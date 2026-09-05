"use client";

// Portado de berretinv2/src/components/scrollytelling/pack/PackScene3D.tsx.
// Único cambio real: no se importa PackDeepCrowd (el import original no se
// usaba — la multitud real es el componente DeepCrowd definido acá abajo).
import React, { useMemo, useRef } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { PACK_ASSETS } from "./packConfig";
import { GroundCobblestones } from "./GroundCobblestones";
import { PackPorteñoYouths } from "./PackPorteñoYouths";
import { PackWordmark3D } from "./PackWordmark3D";
import { PackTangueroWalkingBillboard } from "./PackTangueroWalkingBillboard";
import { PackSmokeAndMist } from "./PackSmokeAndMist";
import { AtmosphericFog } from "./AtmosphericFog";
import styles from "./hero-v2.module.css";

interface PackScene3DProps {
  scrollProgress: number;
  mousePos: { x: number; y: number };
  isMobile: boolean;
  prefersReducedMotion: boolean;
}

// Background Port Plane (01-fondo-puerto-la-boca.png at z = -14.0)
const BackgroundPort: React.FC<{ mousePos: { x: number; y: number }; scrollProgress: number }> = ({ mousePos, scrollProgress }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const texture = useLoader(THREE.TextureLoader, PACK_ASSETS.fondo);
  const { viewport, camera } = useThree();

  // Configuración idempotente de la textura ya cacheada por useLoader (patrón
  // estándar de three.js/R3F) — mutarla acá es seguro aunque el render se
  // repita, siempre deja las mismas flags.
  /* eslint-disable react-hooks/immutability */
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  /* eslint-enable react-hooks/immutability */

  const distance = Math.abs(camera.position.z - -14.0);
  const fovRad = (((camera as THREE.PerspectiveCamera).fov || 40) * Math.PI) / 180;
  const visibleH = 2 * Math.tan(fovRad / 2) * distance;
  const visibleW = visibleH * (viewport.width / viewport.height);

  const imgAspect = 1672 / 941;
  const planeWidth = Math.max(visibleW * 1.25, visibleH * 1.25 * imgAspect);
  const planeHeight = planeWidth / imgAspect;

  useFrame(() => {
    if (!meshRef.current) return;
    const targetX = -mousePos.x * 0.22;
    const targetY = 0.18 + mousePos.y * 0.12 - scrollProgress * 0.18;

    meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, targetX, 0.05);
    meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, targetY, 0.05);
  });

  return (
    <mesh ref={meshRef} position={[0, 0.18, -14.0]} scale={[planeWidth, planeHeight, 1]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={texture} depthWrite={false} toneMapped={false} />
    </mesh>
  );
};

