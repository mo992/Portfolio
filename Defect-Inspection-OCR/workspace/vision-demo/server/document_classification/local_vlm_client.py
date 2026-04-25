"""Local VLM fallback:透過 transformers 跑 SmolVLM-500M-Instruct。

實作 classifier.py 的 _ClientProto:async send_image(...) 回傳帶 .text 的物件。

GOOGLE_API_KEY 沒設時(開發 / demo / 離線)會用這個。
第一次呼叫時 lazy load 權重(從 HF Hub 拉約 1 GB),
用 asyncio.to_thread 包起來,不會卡到 event loop。
"""

from __future__ import annotations

import asyncio
import base64
import io
import logging
import os
import threading
from dataclasses import dataclass
from typing import Any, Optional

from PIL import Image

from app.device import resolve_device

log = logging.getLogger("multimodal.server.local_vlm")

_MODEL_REF = os.getenv("LOCAL_VLM_MODEL", "HuggingFaceTB/SmolVLM-500M-Instruct")


@dataclass(frozen=True)
class LocalVLMMessage:
    text: str


class SmolVLMClient:
    """本地 SmolVLM client;第一次 send_image() 時才 lazy load 權重。"""

    is_configured = True  # No API key needed — always "configured" from the router's POV.

    def __init__(self, *, model_ref: Optional[str] = None) -> None:
        pass

    def warmup(self) -> None:
        pass

    async def send_image(
        self,
        *,
        image_base64: str,
        media_type: str,
        prompt: str,
        max_tokens: int = 256,
    ) -> LocalVLMMessage:
        pass

    def _run_sync(self, image_base64: str, prompt: str, max_tokens: int) -> str:
        pass