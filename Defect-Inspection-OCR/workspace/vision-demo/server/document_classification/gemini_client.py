"""Google Gemini generateContent API 的 HTTP client,只做這件事。

職責單純:送圖片 + prompt,回傳純文字內容。不碰分類邏輯、不負責解析回應 ——
那是 DocumentImageClassifier 的工作。
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Optional

import httpx


class ClassifierConfigError(RuntimeError):
    """Gemini client 缺少必要設定時 raise。"""

@dataclass(frozen=True)
class GeminiMessage:
    text: str


class GeminiVisionClient:
    """非同步 client,把 base64 圖片 + prompt POST 給 Gemini 並回傳文字。

    建構時可注入 httpx.AsyncClient,測試可以塞 fake 進來,不用 monkey-patch。
    """

    _URL_TEMPLATE = (
        "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    )

    def __init__(
        self,
        *,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        http_client: Optional[httpx.AsyncClient] = None,
        timeout_seconds: float = 30.0,
    ) -> None:
        pass

    @property
    def is_configured(self) -> bool:
        pass

    async def send_image(
        self,
        *,
        image_base64: str,
        media_type: str,
        prompt: str,
        max_tokens: int = 256,
    ) -> GeminiMessage:
        pass

    def _client(self):
        pass


class _NoCloseAsyncClient:
    """Adapter:讓注入的 httpx.AsyncClient 不會被 async with 關掉。"""

    def __init__(self, inner: httpx.AsyncClient) -> None:
        pass

    async def __aenter__(self) -> httpx.AsyncClient:
        pass

    async def __aexit__(self, *_exc) -> None:
        pass