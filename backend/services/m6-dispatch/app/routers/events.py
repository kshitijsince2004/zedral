"""M6 — Execution events router."""
from __future__ import annotations

from datetime import datetime
from typing import Optional

import asyncpg
from fastapi import APIRouter, Depends, Query, Request

from ..db import get_conn
from ..models.schemas import ExecutionEventIn, ExecutionEventResponse
from ..services import event_service

router = APIRouter(tags=["events"])


@router.post("/events", response_model=ExecutionEventResponse)
async def ingest_event(body: ExecutionEventIn, request: Request) -> ExecutionEventResponse:
    row = await event_service.ingest_event(
        body.model_dump(),
        request.app.state.pool,
        request.app.state.producer,
    )
    return ExecutionEventResponse(**{k: str(v) if k in ("event_id", "dispatch_item_id") and v else v for k, v in row.items()})


@router.get("/events", response_model=list[ExecutionEventResponse])
async def list_events(
    wc_id: str | None = Query(None),
    wo_id: str | None = Query(None),
    event_type: str | None = Query(None),
    from_dt: datetime | None = Query(None, alias="from"),
    to_dt: datetime | None = Query(None, alias="to"),
    limit: int = Query(50, le=200),
    conn: asyncpg.Connection = Depends(get_conn),
) -> list[ExecutionEventResponse]:
    conditions, params = [], []
    if wc_id:
        params.append(wc_id); conditions.append(f"wc_id = ${len(params)}")
    if wo_id:
        params.append(wo_id); conditions.append(f"wo_id = ${len(params)}")
    if event_type:
        params.append(event_type); conditions.append(f"event_type = ${len(params)}")
    if from_dt:
        params.append(from_dt); conditions.append(f"occurred_at >= ${len(params)}")
    if to_dt:
        params.append(to_dt); conditions.append(f"occurred_at <= ${len(params)}")
    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    params.append(limit)
    rows = await conn.fetch(
        f"SELECT * FROM m6_dispatch.execution_events {where} ORDER BY occurred_at DESC LIMIT ${len(params)}",
        *params,
    )
    return [ExecutionEventResponse(**dict(r)) for r in rows]
