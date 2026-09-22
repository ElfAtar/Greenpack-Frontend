import React from 'react';
import { Canvas } from '@react-three/fiber';
import { Edges, Text } from '@react-three/drei';
import type { PalletDto } from '../types/visualization';

/** Axes
 *  X = pallet.width  (t1/t2, long side)
 *  Z = pallet.length (w1/w2, short side)
 *  Y = up
 */

type DimIndex = 1 | 2 | 3; // 1=width, 2=thickness, 3=height
type EdgeKey = 't1' | 't2' | 'w1' | 'w2' | 'h';
type EdgeMap = Record<DimIndex, number>;
type Mapping = Record<EdgeKey, EdgeMap>;
type CartonDims = { width: number; thickness: number; height: number };

// tight pack
const GAP = 0;
const EPS = 1e-6;

// helpers
const DIM_TO_KEY: Record<DimIndex, keyof CartonDims> = { 1: 'width', 2: 'thickness', 3: 'height' };
const num = (v: unknown, fb = 0) => (Number.isFinite(Number(v)) ? Number(v) : fb);
const sizeFor = (c: Partial<CartonDims>, d: DimIndex) => Math.max(0, num(c[DIM_TO_KEY[d]]));
const layersFromH = (h?: EdgeMap) => {
  const hh = h ?? ({ 1: 0, 2: 0, 3: 0 } as EdgeMap);
  return (hh[1] || 0) + (hh[2] || 0) + (hh[3] || 0);
};
const argMaxH = (h?: EdgeMap): DimIndex => {
  const hh = h ?? ({ 1: 0, 2: 0, 3: 0 } as EdgeMap);
  return ([1, 2, 3] as DimIndex[]).sort((a, b) => (hh[b] || 0) - (hh[a] || 0))[0];
};
const nonZeroDims = (e?: EdgeMap): Array<{ dim: DimIndex; count: number }> => {
  const edge = e ?? ({ 1: 0, 2: 0, 3: 0 } as EdgeMap);
  return ([1, 2, 3] as DimIndex[])
    .filter((d) => (edge[d] || 0) > 0)
    .map((d) => ({ dim: d, count: edge[d] || 0 }));
};
const remainingDim = (a: DimIndex, b: DimIndex): DimIndex =>
  ([1, 2, 3] as DimIndex[]).find((d) => d !== a && d !== b)!;
const toEdgeMap = (src: any): EdgeMap => ({ 1: num(src?.[1]), 2: num(src?.[2]), 3: num(src?.[3]) });

// pallet base
function PalletBase({ pallet }: { pallet?: { width?: number; length?: number; baseThickness?: number } }) {
  const width = num(pallet?.width, 120);
  const length = num(pallet?.length, 100);
  const baseThickness = num(pallet?.baseThickness, 8);
  return (
    <mesh position={[0, baseThickness / 2, 0]}>
      <boxGeometry args={[width, baseThickness, length]} />
      <meshStandardMaterial color="#8b6a46" />
      <Edges />
    </mesh>
  );
}


// centered arrow glyph
function FaceArrow({
  position,
  rotation,
  size,
  color = "#000000",
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  size: number;
  color?: string;
}) {
  return (
    <Text position={position} rotation={rotation} fontSize={size} anchorX="center" anchorY="middle" color={color}>
      ∧
    </Text>
  );
}

// how far w1 consumed along Z (for w2 start)
function computeZAfterW1(
  palletLength: number,
  carton: Partial<CartonDims>,
  h?: EdgeMap,
  w1?: EdgeMap,
  gap = GAP
) {
  const rows = nonZeroDims(w1);
  if (!rows.length) return palletLength / 2;
  const hDom = argMaxH(h);
  let zCursor = palletLength / 2;
  for (const row of rows) {
    const zDim = row.dim as DimIndex;
    const xDimRow = remainingDim(hDom, zDim);
    const yDimRow = remainingDim(xDimRow, zDim);
    const xSize = sizeFor(carton, xDimRow);
    const ySize = sizeFor(carton, yDimRow);
    const zSize = sizeFor(carton, zDim);
    if (!xSize || !ySize || !zSize) continue;
    zCursor -= row.count * (zSize + gap) +(palletLength - (row.count * (zSize + gap)));
    console.log('zCursor', zCursor);
    console.log('row,count', row.count);
    console.log('sizes', xSize, ySize, zSize);
    console.log('paletLength', palletLength);
  }
  return Math.min(zCursor, palletLength / 2);
}

