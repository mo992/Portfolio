import type { Stage, StageContext } from '../Pipeline';

export type BinarizationMethod = 'otsu' | 'fixed' | 'adaptive-mean' | 'adaptive-gaussian';

export interface BinarizationOptions {
  name?: string;
  method?: BinarizationMethod;
  threshold?: number;
  maxValue?: number;
  blockSize?: number;
  C?: number;
  invert?: boolean;
  keepOriginal?: boolean;
  outputKey?: string;
  cv?: unknown;
  cvLoader?: () => Promise<unknown>;
}

export interface BinarizationInput {
  image: unknown;
  imageSize: { width: number; height: number };
  [k: string]: unknown;
}

export interface BinarizationOutput extends BinarizationInput {
  binarizedImage: ImageData;
  binarizationMeta: {
    method: BinarizationMethod;
    threshold?: number;
    blockSize?: number;
    C?: number;
    pixelsOn: number;
    pixelsTotal: number;
  };
}

export interface CvMat {
  data: Uint8Array;
  cols: number;
  rows: number;
  delete(): void;
  roi?(rect: CvRect): CvMat;
}

export interface CvRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CvSize {
  width: number;
  height: number;
}

export interface CvRotatedRect {
  center: { x: number; y: number };
  size: CvSize;
  angle: number;
}

export type CvLike = {
  COLOR_RGBA2GRAY: number;
  COLOR_GRAY2RGBA: number;
  THRESH_BINARY: number;
  THRESH_BINARY_INV: number;
  THRESH_OTSU: number;
  ADAPTIVE_THRESH_MEAN_C: number;
  ADAPTIVE_THRESH_GAUSSIAN_C: number;
  BORDER_CONSTANT?: number;
  INTER_LINEAR?: number;
  CV_8UC1?: number;
  Mat: new (...args: unknown[]) => CvMat;
  matFromImageData(img: ImageData): CvMat;
  cvtColor(src: unknown, dst: unknown, code: number): void;
  threshold(src: unknown, dst: unknown, t: number, maxValue: number, type: number): void;
  adaptiveThreshold(
    src: unknown,
    dst: unknown,
    maxValue: number,
    adaptiveMethod: number,
    thresholdType: number,
    blockSize: number,
    C: number,
  ): void;
  /** Optional — only exercised by the deskew path. Implementations that lack it fall back to bbox-only cropping. */
  findNonZero?(src: unknown, dst: unknown): void;
  minAreaRect?(points: unknown): CvRotatedRect;
  getRotationMatrix2D?(center: { x: number; y: number }, angle: number, scale: number): CvMat;
  warpAffine?(
    src: unknown,
    dst: unknown,
    m: unknown,
    size: CvSize,
    flags?: number,
    borderMode?: number,
    borderValue?: { val: number[] } | number[],
  ): void;
  Rect?: new (x: number, y: number, width: number, height: number) => CvRect;
  Size?: new (width: number, height: number) => CvSize;
  Point?: new (x: number, y: number) => { x: number; y: number };
  Scalar?: new (...channels: number[]) => { val: number[] };
  ready?: Promise<unknown>;
};

let cvPromise: Promise<CvLike> | null = null;

export function setDefaultCvLoader(loader: () => Promise<CvLike>): void {
  cvPromise = loader();
}

export function resetCvLoader(): void {
  cvPromise = null;
}

async function defaultLoad(): Promise<CvLike> {
  const mod = await import('@techstark/opencv-js');
  const cv = ((mod as unknown as { default?: CvLike }).default ?? (mod as unknown as CvLike)) as CvLike;
  if (cv.ready && typeof cv.ready.then === 'function') await cv.ready;
  return cv;
}

async function loadCv(override?: CvLike | (() => Promise<CvLike>)): Promise<CvLike> {
  if (override) {
    if (typeof override === 'function') return (override as () => Promise<CvLike>)();
    return override;
  }
  if (!cvPromise) cvPromise = defaultLoad();
  return cvPromise;
}

