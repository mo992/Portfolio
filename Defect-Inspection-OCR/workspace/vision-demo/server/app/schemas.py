"""Pydantic 資料模型,對應前端 FastAPIBackend 的 request/response。"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class InferRequest(BaseModel):
    input: Dict[str, Any]
    options: Optional[Dict[str, Any]] = None
    task: Optional[str] = None


class TrocrResponse(BaseModel):
    text: str
    confidence: Optional[float] = None
    line_id: Optional[str] = Field(default=None, alias="lineId")
    line_bbox: Optional[Dict[str, float]] = Field(default=None, alias="lineBbox")

    class Config:
        populate_by_name = True


class TrocrBatchLineInput(BaseModel):
    image_base64: str = Field(alias="imageBase64")
    media_type: Optional[str] = Field(default=None, alias="mediaType")
    line_id: Optional[str] = Field(default=None, alias="lineId")
    line_bbox: Optional[Dict[str, float]] = Field(default=None, alias="lineBbox")
    deskew_angle: Optional[float] = Field(default=None, alias="deskewAngle")

    class Config:
        populate_by_name = True


class TrocrBatchResponse(BaseModel):
    lines: List[TrocrResponse]


class HealthResponse(BaseModel):
    status: str
    loaded_models: List[str]
