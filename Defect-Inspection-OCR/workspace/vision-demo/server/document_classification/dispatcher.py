"""把分類結果分派到下一步,職責單純:dispatch。"""
from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any, Dict, Optional

from PIL import Image

from .classifier import ClassifyResult
from .schemas import ClassifyResponse, DispatchResponse


@dataclass(frozen=True)
class DispatchTargets:
    frontend_url: str

    @classmethod
    def from_env(cls) -> "DispatchTargets":
        pass

class _DetectorProto:
    async def detect(
        self,
        image: Image.Image,
        *,
        threshold: float = 0.25,
    ) -> Dict[str, Any]:  # pragma: no cover - protocol
        ...


class ClassificationDispatcher:
    """收 ClassifyResult + PIL image,決定下一步;若是 image 就跑 YOLO。"""

    def __init__(
        self,
        detector: _DetectorProto,
        targets: Optional[DispatchTargets] = None,
    ) -> None:
        self._detector = detector
        self._targets = targets or DispatchTargets.from_env()

    async def dispatch(
        self,
        classification: ClassifyResult,
        image: Image.Image,
        *,
        threshold: float = 0.25,
    ) -> DispatchResponse:
        pass