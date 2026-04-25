"""把訓練好的 YOLO 權重輸出到 detector 預期的位置,可選輸出 ONNX。

職責單純:把 best.pt 複製到固定路徑,需要時呼叫 YOLO.export(format='onnx')。
"""
from __future__ import annotations

import logging
import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

log = logging.getLogger("autodistill_labeling.export")


@dataclass(frozen=True)
class ExportResult:
    pt_path: Path
    onnx_path: Optional[Path]


class WeightsExporter:
    """把權重複製到固定路徑,可選輸出 ONNX。"""

    def export(
        self,
        best_weights: str | Path,
        output_pt: str | Path,
        *,
        to_onnx: bool = False,
        imgsz: int = 640,
    ) -> ExportResult:
        pass