"use client";

// Portado de berretinv2/src/components/scrollytelling/pack/PackSmokeAndMist.tsx.
// Únicos cambios: las 4 texturas de humo apuntan a /hero-v2/ en vez de /assets/.
import React, { useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";

interface PackSmokeAndMistProps {
  scrollProgress: number;
}

const SMOKE_ASPECT = 1672 / 941;
const CAMERA_DISTANCE = 1.5;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const range = (progress: number, start: number, end: number) => clamp01((progress - start) / (end - start));

const smooth = (value: number) => value * value * (3 - 2 * value);

const SMOKE_VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SMOKE_FRAGMENT_SHADER = `
  uniform sampler2D uTexture;
  uniform vec3 uTint;
  uniform float uOpacity;
  varying vec2 vUv;

  void main() {
    vec4 smoke = texture2D(uTexture, vUv);
    float featherX = smoothstep(0.0, 0.055, vUv.x) * smoothstep(0.0, 0.055, 1.0 - vUv.x);
    float featherY = smoothstep(0.0, 0.075, vUv.y) * smoothstep(0.0, 0.075, 1.0 - vUv.y);
    float alpha = smoke.a * uOpacity * featherX * featherY;

    if (alpha < 0.008) discard;
    gl_FragColor = vec4(smoke.rgb * uTint, alpha);
  }
`;

export const PackSmokeAndMist: React.FC<PackSmokeAndMistProps> = ({ scrollProgress }) => {
  const groupRef = useRef<THREE.Group>(null);
  const firstRiseRef = useRef<THREE.Mesh>(null);
  const denseRiseRef = useRef<THREE.Mesh>(null);
  const closingRiseRef = useRef<THREE.Mesh>(null);
  const solidifyingRiseRef = useRef<THREE.Mesh>(null);
  const canopyRiseRef = useRef<THREE.Mesh>(null);
  const firstMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const denseMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const closingMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const solidifyingMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const canopyMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const cameraForwardRef = useRef(new THREE.Vector3());

  const [volumetricTexture, darkTexture, cloudTexture, canopyTexture] = useLoader(THREE.TextureLoader, [
    "/hero-v2/cinematic_volumetric_smoke_cloud_overlay.png",
    "/hero-v2/cinematic_dark_smoke_overlay.png",
    "/hero-v2/cinematic_smoke_cloud_overlay.png",
    "/hero-v2/cinematic_smoke_canopy_overlay.png",
  ]);

  [volumetricTexture, darkTexture, cloudTexture, canopyTexture].forEach((texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
  });

  const firstMaterial = useMemo(
    () => ({
      uniforms: {
        uTexture: { value: volumetricTexture },
        uTint: { value: new THREE.Color("#b4a79c") },
        uOpacity: { value: 0 },
      },
      vertexShader: SMOKE_VERTEX_SHADER,
      fragmentShader: SMOKE_FRAGMENT_SHADER,
    }),
    [volumetricTexture]
  );

  const denseMaterial = useMemo(
    () => ({
      uniforms: {
        uTexture: { value: darkTexture },
        uTint: { value: new THREE.Color("#7d6e66") },
        uOpacity: { value: 0 },
      },
      vertexShader: SMOKE_VERTEX_SHADER,
      fragmentShader: SMOKE_FRAGMENT_SHADER,
    }),
    [darkTexture]
  );

  const closingMaterial = useMemo(
    () => ({
      uniforms: {
        uTexture: { value: cloudTexture },
        uTint: { value: new THREE.Color("#75675f") },
        uOpacity: { value: 0 },
      },
      vertexShader: SMOKE_VERTEX_SHADER,
      fragmentShader: SMOKE_FRAGMENT_SHADER,
    }),
    [cloudTexture]
  );

  const solidifyingMaterial = useMemo(
    () => ({
      uniforms: {
        uTexture: { value: darkTexture },
        uTint: { value: new THREE.Color("#514842") },
        uOpacity: { value: 0 },
      },
      vertexShader: SMOKE_VERTEX_SHADER,
      fragmentShader: SMOKE_FRAGMENT_SHADER,
    }),
    [darkTexture]
  );

  const canopyMaterial = useMemo(
    () => ({
      uniforms: {
        uTexture: { value: canopyTexture },
        uTint: { value: new THREE.Color("#695c55") },
        uOpacity: { value: 0 },
      },
      vertexShader: SMOKE_VERTEX_SHADER,
      fragmentShader: SMOKE_FRAGMENT_SHADER,
    }),
    [canopyTexture]
  );

  useFrame((state) => {
    if (
      !groupRef.current ||
      !firstRiseRef.current ||
      !denseRiseRef.current ||
      !closingRiseRef.current ||
      !solidifyingRiseRef.current ||
      !canopyRiseRef.current ||
      !firstMaterialRef.current ||
      !denseMaterialRef.current ||
      !closingMaterialRef.current ||
      !solidifyingMaterialRef.current ||
      !canopyMaterialRef.current
    )
      return;

    const progress = clamp01(scrollProgress);
    const camera = state.camera as THREE.PerspectiveCamera;
    const forward = cameraForwardRef.current.set(0, 0, -1).applyQuaternion(camera.quaternion);

    groupRef.current.position.copy(camera.position).addScaledVector(forward, CAMERA_DISTANCE);
    groupRef.current.quaternion.copy(camera.quaternion);

    const visibleHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * CAMERA_DISTANCE;
    const visibleWidth = visibleHeight * (state.size.width / state.size.height);
    const planeHeight = Math.max(visibleHeight * 1.1, (visibleWidth / SMOKE_ASPECT) * 1.1);
    const planeWidth = planeHeight * SMOKE_ASPECT;

    const firstRise = smooth(range(progress, 0.55, 0.7));
    const denseRise = smooth(range(progress, 0.64, 0.84));
    const closingRise = smooth(range(progress, 0.74, 0.94));
    const solidifyingRise = smooth(range(progress, 0.82, 0.99));
    const canopyRise = smooth(range(progress, 0.86, 1.0));

    firstRiseRef.current.scale.set(planeWidth * 1.1, planeHeight * 1.1, 1);
    firstRiseRef.current.position.y = THREE.MathUtils.lerp(-visibleHeight * 0.96, visibleHeight * 0.25, firstRise);
    firstMaterialRef.current.uniforms.uOpacity.value = firstRise * 0.7;

    denseRiseRef.current.scale.set(planeWidth * 1.12, planeHeight * 1.12, 1);
    denseRiseRef.current.position.y = THREE.MathUtils.lerp(-visibleHeight * 1.02, visibleHeight * 0.02, denseRise);
    denseMaterialRef.current.uniforms.uOpacity.value = denseRise * 0.9;

    closingRiseRef.current.scale.set(planeWidth * 1.16, planeHeight * 1.16, 1);
    closingRiseRef.current.position.y = THREE.MathUtils.lerp(-visibleHeight * 1.08, visibleHeight * 0.1, closingRise);
    closingMaterialRef.current.uniforms.uOpacity.value = closingRise * 0.96;

    solidifyingRiseRef.current.scale.set(planeWidth * 1.24, planeHeight * 1.24, 1);
    solidifyingRiseRef.current.position.y = THREE.MathUtils.lerp(-visibleHeight, visibleHeight * 0.22, solidifyingRise);
    solidifyingMaterialRef.current.uniforms.uOpacity.value = solidifyingRise * 0.98;

    canopyRiseRef.current.scale.set(planeWidth * 1.18, planeHeight * 1.18, 1);
    canopyRiseRef.current.position.y = THREE.MathUtils.lerp(-visibleHeight * 0.92, visibleHeight * 0.06, canopyRise);
    canopyMaterialRef.current.uniforms.uOpacity.value = canopyRise * 0.98;
  });

  return (
    <group ref={groupRef} renderOrder={40}>
      <mesh ref={firstRiseRef} position={[0, -2, 0]} renderOrder={40}>
        <planeGeometry args={[1, 1]} />
        <shaderMaterial ref={firstMaterialRef} args={[firstMaterial]} transparent depthTest={false} depthWrite={false} toneMapped={false} />
      </mesh>

      <mesh ref={denseRiseRef} position={[0, -2, 0.02]} renderOrder={41}>
        <planeGeometry args={[1, 1]} />
        <shaderMaterial ref={denseMaterialRef} args={[denseMaterial]} transparent depthTest={false} depthWrite={false} toneMapped={false} />
      </mesh>

      <mesh ref={closingRiseRef} position={[0, -2, 0.04]} renderOrder={42}>
        <planeGeometry args={[1, 1]} />
        <shaderMaterial ref={closingMaterialRef} args={[closingMaterial]} transparent depthTest={false} depthWrite={false} toneMapped={false} />
      </mesh>

      <mesh ref={solidifyingRiseRef} position={[0, -2, 0.06]} renderOrder={43}>
        <planeGeometry args={[1, 1]} />
        <shaderMaterial ref={solidifyingMaterialRef} args={[solidifyingMaterial]} transparent depthTest={false} depthWrite={false} toneMapped={false} />
      </mesh>

      <mesh ref={canopyRiseRef} position={[0, -2, 0.08]} renderOrder={44}>
        <planeGeometry args={[1, 1]} />
        <shaderMaterial ref={canopyMaterialRef} args={[canopyMaterial]} transparent depthTest={false} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
};
