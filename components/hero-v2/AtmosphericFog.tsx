"use client";

// Portado tal cual de berretinv2/src/components/scrollytelling/AtmosphericFog.tsx.
import React, { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { SCROLLY_CONFIG } from "./scrollyConfig";

export const AtmosphericFog: React.FC<{ scrollProgress: number }> = ({ scrollProgress }) => {
  const particlesRef = useRef<THREE.Points>(null);
  const mistPlaneRef = useRef<THREE.Mesh>(null);

  // Subtle floating atmospheric ember/dust motes. Inicializador perezoso de
  // useState (no useMemo): es el único lugar donde React tolera código
  // impuro (Math.random) para calcular el valor inicial una sola vez.
  const [[positions, colors]] = useState<[Float32Array, Float32Array]>(() => {
    const count = SCROLLY_CONFIG.elements.fog.particleCount;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);

    const amber = new THREE.Color("#d4a359");
    const mist = new THREE.Color("#7a6b57");

    for (let i = 0; i < count; i++) {
      pos[i * 3 + 0] = (Math.random() - 0.5) * 16;
      pos[i * 3 + 1] = -1.8 + Math.random() * 4;
      pos[i * 3 + 2] = -6 + Math.random() * 10;

      const c = Math.random() > 0.5 ? amber : mist;
      col[i * 3 + 0] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }

    return [pos, col];
  });

  // Soft atmospheric mist texture
  const mistTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d")!;

    const gradient = ctx.createRadialGradient(256, 256, 20, 256, 256, 250);
    gradient.addColorStop(0, "rgba(212, 163, 89, 0.25)");
    gradient.addColorStop(0.5, "rgba(120, 100, 80, 0.12)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    if (particlesRef.current) {
      const array = particlesRef.current.geometry.attributes.position.array as Float32Array;
      const count = SCROLLY_CONFIG.elements.fog.particleCount;
      for (let i = 0; i < count; i++) {
        array[i * 3 + 1] += Math.sin(t * 0.4 + i) * 0.001;
        array[i * 3 + 0] += Math.cos(t * 0.3 + i) * 0.001;
        if (array[i * 3 + 1] > 3.0) array[i * 3 + 1] = -1.8;
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }

    if (mistPlaneRef.current) {
      mistPlaneRef.current.position.x = Math.sin(t * 0.1) * 0.4;
    }
  });

  return (
    <group>
      {/* Exponential Scene Fog */}
      <fogExp2 attach="fog" args={[SCROLLY_CONFIG.elements.fog.color, SCROLLY_CONFIG.elements.fog.density]} />

      {/* Floating atmospheric motes */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.045} vertexColors transparent opacity={0.65} blending={THREE.AdditiveBlending} depthWrite={false} />
      </points>

      {/* Soft volumetric riverbank mist layer */}
      <mesh ref={mistPlaneRef} position={[0, -0.4, -4.5]} scale={[18, 5, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={mistTexture} transparent opacity={0.25 + scrollProgress * 0.15} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
};
