"""YOLOv8 ONNX Runtime 推論,介面與 YoloDetector 對齊以便互換。

類別名稱優先讀 ONNX metadata,缺漏時 fallback 到內建表。
"""
from __future__ import annotations

import asyncio
import ast
import logging
import os
import threading
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from PIL import Image

log = logging.getLogger("multimodal.server.yolo_onnx")

# 預設權重相對於本檔解析,uvicorn 在任何 CWD 都能跑。
_DEFAULT_WEIGHTS = str(
    Path(__file__).resolve().parents[2] / "weights" / "yolov8n-neu-det.onnx"
)

_NEU_DET_FALLBACK_NAMES: Dict[int, str] = {
    0: "crazing",
    1: "inclusion",
    2: "patches",
    3: "pitted_surface",
    4: "rolled-in_scale",
    5: "scratches",
}


@dataclass
class YoloDetection:
    label: str
    score: float
    class_id: int
    x: float
    y: float
    width: float
    height: float


class YoloOnnxDetector:
    """YOLOv8 .onnx 的 ONNX Runtime 封裝"""

    def __init__(
        self,
        *,
        weights: Optional[str] = None,
        default_threshold: Optional[float] = None,
        iou_threshold: Optional[float] = None,
    ) -> None:
        self._weights = weights or os.getenv("YOLO_WEIGHTS", _DEFAULT_WEIGHTS)
        self._default_threshold = (
            default_threshold
            if default_threshold is not None
            else float(os.getenv("YOLO_THRESHOLD", "0.25"))
        )
        self._iou_threshold = (
            iou_threshold
            if iou_threshold is not None
            else float(os.getenv("YOLO_IOU", "0.45"))
        )
        self._lock = threading.Lock()
        self._session: Optional[Any] = None
        self._input_name: Optional[str] = None
        self._input_size: Tuple[int, int] = (640, 640)  # (w, h); refined at warmup
        self._names: Dict[int, str] = {}

    @property
    def model_ref(self) -> str:
        return self._weights

    @property
    def is_loaded(self) -> bool:
        return self._session is not None

    def warmup(self) -> None:
        if self._session is not None:
            return
        with self._lock:
            if self._session is not None:
                return
            import onnxruntime as ort

            from app.device import get_onnx_providers

            providers = get_onnx_providers()
            log.info("Loading YOLO ONNX weights: %s (providers=%s)", self._weights, providers)
            try:
                sess = ort.InferenceSession(self._weights, providers=providers)
            except Exception as exc:  # pragma: no cover - fallback if CUDA EP unavailable
                if providers != ["CPUExecutionProvider"]:
                    log.warning(
                        "ONNX session init failed with %s (%s); falling back to CPU",
                        providers,
                        exc,
                    )
                    sess = ort.InferenceSession(
                        self._weights, providers=["CPUExecutionProvider"]
                    )
                else:
                    raise
            inputs = sess.get_inputs()
            if not inputs:
                raise RuntimeError(f"ONNX model {self._weights!r} has no inputs")
            self._input_name = inputs[0].name
            shape = inputs[0].shape
            # YOLOv8 exports as [N, 3, H, W]; H/W may be symbolic strings for dynamic axes
            h = shape[2] if isinstance(shape[2], int) else 640
            w = shape[3] if isinstance(shape[3], int) else 640
            self._input_size = (int(w), int(h))
            self._names = _parse_names(
                sess.get_modelmeta().custom_metadata_map.get("names")
            ) or dict(_NEU_DET_FALLBACK_NAMES)
            self._session = sess
            log.info(
                "YOLO ONNX ready (input=%s, size=%s, classes=%d, providers=%s)",
                self._input_name,
                self._input_size,
                len(self._names),
                sess.get_providers(),
            )
            try:
                w, h = self._input_size
                dummy = np.zeros((1, 3, h, w), dtype=np.float32)
                t0 = time.perf_counter()
                sess.run(None, {self._input_name: dummy})
                log.info(
                    "YOLO ONNX warmup inference: warmup_onnx_ms=%.1f",
                    (time.perf_counter() - t0) * 1000.0,
                )
            except Exception as exc:
                log.warning("YOLO ONNX warmup forward pass failed: %s", exc)

    async def detect(
        self,
        image: Image.Image,
        *,
        threshold: Optional[float] = None,
    ) -> Dict[str, Any]:
        if self._session is None:
            await asyncio.to_thread(self.warmup)
        conf = threshold if threshold is not None else self._default_threshold
        start = time.perf_counter()
        detections, timings = await asyncio.to_thread(self._run_sync, image, conf)
        elapsed_ms = (time.perf_counter() - start) * 1000.0

        log.info(
            "YOLO detect: image=(%d,%d) letterbox_ms=%.1f onnx_ms=%.1f "
            "postprocess_ms=%.1f total_ms=%.1f",
            image.width,
            image.height,
            timings["letterbox_ms"],
            timings["onnx_ms"],
            timings["postprocess_ms"],
            elapsed_ms,
        )

        return {
            "detections": [
                {
                    "label": d.label,
                    "score": d.score,
                    "class_id": d.class_id,
                    "bbox": {"x": d.x, "y": d.y, "width": d.width, "height": d.height},
                }
                for d in detections
            ],
            "model_ref": self._weights,
            "inference_ms": elapsed_ms,
            "timings": timings,
            "image_size": {"width": image.width, "height": image.height},
        }

    def _run_sync(
        self, image: Image.Image, conf: float
    ) -> Tuple[List[YoloDetection], Dict[str, float]]:
        assert self._session is not None and self._input_name is not None

        t0 = time.perf_counter()
        tensor, scale, pad_x, pad_y = _letterbox(image, self._input_size)
        t1 = time.perf_counter()
        outputs = self._session.run(None, {self._input_name: tensor})
        t2 = time.perf_counter()
        raw = outputs[0]  # [1, 4+nc, N]
        detections = _postprocess(
            raw,
            names=self._names,
            conf_threshold=conf,
            iou_threshold=self._iou_threshold,
            scale=scale,
            pad_x=pad_x,
            pad_y=pad_y,
            orig_w=image.width,
            orig_h=image.height,
        )
        t3 = time.perf_counter()

        timings = {
            "letterbox_ms": (t1 - t0) * 1000.0,
            "onnx_ms": (t2 - t1) * 1000.0,
            "postprocess_ms": (t3 - t2) * 1000.0,
        }
        return detections, timings


