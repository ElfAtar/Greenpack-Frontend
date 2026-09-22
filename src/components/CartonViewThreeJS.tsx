import { Canvas } from '@react-three/fiber';
import { Edges } from '@react-three/drei';
import type { BoxDto, BundleDto, CartonDto } from '../types/visualization';

// Props interface for component (carton prop used directly in function signature)

function getCartonDimensions(carton: CartonDto) {
  return {
    cartonWidth: carton.cartonWidth || carton.width,
    cartonThickness: carton.cartonThickness || carton.thickness,
    cartonHeight: carton.cartonHeight || carton.height,
  };
}

type SourceDimIndex = 1 | 2 | 3;

const SOURCE_DIM_META: Record<SourceDimIndex, { key: 'width' | 'thickness' | 'height'; label: 'W' | 'T' | 'H'; color: string }> = {
  1: { key: 'width', label: 'W', color: '#2563eb' },
  2: { key: 'thickness', label: 'T', color: '#16a34a' },
  3: { key: 'height', label: 'H', color: '#dc2626' },
};

function getBundleCartonMapping(carton: CartonDto): Record<1 | 2 | 3, SourceDimIndex> {
  const mapping = carton.bundleCartonMapping || {};
  const read = (axis: 1 | 2 | 3, fallback: SourceDimIndex): SourceDimIndex => {
    const value = mapping[axis] ?? mapping[String(axis)];
    return value === 1 || value === 2 || value === 3 ? value : fallback;
  };

  return {
    1: read(1, 1),
    2: read(2, 2),
    3: read(3, 3),
  };
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

function BundlesInCarton({ carton, axisBundleDims }: { carton: CartonDto; axisBundleDims: Record<1 | 2 | 3, number> }) {
  const { cartonHeight, cartonWidth, cartonThickness } = getCartonDimensions(carton);
  const { numBundleOrBoxX, numBundleOrBoxY, numBundleOrBoxZ } = carton;
  const bundleWidth = axisBundleDims[1] || cartonWidth / Math.max(numBundleOrBoxX, 1);
  const bundleThickness = axisBundleDims[2] || cartonThickness / Math.max(numBundleOrBoxY, 1);
  const bundleHeight = axisBundleDims[3] || cartonHeight / Math.max(numBundleOrBoxZ, 1);
  const gap = 10; // Space between carton and bundles
  const yOffset = cartonHeight / 2 + gap + bundleHeight / 2;
  const totalWidth = numBundleOrBoxX * bundleWidth;
  const totalThickness = numBundleOrBoxY * bundleThickness;
  const bundles = [];
  for (let x = 0; x < numBundleOrBoxX; x++) {
    for (let y = 0; y < numBundleOrBoxY; y++) {
      for (let z = 0; z < numBundleOrBoxZ; z++) {
        bundles.push(
          <mesh
            key={`bundle-${x}-${y}-${z}`}
            position={[
              -totalWidth / 2 + bundleWidth / 2 + x * bundleWidth,
              yOffset + z * bundleHeight,
              -totalThickness / 2 + bundleThickness / 2 + y * bundleThickness,
            ]}
          >
            <boxGeometry args={[bundleWidth * 0.95, bundleHeight * 0.95, bundleThickness * 0.95]} />
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
  const { cartonHeight, cartonWidth, cartonThickness } = getCartonDimensions(carton);
  const numBoxX = bundle?.numBoxX || 1;
  const numBoxY = bundle?.numBoxY || 1;
  const numBoxZ = bundle?.numBoxZ || 1;
  const bundleDims = bundle?.enabled && bundle.bundleWidth && bundle.bundleHeight && bundle.bundleThickness
    ? [bundle.bundleWidth, bundle.bundleHeight, bundle.bundleThickness]
    : [numBoxX * box.width, numBoxY * box.height, numBoxZ * box.thickness];
  const sourceDims = {
    width: bundleDims[0],
    thickness: bundleDims[2],
    height: bundleDims[1],
  };
  const mapping = getBundleCartonMapping(carton);
  const numBundlesWidth = carton.numBundleOrBoxX;
  const numBundlesHeight = carton.numBundleOrBoxZ;
  const numBundlesThickness = carton.numBundleOrBoxY;
  const axisBundleDims = {
    1: sourceDims[SOURCE_DIM_META[mapping[1]].key],
    2: sourceDims[SOURCE_DIM_META[mapping[2]].key],
    3: sourceDims[SOURCE_DIM_META[mapping[3]].key],
  };
  const axisLabels = {
    1: { ...SOURCE_DIM_META[mapping[1]], count: numBundlesWidth, dim: axisBundleDims[1] },
    2: { ...SOURCE_DIM_META[mapping[2]], count: numBundlesThickness, dim: axisBundleDims[2] },
    3: { ...SOURCE_DIM_META[mapping[3]], count: numBundlesHeight, dim: axisBundleDims[3] },
  };
  // Center the carton visually and set a fixed camera angle
  // Remove OrbitControls for a static view
  // Camera looks at the center of the carton from a fixed isometric-like angle
  const maxDim = Math.max(cartonWidth, cartonHeight, cartonThickness);
  const camDist = maxDim * 1.5;
  const camY = cartonHeight * 1.5;
  return (
    <div style={{ width: '100%', height: '100%', minHeight: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', position: 'relative' }}>
      <Canvas
        gl={{ preserveDrawingBuffer: true }}
        camera={{
          position: [camDist*2.6, camY*2, camDist*2.6],
          fov: 25,
          near: 1,
          far: 10000,
        }}
        style={{ background: 'white' }}
      >
        {/* Carton outer box as white wireframe */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[cartonWidth, cartonHeight, cartonThickness]} />
          <meshBasicMaterial color="#A97835" transparent opacity={0.9} />
          <Edges scale={1.0} threshold={15} color="#A97835" />
        </mesh>
        {/* Flaps */}
        <Flaps cartonWidth={cartonWidth} cartonHeight={cartonHeight} cartonThickness={cartonThickness} />
        {/* Bundles above */}
        <group scale={[0.9, 0.9, 0.9]}>
          <BundlesInCarton carton={carton} axisBundleDims={axisBundleDims} />
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
          right: '65%',
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
          right: '100px',
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
  
