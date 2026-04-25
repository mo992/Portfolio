import { iouBox } from './iou';
import { normalizedEditDistance } from './edit-distance';
import type { LayoutRegion } from '../../core/schemas/DocumentLayout';

export interface LayoutAccuracyInput {
  predicted: LayoutRegion[];
  groundTruth: Array<{
    label: LayoutRegion['label'];
    text: string;
    bbox: LayoutRegion['bbox'];
  }>;
}

export interface LayoutAccuracyResult {
  labelAccuracy: number;
  meanRegionIou: number;
  meanEditDistance: number;
  matched: number;
  gtCount: number;
  predictedCount: number;
}

/**
 * Greedy bbox IoU match, per-GT. Score each match on:
 *   label correctness (0 or 1), IoU (continuous), normalised edit distance on text (1 - d).
 */
export function layoutAccuracy(input: LayoutAccuracyInput): LayoutAccuracyResult {
  const used = new Set<number>();
  let correctLabels = 0;
  const ious: number[] = [];
  const editDistances: number[] = [];

  for (const gt of input.groundTruth) {
    let bestIdx = -1;
    let bestIou = 0;
    for (let i = 0; i < input.predicted.length; i++) {
      if (used.has(i)) continue;
      const p = input.predicted[i];
      const iou = iouBox(p.bbox, gt.bbox);
      if (iou > bestIou) {
        bestIou = iou;
        bestIdx = i;
      }
    }
    if (bestIdx >= 0) {
      used.add(bestIdx);
      ious.push(bestIou);
      if (input.predicted[bestIdx].label === gt.label) correctLabels += 1;
      editDistances.push(normalizedEditDistance(input.predicted[bestIdx].text, gt.text));
    }
  }

  const gtCount = input.groundTruth.length;
  return {
    labelAccuracy: gtCount === 0 ? 0 : correctLabels / gtCount,
    meanRegionIou: ious.length === 0 ? 0 : ious.reduce((a, b) => a + b, 0) / ious.length,
    meanEditDistance:
      editDistances.length === 0
        ? 0
        : editDistances.reduce((a, b) => a + b, 0) / editDistances.length,
    matched: ious.length,
    gtCount,
    predictedCount: input.predicted.length,
  };
}

export const layoutAccuracyMetric = () => ({
  name: 'layout-accuracy',
  compute(predicted: LayoutRegion[], groundTruth: LayoutAccuracyInput['groundTruth']) {
    return layoutAccuracy({ predicted, groundTruth });
  },
});