def _parse_names(raw: Optional[str]) -> Dict[int, str]:
    """從 ONNX metadata 解析 ultralytics 寫入的 names dict 字串。"""
    if not raw:
        return {}
    try:
        parsed = ast.literal_eval(raw)
    except (ValueError, SyntaxError):
        return {}
    if not isinstance(parsed, dict):
        return {}
    return {int(k): str(v) for k, v in parsed.items()}


def _letterbox(
    image: Image.Image, input_size: Tuple[int, int]
) -> Tuple[np.ndarray, float, float, float]:
    """等比例縮放後填灰邊到指定尺寸,回傳 (tensor, scale, pad_x, pad_y)。"""

    target_w, target_h = input_size
    orig_w, orig_h = image.size
    scale = min(target_w / orig_w, target_h / orig_h)
    new_w = int(round(orig_w * scale))
    new_h = int(round(orig_h * scale))

    src = image if image.mode == "RGB" else image.convert("RGB")
    resized = src.resize((new_w, new_h), Image.BILINEAR)

    canvas = Image.new("RGB", (target_w, target_h), (114, 114, 114))
    pad_x = (target_w - new_w) / 2
    pad_y = (target_h - new_h) / 2
    canvas.paste(resized, (int(round(pad_x)), int(round(pad_y))))

    arr = np.asarray(canvas, dtype=np.float32) / 255.0  # HWC
    arr = np.transpose(arr, (2, 0, 1))  # CHW
    tensor = np.expand_dims(arr, axis=0)  # NCHW
    return tensor, scale, pad_x, pad_y


