"""M2 — Operators router."""
from __future__ import annotations

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query

from ..db import get_conn
from ..models.schemas import OperatorCreate, OperatorResponse

router = APIRouter(tags=["operators"])


@router.get("/operators", response_model=list[OperatorResponse])
async def list_operators(
    wc_id: str | None = Query(None),
    shift: str | None = Query(None),
    status: str | None = Query(None),
    badge_id: str | None = Query(None, description="Filter by badge_id (returns 404 if not found)"),
    conn: asyncpg.Connection = Depends(get_conn),
) -> list[OperatorResponse]:
    conditions, params = [], []
    if wc_id:
        params.append(wc_id); conditions.append(f"work_centre_id = ${len(params)}")
    if shift:
        params.append(shift); conditions.append(f"shift_name = ${len(params)}")
    if status:
        params.append(status); conditions.append(f"status = ${len(params)}")
    if badge_id:
        params.append(badge_id); conditions.append(f"operator_id = ${len(params)}")
    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    rows = await conn.fetch(f"SELECT * FROM master.operators {where} ORDER BY name", *params)
    if badge_id and not rows:
        raise HTTPException(status_code=404, detail=f"Operator with badge_id {badge_id} not found")
    return [OperatorResponse.from_row(dict(r)) for r in rows]


@router.post("/operators", response_model=OperatorResponse, status_code=201)
async def create_operator(
    body: OperatorCreate,
    conn: asyncpg.Connection = Depends(get_conn),
) -> OperatorResponse:
    row = await conn.fetchrow(
        """INSERT INTO master.operators (operator_id, name, skill, work_centre_id, shift_name, status)
           VALUES ($1,$2,$3,$4,$5,$6) RETURNING *""",
        body.operator_id, body.name, body.skill, body.work_centre_id, body.shift_name, body.status,
    )
    return OperatorResponse.from_row(dict(row))
