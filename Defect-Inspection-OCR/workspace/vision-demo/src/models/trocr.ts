import { z } from 'zod';
import type { InferenceContext, ModelSpec } from '../core/registry/types';
import { BoundingBoxSchema, type BoundingBox } from '../core/schemas/Detection';
import { getBackend } from '../core/backends/InferenceBackend';
import { imageInputToPngBase64 } from '../core/backends/image';

export const TrOCRInputSchema = z.object({
  image: z.unknown(),
  lineBbox: BoundingBoxSchema.optional(),
  lineId: z.string().optional(),
});
export type TrOCRInput = z.infer<typeof TrOCRInputSchema>;

export const TrOCROutputSchema = z.object({
  text: z.string(),
  confidence: z.number().min(0).max(1).optional(),
  lineBbox: BoundingBoxSchema.optional(),
  lineId: z.string().optional(),
});
export type TrOCROutput = z.infer<typeof TrOCROutputSchema>;

interface RawTrOCRHit {
  generated_text?: string;
  text?: string;
  score?: number;
}

function extractText(raw: unknown): { text: string; confidence?: number } {
  if (Array.isArray(raw)) {
    const first = raw[0] as RawTrOCRHit | undefined;
    if (first) return { text: first.generated_text ?? first.text ?? '', confidence: first.score };
    return { text: '' };
  }
  if (raw && typeof raw === 'object') {
    const r = raw as RawTrOCRHit & { confidence?: number | null };
    const conf = r.score ?? (typeof r.confidence === 'number' ? r.confidence : undefined);
    return { text: r.generated_text ?? r.text ?? '', confidence: conf };
  }
  if (typeof raw === 'string') return { text: raw };
  return { text: '' };
}

export const trocrSpec: ModelSpec<TrOCRInput, TrOCROutput> = {
  id: 'trocr-printed',
  name: 'TrOCR (base, printed) — server-hosted',
  version: '1.1.0',
  capabilities: ['ocr'],
  modality: { input: ['image'], output: ['text'] },
  runtime: 'cloud',
  backend: 'fastapi',
  inputSchema: TrOCRInputSchema,
  outputSchema: TrOCROutputSchema,
  metadata: {
    source: 'microsoft/trocr-base-printed',
    license: 'MIT',
  },
  async infer(input: TrOCRInput, ctx: InferenceContext): Promise<TrOCROutput> {
    const [out] = await trocrBatchInfer([input], ctx);
    return out;
  },
};

/**
 * Batch variant — issues a single HTTP request to the server with multiple line crops.
 * This is the canonical path the document pipeline uses: one HTTP roundtrip per page instead
 * of per line, plus server-side batched `model.generate()` collapses tokenizer + encoder overhead.
 *
 * Server-side contract (see `server/app/models/trocr.py`):
 *   POST /models/trocr-printed/infer  with body.input = { lines: [ { imageBase64, ... }, ... ] }
 *   response = { lines: [ { text, confidence, lineId, lineBbox }, ... ] }
 *
 * The server also accepts a legacy single-line shape (input = { imageBase64, ... }), so
 * `trocrSpec.infer` stays backward compatible for callers who already use single-line.
 */
export async function trocrBatchInfer(
  inputs: TrOCRInput[],
  ctx: InferenceContext,
): Promise<TrOCROutput[]> {
  if (inputs.length === 0) return [];
  const backend = getBackend('fastapi');
  const lines = await Promise.all(
    inputs.map(async (inp) => {
      const { data: imageBase64, mediaType } = await imageInputToPngBase64(inp.image);
      return {
        imageBase64,
        mediaType,
        lineId: inp.lineId,
        lineBbox: inp.lineBbox,
      };
    }),
  );
  const raw = await backend.run<{ lines?: Array<Record<string, unknown>> } | Array<Record<string, unknown>>>(
    {
      modelRef: 'trocr-printed',
      task: 'image-to-text',
      input: { lines },
    },
    ctx,
  );
  const list = Array.isArray(raw) ? raw : (raw?.lines ?? []);
  return inputs.map((inp, i) => {
    const hit = list[i] ?? {};
    const { text, confidence } = extractText(hit);
    return {
      text,
      confidence,
      lineBbox: inp.lineBbox,
      lineId: inp.lineId,
    };
  });
}

export function approxWordBboxes(
  text: string,
  lineBbox: BoundingBox,
): Array<{ text: string; bbox: BoundingBox }> {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const words = trimmed.split(/\s+/);
  if (words.length === 0) return [];
  const totalChars = words.reduce((a, w) => a + w.length, 0) + Math.max(0, words.length - 1);
  if (totalChars === 0) return [];
  const pxPerChar = lineBbox.width / totalChars;
  let cursor = lineBbox.x;
  return words.map((w) => {
    const width = Math.max(1, Math.round(w.length * pxPerChar));
    const bbox: BoundingBox = {
      x: cursor,
      y: lineBbox.y,
      width,
      height: lineBbox.height,
    };
    cursor += width + Math.round(pxPerChar);
    return { text: w, bbox };
  });
}
