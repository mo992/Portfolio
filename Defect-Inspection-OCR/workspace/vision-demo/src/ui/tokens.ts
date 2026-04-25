export function cssVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export const SEVERITY_PALETTE = {
  critical: { var: '--sev-critical', fallback: '#d84a3a' },
  high:     { var: '--sev-high',     fallback: '#d99240' },
  medium:   { var: '--sev-medium',   fallback: '#4ea16a' },
  info:     { var: '--sev-info',     fallback: '#5b7dc4' },
  purple:   { var: '--sev-purple',   fallback: '#a062b0' },
  pink:     { var: '--sev-pink',     fallback: '#d85f85' },
} as const;

export function severityColors(): string[] {
  return [
    cssVar('--sev-critical', '#d84a3a'),
    cssVar('--sev-high',     '#d99240'),
    cssVar('--sev-medium',   '#4ea16a'),
    cssVar('--sev-info',     '#5b7dc4'),
    cssVar('--sev-purple',   '#a062b0'),
    cssVar('--sev-pink',     '#d85f85'),
  ];
}
