"""M1 — Demand Queue router (priority-ranked WOs with material readiness hint)."""
from __future__ import annotations

import asyncpg
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import date

from ..db import get_conn

router = APIRouter(tags=["queue"])


class QueueItem(BaseModel):
    wo_id: str
    material_code: str
    grade: str
    qty_planned_mt: float
    required_date: date
    priority_class: Optional[str]
    priority_score: Optional[float]
    status: str
    material_readiness: Optional[str] = None  # joined from m5a_material.wo_readiness
    model_config = {"from_attributes": True}


@router.get("/queue", response_model=list[QueueItem])
async def get_demand_queue(conn: asyncpg.Connection = Depends(get_conn)) -> list[QueueItem]:
    """Priority-ranked demand queue with material readiness hint from M5a."""
    rows = await conn.fetch(
        """
        SELECT
            wo.wo_id, wo.material_code, wo.grade, wo.qty_planned_mt,
            wo.required_date, wo.priority_class, wo.priority_score, wo.status,
            wr.status AS material_readiness
        FROM m1_demand.work_orders wo
        LEFT JOIN m5a_material.wo_readiness wr ON wr.wo_id = wo.wo_id
        WHERE wo.status NOT IN ('complete', 'cancelled')
        ORDER BY wo.priority_score DESC NULLS LAST, wo.required_date ASC
        LIMIT 100
        """
    )
    return [QueueItem(**dict(r)) for r in rows]
