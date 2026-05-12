"""
Event envelope builder and validator.
Every event published to Redpanda must use this envelope.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import os
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, Field


class EventSource(BaseModel):
    system: str
    user_id: str
    device_id: str


class EventEnvelope(BaseModel):
    event_id: str = Field(default_factory=lambda: str(uuid4()))
    event_type: str
    schema_version: str = "1.0"
    occurred_at: str
    recorded_at: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    source: EventSource
    plant_id: str
    aggregate_id: str
    causation_id: str | None = None
    correlation_id: str | None = None
    payload: dict[str, Any]
    signature: str = "hmac-sha256:placeholder"


def build_envelope(
    event_type: str,
    aggregate_id: str,
    payload: dict[str, Any],
    source_system: str,
    user_id: str = "system",
    device_id: str = "server",
    occurred_at: str | None = None,
    causation_id: str | None = None,
    correlation_id: str | None = None,
) -> EventEnvelope:
    """Build a standard event envelope."""
    plant_id = os.getenv("PLANT_ID", "hsl_ludhiana")
    now = datetime.now(timezone.utc).isoformat()

    envelope = EventEnvelope(
        event_type=event_type,
        occurred_at=occurred_at or now,
        source=EventSource(
            system=source_system,
            user_id=user_id,
            device_id=device_id,
        ),
        plant_id=plant_id,
        aggregate_id=aggregate_id,
        causation_id=causation_id,
        correlation_id=correlation_id,
        payload=payload,
    )

    # Sign the envelope
    secret = os.getenv("EVENT_SIGNING_SECRET", "dev-secret-change-in-prod")
    body = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    sig = hmac.new(secret.encode(), body.encode(), hashlib.sha256).hexdigest()
    envelope.signature = f"hmac-sha256:{sig}"

    return envelope
