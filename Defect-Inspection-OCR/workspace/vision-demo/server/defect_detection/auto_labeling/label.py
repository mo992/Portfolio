"""用 foundation model (GroundingDINO via Autodistill) 自動打標原始影像。

職責單純:給 (images_dir, ontology) → 在 output_dir 產出 YOLO 格式資料集
(images/ + labels/ + data.yaml)。
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Optional

log = logging.getLogger("autodistill_labeling.label")


@dataclass(frozen=True)
class LabelResult:
    dataset_dir: Path          # folder containing the YOLO dataset
    data_yaml: Path            # `<dataset_dir>/data.yaml`
    num_images: int
    classes: list[str]


class AutoLabeler:
    """包一層 autodistill-grounded-sam,讓 caller 不用碰那堆重 import。

    Ontology 是 prompt → class name 的對應:
        {"a visible scratch on metal": "scratch",
         "a rust spot": "rust"}

    右邊的 class name 就是 data.yaml.names 裡會出現的名字。
    """

    def __init__(
        self,
        ontology: Dict[str, str],
        *,
        box_threshold: float = 0.35,
        text_threshold: float = 0.25,
    ) -> None:
        pass

    def label(
        self,
        images_dir: str | Path,
        output_dir: str | Path,
        *,
        extensions: tuple[str, ...] = (".jpg", ".jpeg", ".png", ".bmp"),
    ) -> LabelResult:
        # Lazy import — autodistill 會拉 GroundingDINO(約 1 GB)。
        pass