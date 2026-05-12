"""M6 — Execution event ingestion service.

Idempotent: duplicate event_id returns the existing record.
Enforces status machine transitions.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

import asyncpg
from fastapi import HTTPException

from zedral_common.event_envelope import build_envelope
from zedral_common.kafka import publish
from . import live_service

logger = logging.getLogger(__name__)

# Valid status machine transitions
_TRANSITIONS: dict[str, list[str]] = {
    "pending":              ["setup_in_progress", "production_in_progress", "cancelled", "skipped"],
    "setup_in_progress":    ["production_in_progress", "stopped", "cancelled"],
    "production_in_progress": ["complete", "stopped", "cancelled"],
    "stopped":              ["production_in_progress", "setup_in_progress", "cancelled"],
    "complete":             [],
    "cancelled":            [],
    "skipped":              [],
}

_EVENT_TO_STATUS: dict[str, str] = {
    "setup_started":        "setup_in_progress",
    "production_started":   "production_in_progress",
    "production_completed": "complete",
}


async def ingest_event(
    event_in: dict[str, Any],
    pool: asyncpg.Pool,
    producer: Any,
) -> dict[str, Any]:
    event_id = event_in["event_id"]

    async with pool.acquire() as conn:
        # Idempotency check
        existing = await conn.fetchrow(
            "SELECT * FROM m6_dispatch.execution_events WHERE event_id = $1", event_id
        )
        if existing:
            return dict(existing)

        event_type = event_in["event_type"]
        dispatch_item_id = event_in.get("dispatch_item_id")

        # Validate status transition if applicable
        if dispatch_item_id and event_type in _EVENT_TO_STATUS:
            item = await conn.fetchrow(
                "SELECT actual_status FROM m6_dispatch.dispatch_items WHERE item_id = $1",
                dispatch_item_id,
            )
            if item:
                current = item["actual_status"]
                target = _EVENT_TO_STATUS[event_type]
                if target not in _TRANSITIONS.get(current, []):
                    raise HTTPException(
                        status_code=422,
                        detail=f"Invalid transition {current} → {target} for event {event_type}. "
                               f"Allowed: {_TRANSITIONS.get(current, [])}",
                    )

        async with conn.transaction():
            # Persist event
            row = await conn.fetchrow(
                """INSERT INTO m6_dispatch.execution_events
                   (event_id, dispatch_item_id, wc_id, wo_id, event_type, occurred_at,
                    operator_id, device_id, shift, payload, signature)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *""",
                event_id,
                dispatch_item_id,
                event_in["wc_id"],
                event_in.get("wo_id"),
                event_type,
                event_in["occurred_at"],
                event_in["operator_id"],
                event_in["device_id"],
                event_in.get("shift"),
                event_in.get("payload", {}),
                event_in.get("signature", ""),
            )

            # Apply side effects
            await _apply_side_effects(event_type, event_in, conn, producer)

    # Broadcast live update
    lines = await live_service.get_production_lines(pool)
    await live_service.broadcast(lines)

    return dict(row)


async def _apply_side_effects(
    event_type: str,
    event_in: dict[str, Any],
    conn: asyncpg.Connection,
    producer: Any,
) -> None:
    dispatch_item_id = event_in.get("dispatch_item_id")
    payload = event_in.get("payload", {})
    operator_id = event_in.get("operator_id", "system")
    wc_id = event_in["wc_id"]
    wo_id = event_in.get("wo_id")
    occurred_at = event_in["occurred_at"]

    if event_type == "setup_started":
        if dispatch_item_id:
            await conn.execute(
                "UPDATE m6_dispatch.dispatch_items SET actual_status='setup_in_progress', actual_setup_start=$1 WHERE item_id=$2",
                occurred_at, dispatch_item_id,
            )

    elif event_type == "setup_ended":
        if dispatch_item_id:
            await conn.execute(
                "UPDATE m6_dispatch.dispatch_items SET actual_setup_end=$1 WHERE item_id=$2",
                occurred_at, dispatch_item_id,
            )
            # Record setup timing
            item = await conn.fetchrow("SELECT * FROM m6_dispatch.dispatch_items WHERE item_id=$1", dispatch_item_id)
            if item and item["actual_setup_start"]:
                duration = int((occurred_at - item["actual_setup_start"]).total_seconds() / 60)
                await conn.execute(
                    """INSERT INTO m6_dispatch.setup_timings
                       (wc_id, dispatch_item_id, grade_to, gauge_to_mm, width_to_mm, actual_start, actual_end, actual_duration_min)
                       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)""",
                    wc_id, dispatch_item_id,
                    payload.get("grade_to", ""), payload.get("gauge_to_mm", 0), payload.get("width_to_mm", 0),
                    item["actual_setup_start"], occurred_at, duration,
                )

    elif event_type == "production_started":
        if dispatch_item_id:
            await conn.execute(
                "UPDATE m6_dispatch.dispatch_items SET actual_status='production_in_progress', actual_prod_start=$1, actual_operator_id=$2 WHERE item_id=$3",
                occurred_at, operator_id, dispatch_item_id,
            )
        if producer:
            env = build_envelope("floor.production.started", wo_id or wc_id, {"wc_id": wc_id, "wo_id": wo_id}, "m6-dispatch")
            await publish(producer, "floor.production.started", env.model_dump(), key=wc_id)

    elif event_type == "production_completed":
        if dispatch_item_id:
            await conn.execute(
                """UPDATE m6_dispatch.dispatch_items
                   SET actual_status='complete', actual_prod_end=$1,
                       actual_qty_mt=$2, actual_scrap_mt=$3
                   WHERE item_id=$4""",
                occurred_at,
                payload.get("actual_qty_mt"),
                payload.get("actual_scrap_mt"),
                dispatch_item_id,
            )
        if producer:
            env = build_envelope("floor.production.completed", wo_id or wc_id,
                                 {"wc_id": wc_id, "wo_id": wo_id, "actual_qty_mt": payload.get("actual_qty_mt"),
                                  "coil_id": payload.get("coil_id")}, "m6-dispatch")
            await publish(producer, "floor.production.completed", env.model_dump(), key=wc_id)

    elif event_type == "stoppage_started":
        # Save previous status for restoration
        prev_status = "production_in_progress"
        if dispatch_item_id:
            item = await conn.fetchrow("SELECT actual_status FROM m6_dispatch.dispatch_items WHERE item_id=$1", dispatch_item_id)
            if item:
                prev_status = item["actual_status"]
            await conn.execute(
                "UPDATE m6_dispatch.dispatch_items SET actual_status='stopped' WHERE item_id=$1", dispatch_item_id
            )
        await conn.execute(
            """INSERT INTO m6_dispatch.stoppages
               (wc_id, wo_id, dispatch_item_id, shift, started_at, reason_category, reason_detail, reported_by)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8)""",
            wc_id, wo_id, dispatch_item_id, event_in.get("shift"),
            occurred_at,
            payload.get("reason_category", "other"),
            payload.get("reason_detail"),
            operator_id,
        )
        if producer:
            env = build_envelope("floor.downtime.started", wc_id, {"wc_id": wc_id, "wo_id": wo_id}, "m6-dispatch")
            await publish(producer, "floor.downtime.started", env.model_dump(), key=wc_id)

    elif event_type == "stoppage_ended":
        await conn.execute(
            """UPDATE m6_dispatch.stoppages SET ended_at=$1, resolution_action=$2
               WHERE wc_id=$3 AND is_active=TRUE""",
            occurred_at, payload.get("resolution_action"), wc_id,
        )
        if dispatch_item_id:
            await conn.execute(
                "UPDATE m6_dispatch.dispatch_items SET actual_status='production_in_progress' WHERE item_id=$1",
                dispatch_item_id,
            )
        if producer:
            env = build_envelope("floor.downtime.ended", wc_id, {"wc_id": wc_id}, "m6-dispatch")
            await publish(producer, "floor.downtime.ended", env.model_dump(), key=wc_id)

    elif event_type == "reject_raised":
        await conn.execute(
            """INSERT INTO m6_dispatch.rejects
               (wc_id, wo_id, dispatch_item_id, coil_id, reported_at, reported_by,
                defect_category, defect_detail, affected_qty_mt, disposition)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)""",
            wc_id, wo_id, dispatch_item_id,
            payload.get("coil_id"), occurred_at, operator_id,
            payload.get("defect_category", "other"),
            payload.get("defect_detail"),
            payload.get("affected_qty_mt"),
            payload.get("disposition", "pending"),
        )
        if producer:
            env = build_envelope("floor.reject.raised", wc_id, payload, "m6-dispatch")
            await publish(producer, "floor.reject.raised", env.model_dump(), key=wc_id)

    elif event_type == "shift_handover":
        await conn.execute(
            """INSERT INTO m6_dispatch.shift_handovers
               (wc_id, shift_date, outgoing_shift, incoming_shift, outgoing_operator,
                machine_state_note, pending_items)
               VALUES ($1,$2,$3,$4,$5,$6,$7)
               ON CONFLICT DO NOTHING""",
            wc_id,
            payload.get("shift_date"),
            payload.get("outgoing_shift"),
            payload.get("incoming_shift"),
            operator_id,
            payload.get("machine_state_note"),
            payload.get("pending_items", []),
        )

    # v0.2 events
    elif event_type == "pass_started":
        if dispatch_item_id:
            await conn.execute(
                """INSERT INTO m6_dispatch.production_passes
                   (dispatch_item_id, pass_number, is_final, thickness_in_mm, thickness_out_mm,
                    rw_tension, coolant_temp_c, coolant_press_kg_cm2, started_at, operator_id)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
                   ON CONFLICT (dispatch_item_id, pass_number) DO NOTHING""",
                dispatch_item_id,
                payload.get("pass_number", 1),
                payload.get("is_final", False),
                payload.get("thickness_in_mm"),
                payload.get("thickness_out_mm", 0),
                payload.get("rw_tension"),
                payload.get("coolant_temp_c"),
                payload.get("coolant_press_kg_cm2"),
                occurred_at,
                operator_id,
            )
        if producer:
            env = build_envelope("floor.pass.started", wc_id, payload, "m6-dispatch")
            await publish(producer, "floor.pass.started", env.model_dump(), key=wc_id)

    elif event_type == "pass_completed":
        if dispatch_item_id:
            await conn.execute(
                """UPDATE m6_dispatch.production_passes
                   SET thickness_out_mm=$1, ended_at=$2, notes=$3, is_final=$4
                   WHERE dispatch_item_id=$5 AND pass_number=$6""",
                payload.get("thickness_out_mm", 0),
                occurred_at,
                payload.get("notes"),
                payload.get("is_final", False),
                dispatch_item_id,
                payload.get("pass_number", 1),
            )
            if payload.get("is_final"):
                await conn.execute(
                    "UPDATE m6_dispatch.dispatch_items SET actual_status='complete', actual_prod_end=$1 WHERE item_id=$2",
                    occurred_at, dispatch_item_id,
                )
        if producer:
            env = build_envelope("floor.pass.completed", wc_id, payload, "m6-dispatch")
            await publish(producer, "floor.pass.completed", env.model_dump(), key=wc_id)

    elif event_type == "roll_changed":
        await conn.execute(
            """INSERT INTO m6_dispatch.roll_changes
               (wc_id, occurred_at, out_roll_top_id, out_roll_bottom_id,
                out_cumulative_since_last_change_mt, in_roll_top_id, in_roll_bottom_id,
                in_roll_finish, reason, operator_id, crane_operator_id, dispatch_item_id, duration_min)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)""",
            wc_id, occurred_at,
            payload.get("out_roll_top_id"), payload.get("out_roll_bottom_id"),
            payload.get("out_cumulative_since_last_change_mt"),
            payload.get("in_roll_top_id"), payload.get("in_roll_bottom_id"),
            payload.get("in_roll_finish"),
            payload.get("reason", "scheduled_grind"),
            operator_id, payload.get("crane_operator_id"),
            dispatch_item_id, payload.get("duration_min"),
        )
        # Update roll positions in master
        if payload.get("in_roll_top_id"):
            await conn.execute(
                "UPDATE master.rolls SET current_wc_id=$1, current_position='top', updated_at=now() WHERE roll_id=$2",
                wc_id, payload["in_roll_top_id"],
            )
        if payload.get("in_roll_bottom_id"):
            await conn.execute(
                "UPDATE master.rolls SET current_wc_id=$1, current_position='bottom', updated_at=now() WHERE roll_id=$2",
                wc_id, payload["in_roll_bottom_id"],
            )
        if producer:
            env = build_envelope("floor.roll.changed", wc_id, payload, "m6-dispatch")
            await publish(producer, "floor.roll.changed", env.model_dump(), key=wc_id)

    elif event_type == "crew_confirmed":
        await conn.execute(
            """INSERT INTO m6_dispatch.shift_crew_assignments
               (wc_id, shift_date, shift, line_incharge_id, crew_members, crane_operator_id,
                shift_manager_id, confirmed_at, confirmed_by)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
               ON CONFLICT (wc_id, shift_date, shift) DO UPDATE SET
                 line_incharge_id=$4, crew_members=$5, crane_operator_id=$6,
                 shift_manager_id=$7, confirmed_at=$8, confirmed_by=$9""",
            wc_id,
            payload.get("shift_date"),
            payload.get("shift"),
            payload.get("line_incharge_id"),
            payload.get("crew_members", []),
            payload.get("crane_operator_id"),
            payload.get("shift_manager_id"),
            occurred_at, operator_id,
        )
        if producer:
            env = build_envelope("floor.shift.crew_confirmed", wc_id, payload, "m6-dispatch")
            await publish(producer, "floor.shift.crew_confirmed", env.model_dump(), key=wc_id)

    elif event_type == "shift_report_signed":
        await conn.execute(
            """UPDATE m6_dispatch.shift_handovers
               SET incharge_signed_at=$1, incharge_signature_event_id=$2
               WHERE wc_id=$3 AND shift_date=$4 AND outgoing_shift=$5""",
            occurred_at, event_in["event_id"],
            wc_id, payload.get("shift_date"), payload.get("shift"),
        )
        if producer:
            env = build_envelope("floor.shift_report.signed", wc_id, payload, "m6-dispatch")
            await publish(producer, "floor.shift_report.signed", env.model_dump(), key=wc_id)

    elif event_type == "shift_report_approved":
        await conn.execute(
            """UPDATE m6_dispatch.shift_handovers
               SET manager_approved_at=$1, manager_approval_event_id=$2, is_immutable=TRUE
               WHERE wc_id=$3 AND shift_date=$4 AND outgoing_shift=$5""",
            occurred_at, event_in["event_id"],
            wc_id, payload.get("shift_date"), payload.get("shift"),
        )
        if producer:
            env = build_envelope("floor.shift_report.approved", wc_id, payload, "m6-dispatch")
            await publish(producer, "floor.shift_report.approved", env.model_dump(), key=wc_id)

    elif event_type == "shift_report_correction_requested":
        if producer:
            env = build_envelope("floor.shift_report.correction_requested", wc_id, payload, "m6-dispatch")
            await publish(producer, "floor.shift_report.correction_requested", env.model_dump(), key=wc_id)
