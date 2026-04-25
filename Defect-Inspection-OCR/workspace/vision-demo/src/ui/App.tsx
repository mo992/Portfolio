import { useEffect } from 'react';
import { usePlatformStore, type SceneId } from './store';
import { DefectInspectionScene } from './scenes/DefectInspectionScene';
import { DocumentUnderstandingScene } from './scenes/DocumentUnderstandingScene';
import { BusyOverlay } from './components/BusyOverlay';
import { registerAllModels } from '../models';
import { registerAllPipelines } from '../pipelines';
import { registerBackend } from '../core/backends/InferenceBackend';
import { FastAPIBackend } from '../core/backends/FastAPIBackend';
import { API_BASE_URL } from '../core/config';

const SCENES: Array<{ id: SceneId; label: string }> = [
  { id: 'defect', label: '瑕疵檢測' },
  { id: 'document', label: '文件辨識' },
];

export function App() {
  const scene = usePlatformStore((s) => s.scene);
  const setScene = usePlatformStore((s) => s.setScene);

  useEffect(() => {
    registerBackend(new FastAPIBackend({ baseUrl: API_BASE_URL }));
    registerAllModels();
    registerAllPipelines();
  }, []);

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '1.5rem' }}>
      <header style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0 }}>Vision Demo</h1>
      </header>
      <nav style={{ display: 'flex', gap: 8, marginBottom: '1.5rem' }}>
        {SCENES.map((s) => (
          <button
            key={s.id}
            onClick={() => setScene(s.id)}
            style={{
              padding: '0.4rem 0.9rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid',
              borderColor: scene === s.id ? 'var(--primary)' : 'var(--border)',
              background: scene === s.id ? 'var(--primary-soft)' : 'var(--surface)',
              color: 'var(--text)',
              cursor: 'pointer',
            }}
          >
            {s.label}
          </button>
        ))}
      </nav>
      <main>
        {scene === 'defect' && <DefectInspectionScene />}
        {scene === 'document' && <DocumentUnderstandingScene />}
      </main>
      <BusyOverlay />
    </div>
  );
}
