"""M5a — Work Orders router (material readiness view)."""
from __future__ import annotations

from datetime import date
from typing import Optional

import asyncpg
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from ..db import get_conn

router = APIRouter(tags=["work-orders"])


class WorkOrderReadinessResponse(BaseModel):
    wo_id: str
    grade: str
    gauge_mm: float
    width_mm: int
    qty_planned_mt: float
    required_date: date
    priority_class: Optional[str] = None
    status: str
    readiness_status: Optional[str] = None
    available_qty_mt: Optional[float] = None
    shortfall_qty_mt: Optional[float] = None
    customer: Optional[str] = None


@router.get("/work-orders", response_model=list[WorkOrderReadinessResponse])
async def list_work_orders(
    readiness_status: str | None = Query(None),
    limit: int = Query(50, le=200),
    conn: asyncpg.Connection = Depends(get_conn),
) -> list[WorkOrderReadinessResponse]:
    conditions, params = ["w.status NOT IN ('complete', 'cancelled')"], []
    if readiness_status:
        params.append(readiness_status)
        conditions.append(f"wr.status = ${len(params)}")
    where = f"WHERE {' AND '.join(conditions)}"
    params.append(limit)
    rows = await conn.fetch(
        f"""SELECT w.wo_id, w.grade, w.gauge_mm, w.width_mm, w.qty_planned_mt,
                   w.required_date, w.priority_class, w.status,
                   wr.status AS readiness_status,
                   wr.available_qty_mt, wr.shortfall_qty_mt,
                   c.name AS customer
            FROM m1_demand.work_orders w
            LEFT JOIN m5a_material.wo_readiness wr ON wr.wo_id = w.wo_id
            LEFT JOIN m1_demand.wo_so_link l ON l.wo_id = w.wo_id
            LEFT JOIN m1_demand.sales_orders so ON so.so_id = l.so_id
            LEFT JOIN master.customers c ON c.customer_id = so.customer_id
            {where}
            ORDER BY w.priority_score DESC NULLS LAST
            LIMIT ${len(params)}""",
        *params,
    )
    return [WorkOrderReadinessResponse(**dict(r)) for r in rows]
