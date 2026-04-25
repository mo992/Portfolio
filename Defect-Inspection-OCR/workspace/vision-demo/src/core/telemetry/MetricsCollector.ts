export type MetricValue = number | string | boolean | null;

export interface MetricsSnapshot {
  counters: Record<string, number>;
  gauges: Record<string, number>;
  tags: Record<string, MetricValue>;
}

export class MetricsCollector {
  private counters = new Map<string, number>();
  private gauges = new Map<string, number>();
  private tags = new Map<string, MetricValue>();

  increment(name: string, delta = 1): void {
    this.counters.set(name, (this.counters.get(name) ?? 0) + delta);
  }

  gauge(name: string, value: number): void {
    this.gauges.set(name, value);
  }

  tag(name: string, value: MetricValue): void {
    this.tags.set(name, value);
  }

  snapshot(): MetricsSnapshot {
    return {
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      tags: Object.fromEntries(this.tags),
    };
  }

  reset(): void {
    this.counters.clear();
    this.gauges.clear();
    this.tags.clear();
  }
}
