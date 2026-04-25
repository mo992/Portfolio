import type { Stage, StageContext } from '../Pipeline';

export function postprocessStage<TIn, TOut>(
  fn: (input: TIn, ctx: StageContext) => TOut | Promise<TOut>,
  name = 'postprocess',
): Stage<TIn, TOut> {
  return {
    name,
    async run(input, ctx) {
      return await fn(input, ctx);
    },
  };
}
