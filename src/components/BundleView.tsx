import { Canvas } from '@react-three/fiber';
import { OrbitControls, Edges } from '@react-three/drei';
import type { BundleDto, BoxDto } from '../types/visualization';

interface Props {
  bundle: BundleDto;
  box: BoxDto;
}

export default function BundleView({ bundle, box: _box }: Props) {
  if (!bundle.enabled) return null;

  // Extract counts and bundle dimensions
  const { numBoxX: countX, numBoxY: countY, numBoxZ: countZ, bundleWidth, bundleHeight, bundleThickness } = bundle;
  const spacing = 0.1;

  // Compute individual box size
  const sx = (bundleWidth ?? 0) / (countX ?? 1);
  const sy = (bundleHeight ?? 0) / (countY ?? 1);
  const sz = (bundleThickness ?? 0) / (countZ ?? 1);

  // Compute overall extents and offsets
  const totalX = (countX ?? 1) * sx + ((countX ?? 1) - 1) * spacing;
  const totalY = (countY ?? 1) * sy + ((countY ?? 1) - 1) * spacing;
  const totalZ = (countZ ?? 1) * sz + ((countZ ?? 1) - 1) * spacing;
  const offsetX = -totalX / 2 + sx / 2;
  const offsetY = -totalY / 2 + sy / 2;
  const offsetZ = -totalZ / 2 + sz / 2;

  // Isometric rotation (18° pitch & yaw)
  const isoAngle = -Math.PI / 12;
  const isoPitch = Math.PI / 10;
  const isoYaw = Math.PI / 3.5;

  return (
    <div style={{ width: '100%', height: '400px' }}>
      <Canvas camera={{ position: [totalX, totalY, totalZ], fov: 60, near: 0.1, far: 1000 }}>
        {/* Lights */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[totalX, totalY, totalZ]} intensity={1} />

        {/* Enable orbit controls for better view */}
        <OrbitControls enablePan={true} enableZoom={false} enableRotate={false} />

        {/* Rotate entire bundle to isometric view */}
        <group rotation={[-isoPitch, -isoYaw, isoAngle] as [number, number, number]}>          
          {[...Array(countX)].flatMap((_, i) =>
            [...Array(countY)].flatMap((_, j) =>
              [...Array(countZ)].map((_, k) => {
                const x = i * (sx + spacing) + offsetX;
                const y = j * (sy + spacing) + offsetY;
                const z = k * (sz + spacing) + offsetZ;
                return (
                  <mesh key={`${i}-${j}-${k}`} position={[x, y, z] as [number, number, number]}>                  
                    <boxGeometry args={[sx, sy, sz] as [number, number, number]} />
                    <meshStandardMaterial color="#91b9f7" />
                    <Edges scale={1.0} threshold={15} color="white" />
                  </mesh>
                );
              })
            )
          )}
        </group>
      </Canvas>
    </div>
  );
}
