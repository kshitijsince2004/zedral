"""M2 — Changeover Matrix router."""
from __future__ import annotations

import asyncpg
from fastapi import APIRouter, Depends, Query, Request

from ..db import get_conn
from ..models.schemas import ChangeoverMatrixEntry
from zedral_common.event_envelope import build_envelope
from zedral_common.kafka import publish

router = APIRouter(tags=["changeover-matrix"])


@router.get("/changeover-matrix", response_model=list[ChangeoverMatrixEntry])
async def get_changeover_matrix(
    wc_id: str | None = Query(None),
    conn: asyncpg.Connection = Depends(get_conn),
) -> list[ChangeoverMatrixEntry]:
    if wc_id:
        rows = await conn.fetch(
            "SELECT * FROM master.changeover_matrix WHERE wc_id = $1 ORDER BY grade_from, grade_to", wc_id
        )
    else:
        rows = await conn.fetch("SELECT * FROM master.changeover_matrix ORDER BY wc_id, grade_from, grade_to")
    return [ChangeoverMatrixEntry(**dict(r)) for r in rows]


@router.post("/changeover-matrix", response_model=ChangeoverMatrixEntry, status_code=201)
async def upsert_changeover_entry(
    body: ChangeoverMatrixEntry,
    request: Request,
    conn: asyncpg.Connection = Depends(get_conn),
) -> ChangeoverMatrixEntry:
    row = await conn.fetchrow(
        """INSERT INTO master.changeover_matrix
             (wc_id, grade_from, grade_to, gauge_step, width_step, roll_change_reqd, setup_min, sample_count)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           ON CONFLICT (wc_id, grade_from, grade_to, gauge_step, width_step)
           DO UPDATE SET setup_min = EXCLUDED.setup_min, sample_count = EXCLUDED.sample_count
           RETURNING *""",
        body.wc_id, body.grade_from, body.grade_to, body.gauge_step,
        body.width_step, body.roll_change_reqd, body.setup_min, body.sample_count,
    )
    entry = ChangeoverMatrixEntry(**dict(row))

    # Publish event
    producer = getattr(request.app.state, "producer", None)
    if producer:
        envelope = build_envelope(
            event_type="master.changeover_matrix.updated",
            aggregate_id=f"{body.wc_id}:{body.grade_from}:{body.grade_to}",
            payload=entry.model_dump(),
            source_system="m2-master",
        )
        await publish(producer, "master.changeover_matrix.updated", envelope.model_dump(), key=body.wc_id)

    return entry
