import type { z } from 'zod';
import type { Stage } from '../Pipeline';

export function validationStage<T>(schema: z.ZodSchema<T>, name = 'validate'): Stage<T, T> {
  return {
    name,
    async run(input) {
      const parsed = schema.safeParse(input);
      if (!parsed.success) {
        throw new Error(`ValidationStage[${name}]: ${parsed.error.message}`);
      }
      return parsed.data;
    },
  };
}
