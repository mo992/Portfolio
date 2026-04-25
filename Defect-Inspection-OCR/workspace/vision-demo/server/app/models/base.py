from __future__ import annotations

import base64
import io
from abc import ABC, abstractmethod
from typing import Any, Dict, Optional

from PIL import Image


def decode_image(payload: Dict[str, Any]) -> Image.Image:
    """從 payload 取出 base64 影像,回傳 PIL RGB image。"""
    pass

class ModelHandler(ABC):
    id: str
    _loaded: bool = False

    @property
    def is_loaded(self) -> bool:
        pass

    @abstractmethod
    def warmup(self) -> None:  # pragma: no cover - implementation per handler
        pass

    @abstractmethod
    async def infer(
        self,
        input: Dict[str, Any],
        options: Dict[str, Any],
        task: Optional[str],
    ) -> Dict[str, Any]:  # pragma: no cover
        pass