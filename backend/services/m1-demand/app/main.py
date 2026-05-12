"""M1 Demand & Work Order Service — FastAPI entry point."""
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

from .routers import overrides, queue, sales_orders, work_orders
from .consumers.shortage_consumer import run_shortage_consumer

SERVICE_NAME = "m1-demand"
VERSION = "0.1.0"


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging(SERVICE_NAME)
    app.state.pool = await create_pool()
    app.state.producer = await create_producer()
    # Start Kafka consumers as background tasks
    app.state.consumer_task = asyncio.create_task(
        run_shortage_consumer(app.state.pool, app.state.producer)
    )
    yield
    app.state.consumer_task.cancel()
    await close_pool(app.state.pool)
    await app.state.producer.stop()


app = FastAPI(title="Zedral M1 — Demand Service", version=VERSION, lifespan=lifespan)

origins = os.environ.get("CORS_ORIGINS", "http://localhost:5173,http://localhost:5174").split(",")
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

app.include_router(make_health_router(SERVICE_NAME, VERSION))
app.include_router(work_orders.router, prefix="/api/v1")
app.include_router(sales_orders.router, prefix="/api/v1")
app.include_router(queue.router, prefix="/api/v1")
app.include_router(overrides.router, prefix="/api/v1")
