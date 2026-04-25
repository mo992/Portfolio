"""在 YOLO 格式資料集上訓練 YOLO 模型。

職責單純:給 data.yaml → fine-tune ultralytics.YOLO → 回傳 best 權重路徑。
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

log = logging.getLogger("autodistill_labeling.train")


@dataclass(frozen=True)
class TrainResult:
    best_weights: Path         # 通常是 `runs/detect/<run>/weights/best.pt`
    last_weights: Path
    run_dir: Path


class YoloTrainer:
    """ultralytics.YOLO.train() 的 thin wrapper """

    def __init__(
        self,
        *,
        base_weights: str = "yolov8n.pt",
        epochs: int = 50,
        imgsz: int = 640,
        batch: int = 16,
        device: str = "cpu",
        project: str = "runs/detect",
        name: str = "autodistill",
    ) -> None:
        pass

    def train(self, data_yaml: str | Path) -> TrainResult:
        pass