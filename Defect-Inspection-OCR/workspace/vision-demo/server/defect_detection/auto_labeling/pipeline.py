"""End-to-end orchestrator:原始影像 ➜ 自動打標 ➜ 訓練 ➜ 輸出權重。

只負責組合,各階段的實作都在自己的單一職責 class 裡。
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Optional

from .export import ExportResult, WeightsExporter
from .label import AutoLabeler, LabelResult
from .train import TrainResult, YoloTrainer

log = logging.getLogger("autodistill_labeling.pipeline")


@dataclass(frozen=True)
class PipelineResult:
    label: Optional[LabelResult]
    train: TrainResult
    export: ExportResult


class AutodistillPipeline:
    """
    兩個進入點:

    - run_from_images() — 原始影像 + ontology → 自動打標 → 訓練 → 輸出。
    - run_from_labeled_dataset() — 已打標的 YOLO 資料集 → 訓練 → 輸出。
      適用於下載好的現成資料集(例如 Roboflow、COCO 轉檔)。
    """

    def __init__(
        self,
        labeler: Optional[AutoLabeler] = None,
        trainer: Optional[YoloTrainer] = None,
        exporter: Optional[WeightsExporter] = None,
    ) -> None:
        pass
    
    def run_from_images(
        self,
        images_dir: str | Path,
        dataset_out: str | Path,
        weights_out: str | Path,
        *,
        to_onnx: bool = False,
    ) -> PipelineResult:
        pass

    def run_from_labeled_dataset(
        self,
        data_yaml: str | Path,
        weights_out: str | Path,
        *,
        to_onnx: bool = False,
    ) -> PipelineResult:
        pass