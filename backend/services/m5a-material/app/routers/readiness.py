"""M5a — WO Readiness router."""
from __future__ import annotations

from datetime import datetime
from typing import Optional

import asyncpg
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..db import get_conn
from ..services.readiness_service import calculate_readiness

router = APIRouter(tags=["readiness"])


class WoReadinessResponse(BaseModel):
    wo_id: str
    required_qty_mt: float
    available_qty_mt: float
    expected_qty_mt: float
    shortfall_qty_mt: float
    status: str
    calculated_at: Optional[datetime] = None


@router.get("/wo-readiness", response_model=list[WoReadinessResponse])
async def list_readiness(conn: asyncpg.Connection = Depends(get_conn)) -> list[WoReadinessResponse]:
    rows = await conn.fetch("SELECT * FROM m5a_material.wo_readiness ORDER BY wo_id")
    return [WoReadinessResponse(**dict(r)) for r in rows]


@router.get("/wo-readiness/{wo_id}", response_model=WoReadinessResponse)
async def get_readiness(wo_id: str, conn: asyncpg.Connection = Depends(get_conn)) -> WoReadinessResponse:
    row = await conn.fetchrow("SELECT * FROM m5a_material.wo_readiness WHERE wo_id = $1", wo_id)
    if not row:
        raise HTTPException(status_code=404, detail=f"Readiness for WO {wo_id} not found")
    return WoReadinessResponse(**dict(row))
