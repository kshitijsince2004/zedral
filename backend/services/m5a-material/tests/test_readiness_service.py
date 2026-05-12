"""Unit tests for M5a readiness_service._derive_status and WoReadiness logic."""
from __future__ import annotations

import pytest

from app.services.readiness_service import _derive_status, WoReadiness


class TestDeriveStatus:
    def test_ready_when_available_meets_required(self):
        assert _derive_status(100.0, 100.0, 0.0) == "ready"

    def test_ready_when_available_exceeds_required(self):
        assert _derive_status(50.0, 75.0, 0.0) == "ready"

    def test_partial_when_available_plus_expected_meets_required(self):
        # available=30, expected=30, required=50 → available+expected=60 >= 50 → partial
        assert _derive_status(50.0, 30.0, 30.0) == "partial"

    def test_shortage_when_available_plus_expected_below_required(self):
        # available=10, expected=10, required=50 → 20 < 50 → shortage
        assert _derive_status(50.0, 10.0, 10.0) == "shortage"

    def test_pending_when_nothing_available(self):
        assert _derive_status(50.0, 0.0, 0.0) == "pending"

    def test_shortage_with_some_available_but_not_enough(self):
        # available=5, expected=0, required=50 → shortage (has some but not enough)
        assert _derive_status(50.0, 5.0, 0.0) == "shortage"

    def test_ready_at_exact_boundary(self):
        assert _derive_status(22.5, 22.5, 0.0) == "ready"

    def test_partial_at_exact_boundary(self):
        # available=10, expected=12.5, required=22.5 → 22.5 >= 22.5 → partial
        assert _derive_status(22.5, 10.0, 12.5) == "partial"


class TestWoReadinessDataclass:
    def test_shortfall_is_zero_when_ready(self):
        r = WoReadiness(
            wo_id="WO-001",
            required_qty_mt=50.0,
            available_qty_mt=60.0,
            expected_qty_mt=0.0,
            shortfall_qty_mt=0.0,
            status="ready",
        )
        assert r.shortfall_qty_mt == 0.0
        assert r.status == "ready"

    def test_shortfall_positive_when_shortage(self):
        r = WoReadiness(
            wo_id="WO-002",
            required_qty_mt=50.0,
            available_qty_mt=10.0,
            expected_qty_mt=5.0,
            shortfall_qty_mt=35.0,
            status="shortage",
        )
        assert r.shortfall_qty_mt == 35.0
        assert r.status == "shortage"
