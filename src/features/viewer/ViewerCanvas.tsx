import {
  Component,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ErrorInfo,
  type ReactNode,
} from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { PerspectiveCamera, Vector3 } from 'three';
import { RotateCcw } from 'lucide-react';
import type { ShowcaseDefinition } from '../../core/catalog/types';
import type { ViewerState } from '../../core/viewer/state';
import { assetUrl } from '../../core/assets/url';
import { usePageActive } from '../../shared/use-page-active';
import { useElementVisible } from '../../shared/use-element-visible';
import { useReducedMotion } from '../../shared/use-reduced-motion';
import { useModel } from './use-model';
import { SceneModel } from './SceneModel';
import { Performance } from './Performance';
import { StudioLighting } from './StudioLighting';

export interface ViewerCanvasProps {
  definition: ShowcaseDefinition;
  state: ViewerState;
  onSelect: (id: string | null) => void;
  obscured?: boolean;
  onActionStart: (id: string) => void;
  onActionEnd: (revision: number) => void;
}

class RenderBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Viewer unavailable', error.message, info.componentStack);
  }
  render() {
    return this.state.failed ? (
      <div className="viewer-message">
        <h2>The 3D view is unavailable</h2>
        <p>
          Try a browser with hardware acceleration enabled. You can still explore the component
          list.
        </p>
      </div>
    ) : (
      this.props.children
    );
  }
}

const CANONICAL_FIELD_OF_VIEW = 35;

function CameraRig({
  definition,
  revision,
  active,
}: {
  definition: ShowcaseDefinition;
  revision: number;
  active: boolean;
}) {
  const { camera, size, controls, invalidate } = useThree();
  const framedView = useRef<{
    definition: ShowcaseDefinition;
    revision: number;
    width: number;
    height: number;
  } | null>(null);
  const [maxDistance, setMaxDistance] = useState(19);
  const width = Math.max(size.width, 1);
  const height = Math.max(size.height, 1);
  const aspect = width / height;
  const canonicalHalfFov = (CANONICAL_FIELD_OF_VIEW * Math.PI) / 360;
  // Allow for the near edge of a three-dimensional object, beyond its flat width.
  const distance =
    Math.max(7, definition.camera.fit / (2 * Math.tan(canonicalHalfFov) * aspect)) +
    definition.presentation.extent * 0.18;

  useLayoutEffect(() => {
    if (!(camera instanceof PerspectiveCamera) || !controls) return;
    // Only the first model view and a deliberate Reset apply canonical framing.
    if (framedView.current?.definition !== definition || framedView.current.revision !== revision) {
      framedView.current = { definition, revision, width, height };
      setMaxDistance(Math.max(19, distance * 1.5));
      // Flush residual orbit damping before assigning the canonical view.
      if (
        'enableDamping' in controls &&
        typeof controls.enableDamping === 'boolean' &&
        'update' in controls &&
        typeof controls.update === 'function'
      ) {
        const damping = controls.enableDamping;
        controls.enableDamping = false;
        controls.update();
        controls.enableDamping = damping;
      }
      camera.position.copy(
        new Vector3(...definition.camera.position).normalize().multiplyScalar(distance),
      );
      camera.lookAt(...definition.camera.target);
      if ('target' in controls && controls.target instanceof Vector3) {
        controls.target.set(...definition.camera.target);
      }
    }

    // A taller stage must reveal more space, rather than magnify the model.
    // Keep the reference pixel scale when panels close; fit it down if a viewport shrinks.
    // Projection changes preserve the user's orbit, target, and zoom distance throughout resizing.
    const reference = framedView.current;
    const fitScale = Math.min(1, width / reference.width, height / reference.height);
    camera.fov =
      (Math.atan((Math.tan(canonicalHalfFov) * height) / (reference.height * fitScale)) * 360) /
      Math.PI;
    camera.updateProjectionMatrix();
    invalidate();
  }, [
    camera,
    controls,
    definition,
    distance,
    revision,
    width,
    height,
    canonicalHalfFov,
    invalidate,
  ]);

  return (
    <OrbitControls
      makeDefault
      enabled={active}
      enablePan={false}
      enableDamping
      dampingFactor={0.09}
      minDistance={4.5}
      maxDistance={maxDistance}
      minPolarAngle={0.3}
      maxPolarAngle={Math.PI - 0.3}
    />
  );
}

export default function ViewerCanvas({ obscured = false, ...props }: ViewerCanvasProps) {
  const pageActive = usePageActive();
  const [viewportRef, inViewport] = useElementVisible<HTMLDivElement>();
  const active = pageActive && inViewport && !obscured;

  return (
    <div
      ref={viewportRef}
      className="viewer-viewport"
      data-render-active={active}
      style={{ position: 'absolute', inset: 0, zIndex: 1 }}
    >
      <ViewerScene {...props} active={active} />
    </div>
  );
}

function ViewerScene({
  definition,
  state,
  onSelect,
  onActionStart,
  onActionEnd,
  active,
}: ViewerCanvasProps & { active: boolean }) {
  const [retry, setRetry] = useState(0);
  const reducedMotion = useReducedMotion();
  const url = useMemo(() => assetUrl(definition.asset.path), [definition.asset.path]);
  const result = useModel(url, retry);
  // R3F reapplies changed camera options. Keep the initial position stable through UI renders.
  const cameraOptions = useMemo(
    () => ({
      position: [...definition.camera.position] as [number, number, number],
      fov: CANONICAL_FIELD_OF_VIEW,
      near: 0.05,
      far: 60,
    }),
    [definition.camera.position],
  );
  const dpr = useMemo<[number, number]>(
    () => (state.quality === 'high' ? [1, 2] : state.quality === 'balanced' ? [1, 1] : [1, 1.5]),
    [state.quality],
  );

  if (result.status === 'error')
    return (
      <div className="viewer-message" role="alert">
        <span className="eyebrow">CONNECTION INTERRUPTED</span>
        <h2>Let’s try that again.</h2>
        <p>{result.message}</p>
        <button className="button-primary" onClick={() => setRetry((value) => value + 1)}>
          <RotateCcw size={16} /> Reload model
        </button>
      </div>
    );
  if (result.status === 'loading')
    return (
      <div className="viewer-message" role="status">
        <div className="loader-mark" />
        <span className="eyebrow">PREPARING YOUR PERSPECTIVE</span>
        <p>Loading {definition.title}…</p>
      </div>
    );

  return (
    <RenderBoundary key={retry}>
      <Canvas
        aria-label={`Interactive 3D model of ${definition.title}. Use the component list and controls for keyboard interaction.`}
        camera={cameraOptions}
        dpr={dpr}
        frameloop={active ? 'demand' : 'never'}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        onPointerMissed={() => onSelect(null)}
      >
        <StudioLighting />
        <SceneModel
          model={result.model}
          definition={definition}
          state={state}
          active={active}
          reducedMotion={reducedMotion}
          onSelect={onSelect}
          onActionStart={onActionStart}
          onActionEnd={onActionEnd}
        />
        <CameraRig definition={definition} revision={state.resetRevision} active={active} />
        <Performance quality={state.quality} active={active} />
      </Canvas>
    </RenderBoundary>
  );
}
