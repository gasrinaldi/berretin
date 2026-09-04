"use client";

// Portado de berretinv2/src/components/scrollytelling/pack/PackWordmark3D.tsx.
// PACK_ASSETS.wordmark ahora apunta a /brand/berretin-wordmark.png (el
// asset real de V1) en vez del wordmark propio de v2.
import React, { useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { PACK_ASSETS } from "./packConfig";

interface PackWordmark3DProps {
  scrollProgress: number;
  mousePos: { x: number; y: number };
  isMobile: boolean;
}

export const PackWordmark3D: React.FC<PackWordmark3DProps> = ({ scrollProgress, mousePos, isMobile }) => {
  const meshRef = useRef<THREE.Mesh>(null);
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
  const planeHeight = planeWidth / 2.65;

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
  });

  return (
    // Placed at z = -0.65 so tanguero (moving from z = -5.2 to +1.42) crosses in front of it!
    <mesh ref={meshRef} position={[0, isMobile ? 0.08 : 0.16, -0.65]} scale={[planeWidth, planeHeight, 1]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={texture} transparent opacity={1.0} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
};
