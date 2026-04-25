import { useEffect, useRef } from 'react';
import type { Detection } from '../../core/schemas/Detection';

export interface MaskOverlayProps {
  imageWidth: number;
  imageHeight: number;
  detections: Detection[];
  displayWidth?: number;
  alpha?: number;
}

// Hex approximations of the --sev-* CSS tokens (OKLCH → sRGB). ImageData requires
// numeric RGB channels, and parseInt-on-hex is the quickest path; keep these in
// sync with tokens.css if the severity palette is rethemed.
const PALETTE = ['#d84a3a', '#d99240', '#4ea16a', '#5b7dc4', '#a062b0', '#d85f85'];
function colorFor(label: string): [number, number, number] {
  let h = 0;
  for (let i = 0; i < label.length; i++) h = (h * 31 + label.charCodeAt(i)) >>> 0;
  const hex = PALETTE[h % PALETTE.length].slice(1);
  const n = parseInt(hex, 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

export function MaskOverlay({
  imageWidth,
  imageHeight,
  detections,
  displayWidth = 640,
  alpha = 0.5,
}: MaskOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scale = displayWidth / imageWidth;
  const displayHeight = imageHeight * scale;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = displayWidth;
    canvas.height = displayHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const d of detections) {
      if (!d.mask) continue;
      const [r, g, b] = colorFor(d.label);
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = d.mask.width;
      maskCanvas.height = d.mask.height;
      const mctx = maskCanvas.getContext('2d');
      if (!mctx) continue;
      const imgData = mctx.createImageData(d.mask.width, d.mask.height);
      const raw = d.mask.data instanceof Uint8Array ? d.mask.data : Uint8Array.from(d.mask.data);
      for (let i = 0; i < raw.length; i++) {
        const v = raw[i];
        imgData.data[i * 4] = r;
        imgData.data[i * 4 + 1] = g;
        imgData.data[i * 4 + 2] = b;
        imgData.data[i * 4 + 3] = v > 128 ? Math.round(alpha * 255) : 0;
      }
      mctx.putImageData(imgData, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(maskCanvas, 0, 0, displayWidth, displayHeight);
    }
  }, [detections, displayWidth, displayHeight, alpha]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        maxWidth: '100%',
      }}
    />
  );
}
