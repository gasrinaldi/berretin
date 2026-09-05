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
  // El brillo de cada partícula (col *= 0.4-1.0) simula variación de
  // opacidad sin necesitar un shader propio: con pointsMaterial nativo el
  // tamaño/opacidad son uniformes para todas, pero un color más apagado
  // se percibe como una partícula más tenue contra el fondo oscuro.
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

      const c = (Math.random() > 0.5 ? amber : mist).clone().multiplyScalar(0.4 + Math.random() * 0.6);
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

  // Sprite circular/radial para las motas de polvo — sin esto, pointsMaterial
  // renderiza cada punto como un cuadrado sólido (el primitivo nativo de
  // WebGL). El desenfoque del propio gradiente (sin borde duro) hace que,
  // combinado con tamaños que varían por perspectiva (sizeAttenuation +
  // la dispersión de profundidad ya existente en pos[i*3+2]) y el brillo
  // variable por partícula de arriba, se lean como polvo/chispas sueltas
  // en vez de glitter — no hay dos puntos idénticos en tamaño u opacidad
  // percibida aunque el material sea uno solo.
  const sparkTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d")!;

    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.4, "rgba(255,255,255,0.5)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);

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
        <pointsMaterial
          map={sparkTexture}
          alphaTest={0.02}
          size={0.065}
          sizeAttenuation
          vertexColors
          transparent
          opacity={0.65}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      {/* Soft volumetric riverbank mist layer */}
      <mesh ref={mistPlaneRef} position={[0, -0.4, -4.5]} scale={[18, 5, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={mistTexture} transparent opacity={0.25 + scrollProgress * 0.15} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
};
