import { useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Edges, PerspectiveCamera } from '@react-three/drei';
import type { BundleDto, BoxDto } from '../types/visualization';
import { getBundleCamera } from '../utils/bundleCamera';

interface Props {
  bundle: BundleDto;
  box: BoxDto;
}

function BundleCamera({ width, height, thickness }: { width: number; height: number; thickness: number }) {
  const size = useThree(state => state.size);
  const aspect = size.width / Math.max(size.height, 1);
  const camera = useMemo(() => getBundleCamera(width, height, thickness, aspect), [width, height, thickness, aspect]);
  return <PerspectiveCamera makeDefault {...camera} onUpdate={self => self.lookAt(0, 0, 0)} />;
}

export default function BundleViewThreeJS({ bundle }: Props) {
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

  // center offsets so the bundle is around (0,0,0)
  const offsetX = -totalX / 2 + sx / 2;
  const offsetY = -totalY / 2 + sy / 2;
  const offsetZ = -totalZ / 2 + sz / 2;

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas gl={{ preserveDrawingBuffer: true }}>
        {/* Fixed camera looking at the origin; no controls so it won't move */}
        <BundleCamera width={totalX} height={totalY} thickness={totalZ} />

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
