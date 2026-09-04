"use client";

// Portado tal cual de berretinv2/src/components/scrollytelling/GroundCobblestones.tsx.
import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { SCROLLY_CONFIG } from "./scrollyConfig";

export const GroundCobblestones: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null);

  // Procedural gradient texture for seamless ground blending
  const groundTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d")!;

    // Vertical gradient from dark foreground to transparent far horizon
    const gradient = ctx.createLinearGradient(0, 512, 0, 0);
    gradient.addColorStop(0, "rgba(14, 11, 8, 0.95)");
    gradient.addColorStop(0.35, "rgba(16, 12, 9, 0.7)");
    gradient.addColorStop(0.75, "rgba(18, 14, 10, 0.25)");
    gradient.addColorStop(1, "rgba(18, 14, 10, 0)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={SCROLLY_CONFIG.elements.ground.position} receiveShadow>
      <planeGeometry args={[SCROLLY_CONFIG.elements.ground.size[0], SCROLLY_CONFIG.elements.ground.size[1], 16, 16]} />
      <meshBasicMaterial map={groundTexture} transparent opacity={0.8} depthWrite={false} />
    </mesh>
  );
};
