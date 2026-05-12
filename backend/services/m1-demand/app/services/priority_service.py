"""M1 — Priority scoring service.

Formula:
  proximity_score = clamp(40 - days_until_due * (40/30), 0, 40)
  customer_score  = {high: 30, medium: 20, low: 10}
  type_bonus      = 5 if wo_type == 'customer' else 0
  base_score      = proximity_score + customer_score + type_bonus

Override adjustments (applied to base_score):
  hold         → 0
  rush         → base_score + 50
  defer        → max(0, base_score - 20)
  release_hold → base_score (no adjustment)

Priority class:
  A if score >= 60
  B if score >= 35
  C otherwise
"""
from __future__ import annotations

import logging
from datetime import date, datetime, timezone
from typing import Any

import asyncpg

from zedral_common.event_envelope import build_envelope
from zedral_common.kafka import publish

logger = logging.getLogger(__name__)

_CUSTOMER_SCORE = {"high": 30, "medium": 20, "low": 10}


def _clamp(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, value))


def calculate_priority_score(
    required_date: date,
    customer_priority: str,
    wo_type: str,
    active_override: dict[str, Any] | None,
) -> tuple[float, str, dict[str, Any]]:
    """Return (score, priority_class, components)."""
    today = date.today()
    days_until_due = (required_date - today).days

    proximity = _clamp(40 - days_until_due * (40 / 30), 0, 40)
    customer = _CUSTOMER_SCORE.get(customer_priority, 20)
    type_bonus = 5 if wo_type == "customer" else 0
    base = proximity + customer + type_bonus

    components: dict[str, Any] = {
        "proximity_score": round(proximity, 3),
        "customer_score": customer,
        "type_bonus": type_bonus,
        "base_score": round(base, 3),
        "override_type": None,
        "override_adjustment": 0,
    }

    score = base
    if active_override:
        otype = active_override.get("override_type")
        components["override_type"] = otype
        if otype == "hold":
            score = 0
            components["override_adjustment"] = -base
        elif otype == "rush":
            score = base + 50
            components["override_adjustment"] = 50
        elif otype == "defer":
            score = max(0, base - 20)
            components["override_adjustment"] = score - base
        # release_hold: no adjustment

    score = round(score, 3)
    components["final_score"] = score

    if score >= 60:
        priority_class = "A"
    elif score >= 35:
        priority_class = "B"
    else:
        priority_class = "C"

    return score, priority_class, components


async def recalculate_and_persist(
    wo_id: str,
    pool: asyncpg.Pool,
    producer: Any,
    trigger: str,
    triggered_by: str | None = None,
) -> None:
    """Fetch WO + customer + active override, recalculate, persist, and publish."""
    async with pool.acquire() as conn:
        wo = await conn.fetchrow(
            """SELECT w.wo_id, w.required_date, w.wo_type, c.priority AS customer_priority
               FROM m1_demand.work_orders w
               LEFT JOIN master.customers c ON c.customer_id = (
                 SELECT so.customer_id FROM m1_demand.wo_so_link l
                 JOIN m1_demand.sales_orders so ON so.so_id = l.so_id
                 WHERE l.wo_id = w.wo_id LIMIT 1
               )
               WHERE w.wo_id = $1""",
            wo_id,
        )
        if not wo:
            logger.warning("recalculate_and_persist: WO %s not found", wo_id)
            return

        override = await conn.fetchrow(
            """SELECT override_type, expires_at FROM m1_demand.priority_overrides
               WHERE wo_id = $1 AND is_active = TRUE
               AND (expires_at IS NULL OR expires_at > now())
               ORDER BY overridden_at DESC LIMIT 1""",
            wo_id,
        )

        score, priority_class, components = calculate_priority_score(
            required_date=wo["required_date"],
            customer_priority=wo["customer_priority"] or "medium",
            wo_type=wo["wo_type"],
            active_override=dict(override) if override else None,
        )

        async with conn.transaction():
            await conn.execute(
                "UPDATE m1_demand.work_orders SET priority_score=$1, priority_class=$2, updated_at=now() WHERE wo_id=$3",
                score, priority_class, wo_id,
            )
            await conn.execute(
                """INSERT INTO m1_demand.priority_score_history
                   (wo_id, priority_score, priority_class, score_components, trigger, triggered_by)
                   VALUES ($1,$2,$3,$4,$5,$6)""",
                wo_id, score, priority_class,
                components,  # asyncpg serialises dict → JSONB
                trigger, triggered_by,
            )

    # Publish event
    if producer:
        envelope = build_envelope(
            event_type="demand.priority.recalculated",
            aggregate_id=wo_id,
            payload={"wo_id": wo_id, "score": score, "priority_class": priority_class, "trigger": trigger},
            source_system="m1-demand",
        )
        await publish(producer, "demand.priority.recalculated", envelope.model_dump(), key=wo_id)
