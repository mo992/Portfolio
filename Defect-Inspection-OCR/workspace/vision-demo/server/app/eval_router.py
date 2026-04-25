"""評估資料集的 HTTP 入口,manifest 統一由後端供應。

路由(掛載於 /eval):
    GET /datasets          — 列出所有資料集
    GET /datasets/{id}     — 取得指定 manifest
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from evaluation import get_dataset, list_datasets


def build_router() -> APIRouter:
    router = APIRouter()

    @router.get("/datasets")
    async def datasets():
        pass

    @router.get("/datasets/{dataset_id}")
    async def dataset(dataset_id: str):
        pass

    return router
