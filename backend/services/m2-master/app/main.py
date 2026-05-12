"""M2 Master Data Service — FastAPI application entry point."""
from __future__ import annotations

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from zedral_common.db import close_pool, create_pool
from zedral_common.health import make_health_router
from zedral_common.kafka import create_producer
from zedral_common.logging import configure_logging

from .routers import catalogue, changeover_matrix, customers, materials, operators, routings, shifts, work_centres

SERVICE_NAME = "m2-master"
VERSION = "0.1.0"


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging(SERVICE_NAME)
    app.state.pool = await create_pool()
    app.state.producer = await create_producer()
    yield
    await close_pool(app.state.pool)
    await app.state.producer.stop()


app = FastAPI(
    title="Zedral M2 — Master Data Service",
    version=VERSION,
    lifespan=lifespan,
)

# CORS — allow only the two frontends
origins = os.environ.get(
    "CORS_ORIGINS",
    "http://localhost:5173,http://localhost:5174",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(make_health_router(SERVICE_NAME, VERSION))
app.include_router(work_centres.router, prefix="/api/v1")
app.include_router(materials.router, prefix="/api/v1")
app.include_router(customers.router, prefix="/api/v1")
app.include_router(routings.router, prefix="/api/v1")
app.include_router(changeover_matrix.router, prefix="/api/v1")
app.include_router(operators.router, prefix="/api/v1")
app.include_router(shifts.router, prefix="/api/v1")
app.include_router(catalogue.router, prefix="/api/v1")
