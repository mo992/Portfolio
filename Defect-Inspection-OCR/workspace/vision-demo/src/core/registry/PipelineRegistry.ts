import type { Pipeline } from '../pipeline/Pipeline';

class PipelineRegistryImpl {
  private pipelines = new Map<string, Pipeline<unknown, unknown>>();

  register<TIn, TOut>(pipeline: Pipeline<TIn, TOut>): void {
    if (this.pipelines.has(pipeline.id)) {
      throw new Error(`PipelineRegistry: duplicate pipeline id "${pipeline.id}"`);
    }
    this.pipelines.set(pipeline.id, pipeline as Pipeline<unknown, unknown>);
  }

  get<TIn = unknown, TOut = unknown>(id: string): Pipeline<TIn, TOut> {
    const p = this.pipelines.get(id);
    if (!p) throw new Error(`PipelineRegistry: unknown pipeline "${id}"`);
    return p as Pipeline<TIn, TOut>;
  }

  has(id: string): boolean {
    return this.pipelines.has(id);
  }

  list(): Pipeline<unknown, unknown>[] {
    return [...this.pipelines.values()];
  }

  clear(): void {
    this.pipelines.clear();
  }
}

export type PipelineRegistry = PipelineRegistryImpl;
export const pipelines = new PipelineRegistryImpl();
export function createPipelineRegistry(): PipelineRegistry {
  return new PipelineRegistryImpl();
}
