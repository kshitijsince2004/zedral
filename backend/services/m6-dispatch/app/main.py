"""M6 Dispatch & Execution Service — FastAPI entry point."""
from __future__ import annotations

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from zedral_common.db import close_pool, create_pool
from zedral_common.health import make_health_router
from zedral_common.kafka import create_producer
from zedral_common.logging import configure_logging

from .routers import alerts, auth, dispatch, events, handovers, lines, live_status, master, passes, rejects, stoppages

SERVICE_NAME = "m6-dispatch"
VERSION = "0.2.0"


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging(SERVICE_NAME)
    app.state.pool = await create_pool()
    app.state.producer = await create_producer()
    yield
    await close_pool(app.state.pool)
    await app.state.producer.stop()


app = FastAPI(title="Zedral M6 — Dispatch & Execution Service", version=VERSION, lifespan=lifespan)

origins = os.environ.get("CORS_ORIGINS", "http://localhost:5173,http://localhost:5174").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(make_health_router(SERVICE_NAME, VERSION))
app.include_router(auth.router, prefix="/api/v1")
app.include_router(dispatch.router, prefix="/api/v1")
app.include_router(events.router, prefix="/api/v1")
app.include_router(lines.router, prefix="/api/v1")
app.include_router(alerts.router, prefix="/api/v1")
app.include_router(live_status.router, prefix="/api/v1")
app.include_router(stoppages.router, prefix="/api/v1")
app.include_router(rejects.router, prefix="/api/v1")
app.include_router(handovers.router, prefix="/api/v1")
app.include_router(passes.router, prefix="/api/v1")
app.include_router(master.router, prefix="/api/v1")
