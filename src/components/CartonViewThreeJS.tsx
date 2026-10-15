import { useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Edges, PerspectiveCamera } from '@react-three/drei';
import type { BoxDto, BundleDto, CartonDto } from '../types/visualization';
import { getCartonItemPosition, getCartonLayout } from '../utils/cartonLayout';
import type { CartonLayout } from '../utils/cartonLayout';
import { getCartonCamera } from '../utils/cartonCamera';

function CartonCamera({ layout }: { layout: CartonLayout }) {
  const size = useThree(state => state.size);
  const aspect = size.width / Math.max(size.height, 1);
  const { target, ...camera } = useMemo(() => getCartonCamera(layout, aspect), [layout, aspect]);
  return <PerspectiveCamera makeDefault {...camera} onUpdate={self => self.lookAt(...target)} />;
}

function Flaps({ cartonWidth, cartonHeight, cartonThickness }: { cartonWidth: number; cartonHeight: number; cartonThickness: number }) {
  const flapThickness = 1;
  const flapLengthZ = cartonThickness / 4;
  const flapLengthX = cartonWidth / 4;
  const flapAngle = -Math.PI / 6; // User-provided angle (30 degrees)

  return (
    <>
      {/* Front Flap (rotates backward around X-axis, base at front upper edge) */}
      <group position={[0, cartonHeight / 1.8, -cartonThickness / 2]}>
        <mesh
          rotation={[-flapAngle, 0, 0]}
          position={[0, flapThickness / 2, -flapLengthZ / 2]}
        >
          <boxGeometry args={[cartonWidth, flapThickness, flapLengthZ]} />
          <meshBasicMaterial color="#A97835" />
        </mesh>
      </group>
      {/* Back Flap (rotates backward around X-axis, base at back upper edge) */}
      <group position={[0, cartonHeight / 1.8, cartonThickness / 2]}>
        <mesh
          rotation={[flapAngle, 0, 0]}
          position={[0, flapThickness / 2, flapLengthZ / 2]}
        >
          <boxGeometry args={[cartonWidth, flapThickness, flapLengthZ]} />
          <meshBasicMaterial color="#A97835" />
        </mesh>
      </group>
      {/* Left Flap (rotates outward around Z-axis, base at left upper edge) */}
      <group position={[-cartonWidth / 2, cartonHeight / 1.8, 0]}>
        <mesh
          rotation={[0, 0, flapAngle]}
          position={[-flapLengthX / 2, flapThickness / 1.8, 0]}
        >
          <boxGeometry args={[flapLengthX, flapThickness, cartonThickness]} />
          <meshBasicMaterial color="#A97835" />
        </mesh>
      </group>
      {/* Right Flap (rotates outward around Z-axis, base at right upper edge) */}
      <group position={[cartonWidth / 2, cartonHeight / 1.8, 0]}>
        <mesh
          rotation={[0, 0, -flapAngle]}
          position={[flapLengthX / 2, flapThickness / 2, 0]}
        >
          <boxGeometry args={[flapLengthX, flapThickness, cartonThickness]} />
          <meshBasicMaterial color="#A97835" />
        </mesh>
      </group>
    </>
  );
}

function BundlesAboveCarton({ layout }: { layout: CartonLayout }) {
  if (!layout.fits) return null;
  const [width, thickness, height] = layout.axes;
  const bundles = [];
  for (let x = 0; x < width.count; x++) {
    for (let depth = 0; depth < thickness.count; depth++) {
      for (let layer = 0; layer < height.count; layer++) {
        bundles.push(
          <mesh key={`bundle-${x}-${depth}-${layer}`} position={getCartonItemPosition(layout, x, depth, layer)}>
            <boxGeometry args={[width.dim * 0.95, height.dim * 0.95, thickness.dim * 0.95]} />
            <meshBasicMaterial color="#008B8B" />
            <Edges scale={1.0} threshold={15} color="white" />
          </mesh>
        );
      }
    }
  }
  return <>{bundles}</>;
}

export default function CartonViewThreeJS({ carton, box, bundle }: { carton: CartonDto; box: BoxDto; bundle: BundleDto }) {
  const layout = getCartonLayout(carton, box, bundle);
  if (!layout.valid) {
    return <div role="status" style={{ padding: 16, color: '#666' }}>Koli yerleşim ölçüleri veya adetleri eksik ya da geçersiz.</div>;
  }
  const cartonWidth = layout.outer[1];
  const cartonThickness = layout.outer[2];
  const cartonHeight = layout.outer[3];
  const axisLabels = { 1: layout.axes[0], 2: layout.axes[1], 3: layout.axes[2] };
  return (
    <div style={{ width: '100%', height: '100%', minHeight: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', position: 'relative' }}>
      <Canvas
        gl={{ preserveDrawingBuffer: true }}
        style={{ background: 'white' }}
      >
        <CartonCamera layout={layout} />
        {/* Carton outer box as white wireframe */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[cartonWidth, cartonHeight, cartonThickness]} />
          <meshBasicMaterial color="#A97835" transparent opacity={0.9} />
          <Edges scale={1.0} threshold={15} color="#A97835" />
        </mesh>
        {/* Flaps */}
        <Flaps cartonWidth={cartonWidth} cartonHeight={cartonHeight} cartonThickness={cartonThickness} />
        {/* Bundles above */}
        <group position={[0, cartonHeight / 2 + 10, 0]} scale={[0.9, 0.9, 0.9]}>
          <BundlesAboveCarton layout={layout} />
        </group>
        {/* No OrbitControls: view is fixed */}
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
          right: '70%',
          top: '71%',
          transform: 'translateY(-50%)',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: '2px 4px',
          borderRadius: '2px',
          fontSize: '10px',
          fontWeight: 'bold',
          color: axisLabels[1].color,
          border: `1px solid ${axisLabels[1].color}`,
          boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
          whiteSpace: 'nowrap'
        }}>
          {`${axisLabels[1].label}: ${axisLabels[1].count} x ${axisLabels[1].dim.toFixed(1)} = ${(axisLabels[1].count * axisLabels[1].dim).toFixed(1)}`}
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
          color: axisLabels[3].color,
          border: `1px solid ${axisLabels[3].color}`,
          boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
          whiteSpace: 'nowrap'
        }}>
          {`${axisLabels[3].label}: ${axisLabels[3].count} x ${axisLabels[3].dim.toFixed(1)} = ${(axisLabels[3].count * axisLabels[3].dim).toFixed(1)}`}
        </div>

        <div style={{
          position: 'absolute',
          right: '8%',
          top: '67%',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: '2px 4px',
          borderRadius: '2px',
          fontSize: '10px',
          fontWeight: 'bold',
          color: axisLabels[2].color,
          border: `1px solid ${axisLabels[2].color}`,
          boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
          whiteSpace: 'nowrap'
        }}>
          {`${axisLabels[2].label}: ${axisLabels[2].count} x ${axisLabels[2].dim.toFixed(1)} = ${(axisLabels[2].count * axisLabels[2].dim).toFixed(1)}`}
        </div>
      </div>
    </div>
  );
}
  
