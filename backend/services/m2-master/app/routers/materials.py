"""M2 — Materials router."""
from __future__ import annotations

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query

from ..db import get_conn
from ..models.schemas import MaterialCreate, MaterialResponse

router = APIRouter(tags=["materials"])


@router.get("/materials", response_model=list[MaterialResponse])
async def list_materials(
    type: str | None = Query(None, description="Filter by type: HR | CR | FG"),
    status: str | None = Query(None, description="Filter by status: active | inactive"),
    conn: asyncpg.Connection = Depends(get_conn),
) -> list[MaterialResponse]:
    conditions, params = [], []
    if type:
        params.append(type)
        conditions.append(f"type = ${len(params)}")
    if status:
        params.append(status)
        conditions.append(f"status = ${len(params)}")
    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    rows = await conn.fetch(f"SELECT * FROM master.materials {where} ORDER BY material_code", *params)
    return [MaterialResponse(**dict(r)) for r in rows]


@router.get("/materials/{material_code}", response_model=MaterialResponse)
async def get_material(
    material_code: str,
    conn: asyncpg.Connection = Depends(get_conn),
) -> MaterialResponse:
    row = await conn.fetchrow("SELECT * FROM master.materials WHERE material_code = $1", material_code)
    if not row:
        raise HTTPException(status_code=404, detail=f"Material {material_code} not found")
    return MaterialResponse(**dict(row))


@router.post("/materials", response_model=MaterialResponse, status_code=201)
async def create_material(
    body: MaterialCreate,
    conn: asyncpg.Connection = Depends(get_conn),
) -> MaterialResponse:
    row = await conn.fetchrow(
        """
        INSERT INTO master.materials (material_code, grade, gauge_mm, width_mm, type, status)
        VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
        """,
        body.material_code, body.grade, body.gauge_mm, body.width_mm, body.type, body.status,
    )
    return MaterialResponse(**dict(row))
