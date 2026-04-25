import type { Stage, StageContext } from '../../../core/pipeline/Pipeline';
import type { DetectionResult } from '../../../core/schemas/Detection';
import type { BoundingBox } from '../../../core/schemas/Detection';
import {
  trocrBatchInfer,
  approxWordBboxes,
  type TrOCROutput,
} from '../../../models/trocr';
import type { CvLike } from '../../../core/pipeline/stages/BinarizationStage';
import { deskewLine, imageDataToMat, matToImageData, cropRoi } from '../image-ops';

export interface LineOcrStageInput {
  image: unknown;
  imageSize: { width: number; height: number };
  detection: DetectionResult;
}

export interface OcrLine {
  lineId: string;
  bbox: BoundingBox;
  score: number;
  text: string;
  confidence: number;
  words: Array<{ text: string; bbox: BoundingBox }>;
  /** Degrees applied when deskewing the crop before OCR. 0 when unrotated. */
  deskewAngle?: number;
  deskewSkipReason?: string;
}

export interface LineOcrStageOutput extends LineOcrStageInput {
  lines: OcrLine[];
}

export interface LineOcrStageOptions {
  name?: string;
  /**
   * Override the batch OCR call — one request per page, one response with N `TrOCROutput`s.
   * Prefer this over `runOcr` for production: callers fall through to the default batch helper
   * which collapses per-line HTTP overhead.
   */
  runBatchOcr?: (
    inputs: Array<{ image: unknown; lineBbox: BoundingBox; lineId: string }>,
    ctx: StageContext,
  ) => Promise<TrOCROutput[]>;
  /**
   * Legacy per-line OCR override. When provided, takes precedence over `runBatchOcr` and the
   * stage fires one call per line — useful for tests that assert per-line behaviour.
   */
  runOcr?: (input: {
    image: unknown;
    lineBbox: BoundingBox;
    lineId: string;
  }, ctx: StageContext) => Promise<TrOCROutput>;
  /** Override the crop/deskew step (for Node/test envs or alt implementations). */
  cropLine?: (
    source: unknown,
    bbox: BoundingBox,
    imageSize: { width: number; height: number },
  ) => Promise<CropResult> | CropResult;
  /** OpenCV instance — when provided, crop + optional deskew run on Mat ops (CI-safe). */
  cv?: CvLike;
  /** Enable rotation-aware cropping. Default true when `cv` is provided. */
  deskew?: boolean | { maxAngle?: number; minAngle?: number };
}

export interface CropResult {
  image: unknown;
  deskewAngle?: number;
  deskewSkipReason?: string;
}

async function canvasCropLine(source: unknown, bbox: BoundingBox): Promise<CropResult> {
  if (typeof HTMLCanvasElement === 'undefined' && typeof OffscreenCanvas === 'undefined') {
    return { image: source };
  }
  if (typeof ImageBitmap !== 'undefined' && source instanceof ImageBitmap) {
    return { image: cropBitmap(source, bbox) };
  }
  if (typeof Blob !== 'undefined' && source instanceof Blob) {
    const bitmap = await createImageBitmap(source);
    return { image: cropBitmap(bitmap, bbox) };
  }
  return { image: source };
}

function cropBitmap(bitmap: ImageBitmap, bbox: BoundingBox): ImageBitmap | unknown {
  const canvas =
    typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(Math.max(1, Math.round(bbox.width)), Math.max(1, Math.round(bbox.height)))
      : Object.assign(document.createElement('canvas'), {
          width: Math.max(1, Math.round(bbox.width)),
          height: Math.max(1, Math.round(bbox.height)),
        });
  const ctx = (canvas as OffscreenCanvas | HTMLCanvasElement).getContext('2d') as
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D
    | null;
  if (!ctx) return bitmap;
  (ctx as CanvasRenderingContext2D).drawImage(
    bitmap,
    bbox.x,
    bbox.y,
    bbox.width,
    bbox.height,
    0,
    0,
    bbox.width,
    bbox.height,
  );
  return canvas;
}

