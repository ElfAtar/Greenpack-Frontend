import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import { MathUtils } from 'three';
import type { BoxDto } from '../types/visualization';
import { Edges } from '@react-three/drei';

interface Props {
  box: BoxDto;
}

export default function BoxViewThreeJS({ box }: Props) {
  // Box dimensions
  const width = box.width;
  const height = box.height;
  const thickness = box.thickness;

  // Camera configuration (match BundleViewThreeJS)
  const FOV = 40;
  const maxDim = Math.max(width, height, thickness);
  const camera = useMemo(() => {
    // distance to fit the largest dimension in view for this FOV
    const distFit = (maxDim / 2) / Math.tan(MathUtils.degToRad(FOV / 2));
    const dist = distFit * 1.3;
    // angles chosen to show top + front (+Z) + right (+X)
    const phi = MathUtils.degToRad(60);   // elevation
    const theta = MathUtils.degToRad(150); // azimuth
    const x = dist * Math.sin(phi) * Math.cos(theta);
    const y = dist * Math.cos(phi);
    const z = dist * Math.sin(phi) * Math.sin(theta);
    return { position: [x, y, z] as [number, number, number] };
  }, [width, height, thickness]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas gl={{ preserveDrawingBuffer: true }}>
        {/* Fixed camera looking at the origin; no controls so it won't move */}
        <PerspectiveCamera
          makeDefault
          fov={FOV}
          position={camera.position}
          onUpdate={(self) => self.lookAt(0, 0, 0)}
        />

        {/* Lighting */}
        <ambientLight intensity={0.6} />
        <directionalLight position={[width * 1.2, height * 2, thickness * 1.5]} intensity={1} />

        {/* Box */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[width, height, thickness]} />
          <meshStandardMaterial color="#91b9f7" />
          <Edges scale={1.0} threshold={15} color="white" />
        </mesh>
      </Canvas>

      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 10
      }}>
        <div style={{
          position: 'absolute',
          right: '110px',
          top: '65%',
          transform: 'translateY(-50%)',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: '2px 4px',
          borderRadius: '2px',
          fontSize: '10px',
          fontWeight: 'bold',
          color: '#2563eb',
          border: '1px solid #2563eb',
          boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
          whiteSpace: 'nowrap'
        }}>
          {`W: ${width.toFixed(1)}`}
        </div>

        <div style={{
          position: 'absolute',
          top: '50%',
          left: '20%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: '2px 4px',
          borderRadius: '2px',
          fontSize: '10px',
          fontWeight: 'bold',
          color: '#dc2626',
          border: '1px solid #dc2626',
          boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
          whiteSpace: 'nowrap'
        }}>
          {`H: ${height.toFixed(1)}`}
        </div>

        <div style={{
          position: 'absolute',
          bottom: '5%',
          left: '35%',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: '2px 4px',
          borderRadius: '2px',
          fontSize: '10px',
          fontWeight: 'bold',
          color: '#16a34a',
          border: '1px solid #16a34a',
          boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
          whiteSpace: 'nowrap'
        }}>
          {`T: ${thickness.toFixed(1)}`}
        </div>
      </div>
    </div>
  );
}
