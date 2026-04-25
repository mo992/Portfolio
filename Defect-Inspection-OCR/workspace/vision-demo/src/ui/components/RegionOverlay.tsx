import { useEffect, useRef } from 'react';
import type { LayoutRegion, LayoutLabel } from '../../core/schemas/DocumentLayout';
import { cssVar } from '../tokens';

// Hex approximations of --sev-* / --text-* tokens (OKLCH → sRGB). Canvas fill
// concatenates alpha hex (e.g. color + '55'), which only works with 6-char hex,
// hence we keep literals here in sync with tokens.css.
const PALETTE: Record<LayoutLabel, string> = {
  title: '#d84a3a',        // sev-critical
  header: '#d99240',       // sev-high
  text: '#5b7dc4',         // sev-info
  list: '#4ea16a',         // sev-medium
  table: '#a062b0',        // sev-purple
  'table-cell': '#c995d2', // purple (lighter)
  figure: '#d85f85',       // sev-pink
  caption: '#4aa8a8',      // teal accent (outside 6-sev palette)
  footer: '#6b6656',       // text-3
  other: '#8a8574',        // text-4
};

export interface RegionOverlayProps {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  regions: LayoutRegion[];
  hoveredRegionId?: string;
  displayWidth?: number;
  showLegend?: boolean;
}

export function RegionOverlay({
  imageUrl,
  imageWidth,
  imageHeight,
  regions,
  hoveredRegionId,
  displayWidth = 640,
  showLegend = true,
}: RegionOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scale = displayWidth / imageWidth;
  const displayHeight = imageHeight * scale;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    img.src = imageUrl;
    const labelFg = cssVar('--primary-fg', '#ffffff');
    img.onload = () => {
      canvas.width = displayWidth;
      canvas.height = displayHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, displayWidth, displayHeight);
      ctx.lineWidth = 2;
      ctx.font = '14px "Inter", "Noto Sans TC", sans-serif';
      ctx.textBaseline = 'top';
      for (const r of regions) {
        const x = r.bbox.x * scale;
        const y = r.bbox.y * scale;
        const w = r.bbox.width * scale;
        const h = r.bbox.height * scale;
        const color = PALETTE[r.label] ?? PALETTE.other;
        const isHovered = hoveredRegionId === r.id;
        ctx.strokeStyle = color;
        ctx.fillStyle = color + (isHovered ? '55' : '22');
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = color;
        ctx.lineWidth = isHovered ? 3 : 2;
        ctx.strokeRect(x, y, w, h);
        const badge = `${r.label} ${(r.confidence * 100).toFixed(0)}%`;
        ctx.fillStyle = color;
        const tw = ctx.measureText(badge).width + 8;
        ctx.fillRect(x, Math.max(0, y - 16), tw, 16);
        ctx.fillStyle = labelFg;
        ctx.fillText(badge, x + 4, Math.max(0, y - 14));
      }
    };
  }, [imageUrl, regions, hoveredRegionId, displayWidth, displayHeight, scale]);

  return (
    <div style={{ position: 'relative' }}>
      <canvas ref={canvasRef} style={{ display: 'block', maxWidth: '100%' }} />
      {showLegend && (
        <div
          style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            marginTop: 8,
            fontSize: 'var(--fs-xs)',
          }}
        >
          {Object.entries(PALETTE).map(([label, color]) => (
            <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  background: color,
                  display: 'inline-block',
                  borderRadius: 2,
                }}
              />
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
