"""M1 — Kafka consumer for material.coil.shortage_detected.

When a shortage is detected for a WO, recalculate its priority score so
the demand queue reflects the urgency change.
"""
from __future__ import annotations

import asyncio
import json
import logging
import os

from aiokafka import AIOKafkaConsumer

logger = logging.getLogger(__name__)


async def run_shortage_consumer(pool, producer) -> None:
    brokers = os.environ.get("REDPANDA_BROKERS", "localhost:9092")
    consumer = AIOKafkaConsumer(
        "material.coil.shortage_detected",
        bootstrap_servers=brokers,
        group_id="m1-demand-shortage-consumer",
        auto_offset_reset="earliest",
        value_deserializer=lambda v: json.loads(v.decode("utf-8")),
    )
    await consumer.start()
    logger.info("Shortage consumer started")
    try:
        async for msg in consumer:
            try:
                payload = msg.value
                wo_id = payload.get("wo_id") or (payload.get("payload") or {}).get("wo_id")
                if not wo_id:
                    logger.warning("shortage_detected message missing wo_id: %s", payload)
                    continue

                from ..services.priority_service import recalculate_and_persist
                await recalculate_and_persist(
                    wo_id=wo_id,
                    pool=pool,
                    producer=producer,
                    trigger="shortage_detected",
                    triggered_by="m5a-material",
                )
                logger.info("Recalculated priority for WO %s after shortage_detected", wo_id)
            except Exception as exc:  # noqa: BLE001
                logger.error("Error processing shortage_detected message: %s", exc)
    finally:
        await consumer.stop()
        logger.info("Shortage consumer stopped")
