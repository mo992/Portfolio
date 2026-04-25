import type {
  CvLike,
  CvMat,
  CvRect,
} from '../../core/pipeline/stages/BinarizationStage';
import type { BoundingBox } from '../../core/schemas/Detection';

/** Read an ImageData into an OpenCV RGBA Mat. Caller owns `.delete()`. */
export function imageDataToMat(cv: CvLike, img: ImageData): CvMat {
  return cv.matFromImageData(img);
}

/** Materialise a Mat back to ImageData for the browser / server wire. */
export function matToImageData(_cv: CvLike, mat: CvMat): ImageData {
  return new ImageData(new Uint8ClampedArray(mat.data), mat.cols, mat.rows);
}

function makeRect(cv: CvLike, x: number, y: number, w: number, h: number): CvRect {
  if (cv.Rect) return new cv.Rect(x, y, w, h);
  return { x, y, width: w, height: h };
}

/** Crop an axis-aligned ROI via OpenCV. Returns a new Mat; caller `.delete()`s it. */
export function cropRoi(
  cv: CvLike,
  src: CvMat,
  bbox: BoundingBox,
): CvMat {
  const x = clamp(Math.round(bbox.x), 0, src.cols - 1);
  const y = clamp(Math.round(bbox.y), 0, src.rows - 1);
  const w = clamp(Math.round(bbox.width), 1, src.cols - x);
  const h = clamp(Math.round(bbox.height), 1, src.rows - y);
  const rect = makeRect(cv, x, y, w, h);
  if (typeof src.roi === 'function') {
    return src.roi(rect);
  }
  // Fallback: manual copy — handles real cv.Mat which exposes .roi via cv.Mat.prototype; also used by
  // our FakeMat which implements roi directly.
  const out = new cv.Mat(h, w, cv.CV_8UC1 ?? 0) as CvMat;
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      const srcIdx = ((y + r) * src.cols + (x + c));
      out.data[r * w + c] = src.data[srcIdx] ?? 0;
    }
  }
  out.cols = w;
  out.rows = h;
  return out;
}

/** Normalise OpenCV's ambiguous `minAreaRect` angle into a signed [-45, +45] degree rotation. */
export function normaliseSkewAngle(angle: number): number {
  let a = angle;
  if (a < -45) a += 90;
  if (a > 45) a -= 90;
  return a;
}

export interface DeskewOptions {
  /** Skip rotation when `|angle|` exceeds this (degrees). Default 30. */
  maxAngle?: number;
  /** Below this magnitude (degrees) treat as already-upright. Default 0.5. */
  minAngle?: number;
  /** Adaptive-threshold block size for angle estimation. Default 15. */
  blockSize?: number;
  /** Adaptive-threshold C. Default 10. */
  C?: number;
  /** If true, pad ROI by sin(angle)·max(w,h) before rotating so edges survive. Default true. */
  padForRotation?: boolean;
}

export interface DeskewResult {
  /** The (possibly rotated) crop. */
  image: ImageData;
  /** Degrees actually applied. 0 when skipped or already-upright. */
  angle: number;
  /** Why the rotation was not applied, if skipped. */
  skipReason?: 'already-upright' | 'angle-out-of-range' | 'missing-ops';
}

/**
 * Estimate text-line skew with `minAreaRect` over the binarised ROI and return a rotated crop.
 *
 * Requires the OpenCV deskew ops (`findNonZero`, `minAreaRect`, `getRotationMatrix2D`, `warpAffine`).
 * When any are missing (e.g., a stripped-down polyfill), returns the unrotated crop with
 * `skipReason: 'missing-ops'` — callers can still feed it to OCR without error.
 */
export function deskewLine(
  cv: CvLike,
  source: CvMat,
  bbox: BoundingBox,
  opts: DeskewOptions = {},
): DeskewResult {
  const maxAngle = opts.maxAngle ?? 30;
  const minAngle = opts.minAngle ?? 0.5;
  const blockSize = opts.blockSize ?? 15;
  const C = opts.C ?? 10;

  const roi = cropRoi(cv, source, bbox);
  try {
    const hasOps =
      typeof cv.findNonZero === 'function' &&
      typeof cv.minAreaRect === 'function' &&
      typeof cv.getRotationMatrix2D === 'function' &&
      typeof cv.warpAffine === 'function';
    if (!hasOps) {
      const image = matToImageData(cv, roi);
      return { image, angle: 0, skipReason: 'missing-ops' };
    }

    const gray = new cv.Mat();
    const bin = new cv.Mat();
    const points = new cv.Mat();
    try {
      cv.cvtColor(roi, gray, cv.COLOR_RGBA2GRAY);
      cv.adaptiveThreshold(
        gray,
        bin,
        255,
        cv.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv.THRESH_BINARY_INV,
        Math.max(3, blockSize | 1),
        C,
      );
      cv.findNonZero!(bin, points);
      if (points.rows === 0) {
        return { image: matToImageData(cv, roi), angle: 0, skipReason: 'already-upright' };
      }
      const rect = cv.minAreaRect!(points);
      const angle = normaliseSkewAngle(rect.angle);
      if (Math.abs(angle) < minAngle) {
        return { image: matToImageData(cv, roi), angle: 0, skipReason: 'already-upright' };
      }
      if (Math.abs(angle) > maxAngle) {
        return { image: matToImageData(cv, roi), angle: 0, skipReason: 'angle-out-of-range' };
      }

      const w = roi.cols;
      const h = roi.rows;
      const pad = opts.padForRotation === false
        ? 0
        : Math.ceil(Math.max(w, h) * Math.abs(Math.sin((angle * Math.PI) / 180)));
      const destW = w + pad * 2;
      const destH = h + pad * 2;
      const center = { x: destW / 2, y: destH / 2 };
      const m = cv.getRotationMatrix2D!(center, angle, 1);
      const rotated = new cv.Mat();
      try {
        const size = cv.Size ? new cv.Size(destW, destH) : { width: destW, height: destH };
        const borderValue = cv.Scalar ? new cv.Scalar(255, 255, 255, 255) : [255, 255, 255, 255];
        cv.warpAffine!(
          roi,
          rotated,
          m,
          size,
          cv.INTER_LINEAR ?? 1,
          cv.BORDER_CONSTANT ?? 0,
          borderValue,
        );
        return { image: matToImageData(cv, rotated), angle };
      } finally {
        m.delete();
        rotated.delete();
      }
    } finally {
      gray.delete();
      bin.delete();
      points.delete();
    }
  } finally {
    roi.delete();
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
