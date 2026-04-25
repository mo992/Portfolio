import { useEffect } from 'react';
import { usePlatformStore } from '../store';

const SPINNER_KEYFRAMES = '@keyframes mvp-busy-spin{to{transform:rotate(360deg)}}';

export function BusyOverlay() {
  const active = usePlatformStore((s) => s.busyCount > 0);
  const message = usePlatformStore((s) => s.busyMessage);

  const escape = () => {
    console.warn('[BusyOverlay] forced dismiss by user');
    usePlatformStore.setState({ busyCount: 0, busyMessage: null });
  };

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') escape();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);

  if (!active) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(28, 26, 20, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'auto',
        cursor: 'wait',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) escape();
        else e.stopPropagation();
      }}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <style>{SPINNER_KEYFRAMES}</style>
      <div
        style={{
          background: 'var(--surface)',
          borderRadius: 'var(--radius)',
          padding: '1.25rem 1.75rem',
          minWidth: 220,
          boxShadow: 'var(--shadow)',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            border: '3px solid var(--border)',
            borderTopColor: 'var(--primary)',
            animation: 'mvp-busy-spin 0.9s linear infinite',
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <strong style={{ color: 'var(--text)', fontSize: 'var(--fs-sm)' }}>{message ?? '處理中…'}</strong>
          <span style={{ color: 'var(--text-3)', fontSize: 'var(--fs-xs)' }}>
            模型推論中 — 點擊背景或按 Esc 可關閉
          </span>
        </div>
      </div>
    </div>
  );
}
