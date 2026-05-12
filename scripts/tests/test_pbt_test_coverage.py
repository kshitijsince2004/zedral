"""
Property-based tests for test coverage gate check.

# Feature: deploy-readiness-audit, Property 10: Test failure propagates to FAIL checklist status

Validates: Requirements 6.11
"""
from __future__ import annotations

# Feature: deploy-readiness-audit, Property 10: Test failure propagates to FAIL checklist status

from pathlib import Path
from typing import Optional
import tempfile

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from scripts.checks.test_coverage import (
    SERVICES,
    TestCoverageCheck,
    check_required_test_files,
    run_pytest_for_service,
)
from scripts.models import Status

# ---------------------------------------------------------------------------
# Strategies
# ---------------------------------------------------------------------------

# Any non-zero pytest exit code (failure, error, interrupted, etc.)
# pytest uses: 0=pass, 1=tests failed, 2=interrupted, 3=internal error,
#              4=command-line usage error, 5=no tests collected
nonzero_exit_code_strategy = st.integers(min_value=1, max_value=255)

# A valid service name
service_name_strategy = st.text(
    alphabet="abcdefghijklmnopqrstuvwxyz0123456789-_",
    min_size=1,
    max_size=30,
).filter(lambda s: s.strip("-").strip("_"))

# Simulated pytest stdout/stderr output lines
pytest_output_strategy = st.text(
    alphabet=st.characters(blacklist_categories=("Cs",)),
    min_size=0,
    max_size=500,
)


# ---------------------------------------------------------------------------
# Property 10: Test failure propagates to FAIL checklist status
# ---------------------------------------------------------------------------

@given(exit_code=nonzero_exit_code_strategy)
@settings(max_examples=100)
def test_nonzero_exit_code_always_produces_fail_status(exit_code: int):
    """
    # Feature: deploy-readiness-audit, Property 10: Test failure propagates to FAIL checklist status

    For any pytest invocation that exits with a non-zero code, the audit
    runner SHALL record a FAIL status for the corresponding Test Coverage
    checklist item — never PASS or SKIP.

    This test generates various non-zero exit codes and verifies that
    TestCoverageCheck always maps them to FAIL.

    Validates: Requirements 6.11
    """
    assert exit_code != 0, "Precondition: exit_code must be non-zero"

    # Create a temporary directory to act as the service directory
    with tempfile.TemporaryDirectory() as tmpdir:
        project_root = Path(tmpdir)
        svc_dir = project_root / "test_service"
        svc_dir.mkdir()

        # Mock subprocess that always returns the given non-zero exit code
        def mock_subprocess(
            cmd: list[str],
            cwd: Optional[str] = None,
            timeout: int = 300,
        ) -> tuple[int, str, str]:
            return exit_code, "", f"pytest exited with code {exit_code}"

        # Configure a single service pointing to our temp directory
        services = [
            {
                "name": "test_service",
                "dir": "test_service",
                "required_test_files": [],
            }
        ]

        checker = TestCoverageCheck(
            project_root=project_root,
            run_subprocess=mock_subprocess,
            services=services,
        )
        result = checker.run()

        assert result.status == Status.FAIL, (
            f"Expected FAIL when pytest exits with code {exit_code}, "
            f"but got {result.status!r}. "
            f"Failures: {result.failures}"
        )
        assert result.status != Status.PASS, (
            f"Status MUST NOT be PASS when pytest exits with non-zero code {exit_code}"
        )
        assert result.status != Status.SKIP, (
            f"Status MUST NOT be SKIP when pytest exits with non-zero code {exit_code} "
            f"(SKIP is only for AUDIT_SKIP_TESTS=true)"
        )
        assert len(result.failures) >= 1, (
            f"Failures list must be non-empty when pytest exits with code {exit_code}"
        )


