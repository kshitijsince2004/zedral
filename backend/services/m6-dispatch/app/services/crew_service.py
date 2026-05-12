"""M6 — Shift crew assignment service (v0.2)."""
from __future__ import annotations

from typing import Any

import asyncpg

from zedral_common.event_envelope import build_envelope
from zedral_common.kafka import publish


async def confirm_crew(payload: dict, pool: asyncpg.Pool, producer: Any) -> dict:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """INSERT INTO m6_dispatch.shift_crew_assignments
               (wc_id, shift_date, shift, line_incharge_id, crew_members,
                crane_operator_id, shift_manager_id, confirmed_at, confirmed_by)
               VALUES ($1,$2,$3,$4,$5,$6,$7,now(),$8)
               ON CONFLICT (wc_id, shift_date, shift) DO UPDATE SET
                 line_incharge_id=$4, crew_members=$5, crane_operator_id=$6,
                 shift_manager_id=$7, confirmed_at=now(), confirmed_by=$8
               RETURNING *""",
            payload["wc_id"],
            payload["shift_date"],
            payload["shift"],
            payload.get("line_incharge_id"),
            payload.get("crew_members", []),
            payload.get("crane_operator_id"),
            payload.get("shift_manager_id"),
            payload.get("confirmed_by"),
        )

    if producer:
        env = build_envelope("floor.shift.crew_confirmed", payload["wc_id"], payload, "m6-dispatch")
        await publish(producer, "floor.shift.crew_confirmed", env.model_dump(), key=payload["wc_id"])

    return dict(row)


async def get_crew(wc_id: str, shift_date: str, shift: str, pool: asyncpg.Pool) -> dict | None:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM m6_dispatch.shift_crew_assignments WHERE wc_id=$1 AND shift_date=$2 AND shift=$3",
            wc_id, shift_date, shift,
        )
    return dict(row) if row else None
