import type { EvalReport } from '../harness';

export function reportToMarkdown(report: EvalReport): string {
  const header = `# Evaluation Report

- **Pipeline:** \`${report.pipelineId}\`
- **Dataset:** \`${report.datasetId}\`
- **Run at:** ${report.runAt}
- **Samples:** ${report.sampleCount}
- **Avg latency:** ${report.avgLatencyMs.toFixed(1)} ms
- **Avg IoU:** ${report.avgIou.toFixed(3)}

## Aggregate detection metrics (IoU ≥ 0.5)

| Metric | Value |
|---|---|
| Precision | ${report.aggregate.precision.toFixed(3)} |
| Recall | ${report.aggregate.recall.toFixed(3)} |
| F1 | ${report.aggregate.f1.toFixed(3)} |
| True positives | ${report.aggregate.truePositives} |
| False positives | ${report.aggregate.falsePositives} |
| False negatives | ${report.aggregate.falseNegatives} |

## Per-sample

| Sample | Latency (ms) | IoU | Precision | Recall | F1 | Note |
|---|---|---|---|---|---|---|
`;

  const rows = report.perSample
    .map((s) => {
      const note = s.error ? `ERROR: ${s.error}` : '';
      return `| ${s.sampleId} | ${s.latencyMs.toFixed(1)} | ${s.iou.toFixed(3)} | ${s.precisionRecall.precision.toFixed(3)} | ${s.precisionRecall.recall.toFixed(3)} | ${s.precisionRecall.f1.toFixed(3)} | ${note} |`;
    })
    .join('\n');

  return header + rows + '\n';
}