// X seam just after w1 columns (where w2 should start in X)
function computeXAfterW1(
  palletWidth: number,
  carton: Partial<CartonDims>,
  h?: EdgeMap,
  w1?: EdgeMap,
  t1?: EdgeMap,
  t2?: EdgeMap,
  gap = GAP
) {
  const rows = nonZeroDims(w1);
  if (!rows.length) return -palletWidth / 2; // no w1 → seam at -X edge
  const hDom = argMaxH(h);
  const zDim = rows[0].dim as DimIndex; // w1 row orientation
  const xDimRow = remainingDim(hDom, zDim);
  const xSize = sizeFor(carton, xDimRow);
  if (!xSize) return -palletWidth / 2;
  const colsW1 = Math.max(1, Math.max(num(t1?.[xDimRow]), num(t2?.[xDimRow])));
  return Math.min(-palletWidth / 2 + colsW1 * (xSize + gap), palletWidth / 2);
}

/** Generic edge placer; anchorX: 'left' uses -X edge and grows +X; 'right' uses +X and grows -X. */
function PlaceEdge({
  edge,
  dims,
  carton,
  h,
  t1,
  t2,
  startZ,
  anchorX,
  colorFirst,
  colorDup,
  markOuterX: _markOuterX,
  markOuterZ: _markOuterZ,
}: {
  edge?: EdgeMap;
  dims: { width: number; length: number; baseThickness: number };
  carton: Partial<CartonDims>;
  h?: EdgeMap;
  t1?: EdgeMap;
  t2?: EdgeMap;
  startZ: number;
  anchorX: 'left' | 'right';
  colorFirst: string;
  colorDup: string;
  markOuterX: -1 | 0 | 1;
  markOuterZ: -1 | 0 | 1;
}) {
  const rows = nonZeroDims(edge);
  if (!rows.length) return null;

  const layers = Math.max(1, layersFromH(h));
  const hDom: DimIndex = argMaxH(h);
  const xLeft = -dims.width / 2;
  const xRight = dims.width / 2;

  let zCursor = startZ;
  const nodes: React.ReactNode[] = [];

  rows.forEach((row) => {
    const zDim = row.dim as DimIndex;
    const xDimRow = remainingDim(hDom, zDim);
    const yDimRow = remainingDim(xDimRow, zDim);

    const xSize = sizeFor(carton, xDimRow);
    const ySize = sizeFor(carton, yDimRow);
    const zSize = sizeFor(carton, zDim);
    if (!xSize || !ySize || !zSize) return;

    const totalCols = Math.max(1, Math.max(num(t1?.[xDimRow]), num(t2?.[xDimRow])));
    const zCenter = zCursor + zSize / 2;

    for (let col = 0; col < totalCols; col++) {
      const xCenter =
        anchorX === 'left'
          ? xLeft + xSize / 2 + col * (xSize + GAP) + EPS
          : xRight - xSize / 2 - col * (xSize + GAP) - EPS;

      for (let layer = 0; layer < layers; layer++) {
        const yCenter = dims.baseThickness + ySize / 2 + layer * (ySize + GAP);
        for (let i = 0; i < row.count; i++) {
          const z = zCenter + i * (zSize + GAP);
          const key = `edge-${zDim}-${anchorX}-${col}-${layer}-${i}`;

          // Calculate carton color based on orientation
          let cartonColor = col === 0 ? colorFirst : colorDup; // Default color
          if (xSize < zSize) {
            cartonColor = "#ff0000"; // Red for X orientation
          } else if (zSize < xSize) {
            cartonColor = "#ffa500"; // Orange for Z orientation
          }
          
          nodes.push(
            <mesh key={key} position={[xCenter, yCenter, z]}>
              <boxGeometry args={[xSize, ySize, zSize]} />
              <meshStandardMaterial color={cartonColor} />
              <Edges />
            </mesh>
          );

          // Show arrows on top faces (Y axis) - no side markers
          if (layer === layers - 1) { // Only on the top layer
            const sizeXZ = Math.max(8, Math.min(xSize, zSize) * 0.5); // Make arrows much larger
            const topY = yCenter + ySize / 2 + 0.1; // Above the top face of the carton
            
            // Calculate arrow direction based on carton orientation
            // Arrow should point from smaller edge to smaller edge
            let arrowRotation: [number, number, number] = [-Math.PI / 2, 0, 0]; // Default: flat on top face
            
            if (xSize < zSize) {
              // Carton is shorter in X direction, arrow points along X axis (smaller edge to smaller edge)
              arrowRotation = [-Math.PI / 2, 0, 0];
            } else if (zSize < xSize) {
              // Carton is shorter in Z direction, arrow points along Z axis (smaller edge to smaller edge)
              arrowRotation = [-Math.PI / 2, 0, Math.PI / 2];
            }
            // If xSize === zSize, use default direction
            
            nodes.push(
              <FaceArrow 
                key={`${key}-top`} 
                position={[xCenter, topY, z]} 
                rotation={arrowRotation} 
                size={sizeXZ} 
                color="#000000"
              />
            );
          }
        }
      }
    }

    zCursor += row.count * (zSize + GAP);
  });

  return <group>{nodes}</group>;
}


