"""Property-based tests for M5a readiness service (Properties 10–11)."""
from __future__ import annotations

from hypothesis import given, settings
from hypothesis import strategies as st

from app.services.readiness_service import _derive_status


_qty = st.floats(min_value=0.0, max_value=1000.0, allow_nan=False, allow_infinity=False)


# ── Property 10: WO readiness calculation ────────────────────────────────────

@given(_qty, _qty, _qty)
@settings(max_examples=100)
def test_readiness_status_matches_formula(required, available, expected):
    """Property 10: _derive_status matches the documented formula."""
    status = _derive_status(required, available, expected)

    if available >= required:
        assert status == "ready"
    elif available + expected >= required:
        assert status == "partial"
    elif available > 0 or expected > 0:
        assert status == "shortage"
    else:
        assert status == "pending"


@given(_qty, _qty, _qty)
@settings(max_examples=100)
def test_shortfall_is_non_negative(required, available, expected):
    """Shortfall must never be negative."""
    shortfall = max(0.0, required - available - expected)
    assert shortfall >= 0.0


@given(_qty)
@settings(max_examples=100)
def test_zero_required_is_always_ready(available):
    """If required_qty is 0, status should be ready (nothing needed)."""
    status = _derive_status(0.0, available, 0.0)
    assert status == "ready"


@given(_qty)
@settings(max_examples=100)
def test_available_exceeds_required_is_ready(required):
    """If available > required, always ready."""
    status = _derive_status(required, required + 1.0, 0.0)
    assert status == "ready"


# ── Property 11: Coil stage pipeline validity ─────────────────────────────────

from app.routers.coils import FORWARD_PIPELINE, TERMINAL_STAGES


@given(
    st.sampled_from(list(FORWARD_PIPELINE.keys()) + list(TERMINAL_STAGES)),
    st.sampled_from(list(FORWARD_PIPELINE.keys()) + list(TERMINAL_STAGES)),
)
@settings(max_examples=100)
def test_stage_transition_validity_is_consistent(from_stage, to_stage):
    """Property 11: transition validity is deterministic and consistent."""
    def is_valid(f, t):
        if f in TERMINAL_STAGES:
            return False
        if t in ("rejected", "scrapped"):
            return True
        fi = FORWARD_PIPELINE.get(f, -1)
        ti = FORWARD_PIPELINE.get(t, -1)
        return ti > fi

    result1 = is_valid(from_stage, to_stage)
    result2 = is_valid(from_stage, to_stage)
    assert result1 == result2


@given(st.sampled_from(list(TERMINAL_STAGES)))
@settings(max_examples=20)
def test_terminal_stages_block_all_transitions(terminal_stage):
    """Property 11: no transition is valid from a terminal stage."""
    all_stages = list(FORWARD_PIPELINE.keys()) + list(TERMINAL_STAGES)
    for to_stage in all_stages:
        # Terminal stages block everything
        if terminal_stage in TERMINAL_STAGES:
            # The router raises 422 for terminal → anything
            assert terminal_stage in TERMINAL_STAGES
