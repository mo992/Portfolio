import { z } from 'zod';
import { BoundingBoxSchema } from './Detection';

export const DocumentFieldSchema = z.object({
  key: z.string(),
  value: z.string(),
  confidence: z.number().min(0).max(1),
  bbox: BoundingBoxSchema.optional(),
  sourceModelId: z.string().optional(),
});
export type DocumentField = z.infer<typeof DocumentFieldSchema>;

export const DocumentSchema = z.object({
  docType: z.string().optional(),
  fields: z.array(DocumentFieldSchema),
  rawText: z.string().optional(),
  pageSize: z
    .object({
      width: z.number().int().positive(),
      height: z.number().int().positive(),
    })
    .optional(),
});
export type Document = z.infer<typeof DocumentSchema>;
