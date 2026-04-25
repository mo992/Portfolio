import { z } from 'zod';

export const BoundingBoxSchema = z.object({
  x: z.number().min(0),
  y: z.number().min(0),
  width: z.number().positive(),
  height: z.number().positive(),
});
export type BoundingBox = z.infer<typeof BoundingBoxSchema>;

export const MaskSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  data: z.instanceof(Uint8Array).or(z.array(z.number())),
  encoding: z.enum(['raw', 'rle', 'png-base64']).optional(),
});
export type Mask = z.infer<typeof MaskSchema>;

export const DetectionSchema = z.object({
  label: z.string(),
  score: z.number().min(0).max(1),
  bbox: BoundingBoxSchema,
  mask: MaskSchema.optional(),
  classId: z.number().int().nonnegative().optional(),
});
export type Detection = z.infer<typeof DetectionSchema>;

export const DetectionResultSchema = z.object({
  detections: z.array(DetectionSchema),
  imageSize: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }),
  modelId: z.string(),
  inferenceMs: z.number().nonnegative().optional(),
});
export type DetectionResult = z.infer<typeof DetectionResultSchema>;
