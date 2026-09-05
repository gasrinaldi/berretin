"use client";

// Portado de berretinv2/src/components/scrollytelling/pack/PackWordmark3D.tsx.
// PACK_ASSETS.wordmark ahora apunta a /brand/berretin-wordmark.png (el
// asset real de V1) en vez del wordmark propio de v2.
//
// Cambios de esta pasada (ver hero-v2.module.css/HeroOverlayUI.tsx previos):
// - Sombra sutil: una copia oscura y semitransparente del mismo plano,
//   apenas desplazada y detrás en Z, como hijo del mismo mesh — así se
//   mueve/escala exactamente igual que el wordmark sin tocar su propio
//   material/color dorado.
// - Destello del acento: antes vivía como una capa CSS posicionada por %
//   del viewport (se desalineaba en otros tamaños de ventana). Ahora es
//   un grupo de 3 meshes (halo/chispa/reflejo) hijos del mismo mesh que
//   el wordmark, ubicados en el espacio LOCAL del plano (unidades de
//   PlaneGeometry(1,1), medido contra el bbox real de los píxeles rojos
//   del PNG: x≈0.823, y≈0.222-desde-arriba → v≈0.778) — al ser hijos,
//   heredan automáticamente la escala (mobile/desktop) y el parallax/lerp
//   que ya aplica el useFrame de acá abajo sobre meshRef. La animación es
//   por tiempo real desde el montaje (no por scrollProgress): un único
//   pulso, sin loop, y se salta por completo si prefersReducedMotion.
import React, { useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { PACK_ASSETS } from "./packConfig";

interface PackWordmark3DProps {
  scrollProgress: number;
  mousePos: { x: number; y: number };
  isMobile: boolean;
  prefersReducedMotion: boolean;
}

// Acento rojo de la "í" medido sobre /public/brand/berretin-wordmark.png
// (2079x756): bbox de píxeles rojos x:1659-1765, y:130-205 → centro en
// fracción de imagen x≈0.823, y-desde-arriba≈0.222. PlaneGeometry(1,1)
// tiene su UV.v invertido respecto al pixel-Y (v=0 abajo, v=1 arriba), y
// sus vértices van de -0.5 a 0.5 en cada eje.
const ACCENT_U = 0.823;
const ACCENT_V = 1 - 0.222;
const ACCENT_LOCAL_X = ACCENT_U - 0.5;
const ACCENT_LOCAL_Y = ACCENT_V - 0.5;

// Relación de aspecto del wordmark (planeWidth / planeHeight, igual para
// mobile y desktop). Los meshes circulares del destello son hijos del
// plano principal y por lo tanto heredan su escala NO uniforme — hay que
// contrarrestarla en Y con este mismo factor para que se vean redondos
// en vez de elípticos.
const WORDMARK_ASPECT = 2.65;

// Curvas del pulso (mismos hitos que la versión CSS anterior: delay
// 420ms, duración 900ms, halo/chispa/reflejo con picos escalonados).
function sampleStops(t: number, stops: [number, number][]): number {
  if (t <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    const [t0, v0] = stops[i - 1];
    const [t1, v1] = stops[i];
    if (t <= t1) return v0 + (v1 - v0) * ((t - t0) / (t1 - t0));
  }
  return stops[stops.length - 1][1];
}

const FLASH_DELAY_MS = 420;
const FLASH_DURATION_MS = 900;
const HALO_OPACITY: [number, number][] = [
  [0, 0],
  [0.3, 0.55],
  [0.45, 1],
  [0.65, 0.55],
  [1, 0],
];
const HALO_SCALE: [number, number][] = [
  [0, 0.3],
  [0.3, 0.9],
  [0.45, 1.15],
  [0.65, 1],
  [1, 1.3],
];
const SPARK_OPACITY: [number, number][] = [
  [0, 0],
  [0.4, 0],
  [0.5, 1],
  [0.62, 0.4],
  [1, 0],
];
const SPARK_SCALE: [number, number][] = [
  [0, 0],
  [0.4, 0.2],
  [0.5, 1],
  [0.62, 0.7],
  [1, 0.4],
];
const AMBIENT_OPACITY: [number, number][] = [
  [0, 0],
  [0.35, 0],
  [0.5, 1],
  [0.7, 0.5],
  [1, 0],
];

export const PackWordmark3D: React.FC<PackWordmark3DProps> = ({ scrollProgress, mousePos, isMobile, prefersReducedMotion }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const sparkRef = useRef<THREE.Mesh>(null);
  const ambientRef = useRef<THREE.Mesh>(null);
  const flashStartRef = useRef<number | null>(null);
  const texture = useLoader(THREE.TextureLoader, PACK_ASSETS.wordmark);

  // Configuración idempotente de la textura ya cacheada por useLoader (patrón
  // estándar de three.js/R3F) — mutarla acá es seguro aunque el render se
  // repita, siempre deja las mismas flags.
  /* eslint-disable react-hooks/immutability */
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  /* eslint-enable react-hooks/immutability */

  // Aspect ratio of the Berretín wordmark
  const planeWidth = isMobile ? 2.2 : 2.5;
  const planeHeight = planeWidth / WORDMARK_ASPECT;

  useFrame(() => {
    if (!meshRef.current) return;
    const p = Math.max(0, Math.min(1, scrollProgress));
    const mat = meshRef.current.material as THREE.MeshBasicMaterial;

    // Opacity progression matching storyboard:
    // Cuadro 01 (0%): 1.0 (crisp, solid gold)
    // Cuadro 02 (35%): still prominent, in front of the distant tanguero
    // Cuadro 03 (70%): remains legible behind the now-foreground tanguero
    // Cuadro 04 (85-100%): dissolves inside the smoke before the dictionary wordmark emerges
    let targetOpacity = 1.0;
    if (p < 0.58) {
      targetOpacity = 1.0;
    } else if (p < 0.72) {
      targetOpacity = THREE.MathUtils.lerp(1.0, 0.72, (p - 0.58) / 0.14);
    } else {
      targetOpacity = THREE.MathUtils.lerp(0.72, 0.0, Math.min(1, (p - 0.72) / 0.17));
    }

    mat.opacity = Math.max(0, targetOpacity);

    // Subtle parallax float in 3D space
    const targetX = mousePos.x * 0.06;
    const targetY = (isMobile ? 0.08 : 0.16) + mousePos.y * 0.04 - p * 0.08;
    meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, targetX, 0.05);
    meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, targetY, 0.05);

    // Destello único al montar, en tiempo real (no scrollProgress) — se
    // salta directamente si el usuario prefiere menos movimiento.
    if (!prefersReducedMotion) {
      if (flashStartRef.current === null) flashStartRef.current = performance.now();
      const localElapsed = performance.now() - flashStartRef.current - FLASH_DELAY_MS;
      const t = Math.max(0, Math.min(1, localElapsed / FLASH_DURATION_MS));

      if (haloRef.current) {
        const haloMat = haloRef.current.material as THREE.MeshBasicMaterial;
        haloMat.opacity = sampleStops(t, HALO_OPACITY);
        const s = sampleStops(t, HALO_SCALE);
        haloRef.current.scale.set(s, s * WORDMARK_ASPECT, 1);
      }
      if (sparkRef.current) {
        const sparkMat = sparkRef.current.material as THREE.MeshBasicMaterial;
        sparkMat.opacity = sampleStops(t, SPARK_OPACITY);
        const s = sampleStops(t, SPARK_SCALE);
        sparkRef.current.scale.set(s, s * WORDMARK_ASPECT, 1);
      }
      if (ambientRef.current) {
        const ambientMat = ambientRef.current.material as THREE.MeshBasicMaterial;
        ambientMat.opacity = sampleStops(t, AMBIENT_OPACITY);
      }
    }
  });

  return (
    // Placed at z = -0.65 so tanguero (moving from z = -5.2 to +1.42) crosses in front of it!
    <mesh ref={meshRef} position={[0, isMobile ? 0.08 : 0.16, -0.65]} scale={[planeWidth, planeHeight, 1]}>
      {/* Sombra sutil: copia oscura del mismo plano/textura, apenas
          desplazada y detrás en Z (más lejos de la cámara) — hija del
          mismo mesh, así que hereda la escala y el parallax del padre sin
          tocar el material/color dorado original (el plano de abajo). */}
      <mesh position={[0.014, -0.018, -0.02]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={texture} color="#120d08" transparent opacity={0.22} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>

      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={texture} transparent opacity={1.0} depthWrite={false} side={THREE.DoubleSide} />

      {/* Destello sobre el acento rojo de la "í": tres meshes hijos en el
          espacio local del plano (ACCENT_LOCAL_X/Y), delante en Z. Al ser
          hijos del mismo mesh, acompañan escala/parallax exactamente —
          nunca se desalinean como la versión anterior en % del viewport.
          circleGeometry se corrige en Y (WORDMARK_ASPECT) porque el padre
          aplica una escala no uniforme [planeWidth, planeHeight] que si
          no, los ovalaría. */}
      <mesh ref={haloRef} position={[ACCENT_LOCAL_X, ACCENT_LOCAL_Y, 0.01]}>
        <circleGeometry args={[0.075, 24]} />
        <meshBasicMaterial color="#A92D22" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      <mesh ref={sparkRef} position={[ACCENT_LOCAL_X, ACCENT_LOCAL_Y, 0.012]}>
        <circleGeometry args={[0.028, 24]} />
        <meshBasicMaterial color="#fff6e4" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      <mesh ref={ambientRef} position={[ACCENT_LOCAL_X, ACCENT_LOCAL_Y, 0.008]} scale={[1, WORDMARK_ASPECT, 1]}>
        <circleGeometry args={[0.19, 24]} />
        <meshBasicMaterial color="#C9A15A" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
    </mesh>
  );
};