// Deep Crowd Plane (02-multitud-profunda.png at z = -6.2)
const DeepCrowd: React.FC<{ scrollProgress: number }> = ({ scrollProgress }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const texture = useLoader(THREE.TextureLoader, PACK_ASSETS.multitud);

  // Configuración idempotente de la textura ya cacheada por useLoader (patrón
  // estándar de three.js/R3F) — mutarla acá es seguro aunque el render se
  // repita, siempre deja las mismas flags.
  /* eslint-disable react-hooks/immutability */
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  /* eslint-enable react-hooks/immutability */

  const crowdShader = useMemo(
    () => ({
      uniforms: {
        uTexture: { value: texture },
        uProgress: { value: 0 },
      },
      vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
      fragmentShader: `
      uniform sampler2D uTexture;
      uniform float uProgress;
      varying vec2 vUv;

      void main() {
        vec4 crowd = texture2D(uTexture, vUv);
        vec2 centerField = vec2((vUv.x - 0.5) * 1.55, (vUv.y - 0.46) * 1.08);
        float centerMask = 1.0 - smoothstep(0.10, 0.44, length(centerField));
        float opening = smoothstep(0.12, 0.76, uProgress) * centerMask * 0.88;
        float globalOpacity = mix(0.76, 0.60, smoothstep(0.35, 1.0, uProgress));
        float alpha = crowd.a * globalOpacity * (1.0 - opening);

        if (alpha < 0.01) discard;
        gl_FragColor = vec4(crowd.rgb, alpha);
      }
    `,
    }),
    [texture]
  );

  useFrame(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.uProgress.value = Math.max(0, Math.min(1, scrollProgress));
    }
  });

  return (
    <mesh ref={meshRef} position={[0, -0.62, -6.2]} scale={[17.5, 9.85, 1]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial ref={materialRef} args={[crowdShader]} transparent depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
};

// A restrained fringe of the same crowd sits in front of the wordmark.
// It keeps people at the sides/base while the center opens for the tanguero.
const ForegroundCrowdFringe: React.FC<{ scrollProgress: number }> = ({ scrollProgress }) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const texture = useLoader(THREE.TextureLoader, PACK_ASSETS.multitud);

  // Configuración idempotente de la textura ya cacheada por useLoader (patrón
  // estándar de three.js/R3F) — mutarla acá es seguro aunque el render se
  // repita, siempre deja las mismas flags.
  /* eslint-disable react-hooks/immutability */
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  /* eslint-enable react-hooks/immutability */

  const fringeShader = useMemo(
    () => ({
      uniforms: {
        uTexture: { value: texture },
        uProgress: { value: 0 },
      },
      vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
      fragmentShader: `
      uniform sampler2D uTexture;
      uniform float uProgress;
      varying vec2 vUv;

      void main() {
        vec4 crowd = texture2D(uTexture, vUv);
        float sides = smoothstep(0.24, 0.48, abs(vUv.x - 0.5));
        float base = 1.0 - smoothstep(0.04, 0.34, vUv.y);
        float irregularFringe = max(sides * 0.72, base * 0.88);
        float fadeLate = 1.0 - smoothstep(0.70, 0.90, uProgress);
        float alpha = crowd.a * irregularFringe * mix(0.34, 0.22, uProgress) * fadeLate;

        if (alpha < 0.01) discard;
        gl_FragColor = vec4(crowd.rgb, alpha);
      }
    `,
    }),
    [texture]
  );

  useFrame(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.uProgress.value = Math.max(0, Math.min(1, scrollProgress));
    }
  });

  return (
    <mesh position={[0, -0.62, -0.42]} scale={[17.5, 9.85, 1]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial ref={materialRef} args={[fringeShader]} transparent depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
};

// Camera Controller mapped to Cuadro 01 -> 02 -> 03 -> 04
const PackCameraRig: React.FC<{
  scrollProgress: number;
  mousePos: { x: number; y: number };
  isMobile: boolean;
  prefersReducedMotion: boolean;
}> = ({ scrollProgress, mousePos, isMobile, prefersReducedMotion }) => {
  const currentLookAt = useRef(new THREE.Vector3(0, 0, 0));

  useFrame((state) => {
    const p = Math.max(0, Math.min(1, scrollProgress));

    if (prefersReducedMotion) {
      state.camera.position.set(0, 0, isMobile ? 6.5 : 5.3);
      state.camera.lookAt(0, 0, 0);
      return;
    }

    // Storyboard Camera progression:
    // Cuadro 01 (p=0%): Z = 5.3, Y = 0.05
    // Cuadro 02 (p=35%): Z = 4.8, Y = -0.06
    // Cuadro 03 (p=70%): Z = 4.15, Y = -0.16
    // Cuadro 04 (p=100%): Z = 3.6, Y = -0.25
    const initZ = isMobile ? 6.6 : 5.3;
    const finalZ = isMobile ? 5.2 : 3.7;

    const targetX = 0;
    const targetY = THREE.MathUtils.lerp(0.05, -0.22, p);
    const targetZ = THREE.MathUtils.lerp(initZ, finalZ, p);

    const pX = isMobile ? 0 : mousePos.x * 0.14;
    const pY = isMobile ? 0 : mousePos.y * 0.07;

    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, targetX + pX, 0.06);
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, targetY + pY, 0.06);
    state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, targetZ, 0.08);

    const lookX = pX * 0.08;
    const lookY = THREE.MathUtils.lerp(-0.04, -0.26, p) + pY * 0.08;
    const lookZ = THREE.MathUtils.lerp(0, -1.0, p);

    currentLookAt.current.set(lookX, lookY, lookZ);
    state.camera.lookAt(currentLookAt.current);
  });

  return null;
};

export const PackScene3D: React.FC<PackScene3DProps> = ({ scrollProgress, mousePos, isMobile, prefersReducedMotion }) => {
  return (
    <div className={styles.sceneCanvasWrap}>
      <Canvas
        camera={{
          fov: 40,
          near: 0.1,
          far: 60,
          position: [0, 0.05, 5.3],
        }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
        }}
      >
        {/* Storyboard Camera Controller */}
        <PackCameraRig scrollProgress={scrollProgress} mousePos={mousePos} isMobile={isMobile} prefersReducedMotion={prefersReducedMotion} />

        {/* Ambient & Port Directional Lighting */}
        <ambientLight color="#45382b" intensity={1.35} />
        <directionalLight position={[-4, 7, -3]} color="#5c8296" intensity={0.7} />
        <directionalLight position={[5, 4, 2]} color="#d4a359" intensity={0.88} />

        {/* Cobblestone Ground */}
        <GroundCobblestones />

        {/* 1. Fondo Puerto de La Boca (01-fondo-puerto-la-boca.png) */}
        <BackgroundPort mousePos={mousePos} scrollProgress={scrollProgress} />

        {/* 2. Multitud Profunda (02-multitud-profunda.png) */}
        <DeepCrowd scrollProgress={scrollProgress} />

        {/* 3. Wordmark en profundidad: delante del tanguero al inicio, detrás en Cuadro 03 */}
        <PackWordmark3D scrollProgress={scrollProgress} mousePos={mousePos} isMobile={isMobile} prefersReducedMotion={prefersReducedMotion} />

        {/* Interferencia parcial de gente sobre el wordmark, conservada en bordes y base */}
        <ForegroundCrowdFringe scrollProgress={scrollProgress} />

        {/* 4. Jóvenes Laterales (03-joven-izquierda-sentado, 04-joven-derecha-parado, 05-joven-derecha-sentado) */}
        <PackPorteñoYouths scrollProgress={scrollProgress} isMobile={isMobile} />

        {/* 5. Tanguero Caminando con poses 06, 07, 08 interpoladas */}
        <PackTangueroWalkingBillboard scrollProgress={scrollProgress} isMobile={isMobile} />

        {/* 6. Humo y Bruma de transición (09-bruma-inferior.png & 10-humo-lateral-vignette.png) */}
        <PackSmokeAndMist scrollProgress={scrollProgress} />

        {/* Subtle Atmospheric Mist Particles */}
        <AtmosphericFog scrollProgress={scrollProgress} />
      </Canvas>
    </div>
  );
};
