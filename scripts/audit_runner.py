"""
Deploy Readiness Audit Runner — entry point.

Orchestrates all readiness checks and produces a consolidated pass/fail
checklist report. Exits with code 0 when the deployment gate is open,
code 1 when any check fails.

Environment variables:
    AUDIT_TARGET_ENV        Target environment name (default: "local")
    AUDIT_GATEWAY_URL       Gateway base URL (default: "http://localhost:8000")
    AUDIT_DB_URL            PostgreSQL connection URL
    AUDIT_REDPANDA_BROKERS  Redpanda broker address (default: "localhost:9092")
    AUDIT_SKIP_TESTS        Skip pytest execution when "true" (default: "false")
    AUDIT_SKIP_INFRA        Skip stack-dependent checks when "true" (default: "false")
"""
from __future__ import annotations

import os
import socket
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse

import sys as _sys
import os as _os
_sys.path.insert(0, str(__import__('pathlib').Path(__file__).parent))

from checks.api_contracts import APIContractsCheck
from checks.db_schema import DBSchemaCheck
from checks.frontend import FrontendCheck
from checks.health import HealthCheck
from checks.infrastructure import InfrastructureCheck
from checks.messaging import MessagingCheck
from checks.security import SecurityCheck
from checks.test_coverage import TestCoverageCheck
from models import CheckResult, ChecklistReport, Status
from report import ReportBuilder

# ---------------------------------------------------------------------------
# Infrastructure-dependent check dimension names
# ---------------------------------------------------------------------------

# These checks require a live stack; they are marked SKIP when unreachable.
INFRASTRUCTURE_DEPENDENT_CHECKS: list[str] = [
    "Backend Health",
    "DB Schema",
    "API Contracts",
    "Event Messaging",
]

# Static checks always run regardless of stack state.
STATIC_CHECKS: list[str] = [
    "Frontend Switchover",
    "Test Coverage",
    "Security Hardening",
    "Infrastructure",
    "Floor Console",
]


# ---------------------------------------------------------------------------
# Environment variable parsing
# ---------------------------------------------------------------------------

def _parse_bool(value: str) -> bool:
    """Parse a string as a boolean. Returns True only for "true" (case-insensitive)."""
    return value.strip().lower() == "true"


def load_config() -> dict:
    """
    Read and return the audit configuration from environment variables.

    Returns a dict with keys:
        target_env, gateway_url, db_url, redpanda_brokers,
        skip_tests, skip_infra
    """
    return {
        "target_env": os.environ.get("AUDIT_TARGET_ENV", "local"),
        "gateway_url": os.environ.get(
            "AUDIT_GATEWAY_URL", "http://localhost:8000"
        ),
        "db_url": os.environ.get(
            "AUDIT_DB_URL",
            "postgresql://zedral:zedral_dev_password@localhost:5432/zedral",
        ),
        "redpanda_brokers": os.environ.get(
            "AUDIT_REDPANDA_BROKERS", "localhost:9092"
        ),
        "skip_tests": _parse_bool(
            os.environ.get("AUDIT_SKIP_TESTS", "false")
        ),
        "skip_infra": _parse_bool(
            os.environ.get("AUDIT_SKIP_INFRA", "false")
        ),
    }


# ---------------------------------------------------------------------------
# Stack reachability detection
# ---------------------------------------------------------------------------

def is_stack_reachable(gateway_url: str, timeout: float = 3.0) -> bool:
    """
    Attempt a TCP connection to the gateway host/port.

    Returns True if the connection succeeds, False if it is refused or times out.

    Parameters
    ----------
    gateway_url : str
        The gateway base URL (e.g. "http://localhost:8000").
    timeout : float
        Connection timeout in seconds.
    """
    parsed = urlparse(gateway_url)
    host = parsed.hostname or "localhost"
    port = parsed.port or (443 if parsed.scheme == "https" else 80)

    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except (ConnectionRefusedError, OSError, socket.timeout):
        return False


# ---------------------------------------------------------------------------
# Skip result factory
# ---------------------------------------------------------------------------

def make_skip_result(dimension: str) -> CheckResult:
    """
    Create a CheckResult with SKIP status for an infrastructure-dependent check.

    Used when the stack is unreachable.

    Parameters
    ----------
    dimension : str
        The check dimension name (e.g. "Backend Health").
    """
    return CheckResult(
        dimension=dimension,
        status=Status.SKIP,
        details=[
            "Stack must be running for a full audit — "
            "start the Docker Compose stack and re-run the audit"
        ],
        failures=[],
    )


# ---------------------------------------------------------------------------
# Git SHA helper
# ---------------------------------------------------------------------------

def get_git_sha() -> str:
    """
    Return the short Git SHA of the current HEAD commit.

    Falls back to "unknown" if git is not available or the command fails.
    """
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        if result.returncode == 0:
            return result.stdout.strip()
    except (FileNotFoundError, subprocess.TimeoutExpired, OSError):
        pass
    return "unknown"


# ---------------------------------------------------------------------------
# Check orchestration
# ---------------------------------------------------------------------------