/** w2: starts from -Z edge and grows towards +Z; starts from -X edge and grows towards +X; with arrows. */
function W2WithPropagationFromNegative({
  dims,
  carton,
  h,
  w2,
  t1,
  t2,
  startX = -dims.width / 2,
        startZ = -dims.length / 2, // Start from the seam towards +Z
  colorFirst = '#ffe9e0',
  colorDup = '#fff7d6',
}: {
  dims: { width: number; length: number; baseThickness: number };
  carton: Partial<CartonDims>;
  h?: EdgeMap;
  w2?: EdgeMap;
  t1?: EdgeMap;
  t2?: EdgeMap;
  startX?: number;
        startZ?: number; // Adjusted to start from +Z
  colorFirst?: string;
  colorDup?: string;
}) {
  const layers = Math.max(1, layersFromH(h));
  const gap = 0.5;
  const hDominant: DimIndex = argMaxH(h);
  const rows = nonZeroDims(w2);
  if (!rows.length) return null;

  const nodes: React.ReactNode[] = [];

  // Place rows in order, each row below the previous (toward +Z)
  let zCursor = startZ; // Start from the seam (zAfterW1)
  for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
    const row = rows[rowIdx];
    const zDim = row.dim as DimIndex;
    const xDimRow = remainingDim(hDominant, zDim);
    const yDimRow = remainingDim(xDimRow, zDim);

    const xSize = sizeFor(carton, xDimRow);
    const ySize = sizeFor(carton, yDimRow);
    const zSize = sizeFor(carton, zDim);
    if (!xSize || !ySize || !zSize) continue;

    const totalCols = Math.max(1, Math.max(num(t1?.[xDimRow]), num(t2?.[xDimRow])));

    // The center of the first box should be at zCursor + zSize/2
    let zRowStart = zCursor + zSize / 2;

    // X direction: columns from +X to -X
    let xCursor = startX + (totalCols - 1) * (xSize + gap);
    for (let col = totalCols - 1; col >= 0; col--) {
      const xCenter = xCursor + xSize / 2;

      for (let layer = 0; layer < layers; layer++) {
        const y = num(dims.baseThickness, 8) + ySize / 2 + layer * (ySize + gap);
        for (let i = 0; i < row.count; i++) {
          // For +Z growth: z = zRowStart + i * (zSize + gap)
          const z = zRowStart + i * (zSize + gap);
          const key = `w2neg-${zDim}-${col}-${layer}-${i}`;

          // Clamp: skip if any part of the box would be outside the pallet area
          const xMin = xCenter - xSize / 2;
          const xMax = xCenter + xSize / 2;
          const zMin = z - zSize / 2;
          const zMax = z + zSize / 2;
          if (
            xMin < -dims.width / 2 ||
            xMax > dims.width / 2 ||
            zMin < -dims.length / 2 ||
            zMax > dims.length / 2
          ) {
            continue;
          }

          let cartonColor = col === 0 ? colorFirst : colorDup;
          if (xSize < zSize) {
            cartonColor = "#ff0000";
          } else if (zSize < xSize) {
            cartonColor = "#ffa500";
          }

          nodes.push(
            <mesh key={key} position={[xCenter, y, z]}>
              <boxGeometry args={[xSize, ySize, zSize]} />
              <meshStandardMaterial color={cartonColor} />
              <Edges />
            </mesh>
          );

          if (layer === layers - 1) {
            const sizeXZ = Math.max(8, Math.min(xSize, zSize) * 0.5);
            const topY = y + ySize / 2 + 0.1;
            let arrowRotation: [number, number, number] = [-Math.PI / 2, 0, 0];
            if (xSize < zSize) {
              arrowRotation = [-Math.PI / 2, 0, 0];
            } else if (zSize < xSize) {
              arrowRotation = [-Math.PI / 2, 0, Math.PI / 2];
            }
            nodes.push(
              <FaceArrow
                key={`${key}-top`}
                position={[xCenter, topY, z]}
                rotation={arrowRotation}
                size={sizeXZ}
                color="#000000"
              />
            );
          }
        }
      }
      xCursor = xCursor - (xSize + gap);
    }
    // After placing this row, move zCursor for next row (further +Z)
    zCursor = zRowStart + (row.count - 1) * (zSize + gap);
  }

  return <group>{nodes}</group>;
}

