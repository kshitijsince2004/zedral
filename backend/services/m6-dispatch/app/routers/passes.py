"""M6 — Production passes router (v0.2)."""
from __future__ import annotations

import asyncpg
from fastapi import APIRouter, Depends

from ..db import get_conn
from ..models.schemas import ProductionPassResponse

router = APIRouter(tags=["passes"])


@router.get("/passes/{dispatch_item_id}", response_model=list[ProductionPassResponse])
async def get_passes(
    dispatch_item_id: str,
    conn: asyncpg.Connection = Depends(get_conn),
) -> list[ProductionPassResponse]:
    rows = await conn.fetch(
        "SELECT * FROM m6_dispatch.production_passes WHERE dispatch_item_id=$1 ORDER BY pass_number",
        dispatch_item_id,
    )
    return [ProductionPassResponse(**{k: str(v) if k == "dispatch_item_id" else v for k, v in dict(r).items()}) for r in rows]
