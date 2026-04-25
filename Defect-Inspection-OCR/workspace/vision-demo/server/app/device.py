"""推論裝置選擇:讀取 INFERENCE_DEVICE 環境變數(auto / cpu / cuda)。"""
from __future__ import annotations

import logging
import os
from typing import List

log = logging.getLogger("multimodal.server.device")


def resolve_device() -> str:
    pass

def get_onnx_providers() -> List[str]:
    pass