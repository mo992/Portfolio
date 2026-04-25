"""Evaluation 資料集的檔案系統 registry。

每個資料集為 fixtures/ 下的一個目錄,內含 manifest.json,
其結構需符合前端的 DatasetManifestSchema:
    { id, name, description?, samples: [{ id, imagePath, groundTruth[], meta? }] }
"""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List

_FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures"

def _read_manifest(dataset_dir: Path) -> Dict[str, Any]:
    pass

@lru_cache(maxsize=1)
def _load_all() -> Dict[str, Dict[str, Any]]:
    pass

def list_datasets() -> List[Dict[str, Any]]:
    pass

def get_dataset(dataset_id: str) -> Dict[str, Any] | None:
    pass