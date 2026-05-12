"""Database dependency for M2 service routes."""
from __future__ import annotations

from typing import AsyncGenerator

import asyncpg
from fastapi import Request


async def get_conn(request: Request) -> AsyncGenerator[asyncpg.Connection, None]:
    """FastAPI dependency — yields a connection from the pool."""
    async with request.app.state.pool.acquire() as conn:
        yield conn
