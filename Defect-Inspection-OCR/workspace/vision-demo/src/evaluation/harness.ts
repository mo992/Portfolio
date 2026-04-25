import type { Pipeline } from '../core/pipeline/Pipeline';
import type { Detection, DetectionResult } from '../core/schemas/Detection';
import { meanIou } from './metrics/iou';
import { precisionRecall, type PrecisionRecallResult } from './metrics/precision-recall';
import type { LoadedDataset, DatasetSample } from './datasets/loader';

export interface EvalSampleResult {
  sampleId: string;
  latencyMs: number;
  predictions: Detection[];
  groundTruth: Detection[];
  iou: number;
  precisionRecall: PrecisionRecallResult;
  error?: string;
}

export interface EvalReport {
  datasetId: string;
  pipelineId: string;
  runAt: string;
  sampleCount: number;
  avgLatencyMs: number;
  avgIou: number;
  aggregate: PrecisionRecallResult;
  perSample: EvalSampleResult[];
}

export interface EvalOptions<TIn> {
  pipeline: Pipeline<TIn, { result: DetectionResult } | DetectionResult>;
  dataset: LoadedDataset;
  toInput: (sample: DatasetSample) => Promise<TIn> | TIn;
  iouThreshold?: number;
}

function extractResult(output: unknown): DetectionResult {
  if (output && typeof output === 'object' && 'result' in output) {
    return (output as { result: DetectionResult }).result;
  }
  return output as DetectionResult;
}

export async function runEvaluation<TIn>(opts: EvalOptions<TIn>): Promise<EvalReport> {
  const perSample: EvalSampleResult[] = [];
  let tpSum = 0;
  let fpSum = 0;
  let fnSum = 0;

  for (const sample of opts.dataset.samples) {
    const start = performance.now();
    try {
      const input = await opts.toInput(sample);
      const run = await opts.pipeline.run(input);
      const latencyMs = performance.now() - start;
      const result = extractResult(run.output);
      const predictions = result.detections;
      const iouRes = meanIou(predictions, sample.groundTruth);
      const pr = precisionRecall(predictions, sample.groundTruth, {
        iouThreshold: opts.iouThreshold ?? 0.5,
      });
      tpSum += pr.truePositives;
      fpSum += pr.falsePositives;
      fnSum += pr.falseNegatives;
      perSample.push({
        sampleId: sample.id,
        latencyMs,
        predictions,
        groundTruth: sample.groundTruth,
        iou: iouRes.mean,
        precisionRecall: pr,
      });
    } catch (err) {
      perSample.push({
        sampleId: sample.id,
        latencyMs: performance.now() - start,
        predictions: [],
        groundTruth: sample.groundTruth,
        iou: 0,
        precisionRecall: {
          precision: 0,
          recall: 0,
          f1: 0,
          truePositives: 0,
          falsePositives: 0,
          falseNegatives: sample.groundTruth.length,
        },
        error: err instanceof Error ? err.message : String(err),
      });
      fnSum += sample.groundTruth.length;
    }
  }

  const totalPred = tpSum + fpSum;
  const totalGt = tpSum + fnSum;
  const aggregate: PrecisionRecallResult = {
    precision: totalPred === 0 ? 0 : tpSum / totalPred,
    recall: totalGt === 0 ? 0 : tpSum / totalGt,
    f1: 0,
    truePositives: tpSum,
    falsePositives: fpSum,
    falseNegatives: fnSum,
  };
  aggregate.f1 =
    aggregate.precision + aggregate.recall === 0
      ? 0
      : (2 * aggregate.precision * aggregate.recall) / (aggregate.precision + aggregate.recall);

  const avgLatencyMs =
    perSample.reduce((a, s) => a + s.latencyMs, 0) / Math.max(1, perSample.length);
  const iouValues = perSample.filter((s) => !s.error).map((s) => s.iou);
  const avgIou = iouValues.length === 0 ? 0 : iouValues.reduce((a, b) => a + b, 0) / iouValues.length;

  return {
    datasetId: opts.dataset.id,
    pipelineId: opts.pipeline.id,
    runAt: new Date().toISOString(),
    sampleCount: perSample.length,
    avgLatencyMs,
    avgIou,
    aggregate,
    perSample,
  };
}
