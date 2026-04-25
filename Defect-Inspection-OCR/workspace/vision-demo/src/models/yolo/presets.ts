import { YoloEngine } from './YoloEngine';

/**
 * YOLO presets. All inference is server-delegated via FastAPIBackend —
 * `modelRef` must resolve to a handler registered in the server's MODEL_REGISTRY.
 */

export function createDefectYolo(opts: {
  id: string;
  name: string;
  modelRef: string;
  labelMap?: Record<number, string>;
  task?: 'object-detection' | 'image-segmentation';
}): YoloEngine {
  return new YoloEngine({
    id: opts.id,
    name: opts.name,
    modelRef: opts.modelRef,
    task: opts.task ?? 'object-detection',
    backendId: 'fastapi',
    labelMap: opts.labelMap,
    capabilities:
      opts.task === 'image-segmentation'
        ? ['object-detection', 'segmentation']
        : ['object-detection'],
    metadata: { source: opts.modelRef },
  });
}

export const NEU_DET_LABELS: Record<number, string> = {
  0: 'crazing',
  1: 'inclusion',
  2: 'patches',
  3: 'pitted_surface',
  4: 'rolled-in_scale',
  5: 'scratches',
};

/**
 * Fine-tuned YOLOv8n on NEU-DET (steel surface defects, 6 classes).
 * Served by FastAPI via `MODEL_REGISTRY["yolov8n-neu-det"]`.
 */
export function createNeuDetV8n(
  overrides: Partial<ConstructorParameters<typeof YoloEngine>[0]> = {},
): YoloEngine {
  return new YoloEngine({
    id: 'yolov8n-neu-det',
    name: 'YOLOv8n — NEU-DET steel defects',
    version: '1.0.0',
    modelRef: 'yolov8n-neu-det',
    backendId: 'fastapi',
    task: 'object-detection',
    defaultThreshold: 0.25,
    capabilities: ['object-detection'],
    labelMap: NEU_DET_LABELS,
    metadata: {
      modelSizeMB: 12,
      source: 'NEU-DET fine-tune (yolov8n, 6 classes)',
    },
    ...overrides,
  });
}

/**
 * Text-line detector. Backed server-side by `MODEL_REGISTRY["text-line-cv"]`,
 * which now runs a YOLOv8s word detector → centre-distance clustering.
 *
 * `defaultThreshold: 0.25` matches the server's own default. An explicit
 * override can lower this for recall experiments, but 0 (free-for-all) causes
 * OOD scanned images to drown the clusterer in oversized proposals.
 */
export function createTextLineYolo(
  overrides: Partial<ConstructorParameters<typeof YoloEngine>[0]> = {},
): YoloEngine {
  return new YoloEngine({
    id: 'text-line-cv',
    name: 'Text-line detector',
    version: '0.2.0',
    modelRef: 'text-line-cv',
    backendId: 'fastapi',
    task: 'object-detection',
    defaultThreshold: 0.25,
    capabilities: ['object-detection'],
    labelMap: { 0: 'text-line' },
    metadata: { source: 'yolov8s-words + centre-distance clustering' },
    ...overrides,
  });
}
