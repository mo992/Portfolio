import { useState, type ReactNode } from 'react';
import type { Pipeline, PipelineRunResult } from '../../core/pipeline/Pipeline';
import { usePlatformStore } from '../store';

export interface PipelineRunnerProps<TIn, TOut> {
  pipeline: Pipeline<TIn, TOut>;
  input: TIn | null;
  onResult?: (result: PipelineRunResult<TOut>) => void;
  renderBusy?: () => ReactNode;
  label?: string;
}

export function PipelineRunner<TIn, TOut>({
  pipeline,
  input,
  onResult,
  label = '執行管線',
}: PipelineRunnerProps<TIn, TOut>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const beginBusy = usePlatformStore((s) => s.beginBusy);
  const endBusy = usePlatformStore((s) => s.endBusy);
  const setBusyMessage = usePlatformStore((s) => s.setBusyMessage);

  const run = async () => {
    if (!input) return;
    setBusy(true);
    setError(null);
    beginBusy('處理中…');
    const dev = import.meta.env.DEV;
    let lastStage = '(none)';
    if (dev) console.log('[PipelineRunner] beginBusy', pipeline.id);
    const watchdog = window.setTimeout(() => {
      console.warn(
        `[PipelineRunner] pipeline "${pipeline.id}" still running after 30s; last stage=${lastStage}. Forcing endBusy so UI is not blocked.`,
      );
      endBusy();
      setBusy(false);
    }, 30000);
    try {
      const result = await pipeline.run(input, {
        onStageStart: (name) => {
          lastStage = name;
          if (dev) console.log(`[PipelineRunner] stage start: ${name}`);
          setBusyMessage(`執行中：${name}…`);
        },
      });
      if (dev) console.log(`[PipelineRunner] completed: ${pipeline.id}`);
      onResult?.(result);
    } catch (e) {
      console.error(`[PipelineRunner] pipeline "${pipeline.id}" failed at "${lastStage}":`, e);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      window.clearTimeout(watchdog);
      endBusy();
      setBusy(false);
      if (dev) console.log('[PipelineRunner] endBusy', pipeline.id);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <button
        onClick={run}
        disabled={!input || busy}
        style={{
          padding: '0.5rem 1rem',
          borderRadius: 'var(--radius-sm)',
          border: 'none',
          background: busy ? 'var(--surface-3)' : 'var(--primary)',
          color: 'var(--primary-fg)',
          cursor: busy ? 'not-allowed' : 'pointer',
          fontSize: 'var(--fs-sm)',
          fontWeight: 500,
        }}
      >
        {busy ? '執行中…' : label}
      </button>
      {error && <span style={{ color: 'var(--danger)', fontSize: 'var(--fs-xs)' }}>錯誤：{error}</span>}
    </div>
  );
}
