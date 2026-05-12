"""M5a — WO Readiness calculation service.

Readiness status:
  ready   — available_qty_mt >= required_qty_mt
  partial — 0 < available_qty_mt < required_qty_mt, but available + expected >= required
  shortage — available + expected < required (shortfall > 0)
  pending — no coils reserved yet
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

import asyncpg

from zedral_common.event_envelope import build_envelope
from zedral_common.kafka import publish

logger = logging.getLogger(__name__)


@dataclass
class WoReadiness:
    wo_id: str
    required_qty_mt: float
    available_qty_mt: float
    expected_qty_mt: float
    shortfall_qty_mt: float
    status: str


def _derive_status(required: float, available: float, expected: float) -> str:
    if available >= required:
        return "ready"
    if available + expected >= required:
        return "partial"
    if available > 0 or expected > 0:
        return "shortage"
    return "pending"


async def calculate_readiness(wo_id: str, pool: asyncpg.Pool) -> WoReadiness:
    async with pool.acquire() as conn:
        wo = await conn.fetchrow(
            "SELECT qty_planned_mt FROM m1_demand.work_orders WHERE wo_id = $1", wo_id
        )
        required = float(wo["qty_planned_mt"]) if wo else 0.0

        available_row = await conn.fetchrow(
            """SELECT COALESCE(SUM(weight_remaining_mt), 0) AS total
               FROM m5a_material.coils
               WHERE reserved_for_wo = $1
               AND current_stage NOT IN ('dispatched', 'scrapped', 'rejected')""",
            wo_id,
        )
        available = float(available_row["total"])

        expected_row = await conn.fetchrow(
            """SELECT COALESCE(SUM(expected_weight_mt), 0) AS total
               FROM m5a_material.inbound_expected
               WHERE is_received = FALSE""",
        )
        expected = float(expected_row["total"])

        shortfall = max(0.0, required - available - expected)
        status = _derive_status(required, available, expected)

        return WoReadiness(
            wo_id=wo_id,
            required_qty_mt=required,
            available_qty_mt=available,
            expected_qty_mt=expected,
            shortfall_qty_mt=shortfall,
            status=status,
        )


async def recalculate_all(pool: asyncpg.Pool, producer: Any) -> None:
    """Recalculate readiness for all active WOs; publish shortage events on transitions."""
    async with pool.acquire() as conn:
        wos = await conn.fetch(
            "SELECT wo_id FROM m1_demand.work_orders WHERE status NOT IN ('complete', 'cancelled')"
        )
        existing = {
            r["wo_id"]: r["status"]
            for r in await conn.fetch("SELECT wo_id, status FROM m5a_material.wo_readiness")
        }

    for wo_row in wos:
        wo_id = wo_row["wo_id"]
        try:
            r = await calculate_readiness(wo_id, pool)
            prev_status = existing.get(wo_id)

            async with pool.acquire() as conn:
                await conn.execute(
                    """INSERT INTO m5a_material.wo_readiness
                       (wo_id, required_qty_mt, available_qty_mt, expected_qty_mt, shortfall_qty_mt, status, calculated_at)
                       VALUES ($1,$2,$3,$4,$5,$6,now())
                       ON CONFLICT (wo_id) DO UPDATE SET
                         required_qty_mt=$2, available_qty_mt=$3, expected_qty_mt=$4,
                         shortfall_qty_mt=$5, status=$6, calculated_at=now()""",
                    r.wo_id, r.required_qty_mt, r.available_qty_mt,
                    r.expected_qty_mt, r.shortfall_qty_mt, r.status,
                )

            # Publish shortage transition events
            if producer:
                if prev_status != "shortage" and r.status == "shortage":
                    env = build_envelope(
                        "material.coil.shortage_detected", wo_id,
                        {"wo_id": wo_id, "shortfall_qty_mt": r.shortfall_qty_mt},
                        "m5a-material",
                    )
                    await publish(producer, "material.coil.shortage_detected", env.model_dump(), key=wo_id)
                elif prev_status == "shortage" and r.status != "shortage":
                    env = build_envelope(
                        "material.coil.shortage_resolved", wo_id,
                        {"wo_id": wo_id},
                        "m5a-material",
                    )
                    await publish(producer, "material.coil.shortage_resolved", env.model_dump(), key=wo_id)

        except Exception as exc:  # noqa: BLE001
            logger.error("readiness recalc failed for WO %s: %s", wo_id, exc)
