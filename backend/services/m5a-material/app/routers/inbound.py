"""M5a — Inbound shipments router."""
from __future__ import annotations

from datetime import date, datetime
from typing import Optional
from uuid import UUID

import asyncpg
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..db import get_conn

router = APIRouter(tags=["inbound"])


def _compute_age(expected_at: Optional[date]) -> Optional[int]:
    if not expected_at:
        return None
    return (date.today() - expected_at).days


def _compute_tone(is_overdue: bool) -> str:
    return "critical" if is_overdue else "normal"


class InboundShipmentResponse(BaseModel):
    expectation_id: str
    sap_doc_ref: str
    material_code: str
    grade: str
    gauge_mm: float
    width_mm: int
    expected_weight_mt: float
    supplier: Optional[str] = None
    expected_at: Optional[date] = None
    is_overdue: bool
    is_received: bool
    received_at: Optional[datetime] = None
    age: Optional[int] = None
    status: str
    tone: str
    notes: Optional[str] = None
    created_at: datetime


class InboundCreate(BaseModel):
    sap_doc_ref: str
    material_code: str
    grade: str
    gauge_mm: float
    width_mm: int
    expected_weight_mt: float
    supplier: Optional[str] = None
    expected_at: Optional[date] = None
    notes: Optional[str] = None


def _map_row(row: dict) -> InboundShipmentResponse:
    is_overdue = row.get("is_overdue", False)
    is_received = row.get("is_received", False)
    status = "received" if is_received else ("overdue" if is_overdue else "pending")
    return InboundShipmentResponse(
        expectation_id=str(row["expectation_id"]),
        sap_doc_ref=row["sap_doc_ref"],
        material_code=row["material_code"],
        grade=row["grade"],
        gauge_mm=row["gauge_mm"],
        width_mm=row["width_mm"],
        expected_weight_mt=row["expected_weight_mt"],
        supplier=row.get("supplier"),
        expected_at=row.get("expected_at"),
        is_overdue=is_overdue,
        is_received=is_received,
        received_at=row.get("received_at"),
        age=_compute_age(row.get("expected_at")),
        status=status,
        tone=_compute_tone(is_overdue),
        notes=row.get("notes"),
        created_at=row["created_at"],
    )


@router.get("/inbound", response_model=list[InboundShipmentResponse])
async def list_inbound(conn: asyncpg.Connection = Depends(get_conn)) -> list[InboundShipmentResponse]:
    rows = await conn.fetch(
        "SELECT * FROM m5a_material.inbound_expected ORDER BY expected_at ASC NULLS LAST"
    )
    return [_map_row(dict(r)) for r in rows]


@router.post("/inbound", response_model=InboundShipmentResponse, status_code=201)
async def create_inbound(body: InboundCreate, conn: asyncpg.Connection = Depends(get_conn)) -> InboundShipmentResponse:
    row = await conn.fetchrow(
        """INSERT INTO m5a_material.inbound_expected
           (sap_doc_ref, material_code, grade, gauge_mm, width_mm, expected_weight_mt, supplier, expected_at, notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *""",
        body.sap_doc_ref, body.material_code, body.grade, body.gauge_mm,
        body.width_mm, body.expected_weight_mt, body.supplier, body.expected_at, body.notes,
    )
    return _map_row(dict(row))


@router.patch("/inbound/{expectation_id}/received", response_model=InboundShipmentResponse)
async def mark_received(expectation_id: str, conn: asyncpg.Connection = Depends(get_conn)) -> InboundShipmentResponse:
    row = await conn.fetchrow(
        "UPDATE m5a_material.inbound_expected SET is_received=TRUE, received_at=now() WHERE expectation_id=$1 RETURNING *",
        expectation_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail=f"Inbound expectation {expectation_id} not found")
    return _map_row(dict(row))
