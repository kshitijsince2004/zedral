"""
Unit tests for ReportBuilder (scripts/report.py).

Covers:
- Report header contains timestamp, git_sha, and environment name
- Table rows are present for each CheckResult dimension
- Exit code is 0 when all results are PASS (gate open)
- Exit code is 1 when any result is FAIL (gate blocked)
- Gate verdict line is correct for OPEN and BLOCKED cases
- Failure notes appear in the Notes column
- Report file is named deploy-readiness-<timestamp>.txt
- Write failure logs to stderr but does not raise
"""
import os
import sys
import tempfile
from io import StringIO
from pathlib import Path

import pytest

from scripts.models import ChecklistReport, CheckResult, Status
from scripts.report import ReportBuilder


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_result(
    dimension: str,
    status: Status,
    failures: list[str] | None = None,
) -> CheckResult:
    return CheckResult(
        dimension=dimension,
        status=status,
        details=[],
        failures=failures or [],
    )


def make_report(
    *results: CheckResult,
    timestamp: str = "2025-01-15T10:30:00+05:30",
    git_sha: str = "a1b2c3d4e5f6",
    environment: str = "hsl_ludhiana_staging",
) -> ChecklistReport:
    return ChecklistReport(
        timestamp=timestamp,
        git_sha=git_sha,
        environment=environment,
        results=list(results),
    )


# ---------------------------------------------------------------------------
# Header tests
# ---------------------------------------------------------------------------

class TestReportHeader:
    def test_header_contains_timestamp(self):
        report = make_report(timestamp="2025-01-15T10:30:00+05:30")
        text = ReportBuilder(report).build()
        assert "2025-01-15T10:30:00+05:30" in text

    def test_header_contains_git_sha(self):
        report = make_report(git_sha="deadbeef1234")
        text = ReportBuilder(report).build()
        assert "deadbeef1234" in text

    def test_header_contains_environment(self):
        report = make_report(environment="hsl_ludhiana_staging")
        text = ReportBuilder(report).build()
        assert "hsl_ludhiana_staging" in text

    def test_header_contains_all_three_fields(self):
        report = make_report(
            timestamp="2025-06-01T08:00:00Z",
            git_sha="abc123",
            environment="production",
        )
        text = ReportBuilder(report).build()
        assert "2025-06-01T08:00:00Z" in text
        assert "abc123" in text
        assert "production" in text

    def test_header_contains_audit_title(self):
        report = make_report()
        text = ReportBuilder(report).build()
        assert "ZEDRAL DEPLOY READINESS AUDIT" in text


# ---------------------------------------------------------------------------
# Table row tests
# ---------------------------------------------------------------------------

class TestReportTableRows:
    def test_dimension_name_appears_in_output(self):
        report = make_report(make_result("Backend Health", Status.PASS))
        text = ReportBuilder(report).build()
        assert "Backend Health" in text

    def test_status_pass_appears_in_output(self):
        report = make_report(make_result("DB Schema", Status.PASS))
        text = ReportBuilder(report).build()
        assert "PASS" in text

    def test_status_fail_appears_in_output(self):
        report = make_report(make_result("API Contracts", Status.FAIL))
        text = ReportBuilder(report).build()
        assert "FAIL" in text

    def test_status_skip_appears_in_output(self):
        report = make_report(make_result("Event Messaging", Status.SKIP))
        text = ReportBuilder(report).build()
        assert "SKIP" in text

    def test_failure_note_appears_in_notes_column(self):
        report = make_report(
            make_result(
                "API Contracts",
                Status.FAIL,
                failures=["GET /api/m5a/forecast/ returned 404"],
            )
        )
        text = ReportBuilder(report).build()
        assert "GET /api/m5a/forecast/ returned 404" in text

    def test_multiple_failures_joined_with_semicolon(self):
        report = make_report(
            make_result(
                "Test Coverage",
                Status.FAIL,
                failures=["m6-dispatch: 2 test failures", "m1-demand: 1 test failure"],
            )
        )
        text = ReportBuilder(report).build()
        assert "m6-dispatch: 2 test failures" in text
        assert "m1-demand: 1 test failure" in text

    def test_all_nine_dimensions_present(self):
        dimensions = [
            "Backend Health",
            "DB Schema",
            "API Contracts",
            "Frontend Switchover",
            "Event Messaging",
            "Test Coverage",
            "Security Hardening",
            "Infrastructure",
            "Floor Console",
        ]
        results = [make_result(d, Status.PASS) for d in dimensions]
        report = make_report(*results)
        text = ReportBuilder(report).build()
        for dim in dimensions:
            assert dim in text


# ---------------------------------------------------------------------------
# Exit code tests
# ---------------------------------------------------------------------------

class TestExitCode:
    def test_exit_code_0_when_all_pass(self):
        report = make_report(
            make_result("Backend Health", Status.PASS),
            make_result("DB Schema", Status.PASS),
        )
        assert ReportBuilder(report).exit_code() == 0

    def test_exit_code_1_when_any_fail(self):
        report = make_report(
            make_result("Backend Health", Status.PASS),
            make_result("API Contracts", Status.FAIL),
        )
        assert ReportBuilder(report).exit_code() == 1

    def test_exit_code_0_when_skip_only(self):
        report = make_report(
            make_result("Event Messaging", Status.SKIP),
            make_result("Infrastructure", Status.SKIP),
        )
        assert ReportBuilder(report).exit_code() == 0

    def test_exit_code_0_when_mixed_pass_skip(self):
        report = make_report(
            make_result("Backend Health", Status.PASS),
            make_result("Event Messaging", Status.SKIP),
        )
        assert ReportBuilder(report).exit_code() == 0

    def test_exit_code_1_when_all_fail(self):
        report = make_report(
            make_result("Backend Health", Status.FAIL),
            make_result("DB Schema", Status.FAIL),
        )
        assert ReportBuilder(report).exit_code() == 1

    def test_exit_code_0_when_empty_results(self):
        report = make_report()
        assert ReportBuilder(report).exit_code() == 0


