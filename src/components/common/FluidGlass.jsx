/*
 * NOTE:
 * This is a simplified FluidGlass implementation that mimics the API from reactbits.dev
 * (mode, lensProps, barProps, cubeProps) but does not rely on external GLB models.
 * It uses a mesh with a transmission material to create a glass-like distortion.
 *
 * If you have the official FluidGlass component code from React Bits, you can
 * safely replace this entire file with that implementation and keep the same import.
 */

/* eslint-disable react/prop-types */
import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, MeshTransmissionMaterial } from "@react-three/drei";

function Lens({ lensProps }) {
  const { scale = 0.25, ior = 1.15, thickness = 5, chromaticAberration = 0.1, anisotropy = 0.01 } = lensProps || {};

  return (
    <group scale={scale}>
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[1.2, 96, 96]} />
        <MeshTransmissionMaterial
          thickness={thickness}
          anisotropy={anisotropy}
          chromaticAberration={chromaticAberration}
          ior={ior}
          roughness={0.08}
          distortion={0.45}
          distortionScale={0.4}
          temporalDistortion={0.06}
          color="#ffffff"
          attenuationColor="#fecaca"
          attenuationDistance={2.2}
        />
      </mesh>
    </group>
  );
}

function Bar({ barProps }) {
  const { scale = [1.8, 0.35, 0.6], ...rest } = barProps || {};
  const lensProps = { ...rest };
  return (
    <group scale={scale}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <MeshTransmissionMaterial
          thickness={4}
          anisotropy={0.02}
          chromaticAberration={0.12}
          ior={1.12}
          roughness={0.04}
          distortion={0.35}
          distortionScale={0.45}
          temporalDistortion={0.1}
          color="#ffffff"
          attenuationColor="#bfdbfe"
          attenuationDistance={2.5}
          {...lensProps}
        />
      </mesh>
    </group>
  );
}

function Cube({ cubeProps }) {
  const { scale = 0.85, ...rest } = cubeProps || {};
  const lensProps = { ...rest };
  return (
    <group scale={scale}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <MeshTransmissionMaterial
          thickness={6}
          anisotropy={0.02}
          chromaticAberration={0.16}
          ior={1.16}
          roughness={0.06}
          distortion={0.5}
          distortionScale={0.6}
          temporalDistortion={0.12}
          color="#ffffff"
          attenuationColor="#fee2e2"
          attenuationDistance={2.2}
          {...lensProps}
        />
      </mesh>
    </group>
  );
}

function FluidScene({ mode, lensProps, barProps, cubeProps }) {
  return (
    <>
      <ambientLight intensity={0.45} />
      <directionalLight
        position={[4, 6, 6]}
        intensity={1.2}
        castShadow
      />
      <Environment preset="sunset" />
      {mode === "bar" && <Bar barProps={barProps} />}
      {mode === "cube" && <Cube cubeProps={cubeProps} />}
      {(mode === "lens" || !mode) && <Lens lensProps={lensProps} />}
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.8}
      />
    </>
  );
}

export default function FluidGlass({ mode = "lens", lensProps, barProps, cubeProps }) {
  return (
    <Canvas
      style={{ width: "100%", height: "100%" }}
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, 0, 6], fov: 35 }}
    >
      <Suspense fallback={null}>
        <FluidScene
          mode={mode}
          lensProps={lensProps}
          barProps={barProps}
          cubeProps={cubeProps}
        />
      </Suspense>
    </Canvas>
  );
}
