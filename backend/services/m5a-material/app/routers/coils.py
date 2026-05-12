"""M5a — Coils router with frontend field mapping, stage transitions, reserve/release/hold."""
from __future__ import annotations

from datetime import datetime
from typing import Optional

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel

from ..db import get_conn
from zedral_common.event_envelope import build_envelope
from zedral_common.kafka import publish

router = APIRouter(tags=["coils"])

VALID_STAGES = ["expected", "stores", "pickling", "rolling", "annealing", "rewind", "fg", "dispatched", "rejected", "scrapped"]
FORWARD_PIPELINE = {s: i for i, s in enumerate(["expected", "stores", "pickling", "rolling", "annealing", "rewind", "fg", "dispatched"])}
TERMINAL_STAGES = {"dispatched", "scrapped", "rejected"}


def _format_gauge(gauge_mm: float, width_mm: int) -> str:
    return f"{gauge_mm}×{width_mm}"


class CoilResponse(BaseModel):
    """Frontend-shaped coil response matching TypeScript Coil type."""
    id: str                          # coil_id
    material_code: str
    grade: str
    gauge: str                       # "0.45×1250"
    gauge_mm: float
    width_mm: int
    weightInitial: float             # weight_initial_mt
    weight: float                    # weight_remaining_mt
    heat: Optional[str] = None       # heat_number
    supplier: Optional[str] = None
    stage: str                       # current_stage
    hold: bool                       # is_quality_hold
    ncr: Optional[str] = None        # hold_ncr_id
    reservedFor: Optional[str] = None  # reserved_for_wo
    parent: Optional[str] = None     # parent_coil_id
    sapRef: Optional[str] = None     # sap_coil_ref
    grDate: Optional[str] = None     # gr_date
    created_at: datetime
    model_config = {"from_attributes": True}

    @classmethod
    def from_row(cls, row: dict) -> "CoilResponse":
        return cls(
            id=row["coil_id"],
            material_code=row["material_code"],
            grade=row["grade"],
            gauge=_format_gauge(row["gauge_mm"], row["width_mm"]),
            gauge_mm=row["gauge_mm"],
            width_mm=row["width_mm"],
            weightInitial=row["weight_initial_mt"],
            weight=row["weight_remaining_mt"],
            heat=row.get("heat_number"),
            supplier=row.get("supplier"),
            stage=row["current_stage"],
            hold=row.get("is_quality_hold", False),
            ncr=row.get("hold_ncr_id"),
            reservedFor=row.get("reserved_for_wo"),
            parent=row.get("parent_coil_id"),
            sapRef=row.get("sap_coil_ref"),
            grDate=str(row["gr_date"]) if row.get("gr_date") else None,
            created_at=row["created_at"],
        )


class StageTransitionRequest(BaseModel):
    to_stage: str
    triggered_by: str = "operator_scan"
    user_id: Optional[str] = None
    device_id: Optional[str] = None
    related_wo_id: Optional[str] = None
    notes: Optional[str] = None


class ReserveRequest(BaseModel):
    wo_id: str
    reservation_qty_mt: float
    reserved_by: str


class HoldRequest(BaseModel):
    reason: str
    ncr_id: Optional[str] = None


@router.get("/coils", response_model=list[CoilResponse])
async def list_coils(
    current_stage: str | None = Query(None),
    material_code: str | None = Query(None),
    grade: str | None = Query(None),
    is_quality_hold: bool | None = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    conn: asyncpg.Connection = Depends(get_conn),
) -> list[CoilResponse]:
    conditions, params = [], []
    if current_stage:
        params.append(current_stage); conditions.append(f"current_stage = ${len(params)}")
    if material_code:
        params.append(material_code); conditions.append(f"material_code = ${len(params)}")
    if grade:
        params.append(grade); conditions.append(f"grade = ${len(params)}")
    if is_quality_hold is not None:
        params.append(is_quality_hold); conditions.append(f"is_quality_hold = ${len(params)}")
    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    params.extend([limit, offset])
    rows = await conn.fetch(
        f"SELECT * FROM m5a_material.coils {where} ORDER BY created_at DESC LIMIT ${len(params)-1} OFFSET ${len(params)}",
        *params,
    )
    return [CoilResponse.from_row(dict(r)) for r in rows]


@router.get("/coils/{coil_id}", response_model=CoilResponse)
async def get_coil(coil_id: str, conn: asyncpg.Connection = Depends(get_conn)) -> CoilResponse:
    row = await conn.fetchrow("SELECT * FROM m5a_material.coils WHERE coil_id = $1", coil_id)
    if not row:
        raise HTTPException(status_code=404, detail=f"Coil {coil_id} not found")
    return CoilResponse.from_row(dict(row))


