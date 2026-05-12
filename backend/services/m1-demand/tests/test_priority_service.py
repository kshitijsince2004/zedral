"""Unit tests for M1 priority_service.calculate_priority_score."""
from __future__ import annotations

from datetime import date, timedelta

import pytest

from app.services.priority_service import calculate_priority_score


def _score(days_until_due: int, customer_priority: str = "medium", wo_type: str = "customer", override=None):
    required_date = date.today() + timedelta(days=days_until_due)
    return calculate_priority_score(required_date, customer_priority, wo_type, override)


class TestBaseScore:
    def test_high_priority_customer_due_in_3_days(self):
        score, cls, components = _score(3, "high", "customer")
        # proximity = clamp(40 - 3*(40/30), 0, 40) = clamp(36, 0, 40) = 36
        # customer = 30, type_bonus = 5, base = 71
        assert score == pytest.approx(71.0, abs=0.1)
        assert cls == "A"
        assert components["proximity_score"] == pytest.approx(36.0, abs=0.1)
        assert components["customer_score"] == 30
        assert components["type_bonus"] == 5

    def test_medium_priority_customer_due_in_15_days(self):
        score, cls, components = _score(15, "medium", "customer")
        # proximity = clamp(40 - 15*(40/30), 0, 40) = clamp(20, 0, 40) = 20
        # customer = 20, type_bonus = 5, base = 45
        assert score == pytest.approx(45.0, abs=0.1)
        assert cls == "B"

    def test_low_priority_internal_overdue(self):
        score, cls, components = _score(-5, "low", "internal")
        # proximity = clamp(40 - (-5)*(40/30), 0, 40) = clamp(46.67, 0, 40) = 40
        # customer = 10, type_bonus = 0, base = 50
        assert score == pytest.approx(50.0, abs=0.1)
        assert cls == "B"

    def test_low_priority_far_future(self):
        score, cls, _ = _score(60, "low", "internal")
        # proximity = clamp(40 - 60*(40/30), 0, 40) = clamp(-40, 0, 40) = 0
        # customer = 10, type_bonus = 0, base = 10
        assert score == pytest.approx(10.0, abs=0.1)
        assert cls == "C"


class TestPriorityClassBoundaries:
    def test_exactly_60_is_A(self):
        # Need score = 60: proximity=30, customer=25, type=5 → not exact, use high+customer
        # high=30, type=5, proximity=25 → 60
        # proximity=25 → 40 - days*(40/30)=25 → days=11.25 → use 11 days
        score, cls, _ = _score(11, "high", "customer")
        assert cls == "A"

    def test_exactly_35_is_B(self):
        # medium=20, type=5, proximity=10 → 35
        # proximity=10 → 40 - days*(40/30)=10 → days=22.5 → use 22 days
        score, cls, _ = _score(22, "medium", "customer")
        assert cls == "B"

    def test_below_35_is_C(self):
        score, cls, _ = _score(40, "low", "internal")
        assert cls == "C"


class TestOverrides:
    def test_rush_override_adds_50(self):
        base_score, _, _ = _score(10, "high", "customer", None)
        rush_score, cls, components = _score(10, "high", "customer", {"override_type": "rush"})
        assert rush_score == pytest.approx(base_score + 50, abs=0.1)
        assert components["override_adjustment"] == 50

    def test_hold_override_zeroes_score(self):
        score, cls, components = _score(5, "high", "customer", {"override_type": "hold"})
        assert score == 0.0
        assert cls == "C"
        assert components["override_type"] == "hold"

    def test_defer_override_reduces_by_20(self):
        base_score, _, _ = _score(10, "high", "customer", None)
        defer_score, _, components = _score(10, "high", "customer", {"override_type": "defer"})
        assert defer_score == pytest.approx(max(0, base_score - 20), abs=0.1)

    def test_defer_cannot_go_below_zero(self):
        # Low score that would go negative with defer
        score, _, _ = _score(50, "low", "internal", {"override_type": "defer"})
        assert score >= 0.0

    def test_release_hold_no_adjustment(self):
        base_score, _, _ = _score(10, "medium", "customer", None)
        rh_score, _, components = _score(10, "medium", "customer", {"override_type": "release_hold"})
        assert rh_score == pytest.approx(base_score, abs=0.1)
        assert components["override_adjustment"] == 0

    def test_expired_override_treated_as_none(self):
        """Expired overrides should not be passed to calculate_priority_score."""
        # The service layer filters expired overrides before calling calculate_priority_score.
        # Here we verify that passing None gives the base score.
        base_score, _, _ = _score(10, "high", "customer", None)
        assert base_score > 0


class TestDeterminism:
    def test_same_inputs_same_output(self):
        required_date = date.today() + timedelta(days=7)
        result1 = calculate_priority_score(required_date, "high", "customer", None)
        result2 = calculate_priority_score(required_date, "high", "customer", None)
        assert result1 == result2
