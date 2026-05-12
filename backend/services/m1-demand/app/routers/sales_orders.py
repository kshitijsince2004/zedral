"""M1 — Sales Orders router."""
from __future__ import annotations

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from datetime import date

from ..db import get_conn

router = APIRouter(tags=["sales-orders"])


class SalesOrderResponse(BaseModel):
    so_id: str
    customer_id: str
    required_date: date
    total_qty_mt: float
    status: str
    model_config = {"from_attributes": True}


@router.get("/sales-orders", response_model=list[SalesOrderResponse])
async def list_sales_orders(
    customer_id: str | None = Query(None),
    status: str | None = Query(None),
    conn: asyncpg.Connection = Depends(get_conn),
) -> list[SalesOrderResponse]:
    conditions, params = [], []
    if customer_id:
        params.append(customer_id)
        conditions.append(f"customer_id = ${len(params)}")
    if status:
        params.append(status)
        conditions.append(f"status = ${len(params)}")
    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    rows = await conn.fetch(f"SELECT * FROM m1_demand.sales_orders {where} ORDER BY required_date", *params)
    return [SalesOrderResponse(**dict(r)) for r in rows]


@router.get("/sales-orders/{so_id}", response_model=SalesOrderResponse)
async def get_sales_order(so_id: str, conn: asyncpg.Connection = Depends(get_conn)) -> SalesOrderResponse:
    row = await conn.fetchrow("SELECT * FROM m1_demand.sales_orders WHERE so_id = $1", so_id)
    if not row:
        raise HTTPException(status_code=404, detail=f"Sales order {so_id} not found")
    return SalesOrderResponse(**dict(row))
