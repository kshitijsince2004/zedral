"""M5a — Pipeline stage counts router."""
from __future__ import annotations

import asyncpg
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from ..db import get_conn

router = APIRouter(tags=["pipeline"])

_STAGE_LABELS = {
    "expected":  "Expected",
    "stores":    "Stores",
    "pickling":  "Pickling",
    "rolling":   "Rolling",
    "annealing": "Annealing",
    "rewind":    "Rewind",
    "fg":        "Finished Goods",
}


class PipelineStage(BaseModel):
    id: str
    label: str
    count: int


@router.get("/pipeline", response_model=list[PipelineStage])
async def get_pipeline(conn: asyncpg.Connection = Depends(get_conn)) -> list[PipelineStage]:
    rows = await conn.fetch(
        """SELECT current_stage, COUNT(*) AS cnt
           FROM m5a_material.coils
           WHERE current_stage NOT IN ('dispatched', 'scrapped', 'rejected')
           GROUP BY current_stage"""
    )
    counts = {r["current_stage"]: r["cnt"] for r in rows}
    return [
        PipelineStage(id=stage, label=label, count=counts.get(stage, 0))
        for stage, label in _STAGE_LABELS.items()
    ]
