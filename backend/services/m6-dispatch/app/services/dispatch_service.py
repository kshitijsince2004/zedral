"""M6 — Dispatch list and item service."""
from __future__ import annotations

import json
import logging
from typing import Any

import asyncpg

from zedral_common.event_envelope import build_envelope
from zedral_common.kafka import publish

logger = logging.getLogger(__name__)

_STATUS_MAP = {
    "pending": "queued",
    "setup_in_progress": "setup",
    "production_in_progress": "running",
    "complete": "done",
    "cancelled": "done",
    "skipped": "done",
    "stopped": "running",
}


def _fmt_dt(dt: Any) -> str:
    if dt is None:
        return ""
    from datetime import datetime
    if isinstance(dt, datetime):
        return dt.strftime("%H:%M")
    return str(dt)


async def get_dispatch_lists(pool: asyncpg.Pool) -> list[dict]:
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT * FROM m6_dispatch.dispatch_lists ORDER BY shift_date DESC, shift DESC LIMIT 50"
        )
    return [dict(r) for r in rows]


async def get_dispatch_by_wc(wc_id: str, pool: asyncpg.Pool) -> list[dict]:
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT di.*, wo.grade, wo.gauge_mm, wo.width_mm, wo.qty_planned_mt
               FROM m6_dispatch.dispatch_items di
               JOIN m6_dispatch.dispatch_lists dl ON dl.dispatch_id = di.dispatch_id
               LEFT JOIN m1_demand.work_orders wo ON wo.wo_id = di.wo_id
               WHERE dl.wc_id = $1 AND dl.status = 'published'
               ORDER BY di.sequence_in_shift""",
            wc_id,
        )
    result = []
    for r in rows:
        d = dict(r)
        grade = d.get("grade") or ""
        gauge = d.get("gauge_mm") or ""
        width = d.get("width_mm") or ""
        material = f"{grade} {gauge}×{width}".strip() if grade else "—"
        result.append({
            "wo": d.get("wo_id") or "—",
            "status": _STATUS_MAP.get(d.get("actual_status", "pending"), "queued"),
            "plannedStart": _fmt_dt(d.get("planned_prod_start")),
            "plannedEnd": _fmt_dt(d.get("planned_prod_end")),
            "actualStart": _fmt_dt(d.get("actual_prod_start")) or None,
            "actualEnd": _fmt_dt(d.get("actual_prod_end")) or None,
            "material": material,
            "qty": float(d.get("planned_qty_mt") or 0),
        })
    return result


async def create_dispatch_list(data: dict, pool: asyncpg.Pool, producer: Any) -> dict:
    async with pool.acquire() as conn:
        async with conn.transaction():
            row = await conn.fetchrow(
                """INSERT INTO m6_dispatch.dispatch_lists
                   (wc_id, shift_date, shift, shift_start, shift_end, status)
                   VALUES ($1,$2,$3,$4,$5,'published') RETURNING *""",
                data["wc_id"], data["shift_date"], data["shift"],
                data["shift_start"], data["shift_end"],
            )
            dispatch_id = row["dispatch_id"]
            for i, item in enumerate(data.get("items", []), start=1):
                await conn.execute(
                    """INSERT INTO m6_dispatch.dispatch_items
                       (dispatch_id, wo_id, sequence_in_shift, op_type, planned_prod_start, planned_prod_end, planned_qty_mt)
                       VALUES ($1,$2,$3,$4,$5,$6,$7)""",
                    dispatch_id, item.get("wo_id"), i,
                    item.get("op_type", "production"),
                    item.get("planned_prod_start"), item.get("planned_prod_end"),
                    item.get("planned_qty_mt"),
                )

    if producer:
        env = build_envelope(
            "floor.dispatch.issued", str(dispatch_id),
            {"dispatch_id": str(dispatch_id), "wc_id": data["wc_id"]},
            "m6-dispatch",
        )
        await publish(producer, "floor.dispatch.issued", env.model_dump(), key=data["wc_id"])

    return dict(row)


async def get_dispatch_items(dispatch_id: str, pool: asyncpg.Pool) -> list[dict]:
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT * FROM m6_dispatch.dispatch_items WHERE dispatch_id=$1 ORDER BY sequence_in_shift",
            dispatch_id,
        )
    return [dict(r) for r in rows]