@given(
    exit_code=nonzero_exit_code_strategy,
    stdout=pytest_output_strategy,
    stderr=pytest_output_strategy,
)
@settings(max_examples=100)
def test_nonzero_exit_code_with_any_output_always_produces_fail(
    exit_code: int,
    stdout: str,
    stderr: str,
):
    """
    # Feature: deploy-readiness-audit, Property 10: Test failure propagates to FAIL checklist status

    For any non-zero pytest exit code, regardless of what stdout/stderr
    output is produced, the result SHALL always be FAIL — never PASS or SKIP.

    Validates: Requirements 6.11
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        project_root = Path(tmpdir)
        svc_dir = project_root / "svc"
        svc_dir.mkdir()

        def mock_subprocess(
            cmd: list[str],
            cwd: Optional[str] = None,
            timeout: int = 300,
        ) -> tuple[int, str, str]:
            return exit_code, stdout, stderr

        services = [
            {
                "name": "svc",
                "dir": "svc",
                "required_test_files": [],
            }
        ]

        checker = TestCoverageCheck(
            project_root=project_root,
            run_subprocess=mock_subprocess,
            services=services,
        )
        result = checker.run()

        assert result.status == Status.FAIL, (
            f"Expected FAIL for exit_code={exit_code}, "
            f"stdout={stdout!r:.50}, stderr={stderr!r:.50}, "
            f"but got {result.status!r}"
        )


@given(
    exit_codes=st.lists(
        nonzero_exit_code_strategy,
        min_size=1,
        max_size=5,
    )
)
@settings(max_examples=100)
def test_any_service_failure_propagates_to_overall_fail(
    exit_codes: list[int],
):
    """
    # Feature: deploy-readiness-audit, Property 10: Test failure propagates to FAIL checklist status

    When ANY service's pytest exits with a non-zero code, the overall
    CheckResult status SHALL be FAIL — even if other services pass.

    Validates: Requirements 6.11
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        project_root = Path(tmpdir)

        # Create service directories
        services = []
        for i, exit_code in enumerate(exit_codes):
            svc_name = f"svc_{i}"
            svc_dir = project_root / svc_name
            svc_dir.mkdir()
            services.append(
                {
                    "name": svc_name,
                    "dir": svc_name,
                    "required_test_files": [],
                    "_exit_code": exit_code,  # store for mock
                }
            )

        # Also add a passing service
        passing_svc_dir = project_root / "passing_svc"
        passing_svc_dir.mkdir()
        services.append(
            {
                "name": "passing_svc",
                "dir": "passing_svc",
                "required_test_files": [],
                "_exit_code": 0,
            }
        )

        def mock_subprocess(
            cmd: list[str],
            cwd: Optional[str] = None,
            timeout: int = 300,
        ) -> tuple[int, str, str]:
            # Determine which service is being tested by cwd
            if cwd is None:
                return 0, "", ""
            cwd_path = Path(cwd)
            svc_name = cwd_path.name
            for svc in services:
                if svc["name"] == svc_name:
                    ec = svc.get("_exit_code", 0)
                    return ec, "", f"exit {ec}"
            return 0, "", ""

        # Strip internal _exit_code key before passing to checker
        clean_services = [
            {k: v for k, v in svc.items() if k != "_exit_code"}
            for svc in services
        ]

        checker = TestCoverageCheck(
            project_root=project_root,
            run_subprocess=mock_subprocess,
            services=clean_services,
        )
        result = checker.run()

        assert result.status == Status.FAIL, (
            f"Expected overall FAIL when at least one service has non-zero "
            f"exit codes {exit_codes!r}, but got {result.status!r}. "
            f"Failures: {result.failures}"
        )


