"""Unit tests for coil stage pipeline validation logic."""
from __future__ import annotations

import pytest

from app.routers.coils import FORWARD_PIPELINE, TERMINAL_STAGES


def _is_valid_transition(from_stage: str, to_stage: str) -> tuple[bool, str]:
    """Replicate the validation logic from the coils router."""
    if from_stage in TERMINAL_STAGES:
        return False, f"Cannot transition from terminal stage '{from_stage}'"
    if to_stage in ("rejected", "scrapped"):
        return True, "ok"
    from_idx = FORWARD_PIPELINE.get(from_stage, -1)
    to_idx = FORWARD_PIPELINE.get(to_stage, -1)
    if to_idx <= from_idx:
        valid_next = list(FORWARD_PIPELINE.keys())[from_idx + 1:]
        return False, f"Invalid transition {from_stage} → {to_stage}. Valid: {valid_next}"
    return True, "ok"


class TestForwardTransitions:
    def test_expected_to_stores(self):
        ok, _ = _is_valid_transition("expected", "stores")
        assert ok

    def test_stores_to_pickling(self):
        ok, _ = _is_valid_transition("stores", "pickling")
        assert ok

    def test_pickling_to_rolling(self):
        ok, _ = _is_valid_transition("pickling", "rolling")
        assert ok

    def test_rolling_to_annealing(self):
        ok, _ = _is_valid_transition("rolling", "annealing")
        assert ok

    def test_annealing_to_rewind(self):
        ok, _ = _is_valid_transition("annealing", "rewind")
        assert ok

    def test_rewind_to_fg(self):
        ok, _ = _is_valid_transition("rewind", "fg")
        assert ok

    def test_fg_to_dispatched(self):
        ok, _ = _is_valid_transition("fg", "dispatched")
        assert ok

    def test_skip_stages_forward(self):
        # stores → rolling (skipping pickling) should be valid (forward)
        ok, _ = _is_valid_transition("stores", "rolling")
        assert ok


class TestBackwardTransitions:
    def test_pickling_to_stores_invalid(self):
        ok, msg = _is_valid_transition("pickling", "stores")
        assert not ok
        assert "Invalid transition" in msg

    def test_rolling_to_expected_invalid(self):
        ok, _ = _is_valid_transition("rolling", "expected")
        assert not ok

    def test_fg_to_pickling_invalid(self):
        ok, _ = _is_valid_transition("fg", "pickling")
        assert not ok


class TestTerminalTransitions:
    def test_rolling_to_scrapped_valid(self):
        ok, _ = _is_valid_transition("rolling", "scrapped")
        assert ok

    def test_stores_to_rejected_valid(self):
        ok, _ = _is_valid_transition("stores", "rejected")
        assert ok

    def test_dispatched_to_scrapped_invalid(self):
        # dispatched is terminal
        ok, msg = _is_valid_transition("dispatched", "scrapped")
        assert not ok
        assert "terminal" in msg

    def test_scrapped_to_anything_invalid(self):
        ok, msg = _is_valid_transition("scrapped", "stores")
        assert not ok
        assert "terminal" in msg

    def test_rejected_to_anything_invalid(self):
        ok, msg = _is_valid_transition("rejected", "stores")
        assert not ok
        assert "terminal" in msg
