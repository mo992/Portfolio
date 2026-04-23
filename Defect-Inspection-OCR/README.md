# Defect-Inspection-OCR

面試展示用的工業視覺雙場景 Demo。

- **瑕疵檢測** — YOLOv8n 於 NEU-DET 鋼材表面六類缺陷微調，ONNX Runtime 推論，GPU/CPU 自動切換。
- **文件辨識** — YOLOv8s 逐字偵測 → centre-distance 聚類合併為行 + QR 遮罩 + 欄寬拆分 → 批次送入 TrOCR。

**技術**：React + Vite 前端；FastAPI + ONNX Runtime 後端；OpenCV 後處理；pytest / vitest 測試。

**授權**：PolyForm Noncommercial 1.0.0 — 禁止商業使用與再散布。
