import { useLayoutEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useThree } from '@react-three/fiber';
import { Box3, Group, PerspectiveCamera } from 'three';
import { getPalletCamera } from '../utils/palletCamera';

export default function FittedPalletScene({ children }: { children: ReactNode }) {
  const scene = useRef<Group>(null);
  const { camera, size, invalidate } = useThree();

  useLayoutEffect(() => {
    if (!scene.current || !(camera instanceof PerspectiveCamera)) return;
    // Measure rendered geometry, including the base, partial loads and top arrows.
    scene.current.updateWorldMatrix(true, true);
    const bounds = new Box3().setFromObject(scene.current);
    if (bounds.isEmpty()) return;
    const fit = getPalletCamera({ min: bounds.min.toArray(), max: bounds.max.toArray() }, size.width / Math.max(size.height, 1));
    camera.position.fromArray(fit.position);
    camera.lookAt(...fit.target);
    camera.fov = fit.fov;
    camera.near = fit.near;
    camera.far = fit.far;
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, children, size.width, size.height, invalidate]);

  return <group ref={scene}>{children}</group>;
}
