"""M5a — KPI aggregation router."""
from __future__ import annotations

import asyncpg
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from ..db import get_conn

router = APIRouter(tags=["kpis"])


class M5aKpis(BaseModel):
    totalWos: int
    readyCount: int
    partialCount: int
    shortageCount: int
    pendingCount: int


@router.get("/kpis", response_model=M5aKpis)
async def get_kpis(conn: asyncpg.Connection = Depends(get_conn)) -> M5aKpis:
    row = await conn.fetchrow(
        """SELECT
             COUNT(*)                                          AS total,
             COUNT(*) FILTER (WHERE status = 'ready')         AS ready,
             COUNT(*) FILTER (WHERE status = 'partial')       AS partial,
             COUNT(*) FILTER (WHERE status = 'shortage')      AS shortage,
             COUNT(*) FILTER (WHERE status = 'pending')       AS pending
           FROM m5a_material.wo_readiness"""
    )
    return M5aKpis(
        totalWos=row["total"],
        readyCount=row["ready"],
        partialCount=row["partial"],
        shortageCount=row["shortage"],
        pendingCount=row["pending"],
    )
