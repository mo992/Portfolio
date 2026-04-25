"""Evaluation 資料集模組:manifest 與影像透過 /eval API 提供給前端。

本模組為資料集的 single source of truth,前端 bundle 不包含任何資料集內容。
"""
from .registry import get_dataset, list_datasets

__all__ = ["get_dataset", "list_datasets"]
