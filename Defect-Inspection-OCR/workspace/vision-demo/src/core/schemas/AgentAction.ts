import { z } from 'zod';

export const AgentActionSchema = z.object({
  id: z.string(),
  type: z.enum([
    'annotate',
    'flag-defect',
    'measure',
    'extract-field',
    'route',
    'answer',
    'none',
  ]),
  payload: z.record(z.unknown()),
  confidence: z.number().min(0).max(1).default(1),
  source: z.object({
    pipelineId: z.string(),
    modelIds: z.array(z.string()),
  }),
  timestamp: z.number().int(),
});
export type AgentAction = z.infer<typeof AgentActionSchema>;

export const AgentActionBatchSchema = z.array(AgentActionSchema);
export type AgentActionBatch = z.infer<typeof AgentActionBatchSchema>;

export function createAgentAction(init: Omit<AgentAction, 'id' | 'timestamp'>): AgentAction {
  return {
    ...init,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  };
}
