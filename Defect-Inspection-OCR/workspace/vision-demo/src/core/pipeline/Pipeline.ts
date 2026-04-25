import { Tracer, type StageTiming } from '../telemetry/Tracer';
import { MetricsCollector, type MetricsSnapshot } from '../telemetry/MetricsCollector';
import type { InferenceContext } from '../registry/types';

export interface StageContext extends InferenceContext {
  pipelineId: string;
  stageIndex: number;
}

export interface Stage<TIn, TOut> {
  name: string;
  run(input: TIn, ctx: StageContext): Promise<TOut>;
}

export interface ParallelBranch<TIn, TOut> extends Stage<TIn, TOut> {
  branches: Stage<TIn, unknown>[];
}

export interface PipelineRunResult<TOut> {
  output: TOut;
  trace: StageTiming[];
  metrics: MetricsSnapshot;
  totalMs: number;
}

export interface PipelineOptions {
  id: string;
  evaluationDataset?: string;
  modelIds?: string[];
}

export class Pipeline<TIn, TOut> {
  readonly id: string;
  readonly evaluationDataset?: string;
  readonly modelIds: string[];
  private readonly stages: Stage<unknown, unknown>[];

  constructor(options: PipelineOptions, stages: Stage<unknown, unknown>[]) {
    this.id = options.id;
    this.evaluationDataset = options.evaluationDataset;
    this.modelIds = options.modelIds ?? [];
    this.stages = stages;
  }

  get stageNames(): string[] {
    return this.stages.map((s) => s.name);
  }

  async run(
    input: TIn,
    opts: {
      abortSignal?: AbortSignal;
      onStageStart?: (name: string, index: number) => void;
    } = {},
  ): Promise<PipelineRunResult<TOut>> {
    const tracer = new Tracer();
    const metrics = new MetricsCollector();
    tracer.start(`pipeline:${this.id}`);

    let cursor: unknown = input;
    try {
      for (let i = 0; i < this.stages.length; i++) {
        const stage = this.stages[i];
        const ctx: StageContext = {
          tracer,
          metrics,
          abortSignal: opts.abortSignal,
          pipelineId: this.id,
          stageIndex: i,
        };
        opts.onStageStart?.(stage.name, i);
        cursor = await tracer.measure(stage.name, () => stage.run(cursor, ctx), {
          stageIndex: i,
        });
      }
      tracer.end(`pipeline:${this.id}`);
      return {
        output: cursor as TOut,
        trace: tracer.getTimings(),
        metrics: metrics.snapshot(),
        totalMs: tracer.totalMs(),
      };
    } catch (err) {
      try {
        tracer.fail(`pipeline:${this.id}`, err);
      } catch {
        /* already ended */
      }
      throw err;
    }
  }
}
