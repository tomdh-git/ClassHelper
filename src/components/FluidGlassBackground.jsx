/* eslint-disable react/no-unknown-property */
import * as THREE from 'three';
import { useRef, useState } from 'react';
import { Canvas, createPortal, useFrame, useThree } from '@react-three/fiber';
import { useFBO, MeshTransmissionMaterial } from '@react-three/drei';
import { easing } from 'maath';

function FluidGlassPlane({ darkMode }) {
  const ref = useRef();
  const buffer = useFBO();
  const { viewport, pointer, gl, camera } = useThree();
  const [scene] = useState(() => new THREE.Scene());

  useFrame((state, delta) => {
    const v = viewport.getCurrentViewport(camera, [0, 0, 15]);
    const destX = (pointer.x * v.width) / 2;
    const destY = (pointer.y * v.height) / 2;
    
    if (ref.current) {
      easing.damp3(ref.current.position, [destX, destY, 15], 0.15, delta);
    }

    // Render scene to buffer
    gl.setRenderTarget(buffer);
    gl.render(scene, camera);
    gl.setRenderTarget(null);
    
    // Set background color based on theme
    gl.setClearColor(darkMode ? 0x050509 : 0xf5f5f7, 1);
  });

  return (
    <>
      {createPortal(<AnimatedBlobs darkMode={darkMode} />, scene)}
      <mesh scale={[viewport.width, viewport.height, 1]}>
        <planeGeometry />
        <meshBasicMaterial map={buffer.texture} transparent />
      </mesh>
      <mesh 
        ref={ref} 
        scale={[viewport.width * 1.2, viewport.height * 1.2, 1]} 
        rotation-x={Math.PI / 2}
      >
        <planeGeometry />
        <MeshTransmissionMaterial
          buffer={buffer.texture}
          ior={1.15}
          thickness={5}
          anisotropy={0.01}
          chromaticAberration={0.1}
          transmission={1}
          roughness={0}
          color={darkMode ? '#ffffff' : '#000000'}
          attenuationColor={darkMode ? '#ffffff' : '#000000'}
          attenuationDistance={0.25}
        />
      </mesh>
    </>
  );
}

function AnimatedBlobs({ darkMode }) {
  const group1 = useRef();
  const group2 = useRef();
  const group3 = useRef();

  useFrame((state, delta) => {
    if (group1.current) {
      group1.current.rotation.z += delta * 0.2;
      group1.current.position.x = Math.sin(state.clock.elapsedTime * 0.3) * 2;
      group1.current.position.y = Math.cos(state.clock.elapsedTime * 0.4) * 1.5;
    }
    if (group2.current) {
      group2.current.rotation.z -= delta * 0.15;
      group2.current.position.x = Math.cos(state.clock.elapsedTime * 0.25) * -2;
      group2.current.position.y = Math.sin(state.clock.elapsedTime * 0.35) * -1.5;
    }
    if (group3.current) {
      group3.current.rotation.z += delta * 0.1;
      group3.current.position.x = Math.sin(state.clock.elapsedTime * 0.2) * 1.5;
      group3.current.position.y = Math.cos(state.clock.elapsedTime * 0.3) * 2;
    }
  });

  const color1 = darkMode ? '#ff3b30' : '#ff7f7f';
  const color2 = darkMode ? '#ff7f7f' : '#ff3b30';
  const color3 = darkMode ? '#ff453a' : '#ff9f9f';

  return (
    <>
      <group ref={group1} position={[-3, 2, 10]}>
        <mesh>
          <sphereGeometry args={[1.5, 32, 32]} />
          <meshBasicMaterial color={color1} transparent opacity={0.3} />
        </mesh>
      </group>
      <group ref={group2} position={[3, -2, 12]}>
        <mesh>
          <sphereGeometry args={[1.2, 32, 32]} />
          <meshBasicMaterial color={color2} transparent opacity={0.25} />
        </mesh>
      </group>
      <group ref={group3} position={[0, 0, 8]}>
        <mesh>
          <sphereGeometry args={[1, 32, 32]} />
          <meshBasicMaterial color={color3} transparent opacity={0.2} />
        </mesh>
      </group>
    </>
  );
}

export default function FluidGlassBackground({ darkMode = false }) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
      <Canvas camera={{ position: [0, 0, 20], fov: 15 }} gl={{ alpha: true }}>
        <FluidGlassPlane darkMode={darkMode} />
      </Canvas>
    </div>
  );
}

