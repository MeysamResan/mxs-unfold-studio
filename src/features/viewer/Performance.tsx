import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, Vector3 } from 'three';
import { QualityGovernor } from '../../core/viewer/quality-governor';
import type { Quality } from '../../core/viewer/state';

interface ViewerDiagnostics {
  frames: number;
  active: boolean;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  dpr: number;
  camera: { position: number[]; quaternion: number[]; target: number[] | null };
  projection: { width: number; height: number; verticalFov: number; focalPixels: number } | null;
}
declare global {
  interface Window {
    __UNFOLD_DEBUG__?: ViewerDiagnostics;
  }
}

export function Performance({ quality, active }: { quality: Quality; active: boolean }) {
  const governor = useRef(new QualityGovernor());
  const { setDpr, gl, invalidate } = useThree();
  useEffect(() => {
    governor.current = new QualityGovernor();
    setDpr(
      Math.min(window.devicePixelRatio, quality === 'high' ? 2 : quality === 'balanced' ? 1 : 1.5),
    );
    invalidate();
  }, [quality, setDpr, invalidate]);

  useEffect(() => {
    // Restart demand rendering after visibility changes without replacing the scene or camera.
    // Samples before a pause must not count against the newly resumed animation.
    governor.current = new QualityGovernor();
    if (import.meta.env.DEV && window.__UNFOLD_DEBUG__) {
      window.__UNFOLD_DEBUG__.active = active;
    }
    if (active) invalidate();
  }, [active, invalidate]);

  useFrame(({ camera, controls, size }, delta) => {
    if (active && quality === 'auto') {
      const next = governor.current.sample(delta * 1000, performance.now(), gl.getPixelRatio());
      if (next !== null) setDpr(Math.min(next, window.devicePixelRatio));
    }
    if (import.meta.env.DEV) {
      window.__UNFOLD_DEBUG__ = {
        frames: (window.__UNFOLD_DEBUG__?.frames ?? 0) + 1,
        active,
        drawCalls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
        geometries: gl.info.memory.geometries,
        textures: gl.info.memory.textures,
        dpr: gl.getPixelRatio(),
        projection:
          camera instanceof PerspectiveCamera
            ? {
                width: size.width,
                height: size.height,
                verticalFov: camera.fov,
                focalPixels: size.height / (2 * Math.tan((camera.fov * Math.PI) / 360)),
              }
            : null,
        camera: {
          position: camera.position.toArray(),
          quaternion: camera.quaternion.toArray(),
          target:
            controls && 'target' in controls && controls.target instanceof Vector3
              ? controls.target.toArray()
              : null,
        },
      };
    }
  });
  return null;
}
