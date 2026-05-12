"""M5a — Shortage forecast router."""
from __future__ import annotations

from datetime import date, datetime
from typing import Optional
from uuid import UUID

import asyncpg
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel

from ..db import get_conn
from ..services.readiness_service import calculate_readiness

router = APIRouter(tags=["shortage-forecast"])


class ForecastLine(BaseModel):
    wo_id: str
    required_date: date
    required_qty_mt: float
    available_qty_mt: float
    expected_qty_mt: float
    shortfall_qty_mt: float
    earliest_remediation: Optional[str] = None


class ForecastResponse(BaseModel):
    forecast_id: str
    generated_at: datetime
    horizon_days: int
    total_wos_evaluated: int
    total_shortage_wos: int
    total_shortage_qty_mt: float
    lines: list[ForecastLine] = []


@router.get("/shortage-forecast/run", response_model=ForecastResponse)
async def run_forecast(
    horizon_days: int = 30,
    request: Request = None,
    conn: asyncpg.Connection = Depends(get_conn),
) -> ForecastResponse:
    """Compute a fresh shortage forecast and persist it."""
    pool = request.app.state.pool
    wos = await conn.fetch(
        """SELECT wo_id, required_date, qty_planned_mt FROM m1_demand.work_orders
           WHERE status NOT IN ('complete', 'cancelled')
           AND required_date <= CURRENT_DATE + $1::int""",
        horizon_days,
    )

    lines = []
    total_shortage_qty = 0.0
    for wo in wos:
        r = await calculate_readiness(wo["wo_id"], pool)
        if r.shortfall_qty_mt > 0:
            lines.append(ForecastLine(
                wo_id=r.wo_id,
                required_date=wo["required_date"],
                required_qty_mt=r.required_qty_mt,
                available_qty_mt=r.available_qty_mt,
                expected_qty_mt=r.expected_qty_mt,
                shortfall_qty_mt=r.shortfall_qty_mt,
            ))
            total_shortage_qty += r.shortfall_qty_mt

    forecast_id = await conn.fetchval(
        """INSERT INTO m5a_material.shortage_forecast
           (horizon_days, total_wos_evaluated, total_shortage_wos, total_shortage_qty_mt)
           VALUES ($1,$2,$3,$4) RETURNING forecast_id""",
        horizon_days, len(wos), len(lines), total_shortage_qty,
    )

    for line in lines:
        await conn.execute(
            """INSERT INTO m5a_material.shortage_forecast_lines
               (forecast_id, wo_id, required_date, required_qty_mt, available_qty_mt, expected_qty_mt, shortfall_qty_mt)
               VALUES ($1,$2,$3,$4,$5,$6,$7)""",
            forecast_id, line.wo_id, line.required_date,
            line.required_qty_mt, line.available_qty_mt, line.expected_qty_mt, line.shortfall_qty_mt,
        )

    row = await conn.fetchrow("SELECT * FROM m5a_material.shortage_forecast WHERE forecast_id=$1", forecast_id)
    return ForecastResponse(
        forecast_id=str(row["forecast_id"]),
        generated_at=row["generated_at"],
        horizon_days=row["horizon_days"],
        total_wos_evaluated=row["total_wos_evaluated"],
        total_shortage_wos=row["total_shortage_wos"],
        total_shortage_qty_mt=row["total_shortage_qty_mt"],
        lines=lines,
    )


@router.get("/shortage-forecast", response_model=ForecastResponse)
async def get_latest_forecast(conn: asyncpg.Connection = Depends(get_conn)) -> ForecastResponse:
    """Return the most recently generated forecast."""
    row = await conn.fetchrow(
        "SELECT * FROM m5a_material.shortage_forecast ORDER BY generated_at DESC LIMIT 1"
    )
    if not row:
        return ForecastResponse(
            forecast_id="none", generated_at=datetime.utcnow(),
            horizon_days=30, total_wos_evaluated=0, total_shortage_wos=0,
            total_shortage_qty_mt=0.0, lines=[],
        )
    lines_rows = await conn.fetch(
        "SELECT * FROM m5a_material.shortage_forecast_lines WHERE forecast_id=$1", row["forecast_id"]
    )
    lines = [ForecastLine(**dict(r)) for r in lines_rows]
    return ForecastResponse(
        forecast_id=str(row["forecast_id"]),
        generated_at=row["generated_at"],
        horizon_days=row["horizon_days"],
        total_wos_evaluated=row["total_wos_evaluated"],
        total_shortage_wos=row["total_shortage_wos"],
        total_shortage_qty_mt=row["total_shortage_qty_mt"],
        lines=lines,
    )
