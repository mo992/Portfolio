"""FastAPI 入口:多模態視覺平台對外 HTTP API。

所有 ML 推論統一走 POST /models/{model_id}/infer。
路由清單以 GET / 回傳的 endpoints 為準。
"""
from __future__ import annotations

import logging
import os
from typing import Any, Dict, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .eval_router import build_router as build_eval_router
from .image_intake import IntakeError
from .models.text_line import TextLineHandler
from .models.yolo_neu_det import YoloNeuDetHandler
from .registry import MODEL_REGISTRY
from .schemas import HealthResponse, InferRequest

from document_classification.classifier import DocumentImageClassifier
from document_classification.dispatcher import ClassificationDispatcher
from document_classification.gemini_client import GeminiVisionClient
from document_classification.local_vlm_client import SmolVLMClient
from document_classification.router import build_router as build_classify_router
from defect_detection.yolo_detector.onnx_detector import YoloOnnxDetector

log = logging.getLogger("multimodal.server")
logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))

app = FastAPI(title="Multimodal Vision Platform Server", version="0.3.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173").split(","),
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


_gemini_client: Optional[GeminiVisionClient] = None
_local_vlm_client: Optional[SmolVLMClient] = None
_classifier: Optional[DocumentImageClassifier] = None
_yolo_detector: Optional[YoloOnnxDetector] = None
_dispatcher: Optional[ClassificationDispatcher] = None


def _get_vision_client():
    """有 GOOGLE_API_KEY 則用 Gemini,否則 fallback 到本地 SmolVLM。"""
    pass

def _get_classifier() -> DocumentImageClassifier:
    pass

def _get_yolo_detector() -> YoloOnnxDetector:
    pass

def _get_dispatcher() -> ClassificationDispatcher:
    pass

MODEL_REGISTRY["yolov8n-neu-det"] = YoloNeuDetHandler(
    detector_factory=_get_yolo_detector
)
MODEL_REGISTRY["text-line-cv"] = TextLineHandler()


# --- Routers --------------------------------------------------------------------

app.include_router(
    build_classify_router(
        classifier_factory=_get_classifier,
        dispatcher_factory=_get_dispatcher,
        model_name=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
    ),
    prefix="/classify",
    tags=["classify"],
)

app.include_router(build_eval_router(), prefix="/eval", tags=["eval"])


# --- Lifecycle ------------------------------------------------------------------

@app.on_event("startup")
async def _on_startup() -> None:
    pass
# --- Core routes ---------------------------------------------------------------

@app.get("/")
async def index() -> Dict[str, Any]:
    pass

@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    pass

@app.post("/models/{model_id}/infer")
async def infer(model_id: str, req: InferRequest) -> Any:
    pass