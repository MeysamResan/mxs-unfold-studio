import { afterEach, expect, it, vi } from 'vitest';
import { AudioEngine } from './audio-engine';

afterEach(() => vi.unstubAllGlobals());
it('an old asynchronous resume cannot override a newer mute', async () => {
  let resolveResume!: () => void;
  const suspend = vi.fn(async () => undefined);
  const createOscillator = vi.fn();
  class FakeAudioContext {
    state = 'suspended';
    destination = {};
    createGain() {
      return { gain: { value: 0 }, connect: vi.fn() };
    }
    createOscillator = createOscillator;
    resume() {
      return new Promise<void>((resolve) => {
        resolveResume = () => {
          this.state = 'running';
          resolve();
        };
      });
    }
    suspend = suspend;
    close = vi.fn(async () => undefined);
  }
  vi.stubGlobal('AudioContext', FakeAudioContext);
  const audio = new AudioEngine();
  const enabling = audio.setEnabled(true);
  await audio.setEnabled(false);
  resolveResume();
  await enabling;
  expect(audio.detent(5)).toBe(false);
  expect(audio.firearm('shot')).toBe(false);
  expect(createOscillator).not.toHaveBeenCalled();
  expect(suspend).toHaveBeenCalled();
  await audio.dispose();
});

function recordingContext() {
  const sources: ReturnType<typeof makeSource>[] = [];
  const gains: ReturnType<typeof makeGain>[] = [];
  const buffers: Float32Array[] = [];
  const instances: FakeAudioContext[] = [];
  function makeSource() {
    return {
      buffer: null,
      playbackRate: { value: 1 },
      connect: vi.fn((node: unknown) => node),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null as (() => void) | null,
    };
  }
  function makeGain() {
    return {
      gain: { value: 0 },
      connect: vi.fn((node: unknown) => node),
      disconnect: vi.fn(),
    };
  }
  class FakeAudioContext {
    state = 'suspended';
    currentTime = 0;
    sampleRate = 48000;
    destination = {};
    constructor() {
      instances.push(this);
    }
    createGain() {
      const gain = makeGain();
      gains.push(gain);
      return gain;
    }
    createBufferSource() {
      const source = makeSource();
      sources.push(source);
      return source;
    }
    createBuffer(_channels: number, length: number, sampleRate: number) {
      const data = new Float32Array(length);
      buffers.push(data);
      return { getChannelData: () => data, length, sampleRate };
    }
    async resume() {
      this.state = 'running';
    }
    async suspend() {
      this.state = 'suspended';
    }
    async close() {
      this.state = 'closed';
    }
  }
  vi.stubGlobal('AudioContext', FakeAudioContext);
  return { sources, gains, buffers, instances };
}

it('creates one short audible detent buffer after unlocking, with no delayed catch-up sounds', async () => {
  const recording = recordingContext();
  const audio = new AudioEngine();
  expect(audio.detent(5)).toBe(false);
  expect(recording.instances).toHaveLength(0);
  await audio.setEnabled(true);
  const context = recording.instances[0];
  expect(recording.buffers).toHaveLength(0);

  expect(audio.detent(5)).toBe(true);
  context.currentTime = 0.02;
  expect(audio.detent(10)).toBe(false);
  context.currentTime = 0.039;
  expect(audio.detent(80)).toBe(false);
  expect(recording.sources).toHaveLength(1);
  context.currentTime = 0.08;
  expect(audio.detent(25)).toBe(true);
  expect(recording.sources).toHaveLength(2);
  expect(recording.buffers).toHaveLength(1);
  expect(recording.sources[0].buffer).toBe(recording.sources[1].buffer);
  expect(recording.sources[0].playbackRate.value).toBe(1.04);
  expect(recording.sources[1].playbackRate.value).toBe(0.92);

  const samples = recording.buffers[0];
  expect(samples).toHaveLength(1728);
  expect(samples.every(Number.isFinite)).toBe(true);
  const rms = Math.sqrt(samples.reduce((sum, sample) => sum + sample * sample, 0) / samples.length);
  expect(rms).toBeGreaterThan(0.04);
  expect(Math.max(...samples.map(Math.abs))).toBeLessThan(1);
  expect(Math.abs(samples.at(-1)!)).toBeLessThan(0.001);

  await audio.setEnabled(false);
  expect(recording.sources.every((source) => source.stop.mock.calls.length === 1)).toBe(true);
  context.currentTime = 0.2;
  expect(audio.detent(50)).toBe(false);
  await audio.dispose();
  expect(context.state).toBe('closed');
});

it('shares the four-voice limit and releases both detent nodes when playback ends', async () => {
  const recording = recordingContext();
  const audio = new AudioEngine();
  await audio.setEnabled(true);
  const context = recording.instances[0];
  for (let index = 0; index < 4; index += 1) {
    context.currentTime = index * 0.05;
    expect(audio.detent(index * 5)).toBe(true);
  }
  context.currentTime = 0.25;
  expect(audio.detent(25)).toBe(false);
  recording.sources[0].onended?.();
  expect(recording.sources[0].disconnect).toHaveBeenCalledOnce();
  expect(recording.gains[1].disconnect).toHaveBeenCalledOnce();
  expect(audio.detent(30)).toBe(true);
  expect(recording.buffers).toHaveLength(1);
  await audio.dispose();
  expect(audio.detent(50)).toBe(false);
});

it('reuses bounded firearm buffers and keeps effects silent while muted', async () => {
  const recording = recordingContext();
  const audio = new AudioEngine();
  expect(audio.firearm('shot')).toBe(false);
  expect(recording.instances).toHaveLength(0);
  await audio.setEnabled(true);
  expect(audio.firearm('shot')).toBe(true);
  recording.sources[0].onended?.();
  expect(audio.firearm('shot')).toBe(true);
  expect(recording.buffers).toHaveLength(1);
  expect(recording.sources[0].buffer).toBe(recording.sources[1].buffer);
  expect(audio.firearm('cycle')).toBe(true);
  expect(recording.buffers).toHaveLength(2);
  for (const samples of recording.buffers) {
    expect(samples.every(Number.isFinite)).toBe(true);
    expect(samples.some((value) => Math.abs(value) > 0.1)).toBe(true);
    expect(Math.abs(samples.at(-1)!)).toBeLessThan(0.001);
  }
  await audio.setEnabled(false);
  expect(audio.firearm('cycle')).toBe(false);
  await audio.dispose();
});
