"""M6 — Alerts router."""
from __future__ import annotations

from fastapi import APIRouter, Request

from ..models.schemas import AlertRow
from ..services import live_service

router = APIRouter(tags=["alerts"])


@router.get("/alerts", response_model=list[AlertRow])
async def get_alerts(request: Request) -> list[AlertRow]:
    alerts = await live_service.get_alerts(request.app.state.pool)
    return [AlertRow(**a) for a in alerts]