function cvCropAndOptionallyDeskew(
  cv: CvLike,
  source: unknown,
  bbox: BoundingBox,
  deskewOpts: { enabled: boolean; maxAngle?: number; minAngle?: number },
): CropResult {
  if (!(source instanceof ImageData)) {
    // We need raw pixels for Mat ops. If the source isn't ImageData, fall through to Canvas path.
    return { image: source };
  }
  const srcMat = imageDataToMat(cv, source);
  try {
    if (!deskewOpts.enabled) {
      const roi = cropRoi(cv, srcMat, bbox);
      try {
        return { image: matToImageData(cv, roi) };
      } finally {
        roi.delete();
      }
    }
    const { image, angle, skipReason } = deskewLine(cv, srcMat, bbox, {
      maxAngle: deskewOpts.maxAngle,
      minAngle: deskewOpts.minAngle,
    });
    return { image, deskewAngle: angle, deskewSkipReason: skipReason };
  } finally {
    srcMat.delete();
  }
}

export function lineOcrStage(
  opts: LineOcrStageOptions = {},
): Stage<LineOcrStageInput, LineOcrStageOutput> {
  const name = opts.name ?? 'ocr-lines';
  const runBatchOcr =
    opts.runBatchOcr ??
    (async (inputs, ctx) => trocrBatchInfer(inputs, ctx));

  const deskewEnabled =
    opts.deskew === undefined ? Boolean(opts.cv) : Boolean(opts.deskew);
  const deskewConfig =
    typeof opts.deskew === 'object' && opts.deskew !== null ? opts.deskew : {};

  const cropLine =
    opts.cropLine ??
    (async (source, bbox): Promise<CropResult> => {
      if (opts.cv) {
        return cvCropAndOptionallyDeskew(opts.cv, source, bbox, {
          enabled: deskewEnabled,
          maxAngle: deskewConfig.maxAngle,
          minAngle: deskewConfig.minAngle,
        });
      }
      return canvasCropLine(source, bbox);
    });

  return {
    name,
    async run(input, ctx): Promise<LineOcrStageOutput> {
      type CropRec = {
        det: (typeof input.detection.detections)[number];
        lineId: string;
        crop: CropResult;
      };
      const crops: CropRec[] = [];
      for (let i = 0; i < input.detection.detections.length; i++) {
        const det = input.detection.detections[i];
        const lineId = `line-${i}`;
        const crop = await cropLine(input.image, det.bbox, input.imageSize);
        crops.push({ det, lineId, crop });
      }

      let ocrResults: TrOCROutput[] = [];
      if (crops.length > 0) {
        if (opts.runOcr) {
          // Per-line compatibility path (legacy tests / custom backends).
          ocrResults = [];
          for (const { det, lineId, crop } of crops) {
            ocrResults.push(
              await opts.runOcr(
                { image: crop.image, lineBbox: det.bbox, lineId },
                ctx,
              ),
            );
          }
        } else {
          ocrResults = await runBatchOcr(
            crops.map(({ det, lineId, crop }) => ({
              image: crop.image,
              lineBbox: det.bbox,
              lineId,
            })),
            ctx,
          );
          ctx.metrics.increment('doc.ocr.batches');
        }
      }

      const lines: OcrLine[] = crops.map(({ det, lineId, crop }, i) => {
        const ocr = ocrResults[i] ?? { text: '' };
        const text = ocr.text.trim();
        const words = text ? approxWordBboxes(text, det.bbox) : [];
        return {
          lineId,
          bbox: det.bbox,
          score: det.score,
          text,
          confidence: ocr.confidence ?? det.score,
          words,
          deskewAngle: crop.deskewAngle,
          deskewSkipReason: crop.deskewSkipReason,
        };
      });

      for (const { crop } of crops) {
        ctx.metrics.increment('doc.ocr.lines');
        if (typeof crop.deskewAngle === 'number' && Math.abs(crop.deskewAngle) > 0) {
          ctx.metrics.increment('doc.deskew.applied');
        } else if (crop.deskewSkipReason && crop.deskewSkipReason !== 'already-upright') {
          ctx.metrics.increment(`doc.deskew.skipped.${crop.deskewSkipReason}`);
        }
      }
      ctx.metrics.gauge(
        'doc.ocr.chars',
        lines.reduce((n, l) => n + l.text.length, 0),
      );
      return { ...input, lines };
    },
  };
}
