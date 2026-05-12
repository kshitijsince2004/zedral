"""M2 — Stoppage and Defect Code Catalogue routers (v0.2)."""
from __future__ import annotations

import asyncpg
from fastapi import APIRouter, Depends

from ..db import get_conn
from ..models.schemas import DefectCodeResponse, StoppageCodeResponse

router = APIRouter(tags=["catalogue"])


@router.get("/stoppage-codes", response_model=list[StoppageCodeResponse])
async def list_stoppage_codes(
    conn: asyncpg.Connection = Depends(get_conn),
) -> list[StoppageCodeResponse]:
    rows = await conn.fetch(
        "SELECT * FROM master.stoppage_codes WHERE is_active = TRUE ORDER BY sort_order, code"
    )
    return [StoppageCodeResponse(**dict(r)) for r in rows]


@router.get("/defect-codes", response_model=list[DefectCodeResponse])
async def list_defect_codes(
    conn: asyncpg.Connection = Depends(get_conn),
) -> list[DefectCodeResponse]:
    rows = await conn.fetch(
        "SELECT * FROM master.defect_codes WHERE is_active = TRUE ORDER BY sort_order, code"
    )
    return [DefectCodeResponse(**dict(r)) for r in rows]
