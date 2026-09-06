/** Adjust only after sustained evidence. Idle gaps never count as slow rendering. */
export class QualityGovernor {
  private samples: number[] = [];
  private lastChange = -Infinity;

  sample(frameMs: number, nowMs: number, currentDpr: number): number | null {
    if (frameMs <= 0 || frameMs > 250) {
      this.samples = [];
      return null;
    }
    this.samples.push(frameMs);
    if (this.samples.length < 90) return null;
    const sorted = this.samples.sort((a, b) => a - b);
    const p80 = sorted[Math.floor(sorted.length * 0.8)];
    this.samples = [];
    if (nowMs - this.lastChange < 5000) return null;
    const next =
      p80 > 29
        ? Math.max(0.75, currentDpr - 0.25)
        : p80 < 18
          ? Math.min(1.5, currentDpr + 0.25)
          : currentDpr;
    if (Math.abs(next - currentDpr) < 0.01) return null;
    this.lastChange = nowMs;
    return next;
  }
}
