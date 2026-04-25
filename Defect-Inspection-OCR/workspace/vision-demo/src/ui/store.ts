import { create } from 'zustand';
import type { StageTiming } from '../core/telemetry/Tracer';
import type { MetricsSnapshot } from '../core/telemetry/MetricsCollector';

export type SceneId = 'defect' | 'measurement' | 'document' | 'agent';

export interface RunRecord {
  id: string;
  pipelineId: string;
  at: number;
  totalMs: number;
  stageTimings: StageTiming[];
  metrics: MetricsSnapshot;
}

interface PlatformState {
  scene: SceneId;
  setScene: (s: SceneId) => void;
  runs: RunRecord[];
  pushRun: (r: RunRecord) => void;
  clearRuns: () => void;
  // counter so concurrent jobs don't race the overlay closed
  busyCount: number;
  busyMessage: string | null;
  beginBusy: (message?: string) => void;
  setBusyMessage: (message: string | null) => void;
  endBusy: () => void;
}

export const usePlatformStore = create<PlatformState>((set) => ({
  scene: 'defect',
  setScene: (scene) => set({ scene }),
  runs: [],
  pushRun: (r) => set((s) => ({ runs: [r, ...s.runs].slice(0, 50) })),
  clearRuns: () => set({ runs: [] }),
  busyCount: 0,
  busyMessage: null,
  beginBusy: (message) =>
    set((s) => ({
      busyCount: s.busyCount + 1,
      busyMessage: message ?? s.busyMessage ?? '處理中…',
    })),
  setBusyMessage: (busyMessage) => set({ busyMessage }),
  endBusy: () =>
    set((s) => {
      const next = Math.max(0, s.busyCount - 1);
      return { busyCount: next, busyMessage: next === 0 ? null : s.busyMessage };
    }),
}));
