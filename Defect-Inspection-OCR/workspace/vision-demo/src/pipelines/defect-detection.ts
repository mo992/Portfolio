import { PipelineBuilder } from '../core/pipeline/PipelineBuilder';
import { preprocessStage } from '../core/pipeline/stages/PreprocessStage';
import { postprocessStage } from '../core/pipeline/stages/PostprocessStage';
import { validationStage } from '../core/pipeline/stages/ValidationStage';
import { inferenceStage } from '../core/pipeline/stages/InferenceStage';
import {
  binarizationStage,
  type BinarizationMethod,
  type BinarizationOptions,
} from '../core/pipeline/stages/BinarizationStage';
import { DetectionResultSchema, type DetectionResult } from '../core/schemas/Detection';
import { createAgentAction, type AgentAction } from '../core/schemas/AgentAction';
import { neuDetSpec } from '../models';
import type { YoloEngineInput } from '../models/yolo/YoloEngine';
import type { Pipeline } from '../core/pipeline/Pipeline';

export interface DefectDetectionInput {
  image: unknown;
  imageSize: { width: number; height: number };
  threshold?: number;
}

export interface DefectDetectionOutput {
  result: DetectionResult;
  action: AgentAction;
}

export interface DefectPipelineOptions {
  binarization?: BinarizationOptions | false;
  cv?: unknown;
}

export function buildDefectDetectionPipeline(
  opts: DefectPipelineOptions = {},
): Pipeline<DefectDetectionInput, DefectDetectionOutput> {
  const binarizeOpts: BinarizationOptions = {
    method: 'adaptive-gaussian' as BinarizationMethod,
    blockSize: 11,
    C: 2,
    keepOriginal: true,
    ...(opts.binarization === false ? {} : opts.binarization),
    ...(opts.cv ? { cv: opts.cv } : {}),
  };

  const root = new PipelineBuilder<DefectDetectionInput>('defect-detection');
  const builder: PipelineBuilder<DefectDetectionInput, unknown> =
    opts.binarization === false
      ? (root as unknown as PipelineBuilder<DefectDetectionInput, unknown>)
      : (root.addStage(
          `binarize:${binarizeOpts.method ?? 'adaptive-gaussian'}`,
          binarizationStage(binarizeOpts) as unknown as import('../core/pipeline/Pipeline').Stage<
            DefectDetectionInput,
            unknown
          >,
        ) as PipelineBuilder<DefectDetectionInput, unknown>);

  const finished = (builder as PipelineBuilder<DefectDetectionInput, DefectDetectionInput>)
    .addStage(
      'preprocess',
      preprocessStage({
        fn: (input): YoloEngineInput => {
          const i = input as DefectDetectionInput;
          return {
            image: i.image,
            imageSize: i.imageSize,
            threshold: i.threshold ?? 0.25,
          };
        },
      }),
    )
    .addStage('detect', inferenceStage(neuDetSpec))
    .addStage('validate', validationStage(DetectionResultSchema))
    .addStage(
      'to-agent',
      postprocessStage<DetectionResult, DefectDetectionOutput>((result) => {
        const defectCount = result.detections.length;
        const action = createAgentAction({
          type: defectCount > 0 ? 'flag-defect' : 'none',
          payload: {
            defectCount,
            detections: result.detections.map((d) => ({
              label: d.label,
              score: d.score,
              bbox: d.bbox,
            })),
          },
          confidence:
            defectCount > 0
              ? result.detections.reduce((a, d) => a + d.score, 0) / defectCount
              : 1,
          source: { pipelineId: 'defect-detection', modelIds: ['yolov8n-neu-det'] },
        });
        return { result, action };
      }),
    )
    .withEvaluation('defect-mini');

  return finished.build() as unknown as Pipeline<DefectDetectionInput, DefectDetectionOutput>;
}
