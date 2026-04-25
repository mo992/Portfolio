import { models } from '../core/registry/ModelRegistry';
import { trocrSpec } from './trocr';
import { createNeuDetV8n } from './yolo/presets';

export const neuDetEngine = createNeuDetV8n();
export const neuDetSpec = neuDetEngine.toModelSpec();

let registered = false;

export function registerAllModels(): void {
  if (registered) return;
  models.register(neuDetSpec);
  models.register(trocrSpec);
  registered = true;
}

export { neuDetSpec as defectDetectionSpec, trocrSpec };
export * from './yolo';
