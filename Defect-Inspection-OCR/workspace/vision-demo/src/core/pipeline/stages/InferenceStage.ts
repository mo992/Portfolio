import type { ModelSpec } from '../../registry/types';
import type { Stage } from '../Pipeline';

export function inferenceStage<TIn, TOut>(
  model: ModelSpec<TIn, TOut>,
  name?: string,
): Stage<TIn, TOut> {
  return {
    name: name ?? `infer:${model.id}`,
    async run(input, ctx) {
      const validated = model.inputSchema.safeParse(input);
      if (!validated.success) {
        throw new Error(
          `InferenceStage[${model.id}]: input schema validation failed — ${validated.error.message}`,
        );
      }
      const pre = model.preprocess ? await model.preprocess(validated.data) : validated.data;
      const raw = await model.infer(pre as TIn, ctx);
      const post = model.postprocess ? await model.postprocess(raw) : raw;
      const check = model.outputSchema.safeParse(post);
      if (!check.success) {
        throw new Error(
          `InferenceStage[${model.id}]: output schema validation failed — ${check.error.message}`,
        );
      }
      ctx.metrics.increment(`model.${model.id}.calls`);
      return check.data as TOut;
    },
  };
}
