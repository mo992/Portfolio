import { useMemo, useState } from 'react';
import { ImageUploader, type UploadedImage } from '../components/ImageUploader';
import { DetectionOverlay } from '../components/DetectionOverlay';
import { MaskOverlay } from '../components/MaskOverlay';
import { PipelineRunner } from '../components/PipelineRunner';
import { buildDefectDetectionPipeline, type DefectDetectionOutput } from '../../pipelines/defect-detection';
import type { PipelineRunResult } from '../../core/pipeline/Pipeline';
import { usePlatformStore } from '../store';

export function DefectInspectionScene() {
  const [image, setImage] = useState<UploadedImage | null>(null);
  const [run, setRun] = useState<PipelineRunResult<DefectDetectionOutput> | null>(null);
  const pushRun = usePlatformStore((s) => s.pushRun);

  const pipeline = useMemo(() => buildDefectDetectionPipeline({ binarization: false }), []);

  const input = useMemo(
    () =>
      image
        ? {
            image: image.blob,
            imageSize: { width: image.width, height: image.height },
            threshold: 0.25,
          }
        : null,
    [image],
  );

  const onResult = (result: PipelineRunResult<DefectDetectionOutput>) => {
    setRun(result);
    pushRun({
      id: crypto.randomUUID(),
      pipelineId: pipeline.id,
      at: Date.now(),
      totalMs: result.totalMs,
      stageTimings: result.trace,
      metrics: result.metrics,
    });
  };

  const detections = run?.output.result.detections ?? [];

  return (
    <section style={{ display: 'grid', gap: '1.25rem' }}>
      <header>
        <h2 style={{ margin: 0, fontSize: 'var(--fs-2xl)', color: 'var(--text)' }}>瑕疵檢測</h2>
        <p style={{ margin: '0.25rem 0', color: 'var(--text-2)', fontSize: 'var(--fs-sm)' }}>
          核心方法：YOLO & Transformer
        </p>
      </header>

      <ImageUploader onImage={setImage} />

      <PipelineRunner pipeline={pipeline} input={input} onResult={onResult} label="開始檢測" />

      {image && (
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <DetectionOverlay
            imageUrl={image.url}
            imageWidth={image.width}
            imageHeight={image.height}
            detections={detections}
          />
          <MaskOverlay
            imageWidth={image.width}
            imageHeight={image.height}
            detections={detections}
          />
        </div>
      )}

      {run && (
        <>
          <div>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: 'var(--fs-xl)', color: 'var(--text)' }}>檢測結果</h3>
            <pre
              style={{
                background: 'var(--surface-2)',
                color: 'var(--text)',
                padding: '0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--fs-xs)',
                overflow: 'auto',
              }}
            >
              {JSON.stringify(run.output.action, null, 2)}
            </pre>
          </div>
        </>
      )}
    </section>
  );
}
