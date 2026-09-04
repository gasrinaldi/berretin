"use client";

// Portado tal cual de berretinv2/src/components/scrollytelling/pack/PackPorteñoYouths.tsx.
import React, { useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { PACK_ASSETS } from "./packConfig";

interface PackPorteñoYouthsProps {
  scrollProgress: number;
  isMobile: boolean;
}

export const PackPorteñoYouths: React.FC<PackPorteñoYouthsProps> = ({ scrollProgress, isMobile }) => {
  const groupRef = useRef<THREE.Group>(null);

  // Load the 3 youth textures
  const [texLeftSeated, texRightStanding, texRightSeated] = useLoader(THREE.TextureLoader, [
    PACK_ASSETS.jovenIzquierdaSentado,
    PACK_ASSETS.jovenDerechaParado,
    PACK_ASSETS.jovenDerechaSentado,
  ]);

  [texLeftSeated, texRightStanding, texRightSeated].forEach((tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
  });

  useFrame(() => {
    if (!groupRef.current) return;
    const p = Math.max(0, Math.min(1, scrollProgress));

    // Subtle physical push and perspective parallax as camera advances (Cuadro 01 -> 02 -> 03)
    const driftZ = p * 0.25;
    groupRef.current.position.z = driftZ;
  });

  // Responsive positions and scales:
  // Left Seated Youth (03)
  const leftPos: [number, number, number] = isMobile ? [-1.45, -0.98, 1.1] : [-2.45, -0.92, 1.2];
  const leftScale: [number, number, number] = isMobile ? [1.9, 2.85, 1] : [2.5, 3.75, 1];

  // Right Standing Youth (04)
  const rightStandPos: [number, number, number] = isMobile ? [1.55, -0.78, 0.75] : [2.55, -0.68, 0.8];
  const rightStandScale: [number, number, number] = isMobile ? [1.95, 2.92, 1] : [2.65, 3.98, 1];

  // Right Seated Youth (05)
  const rightSeatPos: [number, number, number] = isMobile ? [1.15, -1.08, 1.15] : [1.82, -1.02, 1.25];
  const rightSeatScale: [number, number, number] = isMobile ? [1.8, 2.7, 1] : [2.4, 3.6, 1];

  return (
    <group ref={groupRef}>
      {/* 1. Left Seated Youth (03) */}
      <mesh position={leftPos} scale={leftScale}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={texLeftSeated} transparent depthWrite={false} side={THREE.DoubleSide} />
      </mesh>

      {/* 2. Right Standing Youth (04) */}
      <mesh position={rightStandPos} scale={rightStandScale}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={texRightStanding} transparent depthWrite={false} side={THREE.DoubleSide} />
      </mesh>

      {/* 3. Right Seated Youth (05) */}
      <mesh position={rightSeatPos} scale={rightSeatScale}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={texRightSeated} transparent depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};
