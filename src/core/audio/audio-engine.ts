/** One lazy AudioContext. No audio is fetched or decoded on application startup. */
export class AudioEngine {
  private context: AudioContext | null = null;
  private gain: GainNode | null = null;
  private enabled = false;
  private revision = 0;
  private readonly voices = new Set<AudioScheduledSourceNode>();
  private detentBuffer: AudioBuffer | null = null;
  private lastDetentTime = -Infinity;
  private readonly firearmBuffers = new Map<string, AudioBuffer>();

  async setEnabled(enabled: boolean): Promise<void> {
    const revision = ++this.revision;
    if (!enabled) {
      this.enabled = false;
      this.stop();
      if (this.context?.state === 'running') await this.context.suspend();
      return;
    }
    this.context ??= new AudioContext();
    if (!this.gain) {
      this.gain = this.context.createGain();
      this.gain.gain.value = 0.12;
      this.gain.connect(this.context.destination);
    }
    const context = this.context;
    await context.resume();
    if (revision !== this.revision || context !== this.context) {
      if (!this.enabled && context.state === 'running') await context.suspend();
      return;
    }
    this.enabled = true;
  }

  /** Play a caller-owned decoded clip. Sound-pack loading stays in the asset layer. */
  playBuffer(buffer: AudioBuffer): boolean {
    if (!this.enabled || !this.context || !this.gain || this.voices.size >= 4) return false;
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.gain);
    this.voices.add(source);
    source.onended = () => {
      this.voices.delete(source);
      source.disconnect();
    };
    source.start();
    return true;
  }

  /** Original synthesized firearm effects; never used for interface clicks. */
  firearm(kind: 'shot' | 'cycle'): boolean {
    if (!this.enabled || !this.context || this.context.state !== 'running') return false;
    let buffer = this.firearmBuffers.get(kind);
    if (!buffer) {
      const context = this.context;
      const duration = kind === 'shot' ? 0.55 : 0.72;
      buffer = context.createBuffer(
        1,
        Math.ceil(context.sampleRate * duration),
        context.sampleRate,
      );
      const data = buffer.getChannelData(0);
      let seed = 0x53484f54;
      let filtered = 0;
      for (let i = 0; i < data.length; i++) {
        const time = i / context.sampleRate;
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        const noise = (seed / 0xffffffff) * 2 - 1;
        filtered = filtered * 0.84 + noise * 0.16;
        const fade = Math.min(1, time / 0.0004) * Math.min(1, (duration - time) / 0.02);
        if (kind === 'shot') {
          const crack = noise * Math.exp(-time / 0.011);
          const body = Math.sin(2 * Math.PI * (85 - time * 30) * time) * Math.exp(-time / 0.06);
          const tail = filtered * Math.exp(-time / 0.12);
          data[i] = (crack * 0.68 + body * 0.38 + tail * 0.45) * fade;
        } else {
          const clack = (start: number) => {
            const t = time - start;
            return t < 0
              ? 0
              : (noise * 0.45 + Math.sin(t * Math.PI * 3400) * 0.24) * Math.exp(-t / 0.015);
          };
          const slide =
            time > 0.08 && time < 0.48
              ? filtered * 0.26 * Math.sin(((time - 0.08) / 0.4) * Math.PI)
              : 0;
          data[i] = (clack(0.015) + clack(0.49) + slide) * fade;
        }
      }
      this.firearmBuffers.set(kind, buffer);
    }
    return this.playBuffer(buffer);
  }

  /** A dry, original mechanical click. There is never a queue of skipped detents. */
  detent(value: number): boolean {
    if (
      !this.enabled ||
      !this.context ||
      !this.gain ||
      this.context.state !== 'running' ||
      this.voices.size >= 4
    ) {
      return false;
    }
    const now = this.context.currentTime;
    if (now - this.lastDetentTime < 0.04) return false;
    this.lastDetentTime = now;
    this.detentBuffer ??= this.createDetentBuffer(this.context);
    const source = this.context.createBufferSource();
    const envelope = this.context.createGain();
    const major = Math.round(value) % 25 === 0;
    source.buffer = this.detentBuffer;
    source.playbackRate.value = major ? 0.92 : 1.04;
    envelope.gain.value = major ? 1.1 : 0.85;
    source.connect(envelope).connect(this.gain);
    this.voices.add(source);
    source.onended = () => {
      this.voices.delete(source);
      source.disconnect();
      envelope.disconnect();
    };
    source.start(now);
    return true;
  }

  private createDetentBuffer(context: AudioContext): AudioBuffer {
    const duration = 0.036;
    const buffer = context.createBuffer(
      1,
      Math.ceil(context.sampleRate * duration),
      context.sampleRate,
    );
    const samples = buffer.getChannelData(0);
    let seed = 0x75bcf21;
    for (let index = 0; index < samples.length; index += 1) {
      const time = index / context.sampleRate;
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const noise = (seed / 0xffffffff) * 2 - 1;
      const crack = noise * 0.68 * Math.exp(-time / 0.0018);
      const body = Math.sin(2 * Math.PI * 370 * time) * 0.34 * Math.exp(-time / 0.008);
      const metal = Math.sin(2 * Math.PI * 2150 * time) * 0.24 * Math.exp(-time / 0.0035);
      const fade = Math.min(1, time / 0.00025) * Math.min(1, (duration - time) / 0.004);
      samples[index] = (crack + body + metal) * fade;
    }
    return buffer;
  }

  stop(): void {
    for (const voice of this.voices) {
      try {
        voice.stop();
      } catch {
        /* A scheduled voice may already have ended. */
      }
    }
    this.voices.clear();
    this.lastDetentTime = -Infinity;
  }

  async dispose(): Promise<void> {
    this.revision += 1;
    this.enabled = false;
    this.stop();
    const context = this.context;
    this.context = null;
    this.gain = null;
    this.detentBuffer = null;
    this.firearmBuffers.clear();
    await context?.close();
  }
}
