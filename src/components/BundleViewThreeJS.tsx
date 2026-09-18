import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Edges, PerspectiveCamera } from '@react-three/drei';
import { MathUtils } from 'three';
import type { BundleDto, BoxDto } from '../types/visualization';

interface Props {
  bundle: BundleDto;
  box: BoxDto;
}

export default function BundleViewThreeJS({ bundle, box: _box }: Props) {
  const countX = bundle.numBoxX ?? 1;
  const countY = bundle.numBoxY ?? 1;
  const countZ = bundle.numBoxZ ?? 1;
  const width = bundle.bundleWidth ?? 0;
  const height = bundle.bundleHeight ?? 0;
  const thickness = bundle.bundleThickness ?? 0;

  const spacing = 0.1; // small gap between boxes

  // single box size
  const sx = width / countX;
  const sy = height / countY;
  const sz = thickness / countZ;

  // full bundle extents
  const totalX = countX * sx + (countX - 1) * spacing;
  const totalY = countY * sy + (countY - 1) * spacing;
  const totalZ = countZ * sz + (countZ - 1) * spacing;
  const maxDim = Math.max(totalX, totalY, totalZ);

  // center offsets so the bundle is around (0,0,0)
  const offsetX = -totalX / 2 + sx / 2;
  const offsetY = -totalY / 2 + sy / 2;
  const offsetZ = -totalZ / 2 + sz / 2;

  // Camera configuration
  const FOV = 40;
  const camera = useMemo(() => {
    // distance to fit the largest dimension in view for this FOV
    const distFit = (maxDim / 2) / Math.tan(MathUtils.degToRad(FOV / 2));
    const dist = distFit * 1.3; // margin so it doesn't touch edges

     // angles chosen to show top + front (+Z) + right (+X)
     const phi = MathUtils.degToRad(60);   // elevation
     const theta = MathUtils.degToRad(150); // azimuth; horizontal rotation to show right side better

    const x = dist * Math.sin(phi) * Math.cos(theta); // +X
    const y = dist * Math.cos(phi);                   // +Y
    const z = dist * Math.sin(phi) * Math.sin(theta); // +Z

    return { position: [x, y, z] as [number, number, number] };
  }, [maxDim]);

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
         <directionalLight position={[totalX * 1.2, totalY * 2, totalZ * 1.5]} intensity={1} />

        {/* Bundle boxes */}
        {[...Array(countX)].map((_, i) =>
          [...Array(countY)].map((_, j) =>
            [...Array(countZ)].map((_, k) => {
              const x = i * (sx + spacing) + offsetX;
              const y = j * (sy + spacing) + offsetY;
              const z = k * (sz + spacing) + offsetZ;

              return (
                <mesh key={`${i}-${j}-${k}`} position={[x, y, z]}>
                  <boxGeometry args={[sx, sy, sz]} />
                  <meshStandardMaterial color="#91b9f7" />
                  <Edges scale={1.0} threshold={15} color="white" />
                </mesh>
              );
            })
          )
        )}
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
          right: '130px',
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
          {`W: ${countX} x ${sx.toFixed(1)} = ${width.toFixed(1)}`}
        </div>

        <div style={{
          position: 'absolute',
          top: '50%',
          left: '15%',
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
          {`H: ${countY} x ${sy.toFixed(1)} = ${height.toFixed(1)}`}
        </div>

        <div style={{
          position: 'absolute',
          right: '70%',
          top: '85%',
          transform: 'translateY(-50%)',
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
          {`T: ${countZ} x ${sz.toFixed(1)} = ${thickness.toFixed(1)}`}
        </div>
      </div>
    </div>
  );
}
