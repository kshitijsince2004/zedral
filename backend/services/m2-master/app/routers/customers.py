"""M2 — Customers router."""
from __future__ import annotations

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query

from ..db import get_conn
from ..models.schemas import CustomerCreate, CustomerResponse

router = APIRouter(tags=["customers"])


@router.get("/customers", response_model=list[CustomerResponse])
async def list_customers(
    priority: str | None = Query(None),
    status: str | None = Query(None),
    conn: asyncpg.Connection = Depends(get_conn),
) -> list[CustomerResponse]:
    conditions, params = [], []
    if priority:
        params.append(priority)
        conditions.append(f"priority = ${len(params)}")
    if status:
        params.append(status)
        conditions.append(f"status = ${len(params)}")
    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    rows = await conn.fetch(f"SELECT * FROM master.customers {where} ORDER BY name", *params)
    return [CustomerResponse(**dict(r)) for r in rows]


@router.post("/customers", response_model=CustomerResponse, status_code=201)
async def create_customer(
    body: CustomerCreate,
    conn: asyncpg.Connection = Depends(get_conn),
) -> CustomerResponse:
    row = await conn.fetchrow(
        "INSERT INTO master.customers (customer_id, name, priority, status) VALUES ($1,$2,$3,$4) RETURNING *",
        body.customer_id, body.name, body.priority, body.status,
    )
    return CustomerResponse(**dict(row))
