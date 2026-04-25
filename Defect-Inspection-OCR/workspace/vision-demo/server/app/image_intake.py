"""使用者上傳影像/PDF 的單一入口。

統一處理解碼、格式檢查與基本驗證,輸出給下游的是 PIL RGB image,
另提供 numpy 格式的轉換 helper。
"""
from __future__ import annotations

import base64
import io
import logging
import time
from dataclasses import dataclass
from typing import Any, Dict, Tuple

import numpy as np
from PIL import Image, UnidentifiedImageError

log = logging.getLogger("multimodal.server.image_intake")

MAX_BYTES = 10 * 1024 * 1024  # 10 MiB

_JPEG_MAGIC = b"\xff\xd8\xff"
_PNG_MAGIC = b"\x89PNG\r\n\x1a\n"
_PDF_MAGIC = b"%PDF-"


class IntakeError(ValueError):
    """上傳資料不符合規範時拋出。"""


@dataclass(frozen=True)
class DecodedUpload:
    image: Image.Image  # PIL, RGB, always
    kind: str  # 'jpeg' | 'png' | 'pdf'
    size_bytes: int  # decoded byte length (for PDF, the source PDF length)


def _sniff(raw: bytes) -> str:
    pass

def _b64_from_input(payload: Any) -> str:
    pass

def decode_upload(payload: Any) -> DecodedUpload:
    """解碼並驗證上傳資料,PDF 取首頁,回傳 PIL RGB image。"""
    pass

def _render_pdf_first_page(raw_pdf: bytes) -> Image.Image:
    """渲染 PDF 首頁為 PIL image。"""
    pass

def to_rgb_array(img: Image.Image) -> np.ndarray:
    """PIL RGB image → HxWx3 uint8 numpy array (RGB 順序)."""
    pass

def to_bgr_array(img: Image.Image) -> np.ndarray:
    """PIL RGB → HxWx3 uint8 numpy(BGR 順序,給 cv2 用)。"""
    pass

__all__ = [
    "MAX_BYTES",
    "DecodedUpload",
    "IntakeError",
    "decode_upload",
    "to_rgb_array",
    "to_bgr_array",
]
