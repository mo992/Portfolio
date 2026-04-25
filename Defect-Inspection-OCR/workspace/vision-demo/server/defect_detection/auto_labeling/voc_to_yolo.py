"""Pascal VOC (XML) → YOLO 格式轉換。

職責單純:讀 VOC XML annotations 跟對應的影像,產出 YOLO 格式資料集
(images/、labels/、data.yaml),含 train/val 切分。
"""
from __future__ import annotations

import logging
import random
import shutil
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple

log = logging.getLogger("autodistill_labeling.voc_to_yolo")

_IMG_EXTS = (".jpg", ".jpeg", ".png", ".bmp")


@dataclass(frozen=True)
class ConvertResult:
    dataset_dir: Path
    data_yaml: Path
    classes: List[str]
    num_train: int
    num_val: int


class VocToYolo:
    """把 Pascal VOC layout 轉成 YOLO 格式資料集。

    支援兩種 source 結構:單一資料夾混放 XML + 影像,或經典 VOC layout
    (Annotations/ 跟 JPEGImages/ 分開)。
    """

    def __init__(
        self,
        *,
        val_split: float = 0.2,
        seed: int = 42,
        classes: Optional[List[str]] = None,
    ) -> None:
        if not 0.0 <= val_split < 1.0:
            raise ValueError("val_split must be in [0.0, 1.0)")
        self._val_split = val_split
        self._seed = seed
        self._fixed_classes = classes

    def convert(
        self,
        source_dir: str | Path,
        output_dir: str | Path,
    ) -> ConvertResult:
        pass

    @staticmethod
    def _find_xml_files(source_dir: Path) -> List[Path]:
        # 優先看 Annotations/(經典 VOC),沒有就 fallback 到全域遞迴掃。
        pass

    @staticmethod
    def _locate_image(xml_path: Path, source_dir: Path) -> Optional[Path]:
        pass

    @staticmethod
    def _write_split(
        pairs: List[Tuple[Path, Path]],
        output_dir: Path,
        split: str,
        class_to_id: Dict[str, int],
    ) -> None:
        pass

def _parse_class_names(xml_path: Path) -> List[str]:
    pass

def _parse_voc(xml_path: Path) -> Tuple[int, int, List[Tuple[str, float, float, float, float]]]:
    pass

def _write_data_yaml(path: Path, dataset_dir: Path, classes: List[str]) -> None:
    # 寫絕對路徑,ultralytics 在任何 CWD 都能解析。
    pass