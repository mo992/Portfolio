import { useEffect, useRef } from 'react';
import type { Detection } from '../../core/schemas/Detection';
import { cssVar, severityColors } from '../tokens';

export interface DetectionOverlayProps {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  detections: Detection[];
  displayWidth?: number;
}

function colorFor(label: string, palette: string[]): string {
  let h = 0;
  for (let i = 0; i < label.length; i++) h = (h * 31 + label.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

export function DetectionOverlay({
  imageUrl,
  imageWidth,
  imageHeight,
  detections,
  displayWidth = 640,
}: DetectionOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scale = displayWidth / imageWidth;
  const displayHeight = imageHeight * scale;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    const palette = severityColors();
    const labelBg = cssVar('--primary-fg', '#ffffff');
    img.onload = () => {
      canvas.width = displayWidth;
      canvas.height = displayHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, displayWidth, displayHeight);
      ctx.lineWidth = 2;
      ctx.font = '14px "Inter", "Noto Sans TC", sans-serif';
      ctx.textBaseline = 'top';
      for (const d of detections) {
        const x = d.bbox.x * scale;
        const y = d.bbox.y * scale;
        const w = d.bbox.width * scale;
        const h = d.bbox.height * scale;
        const color = colorFor(d.label, palette);
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.strokeRect(x, y, w, h);
        const label = `${d.label} ${(d.score * 100).toFixed(0)}%`;
        const textWidth = ctx.measureText(label).width + 8;
        ctx.fillRect(x, Math.max(0, y - 18), textWidth, 18);
        ctx.fillStyle = labelBg;
        ctx.fillText(label, x + 4, Math.max(0, y - 16));
      }
    };
  }, [imageUrl, detections, displayWidth, displayHeight, scale]);

  return <canvas ref={canvasRef} style={{ display: 'block', maxWidth: '100%' }} />;
}
