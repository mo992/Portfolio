# Defect-Inspection-OCR

展示用的工業視覺場景 Demo。

- **瑕疵檢測** — YOLOv8n 使用 NEU-DET 鋼材表面瑕疪資料微調 YOLOv8n 模型，使用 ONNX 優化 Runtime 推論，模型的訓練與推論視環境自動切換 GPU/CPU。
- **文件辨識** — YOLOv8s 偵測文本行 → 後處理 → TrOCR解析出文字內容。

**技術**：React + Vite 前端；FastAPI + ONNX Runtime 後端；OpenCV 後處理；pytest / vitest 測試。

**Demo**
![瑕疵檢測 Demo](./Defect-Inspection-OCR/Results/Patches-Result.jpg)
![](./Defect-Inspection-OCR/Results/Mix-Result.jpg)
![](./Defect-Inspection-OCR/Results/Inclusion-Result.jpg)
![](./Defect-Inspection-OCR/Results/Rolled-In-Scale-Result.jpg)
![](./Defect-Inspection-OCR/Results/Pitted-Surface-Result.jpg)
![OCR 流程](./Defect-Inspection-OCR/Results/OCR-Result.jpg)
![前端介面](./Defect-Inspection-OCR/Results/UI-Detect-inspection.jpg)
![](./Defect-Inspection-OCR/Results/UI-OCR.jpg)

**授權**：PolyForm Noncommercial 1.0.0 — 禁止商業使用與再散布。