@given(exit_code=nonzero_exit_code_strategy)
@settings(max_examples=100)
def test_run_pytest_for_service_nonzero_exit_is_fail(exit_code: int):
    """
    # Feature: deploy-readiness-audit, Property 10: Test failure propagates to FAIL checklist status

    The run_pytest_for_service helper function SHALL return Status.FAIL for
    any non-zero pytest exit code.

    Validates: Requirements 6.11
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        project_root = Path(tmpdir)
        svc_dir = project_root / "svc"
        svc_dir.mkdir()

        def mock_subprocess(
            cmd: list[str],
            cwd: Optional[str] = None,
            timeout: int = 300,
        ) -> tuple[int, str, str]:
            return exit_code, "", f"exit {exit_code}"

        status, details, failures = run_pytest_for_service(
            service_name="svc",
            service_dir=Path("svc"),
            project_root=project_root,
            run_subprocess=mock_subprocess,
        )

        assert status == Status.FAIL, (
            f"run_pytest_for_service must return FAIL for exit code {exit_code}, "
            f"got {status!r}"
        )
        assert status != Status.PASS, (
            f"run_pytest_for_service must NEVER return PASS for non-zero exit code {exit_code}"
        )
        assert status != Status.SKIP, (
            f"run_pytest_for_service must NEVER return SKIP for non-zero exit code {exit_code}"
        )
        assert len(failures) >= 1, (
            f"failures list must be non-empty for non-zero exit code {exit_code}"
        )


# ---------------------------------------------------------------------------
# Additional unit tests (non-PBT) for TestCoverageCheck behaviour
# ---------------------------------------------------------------------------

def test_zero_exit_code_produces_pass():
    """pytest exit code 0 SHALL produce PASS status."""
    with tempfile.TemporaryDirectory() as tmpdir:
        project_root = Path(tmpdir)
        svc_dir = project_root / "svc"
        svc_dir.mkdir()

        def mock_subprocess(
            cmd: list[str],
            cwd: Optional[str] = None,
            timeout: int = 300,
        ) -> tuple[int, str, str]:
            return 0, "1 passed", ""

        services = [{"name": "svc", "dir": "svc", "required_test_files": []}]
        checker = TestCoverageCheck(
            project_root=project_root,
            run_subprocess=mock_subprocess,
            services=services,
        )
        result = checker.run()
        assert result.status == Status.PASS, (
            f"Expected PASS for exit code 0, got {result.status!r}"
        )
        assert result.failures == [], (
            f"Expected no failures for exit code 0, got: {result.failures}"
        )


def test_missing_directory_produces_fail():
    """A missing service directory SHALL produce FAIL status."""
    with tempfile.TemporaryDirectory() as tmpdir:
        project_root = Path(tmpdir)
        # Do NOT create the service directory

        def mock_subprocess(
            cmd: list[str],
            cwd: Optional[str] = None,
            timeout: int = 300,
        ) -> tuple[int, str, str]:
            return 0, "", ""

        services = [
            {"name": "nonexistent", "dir": "nonexistent", "required_test_files": []}
        ]
        checker = TestCoverageCheck(
            project_root=project_root,
            run_subprocess=mock_subprocess,
            services=services,
        )
        result = checker.run()
        assert result.status == Status.FAIL, (
            f"Expected FAIL when service directory does not exist, "
            f"got {result.status!r}"
        )
        assert len(result.failures) >= 1


def test_pytest_not_found_produces_fail():
    """pytest not found (returncode -1) SHALL produce FAIL status."""
    with tempfile.TemporaryDirectory() as tmpdir:
        project_root = Path(tmpdir)
        svc_dir = project_root / "svc"
        svc_dir.mkdir()

        def mock_subprocess(
            cmd: list[str],
            cwd: Optional[str] = None,
            timeout: int = 300,
        ) -> tuple[int, str, str]:
            return -1, "", "Command not found: 'pytest'"

        services = [{"name": "svc", "dir": "svc", "required_test_files": []}]
        checker = TestCoverageCheck(
            project_root=project_root,
            run_subprocess=mock_subprocess,
            services=services,
        )
        result = checker.run()
        assert result.status == Status.FAIL, (
            f"Expected FAIL when pytest is not found, got {result.status!r}"
        )
        assert len(result.failures) >= 1


def test_audit_skip_tests_env_produces_skip(monkeypatch):
    """AUDIT_SKIP_TESTS=true SHALL produce SKIP status without running pytest."""
    monkeypatch.setenv("AUDIT_SKIP_TESTS", "true")

    call_count = 0

    def mock_subprocess(
        cmd: list[str],
        cwd: Optional[str] = None,
        timeout: int = 300,
    ) -> tuple[int, str, str]:
        nonlocal call_count
        call_count += 1
        return 0, "", ""

    checker = TestCoverageCheck(run_subprocess=mock_subprocess)
    result = checker.run()

    assert result.status == Status.SKIP, (
        f"Expected SKIP when AUDIT_SKIP_TESTS=true, got {result.status!r}"
    )
    assert call_count == 0, (
        f"pytest should not be invoked when AUDIT_SKIP_TESTS=true, "
        f"but subprocess was called {call_count} time(s)"
    )


def test_missing_required_test_file_produces_fail():
    """A missing required test file SHALL produce FAIL status."""
    with tempfile.TemporaryDirectory() as tmpdir:
        project_root = Path(tmpdir)
        svc_dir = project_root / "svc"
        svc_dir.mkdir()
        # Do NOT create test_pbt_priority.py

        def mock_subprocess(
            cmd: list[str],
            cwd: Optional[str] = None,
            timeout: int = 300,
        ) -> tuple[int, str, str]:
            return 0, "1 passed", ""

        services = [
            {
                "name": "svc",
                "dir": "svc",
                "required_test_files": ["test_pbt_priority.py"],
            }
        ]
        checker = TestCoverageCheck(
            project_root=project_root,
            run_subprocess=mock_subprocess,
            services=services,
        )
        result = checker.run()
        assert result.status == Status.FAIL, (
            f"Expected FAIL when required test file is missing, "
            f"got {result.status!r}"
        )
        assert any("test_pbt_priority.py" in f for f in result.failures), (
            f"Expected failure to mention missing file, got: {result.failures}"
        )


def test_required_test_file_found_recursively():
    """Required test files SHALL be found even in subdirectories."""
    with tempfile.TemporaryDirectory() as tmpdir:
        project_root = Path(tmpdir)
        svc_dir = project_root / "svc"
        tests_subdir = svc_dir / "tests"
        tests_subdir.mkdir(parents=True)
        # Create the required test file in a subdirectory
        (tests_subdir / "test_pbt_priority.py").write_text("# test")

        def mock_subprocess(
            cmd: list[str],
            cwd: Optional[str] = None,
            timeout: int = 300,
        ) -> tuple[int, str, str]:
            return 0, "1 passed", ""

        services = [
            {
                "name": "svc",
                "dir": "svc",
                "required_test_files": ["test_pbt_priority.py"],
            }
        ]
        checker = TestCoverageCheck(
            project_root=project_root,
            run_subprocess=mock_subprocess,
            services=services,
        )
        result = checker.run()
        assert result.status == Status.PASS, (
            f"Expected PASS when required test file exists in subdirectory, "
            f"got {result.status!r}. Failures: {result.failures}"
        )


def test_check_result_dimension_is_test_coverage():
    """The CheckResult dimension SHALL always be 'Test Coverage'."""
    with tempfile.TemporaryDirectory() as tmpdir:
        project_root = Path(tmpdir)

        def mock_subprocess(
            cmd: list[str],
            cwd: Optional[str] = None,
            timeout: int = 300,
        ) -> tuple[int, str, str]:
            return 0, "", ""

        checker = TestCoverageCheck(
            project_root=project_root,
            run_subprocess=mock_subprocess,
            services=[],
        )
        result = checker.run()
        assert result.dimension == "Test Coverage", (
            f"Expected dimension 'Test Coverage', got {result.dimension!r}"
        )


def test_all_services_pass_produces_overall_pass():
    """When all services pass, the overall status SHALL be PASS."""
    with tempfile.TemporaryDirectory() as tmpdir:
        project_root = Path(tmpdir)

        services = []
        for name in ["svc_a", "svc_b", "svc_c"]:
            svc_dir = project_root / name
            svc_dir.mkdir()
            services.append({"name": name, "dir": name, "required_test_files": []})

        def mock_subprocess(
            cmd: list[str],
            cwd: Optional[str] = None,
            timeout: int = 300,
        ) -> tuple[int, str, str]:
            return 0, "all passed", ""

        checker = TestCoverageCheck(
            project_root=project_root,
            run_subprocess=mock_subprocess,
            services=services,
        )
        result = checker.run()
        assert result.status == Status.PASS, (
            f"Expected PASS when all services pass, got {result.status!r}"
        )
        assert result.failures == []
