import { PipelineBuilder } from '../core/pipeline/PipelineBuilder';
import {
  binarizationStage,
  type BinarizationOptions,
  type CvLike,
} from '../core/pipeline/stages/BinarizationStage';
import type { Pipeline, Stage } from '../core/pipeline/Pipeline';
import type { YoloEngine, YoloEngineInput } from '../models/yolo/YoloEngine';
import {
  lineOcrStage,
  type LineOcrStageInput,
  type LineOcrStageOptions,
  type LineOcrStageOutput,
  type OcrLine,
} from './document/stages';

export interface DocumentUnderstandingInput {
  image: unknown;
  imageSize: { width: number; height: number };
  threshold?: number;
}

export interface DocumentUnderstandingOutput {
  lines: OcrLine[];
  imageSize: { width: number; height: number };
}

export interface DocumentPipelineOptions {
  binarization?: BinarizationOptions | false;
  ocr?: LineOcrStageOptions;
  textLineYolo?: YoloEngine;
  cv?: unknown;
  /** Enable per-line deskew in ocr-lines. Default true when `cv` is provided. */
  deskew?: boolean | { maxAngle?: number; minAngle?: number };
}

function detectLinesStage(
  engine: YoloEngine,
): Stage<DocumentUnderstandingInput, LineOcrStageInput> {
  return {
    name: 'detect-lines',
    async run(input, ctx) {
      const yoloInput: YoloEngineInput = {
        image: input.image,
        imageSize: input.imageSize,
        threshold: input.threshold,
      };
      const detection = await engine.predict(yoloInput, ctx);
      return {
        image: input.image,
        imageSize: input.imageSize,
        detection,
      };
    },
  };
}

function collectLinesStage(): Stage<LineOcrStageOutput, DocumentUnderstandingOutput> {
  return {
    name: 'collect-lines',
    async run(input) {
      return {
        lines: input.lines,
        imageSize: input.imageSize,
      };
    },
  };
}

export function buildDocumentUnderstandingPipeline(
  opts: DocumentPipelineOptions = {},
): Pipeline<DocumentUnderstandingInput, DocumentUnderstandingOutput> {
  const textLineYolo = opts.textLineYolo;
  if (!textLineYolo) {
    throw new Error(
      'document-understanding pipeline requires opts.textLineYolo. ' +
        'No server-side text-line YOLO handler is registered yet; pass one explicitly.',
    );
  }
  const binarizeOpts: BinarizationOptions = {
    method: 'adaptive-gaussian',
    blockSize: 15,
    C: 4,
    keepOriginal: true,
    ...(opts.binarization === false ? {} : opts.binarization),
    ...(opts.cv ? { cv: opts.cv } : {}),
  };

  type U = unknown;
  const root = new PipelineBuilder<DocumentUnderstandingInput>('document-understanding');
  const afterBinarize: PipelineBuilder<DocumentUnderstandingInput, U> =
    opts.binarization === false
      ? (root as unknown as PipelineBuilder<DocumentUnderstandingInput, U>)
      : (root.addStage(
          `binarize:${binarizeOpts.method ?? 'adaptive-gaussian'}`,
          binarizationStage(binarizeOpts) as unknown as Stage<DocumentUnderstandingInput, U>,
        ) as unknown as PipelineBuilder<DocumentUnderstandingInput, U>);

  const finished = (
    afterBinarize as unknown as PipelineBuilder<DocumentUnderstandingInput, DocumentUnderstandingInput>
  )
    .addStage('detect-lines', detectLinesStage(textLineYolo) as unknown as Stage<DocumentUnderstandingInput, DocumentUnderstandingInput>)
    .addStage(
      'ocr-lines',
      lineOcrStage({
        ...(opts.ocr ?? {}),
        cv: opts.ocr?.cv ?? (opts.cv as CvLike | undefined),
        deskew: opts.ocr?.deskew ?? opts.deskew,
      }) as unknown as Stage<DocumentUnderstandingInput, DocumentUnderstandingInput>,
    )
    .addStage('collect-lines', collectLinesStage() as unknown as Stage<DocumentUnderstandingInput, DocumentUnderstandingInput>);

  return finished.build() as unknown as Pipeline<DocumentUnderstandingInput, DocumentUnderstandingOutput>;
}
