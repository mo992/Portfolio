export interface StageTiming {
  stage: string;
  startMs: number;
  endMs: number;
  durationMs: number;
  metadata?: Record<string, unknown>;
  error?: string;
}

export class Tracer {
  private timings: StageTiming[] = [];
  private active = new Map<string, { startMs: number; metadata?: Record<string, unknown> }>();

  start(stage: string, metadata?: Record<string, unknown>): void {
    this.active.set(stage, { startMs: performance.now(), metadata });
  }

  end(stage: string, extra?: Record<string, unknown>): StageTiming {
    const open = this.active.get(stage);
    if (!open) {
      throw new Error(`Tracer.end: no active stage named "${stage}"`);
    }
    const endMs = performance.now();
    const timing: StageTiming = {
      stage,
      startMs: open.startMs,
      endMs,
      durationMs: endMs - open.startMs,
      metadata: { ...open.metadata, ...extra },
    };
    this.timings.push(timing);
    this.active.delete(stage);
    return timing;
  }

  fail(stage: string, error: unknown): StageTiming {
    const open = this.active.get(stage);
    if (!open) {
      throw new Error(`Tracer.fail: no active stage named "${stage}"`);
    }
    const endMs = performance.now();
    const timing: StageTiming = {
      stage,
      startMs: open.startMs,
      endMs,
      durationMs: endMs - open.startMs,
      error: error instanceof Error ? error.message : String(error),
      metadata: open.metadata,
    };
    this.timings.push(timing);
    this.active.delete(stage);
    return timing;
  }

  async measure<T>(
    stage: string,
    fn: () => Promise<T>,
    metadata?: Record<string, unknown>,
  ): Promise<T> {
    this.start(stage, metadata);
    try {
      const result = await fn();
      this.end(stage);
      return result;
    } catch (err) {
      this.fail(stage, err);
      throw err;
    }
  }

  getTimings(): StageTiming[] {
    return [...this.timings];
  }

  totalMs(): number {
    return this.timings.reduce((sum, t) => sum + t.durationMs, 0);
  }

  reset(): void {
    this.timings = [];
    this.active.clear();
  }
}