async function toImageData(input: unknown, size: { width: number; height: number }): Promise<ImageData> {
  if (typeof ImageData !== 'undefined' && input instanceof ImageData) return input;
  if (typeof HTMLCanvasElement !== 'undefined' && input instanceof HTMLCanvasElement) {
    const ctx = input.getContext('2d');
    if (!ctx) throw new Error('BinarizationStage: canvas has no 2d context');
    return ctx.getImageData(0, 0, input.width, input.height);
  }
  if (typeof Blob !== 'undefined' && input instanceof Blob) {
    const bitmap = await createImageBitmap(input);
    const canvas =
      typeof OffscreenCanvas !== 'undefined'
        ? new OffscreenCanvas(bitmap.width, bitmap.height)
        : Object.assign(document.createElement('canvas'), {
            width: bitmap.width,
            height: bitmap.height,
          });
    const ctx = canvas.getContext('2d') as
      | CanvasRenderingContext2D
      | OffscreenCanvasRenderingContext2D
      | null;
    if (!ctx) throw new Error('BinarizationStage: cannot acquire 2d context');
    (ctx as CanvasRenderingContext2D).drawImage(bitmap, 0, 0);
    return (ctx as CanvasRenderingContext2D).getImageData(0, 0, bitmap.width, bitmap.height);
  }
  throw new Error(
    `BinarizationStage: unsupported input type "${typeof input}". Provide Blob | ImageData | HTMLCanvasElement; declared size ${size.width}x${size.height}.`,
  );
}

function countOn(img: ImageData): number {
  let on = 0;
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i] > 127) on += 1;
  }
  return on;
}

export function binarizationStage(opts: BinarizationOptions = {}): Stage<BinarizationInput, BinarizationOutput> {
  const method: BinarizationMethod = opts.method ?? 'adaptive-gaussian';
  const maxValue = opts.maxValue ?? 255;
  const blockSize = opts.blockSize ?? 11;
  const C = opts.C ?? 2;
  const threshold = opts.threshold ?? 127;
  const invert = opts.invert ?? false;
  const name = opts.name ?? `binarize:${method}`;

  if (blockSize % 2 !== 1 || blockSize < 3) {
    throw new Error(`BinarizationStage: blockSize must be an odd integer ≥ 3 (got ${blockSize})`);
  }

  return {
    name,
    async run(input: BinarizationInput, ctx: StageContext): Promise<BinarizationOutput> {
      const override = (opts.cv as CvLike | undefined) ?? (opts.cvLoader as (() => Promise<CvLike>) | undefined);
      const cv = await loadCv(override);
      const source = await toImageData(input.image, input.imageSize);
      const src = cv.matFromImageData(source);
      const gray = new cv.Mat();
      const dst = new cv.Mat();
      try {
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

        const thresholdType = invert ? cv.THRESH_BINARY_INV : cv.THRESH_BINARY;
        if (method === 'fixed') {
          cv.threshold(gray, dst, threshold, maxValue, thresholdType);
        } else if (method === 'otsu') {
          cv.threshold(gray, dst, 0, maxValue, thresholdType | cv.THRESH_OTSU);
        } else {
          const adaptiveMethod =
            method === 'adaptive-mean' ? cv.ADAPTIVE_THRESH_MEAN_C : cv.ADAPTIVE_THRESH_GAUSSIAN_C;
          cv.adaptiveThreshold(gray, dst, maxValue, adaptiveMethod, thresholdType, blockSize, C);
        }

        const rgba = new cv.Mat();
        cv.cvtColor(dst, rgba, cv.COLOR_GRAY2RGBA);
        const out = new ImageData(
          new Uint8ClampedArray(rgba.data),
          rgba.cols,
          rgba.rows,
        );
        rgba.delete();

        const on = countOn(out);
        ctx.metrics.increment('preprocess.binarize.calls');
        ctx.metrics.gauge('preprocess.binarize.fillRatio', on / (out.width * out.height));

        const outputKey = opts.outputKey ?? 'binarizedImage';
        const next: BinarizationOutput = {
          ...input,
          [outputKey]: out,
          binarizedImage: out,
          binarizationMeta: {
            method,
            threshold: method === 'fixed' ? threshold : undefined,
            blockSize: method.startsWith('adaptive') ? blockSize : undefined,
            C: method.startsWith('adaptive') ? C : undefined,
            pixelsOn: on,
            pixelsTotal: out.width * out.height,
          },
        };
        if (!opts.keepOriginal) next.image = out;
        return next;
      } finally {
        src.delete();
        gray.delete();
        dst.delete();
      }
    },
  };
}

export const __test__ = { loadCv, toImageData, defaultLoad };
