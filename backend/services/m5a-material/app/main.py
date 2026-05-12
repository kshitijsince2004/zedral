"""M5a Material & Inventory Service — FastAPI entry point."""
from __future__ import annotations

import asyncio
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from zedral_common.db import close_pool, create_pool
from zedral_common.health import make_health_router
from zedral_common.kafka import create_producer
from zedral_common.logging import configure_logging

from .routers import coils, forecast, inbound, kpis, pipeline, readiness, work_orders
from .consumers.erp_consumer import run_erp_consumers

SERVICE_NAME = "m5a-material"
VERSION = "0.1.0"


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging(SERVICE_NAME)
    app.state.pool = await create_pool()
    app.state.producer = await create_producer()
    app.state.consumer_task = asyncio.create_task(
        run_erp_consumers(app.state.pool, app.state.producer)
    )
    yield
    app.state.consumer_task.cancel()
    await close_pool(app.state.pool)
    await app.state.producer.stop()


app = FastAPI(title="Zedral M5a — Material Service", version=VERSION, lifespan=lifespan)

origins = os.environ.get("CORS_ORIGINS", "http://localhost:5173,http://localhost:5174").split(",")
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

app.include_router(make_health_router(SERVICE_NAME, VERSION))
app.include_router(coils.router, prefix="/api/v1")
app.include_router(readiness.router, prefix="/api/v1")
app.include_router(inbound.router, prefix="/api/v1")
app.include_router(forecast.router, prefix="/api/v1")
app.include_router(pipeline.router, prefix="/api/v1")
app.include_router(kpis.router, prefix="/api/v1")
app.include_router(work_orders.router, prefix="/api/v1")
