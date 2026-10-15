import type { CartonLayout } from './cartonLayout';
import { fitPerspectiveCamera } from './perspectiveCamera.ts';
import type { CameraBounds } from './perspectiveCamera';

export function getCartonPreviewBounds(layout: CartonLayout): CameraBounds {
  const { 1: width, 2: thickness, 3: height } = layout.outer;
  // Include the outward-open flaps and the complete grid above the carton.
  const flapTop = height / 1.8 + Math.max(width, thickness) / 8 + 1;
  const itemTop = layout.fits ? height / 2 + 10 + layout.total[2] * 0.9 : height / 2;
  return {
    min: [-width * 0.75 - 1, -height / 2, -thickness * 0.75 - 1],
    max: [width * 0.75 + 1, Math.max(flapTop, itemTop), thickness * 0.75 + 1],
  };
}

export function getCartonCamera(layout: CartonLayout, aspect: number) {
  // Keep a 30-degree elevation even for shallow cartons so the top stays visible.
  const elevation = Math.PI / 6;
  return fitPerspectiveCamera(getCartonPreviewBounds(layout),
    [1, Math.SQRT2 * Math.tan(elevation), 1], aspect, 25, 1.1);
}
