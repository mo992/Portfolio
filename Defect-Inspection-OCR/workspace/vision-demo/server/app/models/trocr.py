"""TrOCR handler:批次處理多個文字行 crops,可選用 ONNX Runtime。"""
from __future__ import annotations

import asyncio
import logging
import math
import os
import threading
from typing import Any, Dict, List, Optional

from ..device import get_onnx_providers, resolve_device
from .base import ModelHandler, decode_image

log = logging.getLogger("multimodal.server.trocr")

_MODEL_REF = os.getenv("TROCR_MODEL", "microsoft/trocr-base-printed")
_USE_ONNX = os.getenv("TROCR_USE_ONNX", "1") != "0"
_MAX_NEW_TOKENS = int(os.getenv("TROCR_MAX_NEW_TOKENS", "48"))

# 最小邊長
_TROCR_MIN_SIDE = 32


def _normalize_for_trocr(img, *, idx: int = 0):
    """確保產出處理器可接受的 RGB PIL image。"""
    pass

class TrocrHandler(ModelHandler):
    id = "trocr-printed"

    def __init__(self) -> None:
        pass

    def warmup(self) -> None:
        pass

    async def infer(
        self,
        input: Dict[str, Any],
        options: Dict[str, Any],
        task: Optional[str],
    ) -> Dict[str, Any]:
        pass

    async def _infer_single(self, input: Dict[str, Any]) -> Dict[str, Any]:
        pass

    async def _infer_batch(self, lines: List[Dict[str, Any]]) -> Dict[str, Any]:
        pass

    def _run_inference_sync(self, images):
        pass

    def _generate_with_scores(self, pixel_values):
        """執行 generate(),回傳 (texts, 信心值)。"""
        pass