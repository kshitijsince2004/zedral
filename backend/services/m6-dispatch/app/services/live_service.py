"""M6 — Live production line state service with SSE broadcast."""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any

import asyncpg

logger = logging.getLogger(__name__)

# Module-level subscriber set
_subscribers: set[asyncio.Queue] = set()


def subscribe(queue: asyncio.Queue) -> None:
    _subscribers.add(queue)


def unsubscribe(queue: asyncio.Queue) -> None:
    _subscribers.discard(queue)


async def broadcast(lines: list[dict[str, Any]]) -> None:
    for q in list(_subscribers):
        try:
            q.put_nowait(lines)
        except asyncio.QueueFull:
            pass


def _fmt_time(dt: Any) -> str:
    if dt is None:
        return "—"
    if isinstance(dt, datetime):
        return dt.strftime("%H:%M")
    return str(dt)


async def get_production_lines(pool: asyncpg.Pool) -> list[dict[str, Any]]:
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT
              wc.wc_id                                    AS id,
              di.actual_status,
              di.item_id                                  AS dispatch_item_id,
              di.wo_id,
              mat.grade                                   AS material,
              mat.gauge_mm,
              mat.width_mm,
              COALESCE(di.actual_qty_mt, 0)               AS actual_mt,
              di.planned_qty_mt                           AS target_mt,
              di.actual_prod_start                        AS start_time,
              di.planned_prod_end                         AS planned_end,
              op.name                                     AS operator,
              c.coil_id,
              c.arrived_at_stores                         AS coil_mounted_at,
              di.notes_runtime                            AS setup_note,
              CASE WHEN di.actual_status = 'setup_in_progress'
                   THEN EXTRACT(EPOCH FROM (now() - di.actual_setup_start))::INT / 60
                   ELSE NULL END                          AS setup_elapsed,
              NULL::INT                                   AS setup_planned,
              st.reason_category                          AS stoppage_category,
              st.reason_detail                            AS stoppage_detail,
              st.started_at                               AS stoppage_started_at,
              st.duration_min                             AS stoppage_duration
            FROM master.work_centres wc
            LEFT JOIN m6_dispatch.dispatch_items di ON di.dispatch_id = (
              SELECT dispatch_id FROM m6_dispatch.dispatch_lists
              WHERE wc_id = wc.wc_id AND status = 'published'
              ORDER BY shift_date DESC, shift DESC LIMIT 1
            ) AND di.actual_status IN ('setup_in_progress','production_in_progress','stopped')
            LEFT JOIN m1_demand.work_orders wo ON wo.wo_id = di.wo_id
            LEFT JOIN master.materials mat ON mat.material_code = wo.material_code
            LEFT JOIN master.operators op ON op.operator_id = di.actual_operator_id
            LEFT JOIN m5a_material.coils c ON c.reserved_for_wo = di.wo_id
              AND c.current_stage NOT IN ('dispatched','scrapped','rejected')
            LEFT JOIN m6_dispatch.stoppages st ON st.dispatch_item_id = di.item_id
              AND st.is_active = TRUE
            WHERE wc.status = 'active'
            ORDER BY wc.wc_id
            """
        )

    lines = []
    for r in rows:
        d = dict(r)
        status_map = {
            "setup_in_progress": "setup",
            "production_in_progress": "running",
            "stopped": "stopped",
            None: "idle",
        }
        status = status_map.get(d.get("actual_status"), "idle")

        progress = 0
        if d.get("target_mt") and d.get("actual_mt"):
            progress = min(100, round(d["actual_mt"] / d["target_mt"] * 100))

        stoppage = None
        if d.get("stoppage_category"):
            stoppage = {
                "reason": d.get("stoppage_detail") or d["stoppage_category"],
                "category": d["stoppage_category"],
                "startedAt": _fmt_time(d.get("stoppage_started_at")),
                "durationMin": d.get("stoppage_duration") or 0,
            }

        lines.append({
            "id": d["id"],
            "status": status,
            "woId": d.get("wo_id") or "—",
            "material": d.get("material") or "—",
            "gauge": str(d.get("gauge_mm") or "—"),
            "width": str(d.get("width_mm") or "—"),
            "progress": progress,
            "startTime": _fmt_time(d.get("start_time")),
            "plannedEnd": _fmt_time(d.get("planned_end")),
            "targetMt": d.get("target_mt") or 0,
            "actualMt": d.get("actual_mt") or 0,
            "coilId": d.get("coil_id") or "—",
            "coilMountedAt": _fmt_time(d.get("coil_mounted_at")),
            "operator": d.get("operator") or "Unassigned",
            "stoppage": stoppage,
            "setupNote": d.get("setup_note"),
            "setupElapsed": d.get("setup_elapsed"),
            "setupPlanned": d.get("setup_planned"),
        })
    return lines


async def get_alerts(pool: asyncpg.Pool) -> list[dict[str, Any]]:
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT
              'stopp-' || stoppage_id::text  AS id,
              'critical'                     AS severity,
              wc_id                          AS line,
              'Stopped > 10 min · ' || reason_category AS message,
              started_at                     AS at
            FROM m6_dispatch.stoppages
            WHERE is_active = TRUE AND duration_min > 10
            UNION ALL
            SELECT
              'idle-' || wc_id,
              'warning',
              wc_id,
              'Idle — no active job',
              now()
            FROM master.work_centres wc
            WHERE status = 'active'
              AND NOT EXISTS (
                SELECT 1 FROM m6_dispatch.dispatch_items di
                JOIN m6_dispatch.dispatch_lists dl ON dl.dispatch_id = di.dispatch_id
                WHERE dl.wc_id = wc.wc_id AND dl.status = 'published'
                  AND di.actual_status IN ('setup_in_progress','production_in_progress','stopped')
              )
            ORDER BY at DESC
            LIMIT 20
            """
        )
    return [
        {
            "id": str(r["id"]),
            "severity": r["severity"],
            "line": r["line"],
            "message": r["message"],
            "at": _fmt_time(r["at"]),
        }
        for r in rows
    ]