def _postprocess(
    raw: np.ndarray,
    *,
    names: Dict[int, str],
    conf_threshold: float,
    iou_threshold: float,
    scale: float,
    pad_x: float,
    pad_y: float,
    orig_w: int,
    orig_h: int,
) -> List[YoloDetection]:
    """YOLOv8 head 輸出 → 還原到原圖座標的偵測結果。"""
    # raw: [1, 4+nc, N] → [N, 4+nc]
    preds = np.squeeze(raw, axis=0).transpose(1, 0)
    if preds.size == 0:
        return []

    boxes_xywh = preds[:, :4]
    class_scores = preds[:, 4:]
    class_ids = np.argmax(class_scores, axis=1)
    scores = class_scores[np.arange(class_scores.shape[0]), class_ids]

    keep = scores >= conf_threshold
    if not np.any(keep):
        return []
    boxes_xywh = boxes_xywh[keep]
    scores = scores[keep]
    class_ids = class_ids[keep]

    # xywh(中心點)→ xyxy,先在 640×640 空間運算
    cx, cy, bw, bh = (
        boxes_xywh[:, 0],
        boxes_xywh[:, 1],
        boxes_xywh[:, 2],
        boxes_xywh[:, 3],
    )
    x1 = cx - bw / 2
    y1 = cy - bh / 2
    x2 = cx + bw / 2
    y2 = cy + bh / 2
    boxes_xyxy = np.stack([x1, y1, x2, y2], axis=1)

    # 各類別獨立做 NMS
    final_idx: List[int] = []
    for cid in np.unique(class_ids):
        mask = class_ids == cid
        idxs = np.where(mask)[0]
        kept = _nms(boxes_xyxy[idxs], scores[idxs], iou_threshold)
        final_idx.extend(idxs[k] for k in kept)

    detections: List[YoloDetection] = []
    for i in final_idx:
        # 反向 letterbox:扣 padding、除以 scale,再 clip 回原圖範圍
        bx1 = max(0.0, (float(boxes_xyxy[i, 0]) - pad_x) / scale)
        by1 = max(0.0, (float(boxes_xyxy[i, 1]) - pad_y) / scale)
        bx2 = min(float(orig_w), (float(boxes_xyxy[i, 2]) - pad_x) / scale)
        by2 = min(float(orig_h), (float(boxes_xyxy[i, 3]) - pad_y) / scale)
        if bx2 <= bx1 or by2 <= by1:
            continue
        cid = int(class_ids[i])
        detections.append(
            YoloDetection(
                label=names.get(cid, str(cid)),
                score=float(scores[i]),
                class_id=cid,
                x=bx1,
                y=by1,
                width=bx2 - bx1,
                height=by2 - by1,
            )
        )

    detections.sort(key=lambda d: d.score, reverse=True)
    return detections


def _nms(boxes: np.ndarray, scores: np.ndarray, iou_threshold: float) -> List[int]:
    if boxes.size == 0:
        return []
    x1, y1, x2, y2 = boxes[:, 0], boxes[:, 1], boxes[:, 2], boxes[:, 3]
    areas = np.maximum(0.0, x2 - x1) * np.maximum(0.0, y2 - y1)
    order = scores.argsort()[::-1]

    keep: List[int] = []
    while order.size > 0:
        i = int(order[0])
        keep.append(i)
        if order.size == 1:
            break
        rest = order[1:]
        xx1 = np.maximum(x1[i], x1[rest])
        yy1 = np.maximum(y1[i], y1[rest])
        xx2 = np.minimum(x2[i], x2[rest])
        yy2 = np.minimum(y2[i], y2[rest])
        inter = np.maximum(0.0, xx2 - xx1) * np.maximum(0.0, yy2 - yy1)
        union = areas[i] + areas[rest] - inter
        iou = np.where(union > 0, inter / union, 0.0)
        order = rest[iou <= iou_threshold]
    return keep
