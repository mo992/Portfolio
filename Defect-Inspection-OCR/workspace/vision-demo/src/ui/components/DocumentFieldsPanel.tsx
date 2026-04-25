import { useState } from 'react';
import type { DocumentField } from '../../core/schemas/DocumentField';
import type { DocumentLayout } from '../../core/schemas/DocumentLayout';

export interface DocumentFieldsPanelProps {
  fields: DocumentField[];
  layout?: DocumentLayout;
}

export function DocumentFieldsPanel({ fields, layout }: DocumentFieldsPanelProps) {
  const [tab, setTab] = useState<'fields' | 'json'>('fields');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <nav style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => setTab('fields')}
          style={tabStyle(tab === 'fields')}
        >
          欄位（{fields.length}）
        </button>
        <button
          onClick={() => setTab('json')}
          style={tabStyle(tab === 'json')}
        >
          原始 JSON
        </button>
      </nav>
      {tab === 'fields' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {fields.length === 0 ? (
            <p style={{ color: 'var(--text-3)', fontSize: 'var(--fs-xs)' }}>尚未擷取任何欄位。</p>
          ) : (
            fields.map((f, i) => (
              <div
                key={`${f.key}-${i}`}
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.5rem 0.75rem',
                }}
              >
                <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {f.key}
                </div>
                <div style={{ fontSize: 'var(--fs-base)', marginTop: 2, color: 'var(--text)' }}>
                  {f.value || <em style={{ color: 'var(--text-4)' }}>（無資料）</em>}
                </div>
                <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-4)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                  信心度：{(f.confidence * 100).toFixed(0)}%
                </div>
              </div>
            ))
          )}
        </div>
      )}
      {tab === 'json' && (
        <pre
          style={{
            background: 'var(--code-bg)',
            color: 'var(--code-fg)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--fs-sm)',
            padding: '0.75rem',
            borderRadius: 'var(--radius-sm)',
            maxHeight: 360,
            overflow: 'auto',
          }}
        >
          {JSON.stringify(layout ?? fields, null, 2)}
        </pre>
      )}
    </div>
  );
}

function tabStyle(active: boolean): React.CSSProperties {
  return {
    padding: '0.35rem 0.75rem',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid',
    borderColor: active ? 'var(--primary)' : 'var(--border)',
    background: active ? 'var(--primary-soft)' : 'var(--surface)',
    color: 'var(--text)',
    cursor: 'pointer',
    fontSize: 'var(--fs-xs)',
  };
}
