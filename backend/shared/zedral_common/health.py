"""
Standard health check endpoint for all Zedral services.
"""
from __future__ import annotations

import os

from fastapi import APIRouter, Request
from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    db: str


def make_health_router(service_name: str, version: str = "0.1.0") -> APIRouter:
    router = APIRouter()

    @router.get("/health", response_model=HealthResponse, tags=["health"])
    async def health(request: Request) -> HealthResponse:
        db_status = "unknown"
        if hasattr(request.app.state, "pool") and request.app.state.pool:
            try:
                async with request.app.state.pool.acquire() as conn:
                    await conn.fetchval("SELECT 1")
                db_status = "connected"
            except Exception:
                db_status = "disconnected"

        return HealthResponse(
            status="ok" if db_status == "connected" else "degraded",
            service=service_name,
            version=version,
            db=db_status,
        )

    return router
