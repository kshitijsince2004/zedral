"""M1 — Work Orders router."""
from __future__ import annotations

from datetime import date
from typing import Optional

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field

from ..db import get_conn
from ..services.priority_service import recalculate_and_persist
from zedral_common.event_envelope import build_envelope
from zedral_common.kafka import publish

router = APIRouter(tags=["work-orders"])

_PRIORITY_MAP = {"A": "High", "B": "Medium", "C": "Low"}
_STATUS_MAP = {
    "queued": "Pending",
    "pending": "Pending",
    "scheduled": "Pending",
    "released": "Running",
    "in_process": "Running",
    "complete": "Completed",
    "cancelled": "Cancelled",
    "on_hold": "On Hold",
    "rejected": "Rejected",
}
_VALID_TRANSITIONS: dict[str, list[str]] = {
    "pending":    ["queued", "cancelled"],
    "queued":     ["scheduled", "released", "on_hold", "cancelled"],
    "scheduled":  ["released", "on_hold", "cancelled"],
    "released":   ["in_process", "on_hold", "cancelled"],
    "in_process": ["complete", "on_hold"],
    "on_hold":    ["queued", "cancelled"],
    "complete":   [],
    "cancelled":  [],
    "rejected":   [],
}


class WorkOrderResponse(BaseModel):
    wo_id: str
    material_code: str
    grade: str
    gauge_mm: float
    width_mm: int
    qty_planned_mt: float
    qty_confirmed_mt: float
    required_date: date
    routing_valid: bool
    priority_class: Optional[str] = None
    priority: Optional[str] = None          # High / Medium / Low
    priority_score: Optional[float] = None
    wo_type: str
    status: str                              # frontend-mapped status
    customer: Optional[str] = None
    work_centre: Optional[str] = None
    material_exists: bool = True
    routing_exists: bool = False
    wc_active: bool = False
    operator_assigned: bool = False
    hold_reason: Optional[str] = None
    rejection_reason: Optional[str] = None
    model_config = {"from_attributes": True}


class WorkOrderCreate(BaseModel):
    wo_id: str
    material_code: str
    grade: str
    gauge_mm: float
    width_mm: int
    qty_planned_mt: float
    required_date: date
    wo_type: str = "manual"


class OverrideRequest(BaseModel):
    override_type: str = Field(..., pattern="^(rush|defer|hold|release_hold)$")
    reason: str = Field(..., min_length=20)
    overridden_by: str


_ENRICH_QUERY = """
SELECT
  w.*,
  c.name                                          AS customer,
  wc.wc_id                                        AS wc_id_ref,
  wc.status                                       AS wc_status,
  (c.customer_id IS NOT NULL)                     AS material_exists,
  (r.routing_id IS NOT NULL)                      AS routing_exists,
  (wc.status = 'active')                          AS wc_active,
  (op.operator_id IS NOT NULL)                    AS operator_assigned
FROM m1_demand.work_orders w
LEFT JOIN master.materials mat ON mat.material_code = w.material_code
LEFT JOIN master.routings r ON r.routing_id = w.routing_id
LEFT JOIN master.work_centres wc ON wc.wc_id = r.wc_id
LEFT JOIN master.customers c ON c.customer_id = (
  SELECT so.customer_id FROM m1_demand.wo_so_link l
  JOIN m1_demand.sales_orders so ON so.so_id = l.so_id
  WHERE l.wo_id = w.wo_id LIMIT 1
)
LEFT JOIN master.operators op ON op.work_centre_id = wc.wc_id AND op.status = 'active'
"""


def _map_row(row: dict) -> WorkOrderResponse:
    pc = row.get("priority_class")
    raw_status = row.get("status", "pending")
    return WorkOrderResponse(
        wo_id=row["wo_id"],
        material_code=row["material_code"],
        grade=row["grade"],
        gauge_mm=row["gauge_mm"],
        width_mm=row["width_mm"],
        qty_planned_mt=row["qty_planned_mt"],
        qty_confirmed_mt=row.get("qty_confirmed_mt", 0),
        required_date=row["required_date"],
        routing_valid=row.get("routing_valid", False),
        priority_class=pc,
        priority=_PRIORITY_MAP.get(pc) if pc else None,
        priority_score=row.get("priority_score"),
        wo_type=row["wo_type"],
        status=_STATUS_MAP.get(raw_status, raw_status),
        customer=row.get("customer"),
        work_centre=row.get("wc_id_ref"),
        material_exists=bool(row.get("material_exists", True)),
        routing_exists=bool(row.get("routing_exists", False)),
        wc_active=bool(row.get("wc_active", False)),
        operator_assigned=bool(row.get("operator_assigned", False)),
        hold_reason=row.get("hold_reason"),
        rejection_reason=row.get("rejection_reason"),
    )


