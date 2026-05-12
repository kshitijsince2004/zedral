"""M5a — Kafka consumers for ERP and floor events."""
from __future__ import annotations

import asyncio
import json
import logging
import os

from aiokafka import AIOKafkaConsumer

logger = logging.getLogger(__name__)


async def _handle_production_completed(msg_value: dict, pool, producer) -> None:
    """Decrement weight_remaining_mt on consumed coil; trigger readiness recalc."""
    payload = msg_value.get("payload", msg_value)
    coil_id = payload.get("coil_id")
    consumed_mt = payload.get("actual_qty_mt") or payload.get("consumed_mt", 0)
    wo_id = payload.get("wo_id")

    if coil_id and consumed_mt:
        async with pool.acquire() as conn:
            await conn.execute(
                """UPDATE m5a_material.coils
                   SET weight_remaining_mt = GREATEST(0, weight_remaining_mt - $1),
                       consumed_at = now(), updated_at = now()
                   WHERE coil_id = $2""",
                consumed_mt, coil_id,
            )

    if wo_id:
        from ..services.readiness_service import recalculate_all
        await recalculate_all(pool, producer)


async def _handle_wo_received(msg_value: dict, pool) -> None:
    """Create initial wo_readiness record for a new work order."""
    payload = msg_value.get("payload", msg_value)
    wo_id = payload.get("wo_id")
    qty = payload.get("qty_planned_mt", 0)
    if not wo_id:
        return
    async with pool.acquire() as conn:
        await conn.execute(
            """INSERT INTO m5a_material.wo_readiness
               (wo_id, required_qty_mt, available_qty_mt, expected_qty_mt, shortfall_qty_mt, status)
               VALUES ($1,$2,0,$2,$2,'pending')
               ON CONFLICT (wo_id) DO NOTHING""",
            wo_id, qty,
        )


async def _handle_wo_cancelled(msg_value: dict, pool) -> None:
    """Release any active pre-allocations for the cancelled WO."""
    payload = msg_value.get("payload", msg_value)
    wo_id = payload.get("wo_id")
    if not wo_id:
        return
    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE m5a_material.pre_allocations SET is_active=FALSE, released_at=now(), release_reason='wo_cancelled' WHERE wo_id=$1 AND is_active=TRUE",
            wo_id,
        )
        await conn.execute(
            "UPDATE m5a_material.coils SET reserved_for_wo=NULL, reservation_qty_mt=NULL, reservation_set_at=NULL, reservation_set_by=NULL, updated_at=now() WHERE reserved_for_wo=$1",
            wo_id,
        )


async def run_erp_consumers(pool, producer) -> None:
    brokers = os.environ.get("REDPANDA_BROKERS", "localhost:9092")
    consumer = AIOKafkaConsumer(
        "floor.production.completed",
        "erp.work_order.received",
        "erp.work_order.cancelled",
        bootstrap_servers=brokers,
        group_id="m5a-material-consumer",
        auto_offset_reset="earliest",
        value_deserializer=lambda v: json.loads(v.decode("utf-8")),
    )
    await consumer.start()
    logger.info("M5a ERP consumers started")
    try:
        async for msg in consumer:
            try:
                topic = msg.topic
                value = msg.value
                if topic == "floor.production.completed":
                    await _handle_production_completed(value, pool, producer)
                elif topic == "erp.work_order.received":
                    await _handle_wo_received(value, pool)
                elif topic == "erp.work_order.cancelled":
                    await _handle_wo_cancelled(value, pool)
            except Exception as exc:  # noqa: BLE001
                logger.error("Error processing %s message: %s", msg.topic, exc)
    finally:
        await consumer.stop()
        logger.info("M5a ERP consumers stopped")