def run_checks(config: dict) -> list[CheckResult]:
    """
    Instantiate and run all check modules, collecting CheckResult objects.

    When the stack is unreachable, infrastructure-dependent checks are marked
    SKIP rather than FAIL.

    Parameters
    ----------
    config : dict
        Configuration dict as returned by ``load_config()``.

    Returns
    -------
    list[CheckResult]
        One CheckResult per check dimension, in the canonical order.
    """
    gateway_url = config.get("gateway_url", "http://localhost:8000")
    db_url = config.get("db_url", "postgresql://zedral:zedral_dev_password@localhost:5432/zedral")
    redpanda_brokers = config.get("redpanda_brokers", "localhost:9092")
    skip_tests = config.get("skip_tests", False)
    skip_infra = config.get("skip_infra", False)

    # ── Detect stack reachability ────────────────────────────────────────────
    if skip_infra:
        stack_reachable = False
    else:
        stack_reachable = is_stack_reachable(gateway_url)

    results: list[CheckResult] = []

    # ── 1. Backend Health (infrastructure_dependent) ─────────────────────────
    if not stack_reachable:
        results.append(make_skip_result("Backend Health"))
    else:
        results.append(_run_check(
            HealthCheck(gateway_url=gateway_url),
            "Backend Health",
        ))

    # ── 2. DB Schema (infrastructure_dependent) ──────────────────────────────
    if not stack_reachable:
        results.append(make_skip_result("DB Schema"))
    else:
        results.append(_run_check(
            DBSchemaCheck(db_url=db_url),
            "DB Schema",
        ))

    # ── 3. API Contracts (infrastructure_dependent) ──────────────────────────
    if not stack_reachable:
        results.append(make_skip_result("API Contracts"))
    else:
        results.append(_run_check(
            APIContractsCheck(gateway_url=gateway_url),
            "API Contracts",
        ))

    # ── 4. Frontend Switchover (static) ──────────────────────────────────────
    results.append(_run_check(FrontendCheck(), "Frontend Switchover"))

    # ── 5. Event Messaging (infrastructure_dependent) ────────────────────────
    if not stack_reachable:
        results.append(make_skip_result("Event Messaging"))
    else:
        results.append(_run_check(
            MessagingCheck(redpanda_brokers=redpanda_brokers),
            "Event Messaging",
        ))

    # ── 6. Test Coverage (static, unless AUDIT_SKIP_TESTS=true → SKIP) ───────
    if skip_tests:
        results.append(CheckResult(
            dimension="Test Coverage",
            status=Status.SKIP,
            details=["AUDIT_SKIP_TESTS=true — skipping pytest execution"],
            failures=[],
        ))
    else:
        results.append(_run_check(TestCoverageCheck(), "Test Coverage"))

    # ── 7. Security Hardening (static) ───────────────────────────────────────
    results.append(_run_check(SecurityCheck(), "Security Hardening"))

    # ── 8. Infrastructure (static) ───────────────────────────────────────────
    results.append(_run_check(InfrastructureCheck(), "Infrastructure"))

    # ── 9. Floor Console (static — part of frontend check) ───────────────────
    # The frontend.py check covers both Frontend Switchover (Req 4) and
    # Floor Console (Req 9). We run a dedicated FrontendCheck for Floor Console
    # and relabel the result dimension.
    floor_console_result = _run_check(FrontendCheck(), "Floor Console")
    # Override the dimension name to "Floor Console" for the report
    results.append(CheckResult(
        dimension="Floor Console",
        status=floor_console_result.status,
        details=floor_console_result.details,
        failures=floor_console_result.failures,
    ))

    return results


def _run_check(check_instance, dimension: str) -> CheckResult:
    """
    Run a single check module, catching any unexpected exceptions.

    If the check raises an exception, returns a FAIL result with the error
    message rather than crashing the entire audit runner.

    Parameters
    ----------
    check_instance
        An object with a ``run() -> CheckResult`` method.
    dimension : str
        The dimension name (used in the fallback FAIL result).
    """
    try:
        return check_instance.run()
    except Exception as exc:
        return CheckResult(
            dimension=dimension,
            status=Status.FAIL,
            details=[],
            failures=[
                f"Check raised an unexpected exception: {type(exc).__name__}: {exc}"
            ],
        )


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def main() -> int:
    """
    Run the full deploy readiness audit.

    Returns the exit code: 0 if the gate is open, 1 if blocked.
    """
    config = load_config()

    # ── Build report metadata ────────────────────────────────────────────────
    timestamp = datetime.now(tz=timezone.utc).isoformat()
    git_sha = get_git_sha()
    environment = config["target_env"]

    # ── Run all checks ───────────────────────────────────────────────────────
    results = run_checks(config)

    # ── Build and emit report ────────────────────────────────────────────────
    report = ChecklistReport(
        timestamp=timestamp,
        git_sha=git_sha,
        environment=environment,
        results=results,
    )

    builder = ReportBuilder(report)
    exit_code = builder.run()

    return exit_code


if __name__ == "__main__":
    sys.exit(main())
