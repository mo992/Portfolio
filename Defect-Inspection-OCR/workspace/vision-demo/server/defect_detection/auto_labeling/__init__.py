"""Autodistill-Labeling:原始影像 ➜ 自動打標 (GroundingDINO) ➜ YOLO 權重。

三個單一職責的 class,由 pipeline.py 串起來:

- AutoLabeler  (label.py)  — 用 foundation model 跑一個資料夾的影像,
  輸出 YOLO 格式 labels + data.yaml。
- YoloTrainer  (train.py)  — 拿那份資料集呼叫 ultralytics.YOLO.train(),
  回傳 best.pt 路徑。
- WeightsExporter (export.py) — 選用,輸出 ONNX 或複製最佳權重。

autodistill / autodistill-grounded-sam 套件很重(約 1–2 GB),改成 lazy import,
這樣主 server 沒裝這些也能正常起。
"""