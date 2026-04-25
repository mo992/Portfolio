import type { AnyModelSpec, Capability, ModelSpec } from './types';

class ModelRegistryImpl {
  private models = new Map<string, AnyModelSpec>();

  register<TIn, TOut>(spec: ModelSpec<TIn, TOut>): void {
    if (this.models.has(spec.id)) {
      throw new Error(`ModelRegistry: duplicate model id "${spec.id}"`);
    }
    this.models.set(spec.id, spec as AnyModelSpec);
  }

  get<TIn = unknown, TOut = unknown>(id: string): ModelSpec<TIn, TOut> {
    const spec = this.models.get(id);
    if (!spec) {
      throw new Error(`ModelRegistry: unknown model "${id}"`);
    }
    return spec as ModelSpec<TIn, TOut>;
  }

  has(id: string): boolean {
    return this.models.has(id);
  }

  list(): AnyModelSpec[] {
    return [...this.models.values()];
  }

  findByCapability(capability: Capability): AnyModelSpec[] {
    return this.list().filter((m) => m.capabilities.includes(capability));
  }

  unregister(id: string): boolean {
    return this.models.delete(id);
  }

  clear(): void {
    this.models.clear();
  }
}

export type ModelRegistry = ModelRegistryImpl;
export const models = new ModelRegistryImpl();
export function createModelRegistry(): ModelRegistry {
  return new ModelRegistryImpl();
}
