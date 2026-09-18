import type { BoxDto } from '../types/visualization';

interface Props {
  box: BoxDto;
}

// Isometric projection constants
const ISO_ANGLE = Math.PI / 10;
const COS = Math.cos(ISO_ANGLE);
const SIN = Math.sin(ISO_ANGLE);

// Project 3D (x, y, z) to 2D canvas coordinates
function isoProject(x: number, y: number, z: number) {
  return {
    x: 200 + (x - y) * COS,
    y: 120 + (x + y) * SIN - z,
  };
}

export default function BoxView({ box }: Props) {
  const { width, height, thickness } = box;
  const scale = 6; // Much smaller scale to fit properly in the grid cell

  // 1) Define all face options (face dims + depth)
  const faces = [
    { faceW: width,   faceH: height,   depth: thickness, labels: ['width', 'height', 'thickness'], area: width * height },
    { faceW: width,   faceH: thickness, depth: height,    labels: ['width', 'thickness', 'height'], area: width * thickness },
    { faceW: height,  faceH: thickness, depth: width,     labels: ['height','thickness','width'], area: height * thickness },
  ];

  // 2) Pick the smallest face
  const best = faces.reduce((a, b) => (a.area < b.area ? a : b));
  const { faceW, faceH, depth, labels } = best;
  const [labelW, labelH, labelD] = labels;

  // 3) Scale dimensions
  const w = faceW * scale;
  const h = faceH * scale;
  const d = depth * scale;

  // 4) Compute the 8 corners of the box
  const pts = [
    isoProject(0,    0,    0), // 0 front-left-bottom
    isoProject(w,    0,    0), // 1 front-right-bottom
    isoProject(w,    d,    0), // 2 back-right-bottom
    isoProject(0,    d,    0), // 3 back-left-bottom
    isoProject(0,    0,    h), // 4 front-left-top
    isoProject(w,    0,    h), // 5 front-right-top
    isoProject(w,    d,    h), // 6 back-right-top
    isoProject(0,    d,    h), // 7 back-left-top
  ];

  // 5) Polygons for top, side, and front faces in draw order
  const facesPoly = [
    [pts[4], pts[5], pts[6], pts[7]], // top
    [pts[1], pts[2], pts[6], pts[5]], // side (depth)
    [pts[3], pts[2], pts[6], pts[7]], // front (faceW x faceH)
  ];
  const faceColors = ['#91b9f7', '#91b9f7', '#91b9f7'];

  // 6) Helper to get midpoint of an edge with offset
  const mid = (A: any, B: any, dx = 0, dy = 0) => ({
    x: (A.x + B.x) / 2 + dx,
    y: (A.y + B.y) / 2 + dy,
  });

  // 7) Map each dimension label to its new front face edge indices and offsets
  // - width: bottom edge (3-2)
  // - height: right vertical edge (2-6)
  // - depth: top edge (6-7)
  const edgeMap: Record<string, [number, number, number, number]> = {
    [labelW]: [3, 2, 0, 20],    // width → front bottom edge
    [labelH]: [3, 7, -16, 0],    // height → front right vertical edge
    [labelD]: [1, 2,  16, 16],   // depth  → front top edge
  };

  // 8) Render the SVG
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="100%" height="100%" style={{ background: 'none', maxWidth: '100%', maxHeight: '100%' }}>
        {/* Draw faces */}
        {facesPoly.map((poly, i) => (
          <polygon
            key={i}
            points={poly.map(p => `${p.x},${p.y}`).join(' ')}
            fill={faceColors[i]}
            stroke="#222"
            strokeWidth={1.5}
          />
        ))}

        {/* Draw edges */}
        {[
          [0,1],[1,2],[2,3],[3,0], // bottom loop
          [4,5],[5,6],[6,7],[7,4], // top loop
          [0,4],[1,5],[2,6],[3,7], // vertical edges
        ].map(([a,b], idx) => (
          <line
            key={idx}
            x1={pts[a].x} y1={pts[a].y}
            x2={pts[b].x} y2={pts[b].y}
            stroke="#222"
            strokeWidth={1.5}
          />
        ))}
        {/* Number the corners for debugging
        {pts.map((p, i) => (
          <text
            key={"corner-" + i}
            x={p.x + 5}
            y={p.y - 5}
            fontSize={12}
            fill="#d22"
          >
            {i}
          </text>
        ))} */}
        {/* Render dimension labels */}
        {([labelW, labelH, labelD] as string[]).map(dim => {
          const [i, j, dx, dy] = edgeMap[dim];
          const { x, y } = mid(pts[i], pts[j], dx, dy);
          const value = (box as any)[dim];
          return (
            <text key={dim} x={x} y={y} fontSize={10} textAnchor="middle" fill="#222">
              {value}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
