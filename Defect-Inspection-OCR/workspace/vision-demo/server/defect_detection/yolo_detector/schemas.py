"""偵測結果的 Pydantic 資料模型"""
from __future__ import annotations

from typing import List

from pydantic import BaseModel


class BBox(BaseModel):
    x: float
    y: float
    width: float
    height: float


class Detection(BaseModel):
    label: str
    score: float
    class_id: int
    bbox: BBox


class DetectResponse(BaseModel):
    detections: List[Detection]
    model_ref: str
    inference_ms: float
    image_size: dict
