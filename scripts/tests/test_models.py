"""
Unit tests for ChecklistReport.gate_open.

Covers:
- All PASS results → gate_open is True
- Any FAIL result → gate_open is False
- SKIP-only results → gate_open is True
- Mixed PASS/SKIP results → gate_open is True
- Empty results list → gate_open is True
"""
import pytest
from scripts.models import ChecklistReport, CheckResult, Status


def make_result(status: Status, dimension: str = "Test") -> CheckResult:
    return CheckResult(dimension=dimension, status=status, details=[], failures=[])


def make_report(*statuses: Status) -> ChecklistReport:
    results = [make_result(s, f"Dim-{i}") for i, s in enumerate(statuses)]
    return ChecklistReport(
        timestamp="2025-01-15T10:00:00",
        git_sha="abc123",
        environment="test",
        results=results,
    )


class TestGateOpen:
    def test_all_pass_returns_true(self):
        report = make_report(Status.PASS, Status.PASS, Status.PASS)
        assert report.gate_open is True

    def test_any_fail_returns_false(self):
        report = make_report(Status.PASS, Status.FAIL, Status.PASS)
        assert report.gate_open is False

    def test_single_fail_returns_false(self):
        report = make_report(Status.FAIL)
        assert report.gate_open is False

    def test_all_fail_returns_false(self):
        report = make_report(Status.FAIL, Status.FAIL, Status.FAIL)
        assert report.gate_open is False

    def test_skip_only_returns_true(self):
        report = make_report(Status.SKIP, Status.SKIP)
        assert report.gate_open is True

    def test_mixed_pass_skip_returns_true(self):
        report = make_report(Status.PASS, Status.SKIP, Status.PASS)
        assert report.gate_open is True

    def test_empty_results_returns_true(self):
        report = make_report()
        assert report.gate_open is True

    def test_fail_among_skip_returns_false(self):
        report = make_report(Status.SKIP, Status.FAIL, Status.SKIP)
        assert report.gate_open is False

    def test_single_pass_returns_true(self):
        report = make_report(Status.PASS)
        assert report.gate_open is True

    def test_single_skip_returns_true(self):
        report = make_report(Status.SKIP)
        assert report.gate_open is True
