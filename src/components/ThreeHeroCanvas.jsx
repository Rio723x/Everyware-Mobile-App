import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshWobbleMaterial } from '@react-three/drei';

function FloatingMesh() {
  const meshRef = useRef();

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.rotation.x = Math.sin(t / 2) / 3;
      meshRef.current.rotation.y = Math.cos(t / 2) / 3;
    }
  });

  return (
    <Float speed={2} rotationIntensity={1.5} floatIntensity={2}>
      <mesh ref={meshRef} position={[2.5, 0.5, -2]}>
        <icosahedronGeometry args={[1.6, 2]} />
        <MeshWobbleMaterial
          color="#00C4CC"
          factor={0.4}
          speed={2}
          wireframe
          transparent
          opacity={0.3}
        />
      </mesh>
    </Float>
  );
}

function SmallSphere() {
  return (
    <Float speed={3} rotationIntensity={2} floatIntensity={3}>
      <mesh position={[-3, 1, -3]}>
        <sphereGeometry args={[0.8, 32, 32]} />
        <MeshWobbleMaterial
          color="#38BDF8"
          factor={0.3}
          speed={1.5}
          transparent
          opacity={0.25}
        />
      </mesh>
    </Float>
  );
}

export default function ThreeHeroCanvas() {
  const [isReady, setIsReady] = React.useState(false);

  React.useEffect(() => {
    // Defer WebGL context creation & shader compilation until main thread is idle
    if ('requestIdleCallback' in window) {
      const handle = window.requestIdleCallback(() => setIsReady(true), { timeout: 3000 });
      return () => window.cancelIdleCallback(handle);
    } else {
      const timer = setTimeout(() => setIsReady(true), 2500);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!isReady) {
    return (
      <div className="absolute inset-0 pointer-events-none z-0" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }} />
    );
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-0" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
      {/* Explicitly passing pointerEvents: 'none' to Canvas component to prevent intercepting raycast mouse events */}
      <Canvas camera={{ position: [0, 0, 5], fov: 60 }} style={{ pointerEvents: 'none' }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <FloatingMesh />
        <SmallSphere />
      </Canvas>
    </div>
  );
}