// ---------- main ----------
export default function PalletViewThreeJS({ pallet }: { pallet: PalletDto }) {
  const dims = {
    width: num((pallet as any)?.width, 120),
    length: num((pallet as any)?.length, 100),
    baseThickness: num((pallet as any)?.baseThickness, 8),
  };

  // first SKU
  const cd = (pallet as any)?.cartonDimensions ?? {};
  const firstKey = Object.keys(cd)[0];
  const raw = (firstKey ? cd[firstKey] : {}) as any;
  const scaleCartonDim = (value: unknown) => {
    const parsed = num(value);
    return parsed > 120 ? parsed / 10 : parsed;
  };
  const carton: Partial<CartonDims> = {
    width: scaleCartonDim(raw?.cartonWidth ?? raw?.width),
    thickness: scaleCartonDim(raw?.cartonThickness ?? raw?.thickness),
    height: scaleCartonDim(raw?.cartonHeight ?? raw?.height),
  };

  // mapping (mapping or cartonPalletMapping)
  const mp = ((pallet as any)?.cartonPalletMapping ?? (pallet as any)?.mapping) ?? {};
  const mapping: Mapping = {
    h: toEdgeMap(mp.h),
    t1: toEdgeMap(mp.t1),
    t2: toEdgeMap(mp.t2),
    w1: toEdgeMap(mp.w1),
    w2: toEdgeMap(mp.w2),
  };

  // seam positions
  const zAfterW1 = computeZAfterW1(dims.length, carton, mapping.h, mapping.w1, GAP);
  const xAfterW1 = computeXAfterW1(dims.width, carton, mapping.h, mapping.w1, mapping.t1, mapping.t2, GAP);


  // Compute palletHeight for camera and label placement
  const palletHeight = num((pallet as any)?.stackHeight) || (carton.height ? carton.height * layersFromH(mapping.h) : 100);
  const displayPalletHeight = 130;

  // Center the pallet visually and set a fixed camera angle
  // Remove OrbitControls for a static view
  // Camera looks at the center of the pallet from a fixed isometric-like angle
  // Calculate a camera distance that fits the entire pallet in view
  const maxDim = Math.max(dims.width, dims.length, palletHeight);
  const camDist = maxDim * 2.5;
  const camY = palletHeight * 3 + dims.baseThickness;
  return (
    <div style={{ width: '100%', height: '100%', minHeight: 0, display: 'flex', alignItems: 'flex-start', position: 'relative' }}>
      <Canvas
        gl={{ preserveDrawingBuffer: true }}
        camera={{
          position: [camDist*2, camY*1.5, camDist*2],
          fov: 20,
          near: 1,
          far: 10000,
        }}
        style={{ background: 'white' }}
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[80, 140, 60]} intensity={0.65} />


        <PalletBase pallet={dims} />

        {/* w1: -Z → +Z, columns from -X → +X with centered arrows on −X and −Z */}
        <PlaceEdge
          edge={mapping.w1}
          dims={dims}
          carton={carton}
          h={mapping.h}
          t1={mapping.t1}
          t2={mapping.t2}
          startZ={-dims.length / 2}
          anchorX="left"
          colorFirst="#e0e6f9"
          colorDup="#eaffea"
          markOuterX={-1}
          markOuterZ={-1}
        />

        {/* w2: starts from seam and grows towards +Z; starts from seam and grows towards -X */}
        <W2WithPropagationFromNegative
          dims={dims}
          carton={carton}
          h={mapping.h}
          w2={mapping.w2}
          t1={mapping.t1}
          t2={mapping.t2}
          startX={xAfterW1}
          startZ={zAfterW1}
        />

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
          bottom: '35%',
          left: '30%',
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
          {`W: ${dims.width.toFixed(1)}`}
        </div>

        <div style={{
          position: 'absolute',
          right: '30%',
          top: '58%',
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
          {`L: ${dims.length.toFixed(1)}`}
        </div>

        <div style={{
          position: 'absolute',
          top: '30%',
          left: '25%',
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
          {`H: ${displayPalletHeight.toFixed(1)}`}
        </div>
      </div>
    </div>
  );
}
