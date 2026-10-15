import type { BoxDto, BundleDto, CartonDto } from '../types/visualization';

export type CartonAxis = 1 | 2 | 3; // API axes: width, thickness, height.

export const SOURCE_DIM_META = {
  1: { key: 'width', label: 'W', color: '#2563eb' },
  2: { key: 'thickness', label: 'T', color: '#16a34a' },
  3: { key: 'height', label: 'H', color: '#dc2626' },
} as const;

const PERMUTATIONS: [CartonAxis, CartonAxis, CartonAxis][] = [
  [1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 1, 2], [3, 2, 1],
];
const AXES = [1, 2, 3] as const;
const positive = (value: number | undefined): value is number =>
  value !== undefined && Number.isFinite(value) && value > 0;

export function getCartonLayout(carton: CartonDto, box: BoxDto, bundle: BundleDto) {
  const outer = {
    1: carton.cartonWidth || carton.width,
    2: carton.cartonThickness || carton.thickness,
    3: carton.cartonHeight || carton.height,
  };
  // The database endpoint supplies usable dimensions separately from the outer shell.
  const inner = {
    1: positive(carton.width) ? Math.min(carton.width, outer[1]) : outer[1],
    2: positive(carton.thickness) ? Math.min(carton.thickness, outer[2]) : outer[2],
    3: positive(carton.height) ? Math.min(carton.height, outer[3]) : outer[3],
  };
  const source = bundle.enabled ? {
    width: bundle.bundleWidth ?? (bundle.numBoxX ?? 1) * box.width,
    thickness: bundle.bundleThickness ?? (bundle.numBoxZ ?? 1) * box.thickness,
    height: bundle.bundleHeight ?? (bundle.numBoxY ?? 1) * box.height,
  } : box;
  const counts = { 1: carton.numBundleOrBoxX, 2: carton.numBundleOrBoxY, 3: carton.numBundleOrBoxZ };
  const mapping = carton.bundleCartonMapping;
  const hasMapping = PERMUTATIONS.some(order => AXES.every(axis => mapping?.[axis] === order[axis - 1]));
  const makeAxes = (order: readonly CartonAxis[]) => AXES.map(axis => {
    const sourceAxis = order[axis - 1];
    return { ...SOURCE_DIM_META[sourceAxis], count: counts[axis], dim: source[SOURCE_DIM_META[sourceAxis].key] };
  });
  const original = makeAxes(hasMapping ? AXES.map(axis => mapping![axis] as CartonAxis) : AXES);
  const valid = AXES.every(axis => positive(outer[axis]) && positive(inner[axis]) &&
    Number.isInteger(counts[axis]) && counts[axis] > 0) && Object.values(source).every(positive);
  const fits = (axes: typeof original) => valid && AXES.every(axis =>
    axes[axis - 1].count * axes[axis - 1].dim <= inner[axis] + 1e-6);

  let axes = original;
  if (!fits(axes)) {
    // If the grid axes do not match the shell, rotate the entire grid
    // (counts and dimensions together), preserving every item.
    const rotations = PERMUTATIONS.map(order => order.map(axis => original[axis - 1]));
    // Without a mapping, also consider source orientations with fixed axis counts.
    const candidates = hasMapping ? rotations : [...PERMUTATIONS.map(makeAxes), ...rotations];
    axes = candidates.find(fits) ?? original;
  }

  const total = axes.map(axis => axis.count * axis.dim);
  return { outer, inner, axes, total, valid, fits: fits(axes) };
}

export type CartonLayout = ReturnType<typeof getCartonLayout>;

export function getCartonItemPosition(layout: CartonLayout, x: number, depth: number, layer: number): [number, number, number] {
  const [width, thickness, height] = layout.axes.map(axis => axis.dim);
  // Local coordinates for the exploded preview. The view anchors this group
  // above the carton, so its display scale does not move items into the shell.
  return [
    -layout.total[0] / 2 + (x + 0.5) * width,
    (layer + 0.5) * height,
    -layout.total[1] / 2 + (depth + 0.5) * thickness,
  ];
}
