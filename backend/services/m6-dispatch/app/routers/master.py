"""M6 — Master catalogue read endpoints (v0.2).

Provides stoppage-codes and defect-codes directly from M6 service
so the floor console doesn't need to call M2.
"""
from __future__ import annotations

import asyncpg
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional

from ..db import get_conn

router = APIRouter(tags=["master"])


class StoppageCode(BaseModel):
    code: str
    display_name: str
    bucket: str
    is_planned: bool
    is_external: bool
    sort_order: int


class DefectCode(BaseModel):
    code: str
    display_name: str
    family: str
    severity_default: Optional[str] = None
    default_disposition: Optional[str] = None
    sort_order: int


@router.get("/master/stoppage-codes", response_model=list[StoppageCode])
async def list_stoppage_codes(conn: asyncpg.Connection = Depends(get_conn)) -> list[StoppageCode]:
    rows = await conn.fetch(
        "SELECT * FROM master.stoppage_codes WHERE is_active=TRUE ORDER BY sort_order, code"
    )
    return [StoppageCode(**dict(r)) for r in rows]


@router.get("/master/defect-codes", response_model=list[DefectCode])
async def list_defect_codes(conn: asyncpg.Connection = Depends(get_conn)) -> list[DefectCode]:
    rows = await conn.fetch(
        "SELECT * FROM master.defect_codes WHERE is_active=TRUE ORDER BY sort_order, code"
    )
    return [DefectCode(**dict(r)) for r in rows]
