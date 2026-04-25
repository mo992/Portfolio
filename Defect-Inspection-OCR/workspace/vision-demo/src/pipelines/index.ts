import { pipelines } from '../core/registry/PipelineRegistry';
import { buildDefectDetectionPipeline } from './defect-detection';
import { buildDocumentUnderstandingPipeline } from './document-understanding';

let registered = false;

export function registerAllPipelines(): void {
  if (registered) return;
  pipelines.register(buildDefectDetectionPipeline());
  // document-understanding requires a textLineYolo engine that isn't wired
  // up server-side yet; callers that need it must build and register it
  // explicitly via buildDocumentUnderstandingPipeline({ textLineYolo }).
  registered = true;
}

export { buildDefectDetectionPipeline, buildDocumentUnderstandingPipeline };
