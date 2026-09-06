import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import {
  AnimationMixer,
  Box3,
  Group,
  Mesh,
  MeshStandardMaterial,
  LoopOnce,
  LoopRepeat,
  Vector3,
  type Object3D,
} from 'three';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import type { ShowcaseDefinition } from '../../core/catalog/types';
import type { ViewerState } from '../../core/viewer/state';

interface Props {
  model: GLTF;
  definition: ShowcaseDefinition;
  state: ViewerState;
  active: boolean;
  reducedMotion: boolean;
  onSelect: (id: string | null) => void;
  onActionStart: (id: string) => void;
  onActionEnd: (revision: number) => void;
}

export function SceneModel({
  model,
  definition,
  state,
  active,
  reducedMotion,
  onSelect,
  onActionStart,
  onActionEnd,
}: Props) {
  const invalidate = useThree((store) => store.invalidate);
  const smoothed = useRef(0);
  const firstFrame = useRef(true);
  const actionElapsed = useRef(0);
  const actionStarted = useRef(false);
  const actionCompleted = useRef(false);
  const selectedAction = definition.actions?.find((action) => action.id === state.actionId);
  const actionAnimation = selectedAction?.animation;
  const group = useRef<Group>(null);
  const mixer = useMemo(() => new AnimationMixer(model.scene), [model]);
  const prepared = useMemo(() => {
    model.scene.updateMatrixWorld(true);
    const bounds = new Box3().setFromObject(model.scene);
    const center = bounds.getCenter(new Vector3());
    const scale =
      definition.presentation.extent / Math.max(...bounds.getSize(new Vector3()).toArray());
    const parts = definition.parts.map((part) => {
      const nodes = part.nodes.map((name) => {
        const node = model.scene.getObjectByName(name);
        if (!node) throw new Error(`Missing model node: ${name}`);
        return node;
      });
      for (const node of nodes)
        node.traverse((child) => {
          child.userData.partId = part.id;
        });
      const anchor = nodes[0]
        ? new Box3().setFromObject(nodes[0]).getCenter(new Vector3())
        : new Vector3();
      return {
        ...part,
        nodes,
        origins: nodes.map((node) => node.position.clone()),
        anchor: nodes[0] ? nodes[0].worldToLocal(anchor) : anchor,
      };
    });
    const expandedBounds = bounds.clone();
    for (const part of parts)
      for (const node of part.nodes) {
        const offset = new Vector3(...part.separation);
        if (node.parent) {
          offset
            .applyMatrix4(node.parent.matrixWorld)
            .sub(node.parent.getWorldPosition(new Vector3()));
        }
        expandedBounds.union(new Box3().setFromObject(node).translate(offset));
      }
    const spreadRatio = Math.max(
      1,
      Math.max(...expandedBounds.getSize(new Vector3()).toArray()) /
        Math.max(...bounds.getSize(new Vector3()).toArray()),
    );
    if (
      definition.animation &&
      !model.animations.some((clip) => clip.name === definition.animation?.clip)
    ) {
      throw new Error(`Missing animation clip: ${definition.animation.clip}`);
    }
    const animated =
      definition.animation?.displayNodes?.map((name) => {
        const node = model.scene.getObjectByName(name);
        if (!node) throw new Error(`Missing animation display node: ${name}`);
        return node;
      }) ?? [];
    return { center, scale, spreadRatio, parts, animated };
  }, [model, definition]);

  useEffect(() => {
    actionElapsed.current = 0;
    actionStarted.current = false;
    actionCompleted.current = false;
    group.current?.position.set(0, 0, 0);
    invalidate();
  }, [state.actionId, state.actionRevision, invalidate]);

  useEffect(() => {
    const clip = model.animations.find(
      (animation) =>
        animation.name ===
        (actionAnimation?.kind === 'clip' ? actionAnimation.clip : definition.animation?.clip),
    );
    if (!clip) return;
    const action = mixer.clipAction(clip);
    action.setLoop(state.actionId ? LoopOnce : LoopRepeat, state.actionId ? 1 : Infinity);
    action.clampWhenFinished = Boolean(state.actionId);
    if (state.animationActive) action.reset().play();
    else {
      action.stop();
      mixer.setTime(0);
    }
    invalidate();
    return () => {
      action.stop();
    };
  }, [
    state.animationActive,
    state.actionId,
    state.actionRevision,
    state.resetRevision,
    actionAnimation,
    definition.animation,
    model,
    mixer,
    invalidate,
  ]);

  useEffect(
    () => () => {
      mixer.stopAllAction();
      mixer.uncacheRoot(model.scene);
    },
    [mixer, model],
  );

  useEffect(() => {
    for (const part of prepared.parts) {
      for (const node of part.nodes) {
        node.visible = !(state.animationActive && prepared.animated.length > 0);
        node.traverse((child) => {
          if (!(child instanceof Mesh)) return;
          for (const material of Array.isArray(child.material)
            ? child.material
            : [child.material]) {
            if (material instanceof MeshStandardMaterial) {
              material.emissive.set('#ff3038');
              material.emissiveIntensity = part.id === state.selectedPart ? 0.32 : 0;
            }
          }
        });
      }
    }
    for (const node of prepared.animated) node.visible = state.animationActive;
    for (const name of definition.sectionNodes ?? []) {
      const node = model.scene.getObjectByName(name);
      if (node) {
        const alternateHidden =
          state.animationActive &&
          prepared.animated.length > 0 &&
          prepared.parts.some((part) => part.nodes.includes(node));
        node.visible = !state.section && !alternateHidden;
      }
    }
    invalidate();
  }, [
    prepared,
    state.animationActive,
    state.selectedPart,
    state.section,
    definition.sectionNodes,
    model,
    invalidate,
  ]);

  useFrame((_, delta) => {
    if (!active) return;
    if (firstFrame.current) {
      performance.mark('unfold:model-first-frame');
      firstFrame.current = false;
    }
    const target = state.playing ? 0 : state.separation;
    smoothed.current = reducedMotion
      ? target
      : smoothed.current + (target - smoothed.current) * (1 - Math.exp(-delta * 12));
    if (Math.abs(target - smoothed.current) < 0.0001) smoothed.current = target;
    // Keep the expanded artwork in frame without changing the visitor's camera angle.
    group.current?.scale.setScalar(
      prepared.scale / (1 + (prepared.spreadRatio - 1) * smoothed.current),
    );
    if (!state.animationActive)
      for (const part of prepared.parts) {
        part.nodes.forEach((node, index) => {
          node.position.copy(part.origins[index]);
          node.position.x += part.separation[0] * smoothed.current;
          node.position.y += part.separation[1] * smoothed.current;
          node.position.z += part.separation[2] * smoothed.current;
        });
      }
    if (state.actionId && actionAnimation && !actionCompleted.current) {
      // One-shot presentation actions only advance while the viewport is visible.
      if (!actionStarted.current) {
        actionStarted.current = true;
        onActionStart(state.actionId);
      }
      const elapsed = Math.min(delta, 0.05) * state.speed;
      actionElapsed.current += elapsed;
      let duration: number;
      if (actionAnimation.kind === 'clip') {
        const speed = actionAnimation.speed ?? 1;
        const clip = model.animations.find((item) => item.name === actionAnimation.clip);
        duration = clip ? clip.duration / speed : 0;
        mixer.update(elapsed * speed);
      } else {
        duration = actionAnimation.duration;
        const progress = Math.min(1, actionElapsed.current / duration);
        const kick = reducedMotion ? 0 : Math.sin(Math.PI * progress) * Math.exp(-progress * 3);
        group.current?.position.set(
          actionAnimation.offset[0] * kick,
          actionAnimation.offset[1] * kick,
          actionAnimation.offset[2] * kick,
        );
      }
      if (actionElapsed.current >= duration) {
        actionCompleted.current = true;
        group.current?.position.set(0, 0, 0);
        onActionEnd(state.actionRevision);
      }
    } else if (state.playing && !state.actionId) {
      mixer.update(Math.min(delta, 0.05) * state.speed * (definition.animation?.speed ?? 1));
    }
    if ((state.playing && !actionCompleted.current) || smoothed.current !== target) invalidate();
  }, -1);

  const select = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    const id: unknown = event.object.userData.partId;
    if (typeof id === 'string') onSelect(id);
  };

  return (
    <group ref={group} rotation={[...definition.presentation.rotation]} scale={prepared.scale}>
      <group position={prepared.center.clone().multiplyScalar(-1)}>
        <primitive object={model.scene} dispose={null} onClick={select} />
        {state.labels && !state.animationActive && (
          <SceneLabels
            parts={prepared.parts}
            active={active}
            selectedPart={state.selectedPart}
            onSelect={onSelect}
          />
        )}
      </group>
    </group>
  );
}

