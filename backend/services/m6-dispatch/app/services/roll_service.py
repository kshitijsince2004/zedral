"""M6 — Roll change service (v0.2)."""
from __future__ import annotations

from typing import Any

import asyncpg

from zedral_common.event_envelope import build_envelope
from zedral_common.kafka import publish


async def record_roll_change(payload: dict, pool: asyncpg.Pool, producer: Any) -> dict:
    async with pool.acquire() as conn:
        async with conn.transaction():
            row = await conn.fetchrow(
                """INSERT INTO m6_dispatch.roll_changes
                   (wc_id, occurred_at, out_roll_top_id, out_roll_bottom_id,
                    out_cumulative_since_last_change_mt, out_roll_finish_rating,
                    in_roll_top_id, in_roll_bottom_id, in_roll_finish,
                    reason, operator_id, crane_operator_id, dispatch_item_id, duration_min)
                   VALUES ($1,now(),$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *""",
                payload["wc_id"],
                payload.get("out_roll_top_id"), payload.get("out_roll_bottom_id"),
                payload.get("out_cumulative_since_last_change_mt"),
                payload.get("out_roll_finish_rating"),
                payload["in_roll_top_id"], payload["in_roll_bottom_id"],
                payload.get("in_roll_finish"),
                payload.get("reason", "scheduled_grind"),
                payload.get("operator_id"), payload.get("crane_operator_id"),
                payload.get("dispatch_item_id"), payload.get("duration_min"),
            )
            # Update incoming rolls' position
            if payload.get("in_roll_top_id"):
                await conn.execute(
                    "UPDATE master.rolls SET current_wc_id=$1, current_position='top', updated_at=now() WHERE roll_id=$2",
                    payload["wc_id"], payload["in_roll_top_id"],
                )
            if payload.get("in_roll_bottom_id"):
                await conn.execute(
                    "UPDATE master.rolls SET current_wc_id=$1, current_position='bottom', updated_at=now() WHERE roll_id=$2",
                    payload["wc_id"], payload["in_roll_bottom_id"],
                )
            # Accumulate tonnage on outgoing rolls
            if payload.get("out_cumulative_since_last_change_mt") and payload.get("out_roll_top_id"):
                await conn.execute(
                    """UPDATE master.rolls
                       SET cumulative_tonnage_mt = cumulative_tonnage_mt + $1,
                           tonnage_since_grind_mt = tonnage_since_grind_mt + $1,
                           updated_at = now()
                       WHERE roll_id = $2""",
                    payload["out_cumulative_since_last_change_mt"], payload["out_roll_top_id"],
                )

    if producer:
        env = build_envelope("floor.roll.changed", payload["wc_id"], payload, "m6-dispatch")
        await publish(producer, "floor.roll.changed", env.model_dump(), key=payload["wc_id"])

    return dict(row)


async def get_roll_assignments(dispatch_item_id: str, pool: asyncpg.Pool) -> list[dict]:
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT * FROM m6_dispatch.roll_assignments WHERE dispatch_item_id=$1 ORDER BY assigned_at",
            dispatch_item_id,
        )
    return [dict(r) for r in rows]
