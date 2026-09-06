const DETENT_STEP = 5;
const MIN_INTERVAL_MS = 40;

/** A tactile step emits once; skipped steps are never queued for later playback. */
export class SeparationDetents {
  private band: number;
  private lastTick = -Infinity;

  constructor(value: number) {
    this.band = this.toBand(value);
  }

  sync(value: number): void {
    this.band = this.toBand(value);
  }

  advance(value: number, now: number): boolean {
    const band = this.toBand(value);
    if (band === this.band) return false;
    this.band = band;
    if (now - this.lastTick < MIN_INTERVAL_MS) return false;
    this.lastTick = now;
    return true;
  }

  private toBand(value: number): number {
    return Math.floor(Math.max(0, Math.min(100, value)) / DETENT_STEP);
  }
}
