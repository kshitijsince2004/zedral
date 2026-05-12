"""Property-based tests for EventEnvelope (Property 1).

Property: For any valid EventEnvelope, JSON round-trip preserves all fields.
"""
from __future__ import annotations

from hypothesis import given, settings
from hypothesis import strategies as st

from zedral_common.event_envelope import EventEnvelope, EventSource


_event_source_strategy = st.builds(
    EventSource,
    system=st.text(min_size=1, max_size=50, alphabet=st.characters(whitelist_categories=("Lu", "Ll", "Nd"), whitelist_characters="-_")),
    user_id=st.text(min_size=1, max_size=50, alphabet=st.characters(whitelist_categories=("Lu", "Ll", "Nd"), whitelist_characters="-_")),
    device_id=st.text(min_size=1, max_size=50, alphabet=st.characters(whitelist_categories=("Lu", "Ll", "Nd"), whitelist_characters="-_")),
)

_payload_strategy = st.dictionaries(
    keys=st.text(min_size=1, max_size=20, alphabet=st.characters(whitelist_categories=("Lu", "Ll"), whitelist_characters="_")),
    values=st.one_of(st.text(max_size=50), st.integers(), st.floats(allow_nan=False, allow_infinity=False)),
    max_size=5,
)

_envelope_strategy = st.builds(
    EventEnvelope,
    event_type=st.sampled_from([
        "demand.priority.recalculated",
        "floor.production.started",
        "floor.production.completed",
        "material.coil.staged",
        "floor.reject.raised",
    ]),
    occurred_at=st.datetimes().map(lambda d: d.isoformat()),
    source=_event_source_strategy,
    plant_id=st.just("hsl_ludhiana"),
    aggregate_id=st.text(min_size=1, max_size=50, alphabet=st.characters(whitelist_categories=("Lu", "Ll", "Nd"), whitelist_characters="-_")),
    payload=_payload_strategy,
    signature=st.just("hmac-sha256:test"),
)


@given(_envelope_strategy)
@settings(max_examples=100)
def test_event_envelope_json_round_trip(envelope: EventEnvelope):
    """Property 1: JSON serialise → deserialise preserves all fields."""
    serialised = envelope.model_dump_json()
    restored = EventEnvelope.model_validate_json(serialised)

    assert restored.event_id == envelope.event_id
    assert restored.event_type == envelope.event_type
    assert restored.schema_version == envelope.schema_version
    assert restored.occurred_at == envelope.occurred_at
    assert restored.source.system == envelope.source.system
    assert restored.source.user_id == envelope.source.user_id
    assert restored.plant_id == envelope.plant_id
    assert restored.aggregate_id == envelope.aggregate_id
    assert restored.payload == envelope.payload
    assert restored.signature == envelope.signature
