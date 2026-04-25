"""CLI:python -m defect_detection.autodistill_labeling.cli ...

兩種模式:

  # A) 原始影像 + ontology → 自動打標 → 訓練 → 權重
  python -m defect_detection.autodistill_labeling.cli label-and-train \\
      --images ./dataset/raw \\
      --ontology ./ontology.json \\
      --dataset-out ./dataset/labeled \\
      --weights-out ./weights/custom.pt \\
      --epochs 50 --device cpu

  # B) 已經是 YOLO 格式的資料集 → 訓練 → 權重
  python -m defect_detection.autodistill_labeling.cli train \\
      --data ./dataset/labeled/data.yaml \\
      --weights-out ./weights/custom.pt \\
      --epochs 50 --device cpu
"""
from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path

from .label import AutoLabeler
from .pipeline import AutodistillPipeline
from .train import YoloTrainer
from .voc_to_yolo import VocToYolo


def _build_parser() -> argparse.ArgumentParser:
    pass

def main(argv: list[str] | None = None) -> int:
    pass

if __name__ == "__main__":
    sys.exit(main())
