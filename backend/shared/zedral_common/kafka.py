"""
Shared aiokafka producer factory with retry + DLQ routing.
Each service calls create_producer() at startup and stores it in app.state.
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
from typing import Any

from aiokafka import AIOKafkaProducer

logger = logging.getLogger(__name__)

_RETRY_DELAYS = [1, 2, 4]  # seconds — exponential backoff


async def create_producer() -> AIOKafkaProducer:
    brokers = os.environ.get("REDPANDA_BROKERS", "localhost:9092")
    producer = AIOKafkaProducer(
        bootstrap_servers=brokers,
        value_serializer=lambda v: json.dumps(v).encode("utf-8"),
        key_serializer=lambda k: k.encode("utf-8") if k else None,
    )
    await producer.start()
    return producer


async def publish(
    producer: AIOKafkaProducer,
    topic: str,
    value: dict[str, Any],
    key: str | None = None,
) -> None:
    """Publish a message with 3 retries (1s, 2s, 4s backoff).

    On final failure routes to ``{topic}.dlq`` and logs the original payload.
    """
    last_exc: Exception | None = None

    for attempt, delay in enumerate([0] + _RETRY_DELAYS, start=1):
        if delay:
            await asyncio.sleep(delay)
        try:
            await producer.send_and_wait(topic, value=value, key=key)
            return
        except Exception as exc:  # noqa: BLE001
            last_exc = exc
            logger.warning(
                "Kafka publish attempt %d/%d failed for topic %s: %s",
                attempt,
                len(_RETRY_DELAYS) + 1,
                topic,
                exc,
            )

    # All retries exhausted — route to DLQ
    dlq_topic = f"{topic}.dlq"
    dlq_payload = {"original_topic": topic, "original_key": key, "payload": value, "error": str(last_exc)}
    try:
        await producer.send_and_wait(dlq_topic, value=dlq_payload, key=key)
        logger.error(
            "Message routed to DLQ %s after %d failed attempts. Payload: %s",
            dlq_topic,
            len(_RETRY_DELAYS) + 1,
            json.dumps(value)[:500],
        )
    except Exception as dlq_exc:  # noqa: BLE001
        logger.critical(
            "CRITICAL: Failed to route to DLQ %s: %s. Original payload: %s",
            dlq_topic,
            dlq_exc,
            json.dumps(value)[:500],
        )
