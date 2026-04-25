"""Document vs image 分類器:純邏輯,Gemini client 從外部注入。

職責單純:給一張圖,回傳 {label, confidence, reasoning}。
不碰 HTTP、不依賴 FastAPI。可以用 fake GeminiVisionClient 完整測試。
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Literal, Optional, Protocol

ClassifyLabel = Literal["document", "image"]


class _ClientProto(Protocol):
    async def send_image(
        self,
        *,
        image_base64: str,
        media_type: str,
        prompt: str,
        max_tokens: int = ...,
    ) -> object: ...


@dataclass(frozen=True)
class ClassifyResult:
    label: ClassifyLabel
    confidence: float
    reasoning: str


_PROMPT = (
    "You are a vision classifier. Decide whether the attached image is a "
    "DOCUMENT (contains printed or handwritten text that an OCR system should read — "
    "invoices, receipts, forms, letters, reports, tables, scanned pages) "
    "or a general IMAGE / photograph (scenes, objects, people, products, industrial parts).\n"
    "Respond strictly as JSON on one line:\n"
    '{"label": "document" | "image", "confidence": <float 0..1>, "reasoning": "<one sentence>"}\n'
    "Do not include any other text."
)


class DocumentImageClassifier:
    """Classifies an image as document or non-document via an MLLM."""

    def __init__(self, client: _ClientProto, *, prompt: str = _PROMPT) -> None:
        self._client = client
        self._prompt = prompt

    async def classify(
        self,
        *,
        image_base64: str,
        media_type: str = "image/png",
    ) -> ClassifyResult:
        pass

    @staticmethod
    def _parse(raw_text: str) -> ClassifyResult:
        pass

_JSON_OBJECT_RE = re.compile(r"\{[^{}]*\}", re.DOTALL)


def _extract_json(text: str) -> Optional[dict]:
    pass