"use client";

// Portado de berretinv2/src/components/scrollytelling/pack/PackWordmark3D.tsx.
// PACK_ASSETS.wordmark ahora apunta a /brand/berretin-wordmark.png (el
// asset real de V1) en vez del wordmark propio de v2.
//
// Cambios de esta pasada (ver hero-v2.module.css/HeroOverlayUI.tsx previos):
// - Sombra: en vez de una única copia oscura, son 3 copias apiladas con
//   offset y opacidad crecientes/decrecientes — un "blur" pobre por
//   capas (sin filtros/postproceso) que da más difusión/profundidad que
//   una sola sombra dura.
// - Destello del acento: en vez de un anillo geométrico (círculo/arco
//   genérico), son 8 copias RECORTADAS del propio acento (mismo texture,
//   UV remapeado a su bbox real) desplazadas en 8 direcciones alrededor
//   de su posición — como cada copia usa el alpha real del PNG, el brillo
//   queda literalmente pegado al contorno del acento en vez de a una
//   forma geométrica aproximada. Se prenden en secuencia (fase escalonada
//   por dirección) para dar sensación de barrido/laser recorriendo el
//   borde. Viven como hijos del mismo mesh que el wordmark, en su mismo
//   espacio de textura/UV — por eso NO necesitan corrección de aspecto
//   (a diferencia del anillo anterior): al ser un recorte de la MISMA
//   textura con la MISMA transformación de padre, se alinean solas.
import React, { useMemo, useRef } from "react";
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
// (2079x756): bbox de píxeles rojos x:1659-1765, y:130-205. PlaneGeometry(1,1)
// tiene su UV.v invertido respecto al pixel-Y (v=0 abajo, v=1 arriba), y
// sus vértices van de -0.5 a 0.5 en cada eje. Se agrega ~20% de margen
// alrededor del bbox para no cortar el antialiasing del borde real.
const ACCENT_UV_U0 = 0.7875;
const ACCENT_UV_U1 = 0.8591;
const ACCENT_UV_V0 = 0.709;
const ACCENT_UV_V1 = 0.8478;
const ACCENT_CROP_WIDTH = ACCENT_UV_U1 - ACCENT_UV_U0;
const ACCENT_CROP_HEIGHT = ACCENT_UV_V1 - ACCENT_UV_V0;
const ACCENT_LOCAL_X = (ACCENT_UV_U0 + ACCENT_UV_U1) / 2 - 0.5;
const ACCENT_LOCAL_Y = (ACCENT_UV_V0 + ACCENT_UV_V1) / 2 - 0.5;

// Relación de aspecto del wordmark (planeWidth / planeHeight, igual para
// mobile y desktop).
const WORDMARK_ASPECT = 2.65;

const FLASH_DELAY_MS = 420;
const FLASH_DURATION_MS = 950;
// 8 copias recortadas del acento, desplazadas en 8 direcciones alrededor
// de su propia posición — cada una se prende brevemente en su propia
// fase (repartidas a lo largo de toda la ventana activa), dando la
// sensación de un brillo que recorre el contorno en vez de tiparse fijo.
const OUTLINE_COUNT = 8;
const OUTLINE_DIRECTIONS: [number, number][] = Array.from({ length: OUTLINE_COUNT }, (_, i) => {
  const angle = (i / OUTLINE_COUNT) * Math.PI * 2;
  return [Math.cos(angle), Math.sin(angle)];
});
const OUTLINE_OFFSET = 0.009;
const OUTLINE_PULSE_WIDTH = 0.32;
const OUTLINE_PEAK_OPACITY = 0.8;

