import { expect, it } from 'vitest';
import { SeparationDetents } from './separation-detents';

it('emits at 5 percent boundaries in both directions, while the value remains continuous', () => {
  const detents = new SeparationDetents(0);
  expect(detents.advance(1, 0)).toBe(false);
  expect(detents.advance(4, 10)).toBe(false);
  expect(detents.advance(5, 20)).toBe(true);
  expect(detents.advance(9, 80)).toBe(false);
  expect(detents.advance(4, 90)).toBe(true);
});

it('drops fast crossed steps without a catch-up burst', () => {
  const detents = new SeparationDetents(0);
  expect(detents.advance(5, 0)).toBe(true);
  expect(detents.advance(75, 10)).toBe(false);
  expect(detents.advance(99, 30)).toBe(false);
  expect(detents.advance(99, 100)).toBe(false);
  expect(detents.advance(100, 110)).toBe(true);
});

it('synchronizes a programmatic view change without emitting a sound or bypassing the rate cap', () => {
  const detents = new SeparationDetents(0);
  expect(detents.advance(5, 0)).toBe(true);
  detents.sync(75);
  expect(detents.advance(76, 100)).toBe(false);
  expect(detents.advance(80, 110)).toBe(true);
  detents.sync(0);
  expect(detents.advance(5, 120)).toBe(false);
});
