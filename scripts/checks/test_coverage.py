"""
checks/test_coverage.py — Test Coverage Gate check.

Responsibilities:
- Run pytest in each of the five directories via subprocess:
    backend/services/m2-master/
    backend/services/m1-demand/
    backend/services/m5a-material/
    backend/services/m6-dispatch/
    backend/shared/
- Capture exit codes and failure counts; report per-service pass/fail.
- Verify the specific named test files exist before running:
    test_pbt_priority.py in m1-demand
    test_pbt_readiness.py in m5a-material
    test_pbt_m6.py, test_event_idempotency.py, test_status_machine.py in m6-dispatch
    test_pbt_event_envelope.py, test_event_envelope.py in backend/shared
- Mark as FAIL if pytest is not found or a test directory does not exist.
- Respects AUDIT_SKIP_TESTS env var: when set to "true", skips pytest
  execution and marks all services as SKIP.
- Returns a CheckResult with dimension "Test Coverage".
"""
from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path
from typing import Callable, Optional

from models import CheckResult, Status

# ---------------------------------------------------------------------------
# Service configuration
# ---------------------------------------------------------------------------

SERVICES: list[dict] = [
    {
        "name": "m2-master",
        "dir": "backend/services/m2-master",
        "required_test_files": [],
    },
    {
        "name": "m1-demand",
        "dir": "backend/services/m1-demand",
        "required_test_files": ["test_pbt_priority.py"],
    },
    {
        "name": "m5a-material",
        "dir": "backend/services/m5a-material",
        "required_test_files": ["test_pbt_readiness.py"],
    },
    {
        "name": "m6-dispatch",
        "dir": "backend/services/m6-dispatch",
        "required_test_files": [
            "test_pbt_m6.py",
            "test_event_idempotency.py",
            "test_status_machine.py",
        ],
    },
    {
        "name": "shared",
        "dir": "backend/shared",
        "required_test_files": [
            "test_pbt_event_envelope.py",
            "test_event_envelope.py",
        ],
    },
]


# ---------------------------------------------------------------------------
# Subprocess helper
# ---------------------------------------------------------------------------

def _default_run_subprocess(
    cmd: list[str],
    cwd: Optional[str] = None,
    timeout: int = 300,
) -> tuple[int, str, str]:
    """
    Run a subprocess command and return (returncode, stdout, stderr).

    Returns returncode -1 if the command is not found or times out.
    """
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
            cwd=cwd,
        )
        return result.returncode, result.stdout, result.stderr
    except FileNotFoundError:
        return -1, "", f"Command not found: {cmd[0]!r}"
    except subprocess.TimeoutExpired:
        return -1, "", f"Command timed out after {timeout}s: {' '.join(cmd)}"
    except Exception as exc:
        return -1, "", f"Unexpected error running {' '.join(cmd)}: {exc}"


# ---------------------------------------------------------------------------
# Per-service check helpers
# ---------------------------------------------------------------------------

def check_required_test_files(
    service_dir: Path,
    required_files: list[str],
) -> tuple[list[str], list[str]]:
    """
    Verify that all required test files exist within the service directory.

    Searches recursively under service_dir for each required filename.

    Returns (details, failures).
    """
    details: list[str] = []
    failures: list[str] = []

    for filename in required_files:
        matches = list(service_dir.rglob(filename))
        if matches:
            details.append(
                f"  Required test file {filename!r} found: {matches[0].relative_to(service_dir)} ✓"
            )
        else:
            failures.append(
                f"  Required test file {filename!r} not found under {service_dir}"
            )

    return details, failures


