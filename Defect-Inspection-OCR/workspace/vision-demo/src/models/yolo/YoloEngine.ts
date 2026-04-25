import { z } from 'zod';
import type { BackendId, InferenceContext, ModelSpec } from '../../core/registry/types';
import {
  DetectionResultSchema,
  type DetectionResult,
  type Detection,
} from '../../core/schemas/Detection';
import { getBackend } from '../../core/backends/InferenceBackend';
import { imageInputToPngBase64 } from '../../core/backends/image';

export interface YoloLabelMap {
  [classId: number]: string;
}

export type YoloTask = 'object-detection' | 'image-segmentation';

export interface YoloEnginePredictOptions {
  threshold?: number;
  maxDetections?: number;
  labelFilter?: (label: string) => boolean;
  classIdRemap?: YoloLabelMap;
}

export interface YoloEngineOptions {
  id: string;
  name: string;
  version?: string;
  modelRef: string;
  backendId?: BackendId;
  task?: YoloTask;
  defaultThreshold?: number;
  defaultMaxDetections?: number;
  labelMap?: YoloLabelMap;
  capabilities?: ModelSpec['capabilities'];
  modality?: ModelSpec['modality'];
  runtime?: ModelSpec['runtime'];
  metadata?: ModelSpec['metadata'];
  preprocess?: (input: YoloEngineInput) => Promise<YoloEngineInput> | YoloEngineInput;
  postprocessDetection?: (det: Detection) => Detection;
}

export const YoloEngineInputSchema = z.object({
  image: z.unknown(),
  imageSize: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }),
  threshold: z.number().min(0).max(1).optional(),
  maxDetections: z.number().int().positive().optional(),
});
export type YoloEngineInput = z.infer<typeof YoloEngineInputSchema>;

interface RawYoloHit {
  box: { xmin: number; ymin: number; xmax: number; ymax: number };
  score: number;
  label: string;
  classId?: number;
  mask?: { width: number; height: number; data: Uint8Array | number[] };
}

/**
 * Shared engine for any YOLO-family model (detection or instance-seg).
 * Subclass or instantiate directly; either way you get:
 *   - a runnable `predict()` entry-point for app code
 *   - a `toModelSpec()` that plugs the engine into the platform registry
 */
export class YoloEngine {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly modelRef: string;
  readonly backendId: BackendId;
  readonly task: YoloTask;
  readonly defaultThreshold: number;
  readonly defaultMaxDetections: number;
  readonly labelMap?: YoloLabelMap;
  private readonly opts: YoloEngineOptions;
  private warmed = false;

  constructor(options: YoloEngineOptions) {
    this.opts = options;
    this.id = options.id;
    this.name = options.name;
    this.version = options.version ?? '1.0.0';
    this.modelRef = options.modelRef;
    this.backendId = options.backendId ?? 'fastapi';
    this.task = options.task ?? 'object-detection';
    this.defaultThreshold = options.defaultThreshold ?? 0.25;
    this.defaultMaxDetections = options.defaultMaxDetections ?? 100;
    this.labelMap = options.labelMap;
  }

  /**
   * Warm the backend — useful before a demo so the first click isn't a model download.
   */
  async warmup(ctx?: { signal?: AbortSignal }): Promise<void> {
    if (this.warmed) return;
    const backend = getBackend(this.backendId);
    await backend.warmup?.(this.modelRef);
    this.warmed = true;
    void ctx;
  }

  /**
   * Core prediction. App code can call this directly without going through a pipeline.
   */
  async predict(
    input: YoloEngineInput,
    ctx: InferenceContext,
    opts: YoloEnginePredictOptions = {},
  ): Promise<DetectionResult> {
    const validated = YoloEngineInputSchema.parse(input);
    const processed = this.opts.preprocess ? await this.opts.preprocess(validated) : validated;
    const backend = getBackend(this.backendId);

    const { data: imageBase64, mediaType } = await imageInputToPngBase64(processed.image);
    const raw = await backend.run<RawYoloHit[]>(
      {
        modelRef: this.modelRef,
        task: this.task,
        input: { imageBase64, mediaType },
        options: {
          threshold: processed.threshold ?? this.defaultThreshold,
          percentage: false,
        },
      },
      ctx,
    );

    const threshold = processed.threshold ?? this.defaultThreshold;
    const maxDetections = processed.maxDetections ?? this.defaultMaxDetections;
    const relabel = opts.classIdRemap ?? this.labelMap;

    const detections: Detection[] = (raw ?? [])
      .filter((hit) => hit.score >= threshold)
      .filter((hit) => (opts.labelFilter ? opts.labelFilter(hit.label) : true))
      .slice(0, maxDetections)
      .map((hit) => this.hitToDetection(hit, relabel));

    const postprocessed = this.opts.postprocessDetection
      ? detections.map(this.opts.postprocessDetection)
      : detections;

    const result: DetectionResult = {
      detections: postprocessed,
      imageSize: processed.imageSize,
      modelId: this.id,
    };
    return DetectionResultSchema.parse(result);
  }

  private hitToDetection(hit: RawYoloHit, labelMap?: YoloLabelMap): Detection {
    const label =
      hit.classId !== undefined && labelMap && labelMap[hit.classId]
        ? labelMap[hit.classId]
        : hit.label;
    return {
      label,
      score: hit.score,
      classId: hit.classId,
      bbox: {
        x: hit.box.xmin,
        y: hit.box.ymin,
        width: Math.max(1, hit.box.xmax - hit.box.xmin),
        height: Math.max(1, hit.box.ymax - hit.box.ymin),
      },
      mask: hit.mask
        ? {
            width: hit.mask.width,
            height: hit.mask.height,
            data:
              hit.mask.data instanceof Uint8Array ? Array.from(hit.mask.data) : hit.mask.data,
            encoding: 'raw' as const,
          }
        : undefined,
    };
  }

  /**
   * Adapter to the platform's `ModelSpec` plugin contract.
   * Register with `models.register(engine.toModelSpec())`.
   */
  toModelSpec(): ModelSpec<YoloEngineInput, DetectionResult> {
    return {
      id: this.id,
      name: this.name,
      version: this.version,
      capabilities: this.opts.capabilities ?? ['object-detection'],
      modality:
        this.opts.modality ??
        (this.task === 'image-segmentation'
          ? { input: ['image'], output: ['bbox', 'mask'] }
          : { input: ['image'], output: ['bbox'] }),
      runtime: this.opts.runtime ?? 'edge',
      backend: this.backendId,
      inputSchema: YoloEngineInputSchema,
      outputSchema: DetectionResultSchema,
      metadata: this.opts.metadata ?? {},
      infer: (input, ctx) => this.predict(input, ctx),
    };
  }
}
