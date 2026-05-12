"""M2 — Routings router."""
from __future__ import annotations

import asyncpg
from fastapi import APIRouter, Depends, Query

from ..db import get_conn
from ..models.schemas import RoutingCreate, RoutingResponse

router = APIRouter(tags=["routings"])


@router.get("/routings", response_model=list[RoutingResponse])
async def list_routings(
    material_code: str | None = Query(None),
    wc_id: str | None = Query(None),
    conn: asyncpg.Connection = Depends(get_conn),
) -> list[RoutingResponse]:
    conditions, params = [], []
    if material_code:
        params.append(material_code)
        conditions.append(f"material_code = ${len(params)}")
    if wc_id:
        params.append(wc_id)
        conditions.append(f"wc_id = ${len(params)}")
    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    rows = await conn.fetch(f"SELECT * FROM master.routings {where} ORDER BY routing_id", *params)
    return [RoutingResponse.from_row(dict(r)) for r in rows]


@router.post("/routings", response_model=RoutingResponse, status_code=201)
async def create_routing(
    body: RoutingCreate,
    conn: asyncpg.Connection = Depends(get_conn),
) -> RoutingResponse:
    row = await conn.fetchrow(
        """INSERT INTO master.routings (routing_id, material_code, wc_id, std_run_rate_mt_hr, setup_time_min, yield_pct, is_active)
           VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *""",
        body.routing_id, body.material_code, body.wc_id,
        body.std_run_rate_mt_hr, body.setup_time_min, body.yield_pct, body.is_active,
    )
    return RoutingResponse.from_row(dict(row))