def run_pytest_for_service(
    service_name: str,
    service_dir: Path,
    project_root: Path,
    run_subprocess: Callable[[list[str], Optional[str], int], tuple[int, str, str]],
) -> tuple[Status, list[str], list[str]]:
    """
    Run pytest in the given service directory and return (status, details, failures).

    - PASS: pytest exits with code 0
    - FAIL: pytest exits with non-zero code, directory missing, or pytest not found
    - SKIP: should not occur here (handled at the class level via AUDIT_SKIP_TESTS)
    """
    details: list[str] = []
    failures: list[str] = []

    abs_service_dir = project_root / service_dir

    # Check directory existence
    if not abs_service_dir.exists():
        failures.append(
            f"{service_name}: test directory does not exist: {abs_service_dir}"
        )
        return Status.FAIL, details, failures

    # Run pytest
    returncode, stdout, stderr = run_subprocess(
        [sys.executable, "-m", "pytest", "--tb=short", "-q"],
        cwd=str(abs_service_dir),
        timeout=300,
    )

    if returncode == -1:
        # pytest not found or execution error
        err_msg = stderr.strip() or "pytest not found or could not be executed"
        failures.append(f"{service_name}: {err_msg}")
        return Status.FAIL, details, failures

    # Capture output for details
    combined = (stdout + "\n" + stderr).strip()
    if combined:
        # Include last few lines of output for context
        output_lines = combined.splitlines()
        summary_lines = output_lines[-10:] if len(output_lines) > 10 else output_lines
        details.append(
            f"{service_name} pytest output (last {len(summary_lines)} lines):"
        )
        details.extend(f"  {line}" for line in summary_lines)

    if returncode == 0:
        details.append(f"{service_name}: pytest passed ✓")
        return Status.PASS, details, failures
    else:
        failures.append(
            f"{service_name}: pytest exited with code {returncode}"
        )
        return Status.FAIL, details, failures


# ---------------------------------------------------------------------------
# TestCoverageCheck class
# ---------------------------------------------------------------------------

class TestCoverageCheck:
    """
    Checks test coverage by running pytest in each service directory and
    verifying that required test files exist.

    Parameters
    ----------
    project_root : Path, optional
        Root of the project. Defaults to three levels up from this file
        (i.e. the repo root).
    run_subprocess : callable, optional
        Injected subprocess runner for testing. Signature:
        ``(cmd: list[str], cwd: Optional[str], timeout: int) -> (returncode: int, stdout: str, stderr: str)``
    services : list[dict], optional
        Service configuration list. Defaults to the module-level SERVICES.
    """

    def __init__(
        self,
        project_root: Optional[Path] = None,
        run_subprocess: Optional[
            Callable[[list[str], Optional[str], int], tuple[int, str, str]]
        ] = None,
        services: Optional[list[dict]] = None,
    ) -> None:
        if project_root is None:
            # Auto-detect: this file is at scripts/checks/test_coverage.py
            # so project root is three levels up
            self._project_root = Path(__file__).parent.parent.parent
        else:
            self._project_root = project_root

        self._run_subprocess = run_subprocess or _default_run_subprocess
        self._services = services if services is not None else SERVICES

    def run(self) -> CheckResult:
        """Execute all test coverage checks and return a CheckResult."""
        all_details: list[str] = []
        all_failures: list[str] = []

        # ── Check AUDIT_SKIP_TESTS env var ────────────────────────────────────
        skip_tests = os.environ.get("AUDIT_SKIP_TESTS", "false").lower() == "true"

        if skip_tests:
            all_details.append(
                "AUDIT_SKIP_TESTS=true — skipping pytest execution for all services"
            )
            return CheckResult(
                dimension="Test Coverage",
                status=Status.SKIP,
                details=all_details,
                failures=[],
            )

        # ── Run checks for each service ───────────────────────────────────────
        for svc in self._services:
            svc_name: str = svc["name"]
            svc_dir = Path(svc["dir"])
            required_files: list[str] = svc.get("required_test_files", [])

            all_details.append(f"--- {svc_name} ---")

            abs_svc_dir = self._project_root / svc_dir

            # 1. Check directory existence first
            if not abs_svc_dir.exists():
                all_failures.append(
                    f"{svc_name}: test directory does not exist: {abs_svc_dir}"
                )
                all_details.append(
                    f"{svc_name}: FAIL — directory not found: {abs_svc_dir}"
                )
                continue

            # 2. Verify required test files exist
            if required_files:
                file_details, file_failures = check_required_test_files(
                    abs_svc_dir, required_files
                )
                all_details.extend(file_details)
                all_failures.extend(file_failures)

            # 3. Run pytest
            status, pytest_details, pytest_failures = run_pytest_for_service(
                service_name=svc_name,
                service_dir=svc_dir,
                project_root=self._project_root,
                run_subprocess=self._run_subprocess,
            )
            all_details.extend(pytest_details)
            all_failures.extend(pytest_failures)

        # ── Determine overall status ─────────────────────────────────────────
        overall = Status.FAIL if all_failures else Status.PASS

        return CheckResult(
            dimension="Test Coverage",
            status=overall,
            details=all_details,
            failures=all_failures,
        )
