import { memo } from 'react';
import { Environment, Lightformer } from '@react-three/drei';

/** Capture the studio reflections once; UI updates do not rebuild the lighting environment. */
export const StudioLighting = memo(function StudioLighting() {
  return (
    <>
      <hemisphereLight args={['#ffffff', '#b6ada3', 1.5]} />
      <directionalLight position={[3, 5, 6]} intensity={3} color="#ffffff" />
      <directionalLight position={[-4, 2, -5]} intensity={1.6} color="#ffffff" />
      <Environment resolution={128} frames={1}>
        <color attach="background" args={['#707070']} />
        <Lightformer form="rect" intensity={3} scale={[12, 6, 1]} position={[0, 5, 2]} />
        <Lightformer form="rect" intensity={2} scale={[10, 7, 1]} position={[1, 1, 6]} />
        <Lightformer form="rect" intensity={2} scale={[10, 6, 1]} position={[-3, 2, -5]} />
        <Lightformer
          form="rect"
          intensity={1}
          color="#ff3038"
          scale={[3, 6, 1]}
          position={[-6, 1, 0]}
        />
      </Environment>
    </>
  );
});
