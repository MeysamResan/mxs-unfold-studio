import { describe, expect, it } from 'vitest';
import { lightning } from '../../content/lightning';
import { initialViewerState as initial, reduceViewer } from './state';

describe('viewer transitions', () => {
  it('assembles before playback, freezes on pause, and leaves animation for separation', () => {
    const exploded = reduceViewer(initial, { type: 'separate', value: 0.8 }, lightning);
    const playing = reduceViewer(exploded, { type: 'play', value: true }, lightning);
    expect(playing).toMatchObject({ separation: 0, playing: true, animationActive: true });
    const paused = reduceViewer(playing, { type: 'play', value: false }, lightning);
    expect(paused).toMatchObject({ playing: false, animationActive: true });
    expect(reduceViewer(paused, { type: 'separate', value: 0.2 }, lightning)).toMatchObject({
      separation: 0.2,
      playing: false,
      animationActive: false,
    });
  });
  it('resets inspection while retaining the chosen device quality', () => {
    const reset = reduceViewer(
      {
        ...initial,
        quality: 'balanced',
        selectedPart: 'stock',
        playing: true,
        labels: true,
        separation: 0.7,
      },
      { type: 'reset' },
      lightning,
    );
    expect(reset).toEqual({ ...initial, quality: 'balanced', resetRevision: 1, actionRevision: 1 });
  });
  it('gates behavior by content capabilities', () => {
    const simple = { ...lightning, capabilities: [] };
    expect(reduceViewer(initial, { type: 'play', value: true }, simple)).toBe(initial);
    expect(reduceViewer(initial, { type: 'section' }, simple)).toBe(initial);
    expect(reduceViewer(initial, { type: 'separate', value: 1 }, simple)).toBe(initial);
  });
  it('rejects unknown parts and nonfinite values; clamps finite ranges', () => {
    expect(reduceViewer(initial, { type: 'select', part: 'missing' }, lightning)).toBe(initial);
    expect(reduceViewer(initial, { type: 'separate', value: NaN }, lightning)).toBe(initial);
    expect(reduceViewer(initial, { type: 'speed', value: Infinity }, lightning)).toBe(initial);
    expect(reduceViewer(initial, { type: 'separate', value: 100 }, lightning).separation).toBe(1);
    expect(reduceViewer(initial, { type: 'speed', value: -3 }, lightning).speed).toBe(0.25);
  });
});

it('runs available actions once, rejects unsupported actions and ignores stale completion', () => {
  const separated = reduceViewer(initial, { type: 'separate', value: 0.7 }, lightning);
  expect(reduceViewer(separated, { type: 'perform', id: 'reload' }, lightning)).toBe(separated);
  expect(reduceViewer(separated, { type: 'perform', id: 'missing' }, lightning)).toBe(separated);
  const shot = reduceViewer(initial, { type: 'perform', id: 'shoot' }, lightning);
  expect(shot).toMatchObject({ actionId: 'shoot', playing: true, separation: 0, resetRevision: 0 });
  expect(reduceViewer(shot, { type: 'perform', id: 'chamber' }, lightning)).toBe(shot);
  const interrupted = reduceViewer(shot, { type: 'separate', value: 0.5 }, lightning);
  const assembled = reduceViewer(interrupted, { type: 'separate', value: 0 }, lightning);
  const chamber = reduceViewer(assembled, { type: 'perform', id: 'chamber' }, lightning);
  expect(chamber).toMatchObject({ actionId: 'chamber', animationActive: true });
  expect(
    reduceViewer(chamber, { type: 'action-finished', revision: shot.actionRevision }, lightning),
  ).toBe(chamber);
  const ended = reduceViewer(
    chamber,
    { type: 'action-finished', revision: chamber.actionRevision },
    lightning,
  );
  expect(ended).toMatchObject({
    actionId: null,
    playing: false,
    animationActive: false,
    resetRevision: 0,
  });
});

it.each([0.001, 0.5, 1])(
  'leaves the entire viewer unchanged when an action is requested at separation %s',
  (separation) => {
    const inspected = {
      ...initial,
      separation,
      selectedPart: 'stock',
      labels: true,
      resetRevision: 3,
    };
    for (const id of ['shoot', 'chamber']) {
      expect(reduceViewer(inspected, { type: 'perform', id }, lightning)).toBe(inspected);
    }
  },
);
