import type { Detection } from '../../core/schemas/Detection';
import { iouBox } from './iou';

export interface PrecisionRecallResult {
  precision: number;
  recall: number;
  f1: number;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
}

export function precisionRecall(
  predictions: Detection[],
  groundTruth: Detection[],
  opts: { iouThreshold?: number; matchByLabel?: boolean } = {},
): PrecisionRecallResult {
  const iouThreshold = opts.iouThreshold ?? 0.5;
  const matchByLabel = opts.matchByLabel ?? true;
  const usedGt = new Set<number>();
  let tp = 0;

  const sortedPreds = [...predictions].sort((a, b) => b.score - a.score);

  for (const pred of sortedPreds) {
    let bestIdx = -1;
    let bestIou = iouThreshold;
    for (let i = 0; i < groundTruth.length; i++) {
      if (usedGt.has(i)) continue;
      const gt = groundTruth[i];
      if (matchByLabel && pred.label !== gt.label) continue;
      const iou = iouBox(pred.bbox, gt.bbox);
      if (iou >= bestIou) {
        bestIou = iou;
        bestIdx = i;
      }
    }
    if (bestIdx >= 0) {
      usedGt.add(bestIdx);
      tp += 1;
    }
  }

  const fp = predictions.length - tp;
  const fn = groundTruth.length - tp;
  const precision = predictions.length === 0 ? 0 : tp / predictions.length;
  const recall = groundTruth.length === 0 ? 0 : tp / groundTruth.length;
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);

  return {
    precision,
    recall,
    f1,
    truePositives: tp,
    falsePositives: fp,
    falseNegatives: fn,
  };
}

export const precisionRecallMetric = (opts: { iouThreshold?: number } = {}) => ({
  name: 'precision-recall',
  compute(predictions: Detection[], groundTruth: Detection[]) {
    return precisionRecall(predictions, groundTruth, opts);
  },
});
