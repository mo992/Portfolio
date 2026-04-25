"""Classification API 的 request/response schemas。"""
from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


class ClassifyRequest(BaseModel):
    image_base64: str = Field(alias="imageBase64")
    media_type: str = Field(default="image/png", alias="mediaType")

    class Config:
        populate_by_name = True


class ClassifyResponse(BaseModel):
    label: Literal["document", "image"]
    confidence: float
    reasoning: str


class DispatchResponse(BaseModel):
    classification: ClassifyResponse
    next: Literal["detect-ui", "frontend-document-understanding"]
    url: Optional[str] = None
    result: Optional[Dict[str, Any]] = None


class ClassifierHealth(BaseModel):
    configured: bool
    model: str
    dependencies: List[str]