@router.get("/work-orders", response_model=list[WorkOrderResponse])
async def list_work_orders(
    status: str | None = Query(None),
    material_code: str | None = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    conn: asyncpg.Connection = Depends(get_conn),
) -> list[WorkOrderResponse]:
    conditions, params = [], []
    if status:
        params.append(status); conditions.append(f"w.status = ${len(params)}")
    if material_code:
        params.append(material_code); conditions.append(f"w.material_code = ${len(params)}")
    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    params.extend([limit, offset])
    rows = await conn.fetch(
        f"{_ENRICH_QUERY} {where} ORDER BY w.priority_score DESC NULLS LAST LIMIT ${len(params)-1} OFFSET ${len(params)}",
        *params,
    )
    return [_map_row(dict(r)) for r in rows]


@router.get("/work-orders/{wo_id}", response_model=WorkOrderResponse)
async def get_work_order(wo_id: str, conn: asyncpg.Connection = Depends(get_conn)) -> WorkOrderResponse:
    row = await conn.fetchrow(f"{_ENRICH_QUERY} WHERE w.wo_id = $1", wo_id)
    if not row:
        raise HTTPException(status_code=404, detail=f"Work order {wo_id} not found")
    return _map_row(dict(row))


@router.post("/work-orders", response_model=WorkOrderResponse, status_code=201)
async def create_work_order(body: WorkOrderCreate, conn: asyncpg.Connection = Depends(get_conn)) -> WorkOrderResponse:
    row = await conn.fetchrow(
        """INSERT INTO m1_demand.work_orders
           (wo_id, sap_wo_ref, material_code, grade, gauge_mm, width_mm, qty_planned_mt, required_date, wo_type, sap_modified_at)
           VALUES ($1,$1,$2,$3,$4,$5,$6,$7,$8,now()) RETURNING *""",
        body.wo_id, body.material_code, body.grade, body.gauge_mm,
        body.width_mm, body.qty_planned_mt, body.required_date, body.wo_type,
    )
    return _map_row(dict(row))


@router.post("/work-orders/{wo_id}/release", response_model=WorkOrderResponse)
async def release_work_order(wo_id: str, conn: asyncpg.Connection = Depends(get_conn)) -> WorkOrderResponse:
    wo = await conn.fetchrow("SELECT status FROM m1_demand.work_orders WHERE wo_id = $1", wo_id)
    if not wo:
        raise HTTPException(status_code=404, detail=f"Work order {wo_id} not found")
    current = wo["status"]
    if "released" not in _VALID_TRANSITIONS.get(current, []):
        raise HTTPException(
            status_code=422,
            detail=f"Cannot release from status '{current}'. Allowed transitions: {_VALID_TRANSITIONS.get(current, [])}",
        )
    await conn.execute(
        "UPDATE m1_demand.work_orders SET status='released', updated_at=now() WHERE wo_id=$1", wo_id
    )
    row = await conn.fetchrow(f"{_ENRICH_QUERY} WHERE w.wo_id = $1", wo_id)
    return _map_row(dict(row))


@router.post("/work-orders/{wo_id}/override", response_model=WorkOrderResponse)
async def override_work_order(
    wo_id: str,
    body: OverrideRequest,
    request: Request,
    conn: asyncpg.Connection = Depends(get_conn),
) -> WorkOrderResponse:
    wo = await conn.fetchrow("SELECT wo_id, priority_score FROM m1_demand.work_orders WHERE wo_id = $1", wo_id)
    if not wo:
        raise HTTPException(status_code=404, detail=f"Work order {wo_id} not found")

    # Deactivate any existing active override
    await conn.execute(
        "UPDATE m1_demand.priority_overrides SET is_active=FALSE WHERE wo_id=$1 AND is_active=TRUE", wo_id
    )
    await conn.execute(
        """INSERT INTO m1_demand.priority_overrides (wo_id, override_type, old_score, reason, overridden_by)
           VALUES ($1,$2,$3,$4,$5)""",
        wo_id, body.override_type, wo["priority_score"], body.reason, body.overridden_by,
    )

    pool = request.app.state.pool
    producer = getattr(request.app.state, "producer", None)
    await recalculate_and_persist(wo_id, pool, producer, trigger="manual_override", triggered_by=body.overridden_by)

    # Publish override event
    if producer:
        envelope = build_envelope(
            event_type="demand.priority.overridden",
            aggregate_id=wo_id,
            payload={"wo_id": wo_id, "override_type": body.override_type, "reason": body.reason},
            source_system="m1-demand",
            user_id=body.overridden_by,
        )
        await publish(producer, "demand.priority.overridden", envelope.model_dump(), key=wo_id)

    row = await conn.fetchrow(f"{_ENRICH_QUERY} WHERE w.wo_id = $1", wo_id)
    return _map_row(dict(row))
