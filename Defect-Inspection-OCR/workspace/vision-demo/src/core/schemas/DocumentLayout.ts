import { z } from 'zod';
import { BoundingBoxSchema } from './Detection';

export const LayoutLabelSchema = z.enum([
  'title',
  'header',
  'text',
  'list',
  'table',
  'table-cell',
  'figure',
  'caption',
  'footer',
  'other',
]);
export type LayoutLabel = z.infer<typeof LayoutLabelSchema>;

export const LayoutTokenSchema = z.object({
  text: z.string(),
  bbox: BoundingBoxSchema,
  bboxNorm: z
    .object({
      x0: z.number().int().min(0).max(1000),
      y0: z.number().int().min(0).max(1000),
      x1: z.number().int().min(0).max(1000),
      y1: z.number().int().min(0).max(1000),
    })
    .optional(),
  label: LayoutLabelSchema,
  confidence: z.number().min(0).max(1),
  lineId: z.string(),
});
export type LayoutToken = z.infer<typeof LayoutTokenSchema>;

export const LayoutRegionSchema = z.object({
  id: z.string(),
  label: LayoutLabelSchema,
  bbox: BoundingBoxSchema,
  tokens: z.array(LayoutTokenSchema),
  text: z.string(),
  confidence: z.number().min(0).max(1),
});
export type LayoutRegion = z.infer<typeof LayoutRegionSchema>;

export const DocumentLayoutSchema = z.object({
  regions: z.array(LayoutRegionSchema),
  lines: z.array(
    z.object({
      id: z.string(),
      bbox: BoundingBoxSchema,
      score: z.number().min(0).max(1),
      text: z.string().optional(),
      deskewAngle: z.number().optional(),
    }),
  ),
  pageSize: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }),
  modelIds: z.array(z.string()),
});
export type DocumentLayout = z.infer<typeof DocumentLayoutSchema>;
