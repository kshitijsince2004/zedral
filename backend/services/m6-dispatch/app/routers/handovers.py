"""M6 — Shift handovers router."""
from __future__ import annotations

import asyncpg
from fastapi import APIRouter, Depends, HTTPException

from ..db import get_conn
from ..models.schemas import HandoverCreate, HandoverResponse

router = APIRouter(tags=["handovers"])


def _map_row(row: dict) -> HandoverResponse:
    pending = row.get("pending_items") or []
    if isinstance(pending, str):
        import json
        pending = json.loads(pending)
    return HandoverResponse(
        handover_id=str(row["handover_id"]),
        wc_id=row["wc_id"],
        shift_date=row["shift_date"],
        outgoing_shift=row["outgoing_shift"],
        incoming_shift=row["incoming_shift"],
        outgoing_operator=row["outgoing_operator"],
        machine_state_note=row.get("machine_state_note"),
        pending_items=pending,
        handover_complete=row.get("handover_complete", False),
        incharge_signed_at=row.get("incharge_signed_at"),
        manager_approved_at=row.get("manager_approved_at"),
        is_immutable=row.get("is_immutable", False),
        created_at=row["created_at"],
    )


@router.get("/handovers", response_model=list[HandoverResponse])
async def list_handovers(conn: asyncpg.Connection = Depends(get_conn)) -> list[HandoverResponse]:
    rows = await conn.fetch(
        "SELECT * FROM m6_dispatch.shift_handovers ORDER BY shift_date DESC, created_at DESC LIMIT 50"
    )
    return [_map_row(dict(r)) for r in rows]


@router.post("/handovers", response_model=HandoverResponse, status_code=201)
async def create_handover(body: HandoverCreate, conn: asyncpg.Connection = Depends(get_conn)) -> HandoverResponse:
    row = await conn.fetchrow(
        """INSERT INTO m6_dispatch.shift_handovers
           (wc_id, shift_date, outgoing_shift, incoming_shift, outgoing_operator,
            machine_state_note, pending_items)
           VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *""",
        body.wc_id, body.shift_date, body.outgoing_shift, body.incoming_shift,
        body.outgoing_operator, body.machine_state_note, body.pending_items,
    )
    return _map_row(dict(row))


@router.patch("/handovers/{handover_id}/acknowledge", response_model=HandoverResponse)
async def acknowledge_handover(handover_id: str, conn: asyncpg.Connection = Depends(get_conn)) -> HandoverResponse:
    row = await conn.fetchrow(
        "UPDATE m6_dispatch.shift_handovers SET handover_complete=TRUE WHERE handover_id=$1 RETURNING *",
        handover_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail=f"Handover {handover_id} not found")
    return _map_row(dict(row))