# ---------------------------------------------------------------------------
# Gate verdict line tests
# ---------------------------------------------------------------------------

class TestGateVerdictLine:
    def test_gate_open_message_when_all_pass(self):
        report = make_report(
            make_result("Backend Health", Status.PASS),
            make_result("DB Schema", Status.PASS),
        )
        text = ReportBuilder(report).build()
        assert "DEPLOYMENT GATE: OPEN" in text

    def test_gate_blocked_message_when_any_fail(self):
        report = make_report(
            make_result("Backend Health", Status.PASS),
            make_result("API Contracts", Status.FAIL),
        )
        text = ReportBuilder(report).build()
        assert "DEPLOYMENT GATE: BLOCKED" in text

    def test_gate_blocked_shows_correct_fail_count_one(self):
        report = make_report(
            make_result("API Contracts", Status.FAIL),
            make_result("DB Schema", Status.PASS),
        )
        text = ReportBuilder(report).build()
        assert "1 items failed" in text

    def test_gate_blocked_shows_correct_fail_count_two(self):
        report = make_report(
            make_result("API Contracts", Status.FAIL),
            make_result("Test Coverage", Status.FAIL),
            make_result("DB Schema", Status.PASS),
        )
        text = ReportBuilder(report).build()
        assert "2 items failed" in text

    def test_gate_open_not_present_when_blocked(self):
        report = make_report(make_result("API Contracts", Status.FAIL))
        text = ReportBuilder(report).build()
        assert "DEPLOYMENT GATE: OPEN" not in text

    def test_gate_blocked_not_present_when_open(self):
        report = make_report(make_result("Backend Health", Status.PASS))
        text = ReportBuilder(report).build()
        assert "DEPLOYMENT GATE: BLOCKED" not in text


# ---------------------------------------------------------------------------
# File naming tests
# ---------------------------------------------------------------------------

class TestReportFileNaming:
    def test_file_named_with_timestamp(self):
        """Report file should be named deploy-readiness-<timestamp>.txt"""
        report = make_report(timestamp="2025-01-15T10:30:00+05:30")
        with tempfile.TemporaryDirectory() as tmpdir:
            builder = ReportBuilder(report, project_root=tmpdir)
            builder.write_report()
            files = list(Path(tmpdir).iterdir())
            assert len(files) == 1
            assert files[0].name.startswith("deploy-readiness-")
            assert files[0].name.endswith(".txt")

    def test_file_name_contains_sanitised_timestamp(self):
        """Colons in timestamp are replaced so the filename is OS-safe."""
        report = make_report(timestamp="2025-01-15T10:30:00+05:30")
        with tempfile.TemporaryDirectory() as tmpdir:
            builder = ReportBuilder(report, project_root=tmpdir)
            builder.write_report()
            files = list(Path(tmpdir).iterdir())
            # Colons must not appear in the filename
            assert ":" not in files[0].name

    def test_file_content_matches_build_output(self):
        """The written file content must equal what build() returns."""
        report = make_report(
            make_result("Backend Health", Status.PASS),
            make_result("API Contracts", Status.FAIL, failures=["404 on /api/m5a/"]),
        )
        with tempfile.TemporaryDirectory() as tmpdir:
            builder = ReportBuilder(report, project_root=tmpdir)
            builder.write_report()
            files = list(Path(tmpdir).iterdir())
            written = files[0].read_text(encoding="utf-8")
            assert written == builder.build()

    def test_different_timestamps_produce_different_filenames(self):
        report1 = make_report(timestamp="2025-01-15T10:00:00Z")
        report2 = make_report(timestamp="2025-01-15T11:00:00Z")
        with tempfile.TemporaryDirectory() as tmpdir:
            ReportBuilder(report1, project_root=tmpdir).write_report()
            ReportBuilder(report2, project_root=tmpdir).write_report()
            files = sorted(Path(tmpdir).iterdir())
            assert len(files) == 2
            assert files[0].name != files[1].name


# ---------------------------------------------------------------------------
# Write failure handling tests
# ---------------------------------------------------------------------------

class TestWriteFailureHandling:
    def test_write_failure_logs_to_stderr(self, capsys):
        """On write failure, an error is logged to stderr."""
        report = make_report()
        # Use a non-existent directory to force a write failure
        builder = ReportBuilder(report, project_root="/nonexistent/path/xyz")
        builder.write_report()
        captured = capsys.readouterr()
        assert "WARNING" in captured.err or "could not write" in captured.err

    def test_write_failure_does_not_raise(self):
        """write_report() must not raise even when the file cannot be written."""
        report = make_report()
        builder = ReportBuilder(report, project_root="/nonexistent/path/xyz")
        # Should complete without raising
        builder.write_report()

    def test_print_report_still_works_after_write_failure(self, capsys):
        """print_report() outputs to stdout regardless of write_report() outcome."""
        report = make_report(make_result("Backend Health", Status.PASS))
        builder = ReportBuilder(report, project_root="/nonexistent/path/xyz")
        builder.write_report()  # fails silently
        builder.print_report()  # must still work
        captured = capsys.readouterr()
        assert "ZEDRAL DEPLOY READINESS AUDIT" in captured.out
