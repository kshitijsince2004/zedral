"""M6 — Live status router (SSE + polling)."""
from __future__ import annotations

import asyncio
import json

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from ..models.schemas import ProductionLine
from ..services import live_service

router = APIRouter(tags=["live-status"])

_KEEPALIVE_INTERVAL = 15  # seconds


@router.get("/live-status")
async def live_status(request: Request):
    accept = request.headers.get("accept", "")

    if "text/event-stream" in accept:
        # SSE streaming
        async def event_generator():
            queue: asyncio.Queue = asyncio.Queue(maxsize=10)
            live_service.subscribe(queue)
            try:
                while True:
                    try:
                        lines = await asyncio.wait_for(queue.get(), timeout=_KEEPALIVE_INTERVAL)
                        data = json.dumps(lines)
                        yield f"data: {data}\n\n"
                    except asyncio.TimeoutError:
                        yield ": keepalive\n\n"
            except asyncio.CancelledError:
                pass
            finally:
                live_service.unsubscribe(queue)

        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
            },
        )

    # Polling fallback
    lines = await live_service.get_production_lines(request.app.state.pool)
    return [ProductionLine(**line) for line in lines]
