# Defect-Inspection-OCR

展示用的工業視覺場景 Demo。

- **瑕疵檢測** — YOLOv8n 使用 NEU-DET 鋼材表面瑕疪資料微調 YOLOv8n 模型，使用 ONNX 優化 Runtime 推論，模型的訓練與推論視環境自動切換 GPU/CPU。
- **文件辨識** — YOLOv8s 偵測文本行 → 後處理 → TrOCR解析出文字內容。

**技術**：React + Vite 前端；FastAPI + ONNX Runtime 後端；OpenCV 後處理；pytest / vitest 測試。

**Demo**
**瑕疵檢測**

![](Results/Patches-Result.jpg)

![](Results/Mix-Result.jpg)

![](Results/Inclusion-Result.jpg)

![](Results/Rolled-In-Scale-Result.jpg)

![](Results/Pitted-Surface-Result.jpg)

**OCR 流程**

![](Results/OCR-Result.jpg)

**前端介面**

![](Results/UI-Detect-inspection.jpg)

![](Results/UI-OCR.jpg)

**授權**：PolyForm Noncommercial 1.0.0 — 禁止商業使用與再散布。
