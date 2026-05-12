"""M6 — Dispatch routers."""
from __future__ import annotations

import asyncpg
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel

from ..db import get_conn
from ..models.schemas import DispatchList, DispatchItem, DispatchListCreate, JobRow
from ..services import dispatch_service

router = APIRouter(tags=["dispatch"])


@router.get("/dispatch", response_model=list[DispatchList])
async def list_dispatch_lists(request: Request) -> list[DispatchList]:
    rows = await dispatch_service.get_dispatch_lists(request.app.state.pool)
    return [DispatchList(**{k: str(v) if k == "dispatch_id" else v for k, v in r.items()}) for r in rows]


@router.get("/dispatch/{wc_id}", response_model=list[JobRow])
async def get_dispatch_for_wc(wc_id: str, request: Request) -> list[JobRow]:
    rows = await dispatch_service.get_dispatch_by_wc(wc_id, request.app.state.pool)
    return [JobRow(**r) for r in rows]


@router.post("/dispatch", response_model=DispatchList, status_code=201)
async def create_dispatch(body: DispatchListCreate, request: Request) -> DispatchList:
    row = await dispatch_service.create_dispatch_list(
        body.model_dump(), request.app.state.pool, request.app.state.producer
    )
    return DispatchList(**{k: str(v) if k == "dispatch_id" else v for k, v in row.items()})


@router.get("/dispatch/{dispatch_id}/items", response_model=list[DispatchItem])
async def get_dispatch_items(dispatch_id: str, request: Request) -> list[DispatchItem]:
    rows = await dispatch_service.get_dispatch_items(dispatch_id, request.app.state.pool)
    return [DispatchItem(**{k: str(v) if k in ("item_id", "dispatch_id") else v for k, v in r.items()}) for r in rows]
