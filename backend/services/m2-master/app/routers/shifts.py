"""M2 — Shifts router."""
from __future__ import annotations

import asyncpg
from fastapi import APIRouter, Depends

from ..db import get_conn
from ..models.schemas import ShiftResponse

router = APIRouter(tags=["shifts"])


@router.get("/shifts", response_model=list[ShiftResponse])
async def list_shifts(
    conn: asyncpg.Connection = Depends(get_conn),
) -> list[ShiftResponse]:
    rows = await conn.fetch("SELECT * FROM master.shifts ORDER BY name")
    return [ShiftResponse.from_row(dict(r)) for r in rows]