export const PackWordmark3D: React.FC<PackWordmark3DProps> = ({ scrollProgress, mousePos, isMobile, prefersReducedMotion }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const outlineRefs = useRef<(THREE.Mesh | null)[]>([]);
  // Acumulador de "tiempo de animación" del destello (ms), no un timestamp
  // de reloj de pared — ver el comentario dentro de useFrame más abajo.
  const flashElapsedRef = useRef(0);
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

  // Textura recortada: en vez de remapear el UV de un plano sobre la
  // textura gigante del wordmark (esa combinación —textura grande +
  // recorte de UV minúsculo + transparent/alphaTest— terminó invisible
  // en la práctica, aunque geometría y alpha del PNG estaban correctos),
  // se recorta la región del acento a un canvas chico propio, mismo
  // patrón ya usado acá al lado para sparkTexture/mistTexture. Con eso el
  // plano de cada copia usa UV 0–1 normales sobre una textura chica y
  // transparent/blending se comportan como en cualquier sprite común.
  const accentTexture = useMemo(() => {
    const img = texture.image as HTMLImageElement;
    const height = 160;
    const width = Math.max(1, Math.round(height * (ACCENT_CROP_WIDTH / ACCENT_CROP_HEIGHT)));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    const sx = ACCENT_UV_U0 * img.width;
    const sy = (1 - ACCENT_UV_V1) * img.height;
    const sw = (ACCENT_UV_U1 - ACCENT_UV_U0) * img.width;
    const sh = (ACCENT_UV_V1 - ACCENT_UV_V0) * img.height;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [texture]);

  useFrame((_state, delta) => {
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

    // Destello único al montar — se salta directamente si el usuario
    // prefiere menos movimiento. Se acumula en TIEMPO DE ANIMACIÓN propio
    // (delta por frame, no performance.now() en crudo): el primer render
    // de esta escena compila varios materiales/shaders nuevos a la vez
    // (sombra en capas + 8 recortes del acento) y ese primer frame real
    // puede tardar varios segundos en el navegador — si se midiera con
    // reloj de pared, ese parate hace que el "tiempo transcurrido" salte
    // de golpe más allá de toda la ventana del destello y quede saltado
    // por completo. Acá cada frame solo puede sumar como máximo 50ms de
    // "tiempo de animación", así que aunque el frame real haya tardado
    // segundos, el destello igual se ve correr durante varios frames.
    if (!prefersReducedMotion) {
      flashElapsedRef.current += Math.min(delta, 0.05) * 1000;
      const localElapsed = flashElapsedRef.current - FLASH_DELAY_MS;
      const t = Math.max(0, Math.min(1, localElapsed / FLASH_DURATION_MS));
      // Envolvente general: fade-in rápido, fade-out un poco más largo,
      // para que el conjunto no arranque ni termine de golpe.
      const envelope = Math.min(1, t / 0.08) * Math.min(1, (1 - t) / 0.18);

      for (let i = 0; i < OUTLINE_COUNT; i++) {
        const mesh = outlineRefs.current[i];
        if (!mesh) continue;
        const phase = i / OUTLINE_COUNT;
        const localT = t - phase;
        const pulse = Math.max(0, 1 - Math.abs(localT) / OUTLINE_PULSE_WIDTH);
        const mat = mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = pulse * envelope * OUTLINE_PEAK_OPACITY;
      }
    }
  });

  return (
    // Placed at z = -0.65 so tanguero (moving from z = -5.2 to +1.42) crosses in front of it!
    <mesh ref={meshRef} position={[0, isMobile ? 0.08 : 0.16, -0.65]} scale={[planeWidth, planeHeight, 1]}>
      {/* Sombra: 3 copias oscuras apiladas con offset y opacidad crecientes
          — sin filtro de blur real (no existe para meshes en three.js sin
          postproceso), esto simula la difusión apilando capas cada vez
          más desplazadas y más tenues, dando más profundidad/separación
          del fondo que una única copia dura. Todas hijas del mismo mesh:
          heredan escala/parallax sin tocar el material/color dorado
          original (el plano de abajo). */}
      <mesh position={[0.014, -0.018, -0.012]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={texture} color="#0a0705" transparent opacity={0.3} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <mesh position={[0.026, -0.034, -0.024]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={texture} color="#0a0705" transparent opacity={0.2} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <mesh position={[0.04, -0.052, -0.036]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={texture} color="#0a0705" transparent opacity={0.13} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <mesh position={[0.058, -0.074, -0.048]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={texture} color="#0a0705" transparent opacity={0.07} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>

      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={texture} transparent opacity={1.0} depthWrite={false} side={THREE.DoubleSide} />

      {/* Destello sobre el acento rojo de la "í": 8 copias del recorte
          (accentTexture), desplazadas alrededor de su posición y delante
          en Z. Como el recorte usa el alpha real del PNG, el brillo queda
          pegado al contorno verdadero en vez de a un círculo/anillo
          aproximado. Plano sin corrección de aspecto: es del mismo ancho
          relativo que su porción de textura, así que el estiramiento no
          uniforme del padre lo alinea solo (igual que el resto del
          wordmark). */}
      {OUTLINE_DIRECTIONS.map(([dx, dy], i) => (
        <mesh
          key={i}
          ref={(el) => {
            outlineRefs.current[i] = el;
          }}
          position={[ACCENT_LOCAL_X + dx * OUTLINE_OFFSET, ACCENT_LOCAL_Y + dy * OUTLINE_OFFSET, 0.02]}
        >
          <planeGeometry args={[ACCENT_CROP_WIDTH, ACCENT_CROP_HEIGHT]} />
          <meshBasicMaterial
            map={accentTexture}
            color="#ff3b2f"
            transparent
            depthWrite={false}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ))}
    </mesh>
  );
};
