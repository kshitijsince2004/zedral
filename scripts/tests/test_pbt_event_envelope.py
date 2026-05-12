"""
Property-based tests for EventEnvelope signature round-trip.

# Feature: deploy-readiness-audit, Property 7: EventEnvelope signature round-trip

For any event payload dict and any non-empty signing secret string, building an
EventEnvelope via build_envelope() and then re-computing the HMAC-SHA256 of the
payload using the same secret SHALL produce a signature that matches the
`signature` field on the envelope.

Validates: Requirements 5.7, 5.8
"""
from __future__ import annotations

import hashlib
import hmac
import json
import os
import sys
from pathlib import Path

# Make zedral_common importable from backend/shared
_SHARED_PATH = str(Path(__file__).resolve().parents[2] / "backend" / "shared")
if _SHARED_PATH not in sys.path:
    sys.path.insert(0, _SHARED_PATH)

from hypothesis import given, settings
from hypothesis import strategies as st

from zedral_common.event_envelope import build_envelope

# ---------------------------------------------------------------------------
# Strategies
# ---------------------------------------------------------------------------

# JSON-serialisable scalar values (no NaN/Infinity which json.dumps rejects)
_json_value_strategy = st.one_of(
    st.text(max_size=50),
    st.integers(),
    st.floats(allow_nan=False, allow_infinity=False),
    st.booleans(),
    st.none(),
)

# Payload: dict with text keys and JSON-serialisable values
_payload_strategy = st.dictionaries(
    keys=st.text(
        min_size=1,
        max_size=30,
        alphabet=st.characters(
            whitelist_categories=("Lu", "Ll", "Nd"),
            whitelist_characters="_",
        ),
    ),
    values=_json_value_strategy,
    max_size=10,
)

# Non-empty signing secret
_secret_strategy = st.text(min_size=1, max_size=128)


# ---------------------------------------------------------------------------
# Property 7: EventEnvelope signature round-trip
# ---------------------------------------------------------------------------

@given(payload=_payload_strategy, secret=_secret_strategy)
@settings(max_examples=100)
def test_pbt_event_envelope_signature(payload: dict, secret: str) -> None:
    """
    # Feature: deploy-readiness-audit, Property 7: EventEnvelope signature round-trip

    For any event payload dict and any non-empty signing secret string,
    building an EventEnvelope via build_envelope() and then re-computing the
    HMAC-SHA256 of the payload using the same secret SHALL produce a signature
    that matches the `signature` field on the envelope.

    Validates: Requirements 5.7, 5.8
    """
    # Inject the signing secret via environment variable (as build_envelope reads it)
    original_secret = os.environ.get("EVENT_SIGNING_SECRET")
    try:
        os.environ["EVENT_SIGNING_SECRET"] = secret

        envelope = build_envelope(
            event_type="test.event",
            aggregate_id="test-aggregate",
            payload=payload,
            source_system="test-service",
        )
    finally:
        # Restore original env state
        if original_secret is None:
            os.environ.pop("EVENT_SIGNING_SECRET", None)
        else:
            os.environ["EVENT_SIGNING_SECRET"] = original_secret

    # Re-compute HMAC-SHA256 using the same payload and secret
    body = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    expected_sig = hmac.new(
        secret.encode(),
        body.encode(),
        hashlib.sha256,
    ).hexdigest()
    expected_signature = f"hmac-sha256:{expected_sig}"

    # The envelope's signature field must match the re-computed value
    assert envelope.signature == expected_signature, (
        f"Signature mismatch for payload={payload!r}, secret={secret!r}.\n"
        f"  envelope.signature : {envelope.signature!r}\n"
        f"  expected_signature : {expected_signature!r}"
    )

    # The signature must also have the correct prefix format
    assert envelope.signature.startswith("hmac-sha256:"), (
        f"Signature must start with 'hmac-sha256:', got: {envelope.signature!r}"
    )

    # The hex digest part must be a valid 64-character hex string
    hex_part = envelope.signature.split(":", 1)[1]
    assert len(hex_part) == 64, (
        f"HMAC-SHA256 hex digest must be 64 characters, got {len(hex_part)}: {hex_part!r}"
    )
    assert all(c in "0123456789abcdef" for c in hex_part), (
        f"HMAC-SHA256 hex digest must contain only hex characters, got: {hex_part!r}"
    )
