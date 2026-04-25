"""Model handler 註冊表。新增模型在此加一行即可。

每個 handler 提供:
- is_loaded: bool
- warmup() -> None
- async infer(input, options, task) -> dict
"""
from __future__ import annotations

from typing import Dict

from .models.base import ModelHandler
from .models.trocr import TrocrHandler


MODEL_REGISTRY: Dict[str, ModelHandler] = {
    "trocr-printed": TrocrHandler(),
}
