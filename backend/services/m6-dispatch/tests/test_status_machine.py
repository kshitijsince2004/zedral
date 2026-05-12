"""Unit tests for M6 dispatch item status machine."""
from __future__ import annotations

import pytest

from app.services.event_service import _TRANSITIONS, _EVENT_TO_STATUS


def _can_transition(current_status: str, event_type: str) -> bool:
    target = _EVENT_TO_STATUS.get(event_type)
    if target is None:
        return True  # non-status-changing events always allowed
    return target in _TRANSITIONS.get(current_status, [])


class TestValidTransitions:
    def test_pending_setup_started(self):
        assert _can_transition("pending", "setup_started")

    def test_pending_production_started(self):
        assert _can_transition("pending", "production_started")

    def test_setup_in_progress_production_started(self):
        assert _can_transition("setup_in_progress", "production_started")

    def test_production_in_progress_production_completed(self):
        assert _can_transition("production_in_progress", "production_completed")

    def test_stopped_production_started(self):
        # After stoppage ends, can resume production
        assert "production_in_progress" in _TRANSITIONS["stopped"]


class TestInvalidTransitions:
    def test_complete_cannot_start_production(self):
        assert not _can_transition("complete", "production_started")

    def test_complete_cannot_setup(self):
        assert not _can_transition("complete", "setup_started")

    def test_cancelled_cannot_start(self):
        assert not _can_transition("cancelled", "production_started")

    def test_pending_cannot_complete(self):
        assert not _can_transition("pending", "production_completed")


class TestStoppageTransitions:
    def test_production_in_progress_can_stop(self):
        # stoppage_started doesn't use _EVENT_TO_STATUS but sets stopped directly
        assert "stopped" in _TRANSITIONS["production_in_progress"]

    def test_stopped_can_resume(self):
        assert "production_in_progress" in _TRANSITIONS["stopped"]

    def test_stopped_can_cancel(self):
        assert "cancelled" in _TRANSITIONS["stopped"]


class TestEventToStatusMapping:
    def test_setup_started_maps_to_setup_in_progress(self):
        assert _EVENT_TO_STATUS["setup_started"] == "setup_in_progress"

    def test_production_started_maps_to_production_in_progress(self):
        assert _EVENT_TO_STATUS["production_started"] == "production_in_progress"

    def test_production_completed_maps_to_complete(self):
        assert _EVENT_TO_STATUS["production_completed"] == "complete"
