import type { Stage, StageContext } from '../Pipeline';

export interface PreprocessOptions {
  name?: string;
  resize?: [number, number];
  toFormat?: 'ImageData' | 'Blob' | 'Uint8Array' | 'passthrough';
  fn?: (input: unknown, ctx: StageContext) => Promise<unknown> | unknown;
}

export function preprocessStage(opts: PreprocessOptions = {}): Stage<unknown, unknown> {
  const name = opts.name ?? 'preprocess';
  return {
    name,
    async run(input, ctx) {
      if (opts.fn) return await opts.fn(input, ctx);
      if (opts.toFormat === 'passthrough' || !opts.toFormat) return input;
      return input;
    },
  };
}
