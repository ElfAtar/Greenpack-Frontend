import { fitPerspectiveCamera } from './perspectiveCamera.ts';
import type { CameraBounds } from './perspectiveCamera';

export function getPalletCamera(bounds: CameraBounds, aspect: number) {
  const elevation = Math.PI / 6;
  return fitPerspectiveCamera(bounds,
    [1, Math.SQRT2 * Math.tan(elevation), 1], aspect, 25, 1.25);
}
