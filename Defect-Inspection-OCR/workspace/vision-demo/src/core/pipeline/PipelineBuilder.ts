import { Pipeline, type Stage, type StageContext } from './Pipeline';
import { inferenceStage } from './stages/InferenceStage';
import type { ModelSpec } from '../registry/types';

export class PipelineBuilder<TIn = unknown, TCurrent = TIn> {
  private readonly id: string;
  private stages: Stage<unknown, unknown>[] = [];
  private evaluationDataset?: string;
  private modelIds: string[] = [];

  constructor(id: string) {
    this.id = id;
  }

  addStage<TNext>(_name: string, stage: Stage<TCurrent, TNext>): PipelineBuilder<TIn, TNext>;
  addStage<TNext>(
    _name: string,
    model: ModelSpec<TCurrent, TNext>,
  ): PipelineBuilder<TIn, TNext>;
  addStage<TNext>(
    _name: string,
    stageOrModel: Stage<TCurrent, TNext> | ModelSpec<TCurrent, TNext>,
  ): PipelineBuilder<TIn, TNext> {
    if (this.isModelSpec(stageOrModel)) {
      this.modelIds.push(stageOrModel.id);
      this.stages.push(
        inferenceStage(stageOrModel, _name) as unknown as Stage<unknown, unknown>,
      );
    } else {
      this.stages.push({ ...stageOrModel, name: _name } as Stage<unknown, unknown>);
    }
    return this as unknown as PipelineBuilder<TIn, TNext>;
  }

  parallel<TNext>(
    name: string,
    branches: Array<Stage<TCurrent, unknown> | ModelSpec<TCurrent, unknown>>,
    merge?: (outputs: unknown[], ctx: StageContext) => TNext | Promise<TNext>,
  ): PipelineBuilder<TIn, TNext> {
    const resolved: Stage<TCurrent, unknown>[] = branches.map((b): Stage<TCurrent, unknown> => {
      if (this.isModelSpec(b)) {
        return inferenceStage(b as ModelSpec<TCurrent, unknown>) as Stage<TCurrent, unknown>;
      }
      return b as Stage<TCurrent, unknown>;
    });
    const stage: Stage<TCurrent, TNext> = {
      name,
      async run(input, ctx) {
        const outputs = await Promise.all(resolved.map((s) => s.run(input, ctx)));
        if (merge) return await merge(outputs, ctx);
        return outputs as unknown as TNext;
      },
    };
    branches.forEach((b) => {
      if (this.isModelSpec(b)) this.modelIds.push(b.id);
    });
    this.stages.push(stage as Stage<unknown, unknown>);
    return this as unknown as PipelineBuilder<TIn, TNext>;
  }

  withEvaluation(datasetId: string): this {
    this.evaluationDataset = datasetId;
    return this;
  }

  build(): Pipeline<TIn, TCurrent> {
    return new Pipeline<TIn, TCurrent>(
      { id: this.id, evaluationDataset: this.evaluationDataset, modelIds: this.modelIds },
      this.stages,
    );
  }

  private isModelSpec(x: unknown): x is ModelSpec<unknown, unknown> {
    return Boolean(
      x &&
        typeof x === 'object' &&
        'id' in x &&
        'infer' in x &&
        'inputSchema' in x &&
        'outputSchema' in x,
    );
  }
}
