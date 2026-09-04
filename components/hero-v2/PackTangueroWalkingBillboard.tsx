"use client";

// Portado tal cual de berretinv2/src/components/scrollytelling/pack/PackTangueroWalkingBillboard.tsx.
import React, { useRef, useMemo } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { PACK_ASSETS } from "./packConfig";

interface PackTangueroWalkingBillboardProps {
  scrollProgress: number;
  isMobile: boolean;
}

export const PackTangueroWalkingBillboard: React.FC<PackTangueroWalkingBillboardProps> = ({ scrollProgress, isMobile }) => {
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Load the 3 sequential walk cycle textures
  const [tex1, tex2, tex3] = useLoader(THREE.TextureLoader, [PACK_ASSETS.tanguero01, PACK_ASSETS.tanguero02, PACK_ASSETS.tanguero03]);

  [tex1, tex2, tex3].forEach((tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
  });

  // Custom Shader with pose-morphing crossfade + optical depth blur + emergence opacity
  const customShader = useMemo(() => {
    return {
      uniforms: {
        uTex1: { value: tex1 },
        uTex2: { value: tex2 },
        uTex3: { value: tex3 },
        uBlend12: { value: 1.0 }, // Weight of tex1 vs tex2
        uBlend23: { value: 0.0 }, // Weight of tex2 vs tex3
        uPoseMix: { value: 0.0 }, // Continuous pose phase [0, 2]
        uBlur: { value: 1.8 },
        uOpacity: { value: 0.34 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uTex1;
        uniform sampler2D uTex2;
        uniform sampler2D uTex3;
        uniform float uPoseMix;
        uniform float uBlur;
        uniform float uOpacity;
        varying vec2 vUv;

        // Sample texture with circular optical blur
        vec4 sampleBlurred(sampler2D tex, vec2 uv, float blur) {
          if (blur < 0.05) {
            return texture2D(tex, uv);
          }
          float r = blur * 0.0035;
          vec4 col = vec4(0.0);
          col += texture2D(tex, uv) * 0.24;
          col += texture2D(tex, uv + vec2(r, 0.0)) * 0.12;
          col += texture2D(tex, uv - vec2(r, 0.0)) * 0.12;
          col += texture2D(tex, uv + vec2(0.0, r)) * 0.12;
          col += texture2D(tex, uv - vec2(0.0, r)) * 0.12;
          col += texture2D(tex, uv + vec2(r * 0.707, r * 0.707)) * 0.07;
          col += texture2D(tex, uv - vec2(r * 0.707, r * 0.707)) * 0.07;
          col += texture2D(tex, uv + vec2(-r * 0.707, r * 0.707)) * 0.07;
          col += texture2D(tex, uv + vec2(r * 0.707, -r * 0.707)) * 0.07;
          return col;
        }

        void main() {
          // uPoseMix runs continuously 0 -> 1 -> 2 -> 0
          float phase = mod(uPoseMix, 3.0);
          vec4 c1 = sampleBlurred(uTex1, vUv, uBlur);
          vec4 c2 = sampleBlurred(uTex2, vUv, uBlur);
          vec4 c3 = sampleBlurred(uTex3, vUv, uBlur);

          vec4 mixedColor;
          if (phase < 1.0) {
            float t = smoothstep(0.15, 0.85, phase);
            mixedColor = mix(c1, c2, t);
          } else if (phase < 2.0) {
            float t = smoothstep(0.15, 0.85, phase - 1.0);
            mixedColor = mix(c2, c3, t);
          } else {
            float t = smoothstep(0.15, 0.85, phase - 2.0);
            mixedColor = mix(c3, c1, t);
          }

          // Discard transparent pixels
          if (mixedColor.a < 0.01) discard;

          gl_FragColor = vec4(mixedColor.rgb, mixedColor.a * uOpacity);
        }
      `,
    };
  }, [tex1, tex2, tex3]);

  // Positional and Scaling boundaries matching Storyboard Cuadro 01 -> 02 -> 03
  // Aspect ratio is 1024 / 1536 = 0.6667
  const initialPos: [number, number, number] = isMobile ? [0.0, -0.5, -5.0] : [0.0, -0.58, -5.45];

  const middlePos: [number, number, number] = isMobile ? [0.0, -0.68, -3.05] : [0.0, -0.7, -3.25];

  const finalPos: [number, number, number] = isMobile ? [-0.18, -1.44, 0.48] : [-0.34, -1.42, 0.62];

  const initialScale: [number, number, number] = isMobile ? [0.34, 0.51, 1] : [0.38, 0.57, 1];

  const middleScale: [number, number, number] = isMobile ? [0.66, 0.99, 1] : [0.74, 1.11, 1];

  const finalScale: [number, number, number] = isMobile ? [1.82, 2.73, 1] : [2.18, 3.27, 1];

  useFrame(() => {
    if (!groupRef.current) return;

    const p = Math.max(0, Math.min(1, scrollProgress));

    // Keyed to the storyboard: distant at 0%, advancing at 35%, foreground by 70%.
    const firstLeg = Math.min(1, p / 0.35);
    const secondLeg = Math.max(0, Math.min(1, (p - 0.35) / 0.35));
    const curX = p <= 0.35 ? THREE.MathUtils.lerp(initialPos[0], middlePos[0], firstLeg) : THREE.MathUtils.lerp(middlePos[0], finalPos[0], secondLeg);
    const curY = p <= 0.35 ? THREE.MathUtils.lerp(initialPos[1], middlePos[1], firstLeg) : THREE.MathUtils.lerp(middlePos[1], finalPos[1], secondLeg);
    const curZ = p <= 0.35 ? THREE.MathUtils.lerp(initialPos[2], middlePos[2], firstLeg) : THREE.MathUtils.lerp(middlePos[2], finalPos[2], secondLeg);

    const scaleX = p <= 0.35 ? THREE.MathUtils.lerp(initialScale[0], middleScale[0], firstLeg) : THREE.MathUtils.lerp(middleScale[0], finalScale[0], secondLeg);
    const scaleY = p <= 0.35 ? THREE.MathUtils.lerp(initialScale[1], middleScale[1], firstLeg) : THREE.MathUtils.lerp(middleScale[1], finalScale[1], secondLeg);
    const scaleZ = p <= 0.35 ? THREE.MathUtils.lerp(initialScale[2], middleScale[2], firstLeg) : THREE.MathUtils.lerp(middleScale[2], finalScale[2], secondLeg);

    groupRef.current.scale.set(scaleX, scaleY, scaleZ);

    // Dynamic Walk Kinematics (Natural stride heave, lateral weight shift, shoulder counter-roll)
    const walkActivation = Math.pow(Math.sin(p * Math.PI), 0.7); // 0 at frame 0, strong during mid-scroll, relaxes at finish
    const stepCadence = p * 14.0; // ~5 complete elegant compadrito steps

    // Vertical stride impulse (2 bounces per full stride cycle)
    const bobY = Math.abs(Math.sin(stepCadence * Math.PI)) * 0.045 * walkActivation * (scaleY / finalScale[1]);

    // Lateral weight transfer (swaying toward the supporting foot)
    const swayX = Math.sin(stepCadence * Math.PI * 0.5) * 0.025 * walkActivation * (scaleX / finalScale[0]);

    // Torso counter-rotation tilt
    const tiltZ = -Math.sin(stepCadence * Math.PI * 0.5) * 0.015 * walkActivation;

    // Pitch forward stride impulse
    const pitchY = -Math.cos(stepCadence * Math.PI) * 0.008 * walkActivation;

    groupRef.current.position.set(curX + swayX, curY + bobY + pitchY, curZ);
    groupRef.current.rotation.z = tiltZ;

    // Update Shader uniforms
    if (materialRef.current) {
      // 1. Cycle between walk poses 06, 07, 08 seamlessly
      materialRef.current.uniforms.uPoseMix.value = stepCadence;

      // 2. Optical blur: distant and atmospheric at first, fully sharp by Cuadro 03.
      const blurFactor = Math.max(0, 1.0 - p / 0.68);
      materialRef.current.uniforms.uBlur.value = THREE.MathUtils.lerp(0.0, 1.8, blurFactor);

      // 3. Emergence opacity: the crowd fringe initially veils him, then he becomes solid.
      const opacityFactor = Math.min(1.0, p / 0.66);
      materialRef.current.uniforms.uOpacity.value = THREE.MathUtils.lerp(0.34, 1.0, opacityFactor);
    }
  });

  return (
    <group ref={groupRef} position={initialPos} scale={initialScale}>
      {/* 2D Plane Billboard with Custom Walking / Blur Shader */}
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[1, 1]} />
        <shaderMaterial ref={materialRef} args={[customShader]} transparent depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};
