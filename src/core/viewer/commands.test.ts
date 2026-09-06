import { expect, it } from 'vitest';
import { lightning } from '../../content/lightning';
import { initialViewerState, reduceViewer } from './state';
import { viewCommands } from './commands';

it('validates commands atomically and uses the same reducer as the interface', () => {
  const actions = viewCommands(
    { partId: 'stock', separation: 0.6, labels: true },
    initialViewerState,
    lightning,
  );
  const state = actions.reduce(
    (current, action) => reduceViewer(current, action, lightning),
    initialViewerState,
  );
  expect(state).toMatchObject({ selectedPart: 'stock', separation: 0.6, labels: true });
  expect(() =>
    viewCommands({ partId: 'stock', separation: 4 }, initialViewerState, lightning),
  ).toThrow();
  expect(() =>
    viewCommands({ separation: 0.6, playing: true }, initialViewerState, lightning),
  ).toThrow();
  expect(() => viewCommands({ unexpected: true }, initialViewerState, lightning)).toThrow();
});
