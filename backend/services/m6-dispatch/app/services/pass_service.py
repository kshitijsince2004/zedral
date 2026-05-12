"""M6 — Production pass service (v0.2)."""
from __future__ import annotations

import asyncpg


async def get_passes(dispatch_item_id: str, pool: asyncpg.Pool) -> list[dict]:
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT * FROM m6_dispatch.production_passes WHERE dispatch_item_id=$1 ORDER BY pass_number",
            dispatch_item_id,
        )
    return [dict(r) for r in rows]


async def create_pass(dispatch_item_id: str, payload: dict, pool: asyncpg.Pool) -> dict:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """INSERT INTO m6_dispatch.production_passes
               (dispatch_item_id, pass_number, is_final, thickness_in_mm, thickness_out_mm,
                rw_tension, coolant_temp_c, coolant_press_kg_cm2, operator_id, notes)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *""",
            dispatch_item_id,
            payload.get("pass_number", 1),
            payload.get("is_final", False),
            payload.get("thickness_in_mm"),
            payload.get("thickness_out_mm", 0),
            payload.get("rw_tension"),
            payload.get("coolant_temp_c"),
            payload.get("coolant_press_kg_cm2"),
            payload.get("operator_id"),
            payload.get("notes"),
        )
    return dict(row)


async def complete_pass(pass_id: int, payload: dict, pool: asyncpg.Pool) -> dict:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """UPDATE m6_dispatch.production_passes
               SET thickness_out_mm=$1, ended_at=now(), operator_id=$2, notes=$3, is_final=$4
               WHERE pass_id=$5 RETURNING *""",
            payload.get("thickness_out_mm", 0),
            payload.get("operator_id"),
            payload.get("notes"),
            payload.get("is_final", False),
            pass_id,
        )
        if row and row["is_final"]:
            await conn.execute(
                "UPDATE m6_dispatch.dispatch_items SET actual_status='complete', actual_prod_end=now() WHERE item_id=$1",
                row["dispatch_item_id"],
            )
    return dict(row)
