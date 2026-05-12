"""
Shared asyncpg connection pool factory.
Each service calls get_pool() once at startup and stores it in app.state.
"""
from __future__ import annotations

import os
import asyncpg


async def create_pool() -> asyncpg.Pool:
    """Create and return an asyncpg connection pool from DATABASE_URL env var."""
    dsn = os.environ["DATABASE_URL"]
    pool = await asyncpg.create_pool(
        dsn=dsn,
        min_size=2,
        max_size=10,
        command_timeout=30,
    )
    return pool


async def close_pool(pool: asyncpg.Pool) -> None:
    await pool.close()
