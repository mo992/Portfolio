"""Classification 的 HTTP 入口層,組裝邏輯放在 app/main.py。"""
from __future__ import annotations

from typing import Callable, Optional

from fastapi import APIRouter, HTTPException

from app.image_intake import IntakeError, decode_upload

from .gemini_client import ClassifierConfigError
from .classifier import DocumentImageClassifier
from .dispatcher import ClassificationDispatcher
from .schemas import ClassifierHealth, ClassifyRequest, ClassifyResponse, DispatchResponse


def build_router(
    *,
    classifier_factory: Callable[[], DocumentImageClassifier],
    dispatcher_factory: Optional[Callable[[], ClassificationDispatcher]] = None,
    model_name: str = "gemini-2.5-flash",
) -> APIRouter:
    """Constructor-style router:caller 注入 factory,
    測試時可以替換 classifier 跟 dispatcher,不用 patch module。"""
    pass