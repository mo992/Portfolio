import type { BoundingBox, Detection } from '../../core/schemas/Detection';

export function iouBox(a: BoundingBox, b: BoundingBox): number {
  const ax2 = a.x + a.width;
  const ay2 = a.y + a.height;
  const bx2 = b.x + b.width;
  const by2 = b.y + b.height;
  const interX1 = Math.max(a.x, b.x);
  const interY1 = Math.max(a.y, b.y);
  const interX2 = Math.min(ax2, bx2);
  const interY2 = Math.min(ay2, by2);
  const interW = Math.max(0, interX2 - interX1);
  const interH = Math.max(0, interY2 - interY1);
  const inter = interW * interH;
  if (inter === 0) return 0;
  const union = a.width * a.height + b.width * b.height - inter;
  return union <= 0 ? 0 : inter / union;
}

export function meanIou(
  predictions: Detection[],
  groundTruth: Detection[],
  opts: { matchByLabel?: boolean } = {},
): { mean: number; perMatch: number[]; matched: number; gtCount: number } {
  const matchByLabel = opts.matchByLabel ?? true;
  const perMatch: number[] = [];
  const used = new Set<number>();

  for (const gt of groundTruth) {
    let best = 0;
    let bestIdx = -1;
    for (let i = 0; i < predictions.length; i++) {
      if (used.has(i)) continue;
      const p = predictions[i];
      if (matchByLabel && p.label !== gt.label) continue;
      const iou = iouBox(p.bbox, gt.bbox);
      if (iou > best) {
        best = iou;
        bestIdx = i;
      }
    }
    if (bestIdx >= 0) {
      used.add(bestIdx);
      perMatch.push(best);
    }
  }

  const mean = perMatch.length === 0 ? 0 : perMatch.reduce((a, b) => a + b, 0) / perMatch.length;
  return { mean, perMatch, matched: perMatch.length, gtCount: groundTruth.length };
}

export const iou = () => ({
  name: 'iou',
  compute(predictions: Detection[], groundTruth: Detection[]) {
    const r = meanIou(predictions, groundTruth);
    return { meanIou: r.mean, matched: r.matched, gtCount: r.gtCount };
  },
});
