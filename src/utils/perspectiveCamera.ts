import { MathUtils, Vector3 } from 'three';

export type Point3 = [number, number, number];
export interface CameraBounds {
  min: Point3;
  max: Point3;
}

export function fitPerspectiveCamera(bounds: CameraBounds, viewDirection: Point3, aspect: number, fov = 40, margin = 1.2) {
  const center = new Vector3().addVectors(new Vector3(...bounds.min), new Vector3(...bounds.max)).multiplyScalar(0.5);
  const direction = new Vector3(...viewDirection).normalize();
  const right = new Vector3().crossVectors(new Vector3(0, 1, 0), direction).normalize();
  const up = new Vector3().crossVectors(direction, right).normalize();
  const tanVertical = Math.tan(MathUtils.degToRad(fov / 2));
  const tanHorizontal = tanVertical * Math.max(aspect, 0.01);
  let distance = 0;
  // Fit every corner, including the extra perspective size of nearer corners.
  for (const x of [bounds.min[0], bounds.max[0]]) {
    for (const y of [bounds.min[1], bounds.max[1]]) {
      for (const z of [bounds.min[2], bounds.max[2]]) {
        const corner = new Vector3(x, y, z).sub(center);
        const depth = corner.dot(direction);
        distance = Math.max(distance,
          depth + margin * Math.abs(corner.dot(right)) / tanHorizontal,
          depth + margin * Math.abs(corner.dot(up)) / tanVertical);
      }
    }
  }
  distance = Math.max(distance, 1);
  return {
    position: center.clone().addScaledVector(direction, distance).toArray() as Point3,
    target: center.toArray() as Point3,
    fov,
    near: distance / 1000,
    far: distance * 10,
  };
}
