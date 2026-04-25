import { useMemo, useState } from 'react';
import { ImageUploader, type UploadedImage } from '../components/ImageUploader';
import { PipelineRunner } from '../components/PipelineRunner';
import { DetectionOverlay } from '../components/DetectionOverlay';
import type { PipelineRunResult } from '../../core/pipeline/Pipeline';
import {
  buildDocumentUnderstandingPipeline,
  type DocumentUnderstandingOutput,
} from '../../pipelines/document-understanding';
import { createTextLineYolo } from '../../models/yolo';
import type { Detection } from '../../core/schemas/Detection';
import { usePlatformStore } from '../store';

interface DocSceneInput {
  image: Blob;
  imageSize: { width: number; height: number };
}

export function DocumentUnderstandingScene() {
  const [image, setImage] = useState<UploadedImage | null>(null);
  const [run, setRun] = useState<PipelineRunResult<DocumentUnderstandingOutput> | null>(null);
  const pushRun = usePlatformStore((s) => s.pushRun);

  const pipeline = useMemo(
    () =>
      buildDocumentUnderstandingPipeline({
        textLineYolo: createTextLineYolo(),
        binarization: false,
      }),
    [],
  );

  const input = useMemo<DocSceneInput | null>(
    () =>
      image
        ? { image: image.blob, imageSize: { width: image.width, height: image.height } }
        : null,
    [image],
  );

  const onResult = (result: PipelineRunResult<DocumentUnderstandingOutput>) => {
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

  const lines = run?.output.lines ?? [];
  const fullText = lines.map((l) => l.text).filter(Boolean).join('\n');
  const avgConfidence = lines.length
    ? lines.reduce((a, l) => a + l.confidence, 0) / lines.length
    : null;

  const lineDetections: Detection[] = lines.map((l, i) => ({
    label: `L${i + 1}`,
    score: l.confidence,
    bbox: l.bbox,
  }));

  return (
    <section style={{ display: 'grid', gap: '1.25rem' }}>
      <header>
        <h2 style={{ margin: 0, fontSize: 'var(--fs-2xl)', color: 'var(--text)' }}>文件辨識</h2>
        <p style={{ margin: '0.25rem 0', color: 'var(--text-2)', fontSize: 'var(--fs-sm)' }}>
          核心方法：OCR 文字辨識
        </p>
      </header>

      <ImageUploader onImage={(img) => { setImage(img); setRun(null); }} />

      <PipelineRunner
        pipeline={pipeline}
        input={input}
        onResult={onResult}
        label="執行 OCR"
      />

      {image && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 2fr) minmax(260px, 1fr)',
            gap: '1rem',
            alignItems: 'start',
          }}
        >
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {lines.length > 0 ? (
              <DetectionOverlay
                imageUrl={image.url}
                imageWidth={image.width}
                imageHeight={image.height}
                detections={lineDetections}
              />
            ) : (
              <img
                src={image.url}
                alt={image.name}
                style={{ maxWidth: '100%', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}
              />
            )}
          </div>
          <aside style={{ display: 'grid', gap: '1rem' }}>
            <section>
              <h3 style={{ margin: '0 0 0.5rem', fontSize: 'var(--fs-2xl)', color: 'var(--text)' }}>
                辨識結果
              </h3>
              {run ? (
                <div style={{ display: 'grid', gap: 8 }}>
                  <div
                    style={{
                      padding: '0.85rem 1rem',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 'var(--fs-base)',
                      lineHeight: 'var(--lh-body)',
                      color: 'var(--text)',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      minHeight: 80,
                      maxHeight: 420,
                      overflowY: 'auto',
                    }}
                  >
                    {fullText || <em style={{ color: 'var(--text-4)' }}>（未偵測到任何文字行）</em>}
                  </div>
                  <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                    共 {lines.length} 行
                    {avgConfidence !== null && `・平均信心度 ${(avgConfidence * 100).toFixed(1)}%`}
                  </div>
                  {lines.length > 0 && (
                    <details>
                      <summary style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-3)', cursor: 'pointer' }}>
                        逐行結果
                      </summary>
                      <ol
                        style={{
                          margin: '8px 0 0',
                          paddingLeft: '1.5rem',
                          fontSize: 'var(--fs-base)',
                          lineHeight: 'var(--lh-body)',
                          color: 'var(--text)',
                          display: 'grid',
                          gap: 6,
                          maxHeight: 360,
                          overflowY: 'auto',
                        }}
                      >
                        {lines.map((l) => (
                          <li key={l.lineId}>
                            {l.text || <em style={{ color: 'var(--text-4)' }}>（空）</em>}
                            <span
                              style={{
                                marginLeft: 6,
                                fontSize: 'var(--fs-sm)',
                                color: 'var(--text-4)',
                                fontFamily: 'var(--font-mono)',
                              }}
                            >
                              {(l.confidence * 100).toFixed(0)}%
                            </span>
                          </li>
                        ))}
                      </ol>
                    </details>
                  )}
                  <details>
                    <summary style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', cursor: 'pointer' }}>
                      原始 JSON
                    </summary>
                    <pre
                      style={{
                        background: 'var(--code-bg)',
                        color: 'var(--code-fg)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 'var(--fs-sm)',
                        padding: '0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        marginTop: 6,
                        maxHeight: 320,
                        overflow: 'auto',
                      }}
                    >
                      {JSON.stringify(run.output, null, 2)}
                    </pre>
                  </details>
                </div>
              ) : (
                <p style={{ color: 'var(--text-3)', fontSize: 'var(--fs-xs)' }}>
                  請上傳圖片並點擊「執行 OCR」。
                </p>
              )}
            </section>
          </aside>
        </div>
      )}
    </section>
  );
}
