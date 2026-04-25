import { useCallback, useRef, useState } from 'react';

export interface UploadedImage {
  blob: Blob; // Always a raster image blob (png/jpeg), even if a PDF was dropped.
  url: string;
  width: number;
  height: number;
  name: string;
  sourceKind: 'image' | 'pdf';
  sourceSize: number; // original uploaded byte length
}

export interface ImageUploaderProps {
  onImage: (img: UploadedImage) => void;
  onError?: (message: string) => void;
}

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // mirrors server/app/image_intake.MAX_BYTES
const ALLOWED_EXT = ['.pdf', '.jpg', '.jpeg', '.png'];
const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
]);
const ACCEPT_ATTR = '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png';

function validate(file: File): string | null {
  const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
  const typeOk = ALLOWED_MIME.has(file.type) || ALLOWED_EXT.includes(ext);
  if (!typeOk) {
    return `不支援的檔案類型「${file.type || ext || '未知'}」,僅接受 JPG/JPEG、PNG、PDF。`;
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    return `檔案過大（${mb} MiB),上限為 10 MiB。`;
  }
  return null;
}

export function ImageUploader({ onImage, onError }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const reportError = useCallback(
    (msg: string) => {
      setLocalError(msg);
      onError?.(msg);
    },
    [onError],
  );

  const handleFile = useCallback(
    async (file: File) => {
      setLocalError(null);
      const err = validate(file);
      if (err) {
        reportError(err);
        return;
      }
      const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
      const isPdf = file.type === 'application/pdf' || ext === '.pdf';

      if (isPdf) {
        // PDF rendering happens server-side via pdf2image (page 1 only).
        // The preview blob here is the original PDF; the SPA uploads the
        // same base64 to the backend which returns detections against page 1.
        onImage({
          blob: file,
          url: URL.createObjectURL(file),
          width: 0, // unknown client-side; the backend renders it
          height: 0,
          name: file.name,
          sourceKind: 'pdf',
          sourceSize: file.size,
        });
        return;
      }

      const url = URL.createObjectURL(file);
      const img = new Image();
      img.src = url;
      try {
        await img.decode();
      } catch {
        reportError('無法解碼圖片,檔案可能已損毀。');
        return;
      }
      onImage({
        blob: file,
        url,
        width: img.naturalWidth,
        height: img.naturalHeight,
        name: file.name,
        sourceKind: 'image',
        sourceSize: file.size,
      });
    },
    [onImage, reportError],
  );

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files?.[0];
          if (f) void handleFile(f);
        }}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? 'var(--primary)' : 'var(--border-strong)'}`,
          background: dragging ? 'var(--primary-soft)' : 'var(--surface-2)',
          padding: '2rem',
          borderRadius: 'var(--radius)',
          textAlign: 'center',
          cursor: 'pointer',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTR}
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />
        <p style={{ margin: 0, color: 'var(--text-2)' }}>
          <strong>拖放檔案</strong>或點擊上傳
        </p>
        <p style={{ margin: '0.35rem 0 0', color: 'var(--text-3)', fontSize: 'var(--fs-xs)' }}>
          限格式為 JPG/JPEG、PNG、PDF (本系統只讀取第1頁) · 檔案大小限 10 MB
        </p>
      </div>
      {localError && (
        <p style={{ color: 'var(--danger)', fontSize: 'var(--fs-xs)', marginTop: 8 }}>{localError}</p>
      )}
    </div>
  );
}