interface LabelPart {
  id: string;
  label: string;
  nodes: Object3D[];
  anchor: Vector3;
}

interface LabelEntry {
  part: LabelPart;
  point: Vector3;
  button: HTMLButtonElement | null;
  leader: SVGLineElement | null;
  dot: SVGCircleElement | null;
  width: number;
  height: number;
  x: number;
  y: number;
}

const overlayPosition = (
  _object: Object3D,
  _camera: unknown,
  size: { width: number; height: number },
) => [size.width / 2, size.height / 2];

function SceneLabels({
  parts,
  active,
  selectedPart,
  onSelect,
}: {
  parts: LabelPart[];
  active: boolean;
  selectedPart: string | null;
  onSelect: (id: string) => void;
}) {
  const size = useThree((store) => store.size);
  const invalidate = useThree((store) => store.invalidate);
  const entries = useMemo<LabelEntry[]>(
    () =>
      parts
        .filter((part) => part.nodes[0])
        .map((part) => ({
          part,
          point: new Vector3(),
          button: null,
          leader: null,
          dot: null,
          width: 0,
          height: 0,
          x: 0,
          y: 0,
        })),
    [parts],
  );

  useEffect(() => {
    for (const entry of entries) entry.width = 0;
    invalidate();
  }, [entries, size.width, size.height, invalidate]);

  useFrame(({ camera }) => {
    if (!active) return;
    // Model motion runs first. Only rendered frames project anchors and update the overlay;
    // dimensions are measured once after mount or resize, never on every animation frame.
    const visible: LabelEntry[] = [];
    for (const entry of entries) {
      if (!entry.button || !entry.leader || !entry.dot) continue;
      entry.part.nodes[0].updateWorldMatrix(true, false);
      entry.point
        .copy(entry.part.anchor)
        .applyMatrix4(entry.part.nodes[0].matrixWorld)
        .project(camera);
      const inView =
        Math.abs(entry.point.x) <= 1 &&
        Math.abs(entry.point.y) <= 1 &&
        Math.abs(entry.point.z) <= 1;
      entry.button.style.visibility = inView ? 'visible' : 'hidden';
      entry.leader.style.visibility = inView ? 'visible' : 'hidden';
      entry.dot.style.visibility = inView ? 'visible' : 'hidden';
      if (!inView) continue;
      if (!entry.width) {
        entry.width = entry.button.offsetWidth;
        entry.height = entry.button.offsetHeight;
      }
      entry.x = ((entry.point.x + 1) * size.width) / 2;
      entry.y = ((1 - entry.point.y) * size.height) / 2;
      visible.push(entry);
    }
    if (size.width < 520 && visible.length > 0) {
      // On narrow screens, leave the center of the artwork clear. Full-name callouts
      // occupy rows above and below it instead of covering it from both sides.
      visible.sort((a, b) => a.y - b.y);
      const split = Math.ceil(visible.length / 2);
      const padding = 12;
      const gap = 8;
      const columns = Math.min(3, Math.ceil(entries.length / 2));
      const cellWidth = (size.width - padding * 2 - gap * (columns - 1)) / columns;
      const rowHeight = Math.max(...visible.map((entry) => entry.height));
      const rows = [visible.slice(0, split), visible.slice(split)];
      const heights = rows.map((row) => Math.ceil(row.length / columns) * (rowHeight + gap) - gap);
      const bottomLimit = size.height - 48;
      const top = Math.max(
        padding,
        Math.min(
          Math.min(...visible.map((entry) => entry.y)) - heights[0] - 28,
          bottomLimit - heights[0] - heights[1] - 24,
        ),
      );
      const bottom = Math.max(
        top + heights[0] + 24,
        Math.min(Math.max(...visible.map((entry) => entry.y)) + 28, bottomLimit - heights[1]),
      );
      rows.forEach((row, side) => {
        row.sort((a, b) => a.x - b.x);
        row.forEach((entry, index) => {
          const x = padding + (index % columns) * (cellWidth + gap) + (cellWidth - entry.width) / 2;
          const y = (side === 0 ? top : bottom) + Math.floor(index / columns) * (rowHeight + gap);
          entry.button!.style.transform = `translate3d(${x}px, ${y}px, 0)`;
          entry.leader!.setAttribute('x1', String(entry.x));
          entry.leader!.setAttribute('y1', String(entry.y));
          entry.leader!.setAttribute('x2', String(x + entry.width / 2));
          entry.leader!.setAttribute('y2', String(side === 0 ? y + entry.height : y));
          entry.dot!.setAttribute('cx', String(entry.x));
          entry.dot!.setAttribute('cy', String(entry.y));
        });
      });
      return;
    }
    visible.sort((a, b) => a.x - b.x);
    const split = Math.ceil(visible.length / 2);
    for (const [side, column] of [visible.slice(0, split), visible.slice(split)].entries()) {
      column.sort((a, b) => a.y - b.y);
      const padding = 12;
      const gap = 10;
      const totalHeight =
        column.reduce((sum, entry) => sum + entry.height, 0) + Math.max(0, column.length - 1) * gap;
      const bottomLimit = Math.max(padding + totalHeight, size.height - 48);
      const topLimit = Math.max(
        padding,
        Math.min(...column.map((entry) => entry.y - entry.height / 2), bottomLimit - totalHeight),
      );
      const positions: number[] = [];
      let nextY = topLimit;
      for (const entry of column) {
        const y = Math.max(nextY, Math.min(entry.y - entry.height / 2, bottomLimit - entry.height));
        positions.push(y);
        nextY = y + entry.height + gap;
      }
      // A backwards sweep keeps the stack inside the viewport when several anchors coincide.
      let ceiling = bottomLimit;
      for (let index = column.length - 1; index >= 0; index--) {
        const entry = column[index];
        positions[index] = Math.min(positions[index], ceiling - entry.height);
        ceiling = positions[index] - gap;
      }
      column.forEach((entry, index) => {
        const x = side === 0 ? padding : size.width - padding - entry.width;
        const y = positions[index];
        entry.button!.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        entry.leader!.setAttribute('x1', String(entry.x));
        entry.leader!.setAttribute('y1', String(entry.y));
        entry.leader!.setAttribute('x2', String(side === 0 ? x + entry.width : x));
        entry.leader!.setAttribute('y2', String(y + entry.height / 2));
        entry.dot!.setAttribute('cx', String(entry.x));
        entry.dot!.setAttribute('cy', String(entry.y));
      });
    }
  });

  return (
    <Html
      fullscreen
      calculatePosition={overlayPosition}
      className="scene-label-overlay"
      zIndexRange={[20, 0]}
    >
      <svg className="scene-label-leaders" aria-hidden="true">
        {entries.map((entry) => (
          <g
            key={entry.part.id}
            className={selectedPart === entry.part.id ? 'selected' : undefined}
          >
            <line
              ref={(element) => {
                entry.leader = element;
              }}
            />
            <circle
              r="3"
              ref={(element) => {
                entry.dot = element;
              }}
            />
          </g>
        ))}
      </svg>
      {entries.map((entry) => (
        <button
          key={entry.part.id}
          ref={(element) => {
            entry.button = element;
            entry.width = 0;
            if (element) invalidate();
          }}
          className={`scene-label ${selectedPart === entry.part.id ? 'selected' : ''}`}
          style={{
            maxWidth:
              size.width < 520
                ? (size.width - 24 - (Math.min(3, Math.ceil(entries.length / 2)) - 1) * 8) /
                  Math.min(3, Math.ceil(entries.length / 2))
                : Math.min(180, (size.width - 40) / 2),
          }}
          aria-label={`Select ${entry.part.label}`}
          aria-pressed={selectedPart === entry.part.id}
          onClick={() => onSelect(entry.part.id)}
        >
          {entry.part.label}
        </button>
      ))}
    </Html>
  );
}
