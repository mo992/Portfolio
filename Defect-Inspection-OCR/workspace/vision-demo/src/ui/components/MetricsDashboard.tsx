import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { StageTiming } from '../../core/telemetry/Tracer';
import { cssVar } from '../tokens';

export interface MetricsDashboardProps {
  timings: StageTiming[];
  totalMs?: number;
}

export function MetricsDashboard({ timings, totalMs }: MetricsDashboardProps) {
  const data = timings
    .filter((t) => !t.stage.startsWith('pipeline:'))
    .map((t) => ({ stage: t.stage, ms: Math.round(t.durationMs * 100) / 100 }));
  const total = totalMs ?? timings.reduce((a, t) => a + t.durationMs, 0);
  const barFill = cssVar('--primary', '#c86a3e');
  return (
    <div style={{ width: '100%', height: 240 }}>
      <h4 style={{ margin: '0 0 0.5rem', fontSize: 'var(--fs-lg)', color: 'var(--text)' }}>
        各階段延遲 — 總計 {total.toFixed(1)} ms
      </h4>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ left: 40, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" />
          <YAxis type="category" dataKey="stage" width={160} />
          <Tooltip />
          <Bar dataKey="ms" fill={barFill} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
