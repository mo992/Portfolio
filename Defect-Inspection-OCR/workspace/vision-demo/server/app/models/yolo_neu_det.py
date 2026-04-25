"""
對應 NEU-DET fine-tuned YOLOv8n (ONNX) 的 ModelHandler。
將 YoloOnnxDetector 包裝為前端 infer 介面,輸出符合 RawYoloHit 格式的偵測結果。
"""
from __future__ import annotations

from typing import Any, Callable, Dict, List, Optional

from defect_detection.yolo_detector.onnx_detector import YoloOnnxDetector

from ..image_intake import IntakeError, decode_upload
from .base import ModelHandler


class YoloNeuDetHandler(ModelHandler):
    id = "yolov8n-neu-det"

    def __init__(self, detector_factory: Callable[[], YoloOnnxDetector]) -> None:
        pass
    
    @property
    def is_loaded(self) -> bool:
        pass

    def warmup(self) -> None:
        pass

    async def infer(
        self,
        input: Dict[str, Any],
        options: Dict[str, Any],
        task: Optional[str],
    ) -> List[Dict[str, Any]]:
        pass