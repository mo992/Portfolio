"""YOLO 推論:封裝 ultralytics.YOLO,專注於單張影像偵測。

權重採 lazy load 並用 lock 保護,避免併發請求重複載入。
"""
from __future__ import annotations

import asyncio
import logging
import os
import threading
import time
from dataclasses import dataclass
from typing import Any, List, Optional

from PIL import Image

log = logging.getLogger("multimodal.server.yolo")


@dataclass
class YoloDetection:
    label: str
    score: float
    class_id: int
    x: float
    y: float
    width: float
    height: float


class YoloDetector:
    """ultralytics.YOLO 的 thin wrapper"""

    def __init__(
        self,
        *,
        weights: Optional[str] = None,
        device: Optional[str] = None,
        default_threshold: Optional[float] = None,
    ) -> None:
        from app.device import resolve_device

        self._weights = weights or os.getenv("YOLO_WEIGHTS", "yolov8n.pt")
        self._device = device or os.getenv("YOLO_DEVICE") or resolve_device()
        self._default_threshold = (
            default_threshold
            if default_threshold is not None
            else float(os.getenv("YOLO_THRESHOLD", "0.25"))
        )
        self._lock = threading.Lock()
        self._model: Optional[Any] = None

    @property
    def model_ref(self) -> str:
        return self._weights

    @property
    def is_loaded(self) -> bool:
        return self._model is not None

    def warmup(self) -> None:
        if self._model is not None:
            return
        with self._lock:
            if self._model is not None:
                return
            log.info("Importing ultralytics YOLO…")
            from ultralytics import YOLO

            log.info("Loading YOLO weights: %s (device=%s)", self._weights, self._device)
            model = YOLO(self._weights)
            try:
                model.to(self._device)
            except Exception as exc:  # pragma: no cover
                log.warning("Could not move YOLO to %s (%s); staying on default device", self._device, exc)
            self._model = model
            log.info("YOLO ready")

    async def detect(
        self,
        image: Image.Image,
        *,
        threshold: Optional[float] = None,
    ) -> dict:
        if self._model is None:
            await asyncio.to_thread(self.warmup)
        conf = threshold if threshold is not None else self._default_threshold
        start = time.perf_counter()
        results = await asyncio.to_thread(
            self._model.predict, image, conf=conf, verbose=False  # type: ignore[union-attr]
        )
        elapsed_ms = (time.perf_counter() - start) * 1000.0

        detections: List[YoloDetection] = []
        names = getattr(self._model, "names", {}) or {}
        if results:
            result = results[0]
            boxes = getattr(result, "boxes", None)
            if boxes is not None and len(boxes) > 0:
                xyxy = boxes.xyxy.tolist() if hasattr(boxes, "xyxy") else []
                confs = boxes.conf.tolist() if hasattr(boxes, "conf") else []
                cls_ids = boxes.cls.tolist() if hasattr(boxes, "cls") else []
                for (x1, y1, x2, y2), score, cls_id in zip(xyxy, confs, cls_ids):
                    cid = int(cls_id)
                    detections.append(
                        YoloDetection(
                            label=str(names.get(cid, cid)),
                            score=float(score),
                            class_id=cid,
                            x=float(x1),
                            y=float(y1),
                            width=float(x2 - x1),
                            height=float(y2 - y1),
                        )
                    )

        return {
            "detections": [
                {
                    "label": d.label,
                    "score": d.score,
                    "class_id": d.class_id,
                    "bbox": {"x": d.x, "y": d.y, "width": d.width, "height": d.height},
                }
                for d in detections
            ],
            "model_ref": self._weights,
            "inference_ms": elapsed_ms,
            "image_size": {"width": image.width, "height": image.height},
        }
