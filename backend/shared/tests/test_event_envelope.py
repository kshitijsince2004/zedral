"""Unit tests for EventEnvelope round-trip and HMAC signature."""
from __future__ import annotations

import hashlib
import hmac
import json
import os

import pytest

from zedral_common.event_envelope import EventEnvelope, EventSource, build_envelope


class TestEventEnvelopeRoundTrip:
    def test_model_dump_json_round_trip(self):
        env = build_envelope(
            event_type="demand.priority.recalculated",
            aggregate_id="WO-1001",
            payload={"wo_id": "WO-1001", "score": 72.5, "priority_class": "A"},
            source_system="m1-demand",
        )
        serialised = env.model_dump_json()
        restored = EventEnvelope.model_validate_json(serialised)

        assert restored.event_id == env.event_id
        assert restored.event_type == env.event_type
        assert restored.aggregate_id == env.aggregate_id
        assert restored.payload == env.payload
        assert restored.signature == env.signature

    def test_all_required_fields_present(self):
        env = build_envelope(
            event_type="floor.production.started",
            aggregate_id="CRS-1",
            payload={"wc_id": "CRS-1"},
            source_system="m6-dispatch",
        )
        assert env.event_id
        assert env.event_type == "floor.production.started"
        assert env.schema_version == "1.0"
        assert env.occurred_at
        assert env.recorded_at
        assert env.source.system == "m6-dispatch"
        assert env.plant_id
        assert env.aggregate_id == "CRS-1"
        assert env.signature.startswith("hmac-sha256:")

    def test_causation_and_correlation_ids(self):
        env = build_envelope(
            event_type="test.event",
            aggregate_id="agg-1",
            payload={},
            source_system="test",
            causation_id="cause-123",
            correlation_id="corr-456",
        )
        assert env.causation_id == "cause-123"
        assert env.correlation_id == "corr-456"


class TestHmacSignature:
    def test_signature_is_correct_hmac(self):
        secret = "test-secret"
        payload = {"wo_id": "WO-001", "score": 42.0}

        with pytest.MonkeyPatch().context() as mp:
            mp.setenv("EVENT_SIGNING_SECRET", secret)
            env = build_envelope(
                event_type="test.event",
                aggregate_id="WO-001",
                payload=payload,
                source_system="test",
            )

        body = json.dumps(payload, sort_keys=True, separators=(",", ":"))
        expected_sig = hmac.new(secret.encode(), body.encode(), hashlib.sha256).hexdigest()
        assert env.signature == f"hmac-sha256:{expected_sig}"

    def test_different_payloads_produce_different_signatures(self):
        env1 = build_envelope("t", "a", {"x": 1}, "s")
        env2 = build_envelope("t", "a", {"x": 2}, "s")
        assert env1.signature != env2.signature

    def test_signature_is_deterministic_for_same_payload(self):
        payload = {"key": "value", "num": 42}
        env1 = build_envelope("t", "a", payload, "s")
        env2 = build_envelope("t", "a", payload, "s")
        assert env1.signature == env2.signature
