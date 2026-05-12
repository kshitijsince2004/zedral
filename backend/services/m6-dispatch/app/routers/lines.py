"""M6 — Production lines router."""
from __future__ import annotations

from fastapi import APIRouter, Request

from ..models.schemas import ProductionLine
from ..services import live_service

router = APIRouter(tags=["lines"])


@router.get("/lines", response_model=list[ProductionLine])
async def get_lines(request: Request) -> list[ProductionLine]:
    lines = await live_service.get_production_lines(request.app.state.pool)
    return [ProductionLine(**line) for line in lines]
