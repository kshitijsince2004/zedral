"""M6 — Stoppages router."""
from __future__ import annotations

import asyncpg
from fastapi import APIRouter, Depends, Query

from ..db import get_conn
from ..models.schemas import StoppageResponse

router = APIRouter(tags=["stoppages"])


@router.get("/stoppages", response_model=list[StoppageResponse])
async def list_stoppages(
    wc_id: str | None = Query(None),
    is_active: bool | None = Query(None),
    conn: asyncpg.Connection = Depends(get_conn),
) -> list[StoppageResponse]:
    conditions, params = [], []
    if wc_id:
        params.append(wc_id); conditions.append(f"wc_id = ${len(params)}")
    if is_active is not None:
        params.append(is_active); conditions.append(f"is_active = ${len(params)}")
    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    rows = await conn.fetch(
        f"SELECT * FROM m6_dispatch.stoppages {where} ORDER BY started_at DESC LIMIT 100",
        *params,
    )
    return [StoppageResponse(**{k: str(v) if k in ("stoppage_id", "dispatch_item_id") and v else v for k, v in dict(r).items()}) for r in rows]
