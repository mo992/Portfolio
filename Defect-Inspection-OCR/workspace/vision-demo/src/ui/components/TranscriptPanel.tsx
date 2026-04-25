import type { LayoutRegion } from '../../core/schemas/DocumentLayout';

export interface TranscriptPanelProps {
  regions: LayoutRegion[];
  hoveredRegionId?: string;
  onHover?: (id: string | undefined) => void;
}

export function TranscriptPanel({ regions, hoveredRegionId, onHover }: TranscriptPanelProps) {
  if (regions.length === 0) {
    return <p style={{ color: 'var(--text-3)', fontSize: 'var(--fs-xs)' }}>尚未產生轉譯結果 — 請先執行管線。</p>;
  }
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        maxHeight: 380,
        overflowY: 'auto',
        paddingRight: 8,
      }}
      onMouseLeave={() => onHover?.(undefined)}
    >
      {regions.map((r) => {
        const active = hoveredRegionId === r.id;
        return (
          <div
            key={r.id}
            onMouseEnter={() => onHover?.(r.id)}
            style={{
              padding: '0.5rem 0.75rem',
              borderLeft: `3px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
              background: active ? 'var(--primary-soft)' : 'var(--surface-2)',
              cursor: 'default',
            }}
          >
            <header
              style={{
                fontSize: 'var(--fs-sm)',
                textTransform: 'uppercase',
                color: 'var(--text-3)',
                letterSpacing: '0.05em',
              }}
            >
              {r.label} · {(r.confidence * 100).toFixed(0)}%
            </header>
            <p style={{ margin: '0.25rem 0 0', fontSize: 'var(--fs-sm)', whiteSpace: 'pre-wrap', color: 'var(--text)' }}>
              {r.text || <em style={{ color: 'var(--text-4)' }}>（空）</em>}
            </p>
          </div>
        );
      })}
    </div>
  );
}
