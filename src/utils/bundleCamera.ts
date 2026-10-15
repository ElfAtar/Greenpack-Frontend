import { MathUtils } from 'three';
import { fitPerspectiveCamera } from './perspectiveCamera.ts';

export function getBundleCamera(width: number, height: number, thickness: number, aspect: number) {
  const phi = MathUtils.degToRad(60);
  const theta = MathUtils.degToRad(150);
  const { position, fov, near, far } = fitPerspectiveCamera(
    { min: [-width / 2, -height / 2, -thickness / 2], max: [width / 2, height / 2, thickness / 2] },
    [Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta)],
    aspect,
  );
  return { position, fov, near, far };
}