@router.patch("/coils/{coil_id}/stage", response_model=CoilResponse)
async def transition_stage(
    coil_id: str,
    body: StageTransitionRequest,
    request: Request,
    conn: asyncpg.Connection = Depends(get_conn),
) -> CoilResponse:
    coil = await conn.fetchrow("SELECT * FROM m5a_material.coils WHERE coil_id = $1", coil_id)
    if not coil:
        raise HTTPException(status_code=404, detail=f"Coil {coil_id} not found")

    from_stage = coil["current_stage"]
    to_stage = body.to_stage

    if from_stage in TERMINAL_STAGES:
        raise HTTPException(status_code=422, detail=f"Cannot transition from terminal stage '{from_stage}'")

    if to_stage not in ["rejected", "scrapped"]:
        from_idx = FORWARD_PIPELINE.get(from_stage, -1)
        to_idx = FORWARD_PIPELINE.get(to_stage, -1)
        if to_idx <= from_idx:
            valid_next = list(FORWARD_PIPELINE.keys())[from_idx + 1:]
            raise HTTPException(
                status_code=422,
                detail=f"Invalid transition {from_stage} → {to_stage}. Valid next stages: {valid_next}",
            )

    extra_updates = ""
    if to_stage == "dispatched":
        extra_updates = ", dispatched_at = now()"
    elif to_stage == "scrapped":
        extra_updates = ", scrapped_at = now()"

    async with conn.transaction():
        await conn.execute(
            f"UPDATE m5a_material.coils SET current_stage=$1, updated_at=now(){extra_updates} WHERE coil_id=$2",
            to_stage, coil_id,
        )
        await conn.execute(
            """INSERT INTO m5a_material.coil_stage_history
               (coil_id, from_stage, to_stage, triggered_by, user_id, device_id, related_wo_id, notes)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8)""",
            coil_id, from_stage, to_stage, body.triggered_by,
            body.user_id, body.device_id, body.related_wo_id, body.notes,
        )

    producer = getattr(request.app.state, "producer", None)
    if producer:
        env = build_envelope(
            "material.coil.staged", coil_id,
            {"coil_id": coil_id, "from_stage": from_stage, "to_stage": to_stage},
            "m5a-material",
        )
        await publish(producer, "material.coil.staged", env.model_dump(), key=coil_id)

    row = await conn.fetchrow("SELECT * FROM m5a_material.coils WHERE coil_id = $1", coil_id)
    return CoilResponse.from_row(dict(row))


@router.post("/coils/{coil_id}/reserve", response_model=CoilResponse)
async def reserve_coil(
    coil_id: str,
    body: ReserveRequest,
    request: Request,
    conn: asyncpg.Connection = Depends(get_conn),
) -> CoilResponse:
    coil = await conn.fetchrow("SELECT * FROM m5a_material.coils WHERE coil_id = $1", coil_id)
    if not coil:
        raise HTTPException(status_code=404, detail=f"Coil {coil_id} not found")
    if coil["reserved_for_wo"] and coil["reserved_for_wo"] != body.wo_id:
        raise HTTPException(
            status_code=409,
            detail=f"Coil already reserved for {coil['reserved_for_wo']}. Release first.",
        )
    await conn.execute(
        "UPDATE m5a_material.coils SET reserved_for_wo=$1, reservation_qty_mt=$2, reservation_set_at=now(), reservation_set_by=$3, updated_at=now() WHERE coil_id=$4",
        body.wo_id, body.reservation_qty_mt, body.reserved_by, coil_id,
    )
    producer = getattr(request.app.state, "producer", None)
    if producer:
        env = build_envelope(
            "material.coil.reserved", coil_id,
            {"coil_id": coil_id, "wo_id": body.wo_id, "qty_mt": body.reservation_qty_mt},
            "m5a-material",
        )
        await publish(producer, "material.coil.reserved", env.model_dump(), key=coil_id)

    row = await conn.fetchrow("SELECT * FROM m5a_material.coils WHERE coil_id = $1", coil_id)
    return CoilResponse.from_row(dict(row))


@router.post("/coils/{coil_id}/release", response_model=CoilResponse)
async def release_coil(
    coil_id: str,
    request: Request,
    conn: asyncpg.Connection = Depends(get_conn),
) -> CoilResponse:
    coil = await conn.fetchrow("SELECT reserved_for_wo FROM m5a_material.coils WHERE coil_id = $1", coil_id)
    if not coil:
        raise HTTPException(status_code=404, detail=f"Coil {coil_id} not found")
    wo_id = coil["reserved_for_wo"]
    await conn.execute(
        "UPDATE m5a_material.coils SET reserved_for_wo=NULL, reservation_qty_mt=NULL, reservation_set_at=NULL, reservation_set_by=NULL, updated_at=now() WHERE coil_id=$1",
        coil_id,
    )
    producer = getattr(request.app.state, "producer", None)
    if producer:
        env = build_envelope(
            "material.coil.allocated", coil_id,
            {"coil_id": coil_id, "released_from_wo": wo_id},
            "m5a-material",
        )
        await publish(producer, "material.coil.allocated", env.model_dump(), key=coil_id)

    row = await conn.fetchrow("SELECT * FROM m5a_material.coils WHERE coil_id = $1", coil_id)
    return CoilResponse.from_row(dict(row))


@router.post("/coils/{coil_id}/hold", response_model=CoilResponse)
async def hold_coil(
    coil_id: str,
    body: HoldRequest,
    conn: asyncpg.Connection = Depends(get_conn),
) -> CoilResponse:
    row = await conn.fetchrow(
        "UPDATE m5a_material.coils SET is_quality_hold=TRUE, hold_reason=$1, hold_ncr_id=$2, updated_at=now() WHERE coil_id=$3 RETURNING *",
        body.reason, body.ncr_id, coil_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail=f"Coil {coil_id} not found")
    return CoilResponse.from_row(dict(row))


@router.post("/coils/{coil_id}/release-hold", response_model=CoilResponse)
async def release_hold(
    coil_id: str,
    conn: asyncpg.Connection = Depends(get_conn),
) -> CoilResponse:
    row = await conn.fetchrow(
        "UPDATE m5a_material.coils SET is_quality_hold=FALSE, hold_reason=NULL, hold_ncr_id=NULL, updated_at=now() WHERE coil_id=$1 RETURNING *",
        coil_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail=f"Coil {coil_id} not found")
    return CoilResponse.from_row(dict(row))
