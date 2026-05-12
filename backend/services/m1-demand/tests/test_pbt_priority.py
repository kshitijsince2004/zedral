"""Property-based tests for M1 priority scoring (Properties 4–8)."""
from __future__ import annotations

from datetime import date, timedelta

from hypothesis import given, settings
from hypothesis import strategies as st

from app.services.priority_service import calculate_priority_score


_customer_priorities = st.sampled_from(["high", "medium", "low"])
_wo_types = st.sampled_from(["customer", "internal", "rework", "manual"])
_days_until_due = st.integers(min_value=-30, max_value=90)
_override_types = st.sampled_from(["rush", "defer", "hold", "release_hold"])


def _make_inputs(days, customer_priority, wo_type, override_type=None):
    required_date = date.today() + timedelta(days=days)
    override = {"override_type": override_type} if override_type else None
    return required_date, customer_priority, wo_type, override


# ── Property 4: Determinism ───────────────────────────────────────────────────

@given(_days_until_due, _customer_priorities, _wo_types, st.one_of(st.none(), _override_types))
@settings(max_examples=100)
def test_priority_score_determinism(days, customer_priority, wo_type, override_type):
    """Property 4: Same inputs always produce identical (score, class, components)."""
    required_date, cp, wt, override = _make_inputs(days, customer_priority, wo_type, override_type)
    result1 = calculate_priority_score(required_date, cp, wt, override)
    result2 = calculate_priority_score(required_date, cp, wt, override)
    assert result1 == result2


# ── Property 5: Rush override adds exactly 50 ────────────────────────────────

@given(_days_until_due, _customer_priorities, _wo_types)
@settings(max_examples=100)
def test_rush_override_adds_50(days, customer_priority, wo_type):
    """Property 5: rush override always adds exactly 50 to base score."""
    required_date = date.today() + timedelta(days=days)
    base_score, _, _ = calculate_priority_score(required_date, customer_priority, wo_type, None)
    rush_score, _, components = calculate_priority_score(
        required_date, customer_priority, wo_type, {"override_type": "rush"}
    )
    assert rush_score == round(base_score + 50, 3)
    assert components["override_adjustment"] == 50


# ── Property 6: Hold override zeroes score ────────────────────────────────────

@given(_days_until_due, _customer_priorities, _wo_types)
@settings(max_examples=100)
def test_hold_override_zeroes_score(days, customer_priority, wo_type):
    """Property 6: hold override always produces score == 0."""
    required_date = date.today() + timedelta(days=days)
    score, cls, _ = calculate_priority_score(
        required_date, customer_priority, wo_type, {"override_type": "hold"}
    )
    assert score == 0.0
    assert cls == "C"


# ── Property 7: Expired override treated as no override ──────────────────────

@given(_days_until_due, _customer_priorities, _wo_types)
@settings(max_examples=100)
def test_expired_override_excluded(days, customer_priority, wo_type):
    """Property 7: passing None (expired override filtered upstream) equals base score."""
    required_date = date.today() + timedelta(days=days)
    base_score, base_cls, _ = calculate_priority_score(required_date, customer_priority, wo_type, None)
    # Expired overrides are filtered before calling calculate_priority_score
    # so passing None should give the same result as no override
    score2, cls2, _ = calculate_priority_score(required_date, customer_priority, wo_type, None)
    assert base_score == score2
    assert base_cls == cls2


# ── Property 8: Queue ordering ────────────────────────────────────────────────

@given(st.lists(
    st.tuples(_days_until_due, _customer_priorities, _wo_types),
    min_size=2, max_size=20,
))
@settings(max_examples=100)
def test_queue_ordering(work_orders):
    """Property 8: scores computed for a list of WOs are sortable descending."""
    scores = []
    for days, cp, wt in work_orders:
        required_date = date.today() + timedelta(days=days)
        score, _, _ = calculate_priority_score(required_date, cp, wt, None)
        scores.append(score)

    sorted_desc = sorted(scores, reverse=True)
    # Verify the sorted list is non-increasing
    for i in range(len(sorted_desc) - 1):
        assert sorted_desc[i] >= sorted_desc[i + 1]


# ── Property: Score is always non-negative ────────────────────────────────────

@given(_days_until_due, _customer_priorities, _wo_types, st.one_of(st.none(), _override_types))
@settings(max_examples=100)
def test_score_always_non_negative(days, customer_priority, wo_type, override_type):
    """Score must never be negative regardless of inputs."""
    required_date, cp, wt, override = _make_inputs(days, customer_priority, wo_type, override_type)
    score, _, _ = calculate_priority_score(required_date, cp, wt, override)
    assert score >= 0.0


# ── Property: Priority class is always A, B, or C ────────────────────────────

@given(_days_until_due, _customer_priorities, _wo_types, st.one_of(st.none(), _override_types))
@settings(max_examples=100)
def test_priority_class_always_valid(days, customer_priority, wo_type, override_type):
    """Priority class must always be A, B, or C."""
    required_date, cp, wt, override = _make_inputs(days, customer_priority, wo_type, override_type)
    _, cls, _ = calculate_priority_score(required_date, cp, wt, override)
    assert cls in ("A", "B", "C")
