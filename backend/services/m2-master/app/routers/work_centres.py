"""M2 — Work Centres router."""
from __future__ import annotations

from typing import Annotated

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query

from ..db import get_conn
from ..models.schemas import WorkCentreCreate, WorkCentreResponse, WorkCentreUpdate

router = APIRouter(tags=["work-centres"])


@router.get("/work-centres", response_model=list[WorkCentreResponse])
async def list_work_centres(
    status: str | None = Query(None, description="Filter by status: active | inactive"),
    conn: asyncpg.Connection = Depends(get_conn),
) -> list[WorkCentreResponse]:
    query = "SELECT * FROM master.work_centres"
    params: list = []
    if status:
        query += " WHERE status = $1"
        params.append(status)
    query += " ORDER BY wc_id"
    rows = await conn.fetch(query, *params)
    return [WorkCentreResponse(**dict(r)) for r in rows]


@router.get("/work-centres/{wc_id}", response_model=WorkCentreResponse)
async def get_work_centre(
    wc_id: str,
    conn: asyncpg.Connection = Depends(get_conn),
) -> WorkCentreResponse:
    row = await conn.fetchrow(
        "SELECT * FROM master.work_centres WHERE wc_id = $1", wc_id
    )
    if not row:
        raise HTTPException(status_code=404, detail=f"Work centre {wc_id} not found")
    return WorkCentreResponse(**dict(row))


@router.post("/work-centres", response_model=WorkCentreResponse, status_code=201)
async def create_work_centre(
    body: WorkCentreCreate,
    conn: asyncpg.Connection = Depends(get_conn),
) -> WorkCentreResponse:
    row = await conn.fetchrow(
        """
        INSERT INTO master.work_centres (wc_id, name, type, status, gauge_min_mm, gauge_max_mm, width_min_mm, width_max_mm)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
        """,
        body.wc_id, body.name, body.type, body.status,
        body.gauge_min_mm, body.gauge_max_mm, body.width_min_mm, body.width_max_mm,
    )
    return WorkCentreResponse(**dict(row))


@router.patch("/work-centres/{wc_id}", response_model=WorkCentreResponse)
async def update_work_centre(
    wc_id: str,
    body: WorkCentreUpdate,
    conn: asyncpg.Connection = Depends(get_conn),
) -> WorkCentreResponse:
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=422, detail="No fields to update")
    set_clause = ", ".join(f"{k} = ${i+2}" for i, k in enumerate(updates))
    values = list(updates.values())
    row = await conn.fetchrow(
        f"UPDATE master.work_centres SET {set_clause}, updated_at = now() WHERE wc_id = $1 RETURNING *",
        wc_id, *values,
    )
    if not row:
        raise HTTPException(status_code=404, detail=f"Work centre {wc_id} not found")
    return WorkCentreResponse(**dict(row))
