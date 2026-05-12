"""M6 — Rejects router."""
from __future__ import annotations

import asyncpg
from fastapi import APIRouter, Depends, Query

from ..db import get_conn
from ..models.schemas import RejectResponse

router = APIRouter(tags=["rejects"])


@router.get("/rejects", response_model=list[RejectResponse])
async def list_rejects(
    wc_id: str | None = Query(None),
    wo_id: str | None = Query(None),
    conn: asyncpg.Connection = Depends(get_conn),
) -> list[RejectResponse]:
    conditions, params = [], []
    if wc_id:
        params.append(wc_id); conditions.append(f"wc_id = ${len(params)}")
    if wo_id:
        params.append(wo_id); conditions.append(f"wo_id = ${len(params)}")
    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    rows = await conn.fetch(
        f"SELECT * FROM m6_dispatch.rejects {where} ORDER BY reported_at DESC LIMIT 100",
        *params,
    )
    return [RejectResponse(**{k: str(v) if k == "reject_id" else v for k, v in dict(r).items()}) for r in rows]
