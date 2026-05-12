"""
checks/messaging.py — Event Messaging Readiness check.

Responsibilities:
- Use Redpanda Admin API (HTTP GET to http://<broker_host>:9644/v1/topics)
  or `rpk topic list` via subprocess to verify all required topics exist.
- Verify the four critical topics have at least 3 partitions each:
    floor.dispatch.issued
    demand.priority.recalculated
    material.coil.shortage_detected
    floor.shift.handover_submitted
- Inspect infra/redpanda/bootstrap.sh (or infra/bootstrap.sh) for the
  --if-not-exists flag to verify idempotent bootstrap.
- Check service container logs for consumer startup confirmation messages
  via `docker logs` subprocess.
- Returns a CheckResult with dimension "Event Messaging".
"""
from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path
from typing import Any, Callable, Optional

try:
    import requests as _requests_lib
    _REQUESTS_AVAILABLE = True
except ImportError:
    _REQUESTS_AVAILABLE = False

from models import CheckResult, Status

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Critical topics that must exist and have >= 3 partitions each
CRITICAL_TOPICS: list[str] = [
    "floor.dispatch.issued",
    "demand.priority.recalculated",
    "material.coil.shortage_detected",
    "floor.shift.handover_submitted",
]

# Minimum required partition count for critical topics
MIN_PARTITIONS = 3

# Redpanda Admin API port
_ADMIN_API_PORT = 9644

# Bootstrap script candidates (checked in order)
_BOOTSTRAP_CANDIDATES: list[Path] = [
    Path(__file__).parent.parent.parent / "infra" / "redpanda" / "bootstrap.sh",
    Path(__file__).parent.parent.parent / "infra" / "bootstrap.sh",
]

# Consumer startup confirmation patterns per service container
_CONSUMER_SERVICES: list[dict[str, Any]] = [
    {
        "container": "m1-demand",
        "pattern": "run_shortage_consumer",
        "description": "m1-demand shortage consumer",
    },
    {
        "container": "m5a-material",
        "pattern": "run_erp_consumers",
        "description": "m5a-material ERP consumers",
    },
]

# Flag that must appear in bootstrap.sh for idempotent topic creation
_IDEMPOTENT_FLAG = "--if-not-exists"


# ---------------------------------------------------------------------------
# Topic partition validation
# ---------------------------------------------------------------------------

def validate_topic_partitions(
    topic: str,
    partition_count: int,
    min_partitions: int = MIN_PARTITIONS,
) -> tuple[bool, str]:
    """
    Validate that a topic has at least the required number of partitions.

    Returns (True, "") on success, or (False, reason) on failure.
    """
    if partition_count >= min_partitions:
        return True, ""
    return (
        False,
        f"Topic {topic!r} has {partition_count} partition(s), "
        f"expected >= {min_partitions}",
    )


# ---------------------------------------------------------------------------
# Bootstrap script inspection
# ---------------------------------------------------------------------------

def check_bootstrap_idempotence(
    bootstrap_candidates: list[Path] = _BOOTSTRAP_CANDIDATES,
) -> tuple[list[str], list[str]]:
    """
    Inspect the bootstrap.sh script for the --if-not-exists flag.

    Returns (details, failures).
    """
    details: list[str] = []
    failures: list[str] = []

    bootstrap_path: Optional[Path] = None
    for candidate in bootstrap_candidates:
        if candidate.exists():
            bootstrap_path = candidate
            break

    if bootstrap_path is None:
        failures.append(
            "bootstrap.sh not found at any of: "
            + ", ".join(str(p) for p in bootstrap_candidates)
        )
        return details, failures

    try:
        content = bootstrap_path.read_text(encoding="utf-8")
    except Exception as exc:
        failures.append(f"Could not read bootstrap.sh: {exc}")
        return details, failures

    if _IDEMPOTENT_FLAG in content:
        details.append(
            f"bootstrap.sh: {_IDEMPOTENT_FLAG!r} flag present — "
            "idempotent topic creation confirmed ✓"
        )
    else:
        failures.append(
            f"bootstrap.sh: {_IDEMPOTENT_FLAG!r} flag not found — "
            "topic creation may not be idempotent (duplicate topics possible)"
        )

    return details, failures


# ---------------------------------------------------------------------------
# Redpanda Admin API helpers
# ---------------------------------------------------------------------------

def _default_http_get(url: str, timeout: int = 5) -> tuple[int, Any]:
    """
    Perform a GET request and return (status_code, json_body_or_None).

    Raises ConnectionError if the connection is refused or the host is
    unreachable.
    """
    if _REQUESTS_AVAILABLE:
        try:
            resp = _requests_lib.get(url, timeout=timeout)
            try:
                body = resp.json()
            except Exception:
                body = None
            return resp.status_code, body
        except _requests_lib.exceptions.ConnectionError as exc:
            raise ConnectionError(f"Connection refused: {url}") from exc
        except _requests_lib.exceptions.Timeout as exc:
            raise ConnectionError(f"Timeout connecting to: {url}") from exc

    # urllib fallback
    import urllib.request
    import urllib.error

    try:
        with urllib.request.urlopen(url, timeout=timeout) as resp:
            raw = resp.read()
            try:
                body = json.loads(raw.decode("utf-8"))
            except Exception:
                body = None
            return resp.status, body
    except urllib.error.URLError as exc:
        reason = str(exc.reason) if hasattr(exc, "reason") else str(exc)
        if "refused" in reason.lower() or "connect" in reason.lower():
            raise ConnectionError(f"Connection refused: {url}") from exc
        raise ConnectionError(f"URL error: {exc}") from exc


def _parse_admin_api_topics(
    body: Any,
) -> Optional[dict[str, int]]:
    """
    Parse the Redpanda Admin API /v1/topics response.

    The API returns a list of topic objects. Each object has at minimum:
      {"name": "topic-name", "partitions": [...]}

    Returns a dict mapping topic_name → partition_count, or None if the
    response cannot be parsed.
    """
    if not isinstance(body, list):
        return None

    result: dict[str, int] = {}
    for item in body:
        if not isinstance(item, dict):
            continue
        name = item.get("name")
        if not isinstance(name, str):
            continue
        # partitions may be a list of partition objects or an integer
        partitions = item.get("partitions", [])
        if isinstance(partitions, list):
            count = len(partitions)
        elif isinstance(partitions, int):
            count = partitions
        else:
            count = 0
        result[name] = count

    return result


def fetch_topics_via_admin_api(
    broker_host: str,
    admin_port: int = _ADMIN_API_PORT,
    http_get: Optional[Callable[[str], tuple[int, Any]]] = None,
) -> Optional[dict[str, int]]:
    """
    Fetch topic list from the Redpanda Admin API.

    Returns a dict mapping topic_name → partition_count, or None if the
    API is unreachable or returns an unexpected response.

    Raises ConnectionError if the broker is unreachable.
    """
    if http_get is None:
        http_get = _default_http_get

    url = f"http://{broker_host}:{admin_port}/v1/topics"
    status_code, body = http_get(url)

    if status_code != 200:
        return None

    return _parse_admin_api_topics(body)


# ---------------------------------------------------------------------------
# rpk topic list fallback
# ---------------------------------------------------------------------------

def _default_run_subprocess(
    cmd: list[str],
    timeout: int = 30,
) -> tuple[int, str, str]:
    """
    Run a subprocess command and return (returncode, stdout, stderr).
    """
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        return result.returncode, result.stdout, result.stderr
    except FileNotFoundError:
        return -1, "", f"Command not found: {cmd[0]!r}"
    except subprocess.TimeoutExpired:
        return -1, "", f"Command timed out after {timeout}s: {' '.join(cmd)}"
    except Exception as exc:
        return -1, "", f"Unexpected error running {' '.join(cmd)}: {exc}"


def fetch_topics_via_rpk(
    broker: str,
    run_subprocess: Optional[
        Callable[[list[str]], tuple[int, str, str]]
    ] = None,
) -> Optional[list[str]]:
    """
    Fetch topic list via `rpk topic list`.

    Returns a list of topic names, or None if rpk is unavailable or fails.
    """
    if run_subprocess is None:
        run_subprocess = _default_run_subprocess

    returncode, stdout, stderr = run_subprocess(
        ["rpk", "topic", "list", "--brokers", broker, "--format", "json"]
    )

    if returncode != 0:
        return None

    try:
        data = json.loads(stdout)
        if isinstance(data, list):
            return [item.get("name", "") for item in data if isinstance(item, dict)]
    except Exception:
        pass

    # Plain text fallback: one topic per line
    topics = [line.strip() for line in stdout.splitlines() if line.strip()]
    return topics if topics else None


# ---------------------------------------------------------------------------
# Topic existence and partition checks
# ---------------------------------------------------------------------------

def check_critical_topics(
    topics: dict[str, int],
    critical_topics: list[str] = CRITICAL_TOPICS,
    min_partitions: int = MIN_PARTITIONS,
) -> tuple[list[str], list[str]]:
    """
    Verify that all critical topics exist and have >= min_partitions partitions.

    Parameters
    ----------
    topics : dict[str, int]
        Mapping of topic_name → partition_count from the broker.
    critical_topics : list[str]
        Topic names that must exist with sufficient partitions.
    min_partitions : int
        Minimum required partition count.

    Returns
    -------
    (details, failures)
    """
    details: list[str] = []
    failures: list[str] = []

    for topic in critical_topics:
        if topic not in topics:
            failures.append(
                f"Critical topic {topic!r} does not exist on the broker"
            )
            continue

        partition_count = topics[topic]
        ok, reason = validate_topic_partitions(topic, partition_count, min_partitions)
        if ok:
            details.append(
                f"Topic {topic!r}: {partition_count} partition(s) >= {min_partitions} ✓"
            )
        else:
            failures.append(reason)

    return details, failures


# ---------------------------------------------------------------------------
# Consumer log checks
# ---------------------------------------------------------------------------

def check_consumer_logs(
    services: list[dict[str, Any]] = _CONSUMER_SERVICES,
    run_subprocess: Optional[
        Callable[[list[str]], tuple[int, str, str]]
    ] = None,
) -> tuple[list[str], list[str]]:
    """
    Check service container logs for consumer startup confirmation messages.

    Uses `docker logs <container_name>` to retrieve recent logs and searches
    for the expected startup pattern.

    Returns (details, failures).
    """
    if run_subprocess is None:
        run_subprocess = _default_run_subprocess

    details: list[str] = []
    failures: list[str] = []

    for svc in services:
        container = svc["container"]
        pattern = svc["pattern"]
        description = svc["description"]

        returncode, stdout, stderr = run_subprocess(
            ["docker", "logs", "--tail", "200", container]
        )

        if returncode == -1:
            # docker not found or other execution error
            failures.append(
                f"{description}: docker command unavailable — {stderr.strip()}"
            )
            continue

        if returncode != 0:
            # Container may not exist or not be running
            err_msg = (stderr.strip() or stdout.strip())[:200]
            failures.append(
                f"{description}: could not retrieve logs for container "
                f"{container!r} — {err_msg}"
            )
            continue

        # Search both stdout and stderr for the pattern
        combined_output = stdout + stderr
        if pattern in combined_output:
            details.append(
                f"{description}: startup confirmation {pattern!r} found in logs ✓"
            )
        else:
            failures.append(
                f"{description}: startup confirmation {pattern!r} not found "
                f"in logs for container {container!r}"
            )

    return details, failures


# ---------------------------------------------------------------------------
# MessagingCheck class
# ---------------------------------------------------------------------------

class MessagingCheck:
    """
    Checks event messaging readiness: topic existence, partition counts,
    idempotent bootstrap, and consumer startup confirmation.

    Parameters
    ----------
    redpanda_brokers : str
        Broker address (default: from env AUDIT_REDPANDA_BROKERS or
        'localhost:9092').
    http_get : callable, optional
        Injected HTTP GET function for testing. Signature:
        ``(url: str) -> (status_code: int, body: Any)``
        Raises ``ConnectionError`` on connection failure.
    run_subprocess : callable, optional
        Injected subprocess runner for testing. Signature:
        ``(cmd: list[str]) -> (returncode: int, stdout: str, stderr: str)``
    bootstrap_candidates : list[Path], optional
        Paths to search for bootstrap.sh (default: standard infra locations).
    """

    def __init__(
        self,
        redpanda_brokers: Optional[str] = None,
        http_get: Optional[Callable[[str], tuple[int, Any]]] = None,
        run_subprocess: Optional[
            Callable[[list[str]], tuple[int, str, str]]
        ] = None,
        bootstrap_candidates: Optional[list[Path]] = None,
    ) -> None:
        self._brokers = (
            redpanda_brokers
            or os.environ.get("AUDIT_REDPANDA_BROKERS", "localhost:9092")
        )
        self._http_get = http_get
        self._run_subprocess = run_subprocess
        self._bootstrap_candidates = bootstrap_candidates or _BOOTSTRAP_CANDIDATES

    @property
    def _broker_host(self) -> str:
        """Extract the hostname from the broker address (strip port)."""
        return self._brokers.split(":")[0]

    def run(self) -> CheckResult:
        """Execute all messaging checks and return a CheckResult."""
        all_details: list[str] = []
        all_failures: list[str] = []

        # ── 1. Bootstrap idempotence (static file check) ─────────────────────
        boot_details, boot_failures = check_bootstrap_idempotence(
            self._bootstrap_candidates
        )
        all_details.extend(boot_details)
        all_failures.extend(boot_failures)

        # ── 2. Fetch topics from Redpanda Admin API ───────────────────────────
        topics: Optional[dict[str, int]] = None
        try:
            topics = fetch_topics_via_admin_api(
                broker_host=self._broker_host,
                http_get=self._http_get,
            )
        except ConnectionError as exc:
            # Broker unreachable — mark as SKIP
            all_details.append(
                f"Redpanda Admin API unreachable at "
                f"{self._broker_host}:{_ADMIN_API_PORT} — {exc}"
            )
            return CheckResult(
                dimension="Event Messaging",
                status=Status.SKIP,
                details=all_details,
                failures=[
                    f"Redpanda broker unreachable — stack may not be running"
                ],
            )

        if topics is None:
            # Admin API returned unexpected response — try rpk fallback
            all_details.append(
                "Redpanda Admin API returned unexpected response; "
                "falling back to rpk topic list"
            )
            rpk_topics = fetch_topics_via_rpk(
                broker=self._brokers,
                run_subprocess=self._run_subprocess,
            )
            if rpk_topics is None:
                all_failures.append(
                    "Could not retrieve topic list via Admin API or rpk — "
                    "verify Redpanda is running and accessible"
                )
            else:
                # rpk gives us names only, no partition counts
                # Build a topics dict with unknown partition counts (0)
                topics = {name: 0 for name in rpk_topics}
                all_details.append(
                    f"Retrieved {len(topics)} topic(s) via rpk topic list "
                    "(partition counts unavailable via rpk fallback)"
                )

        # ── 3. Verify critical topics exist and have sufficient partitions ────
        if topics is not None:
            all_details.append(
                f"Broker reports {len(topics)} topic(s) total"
            )
            crit_details, crit_failures = check_critical_topics(topics)
            all_details.extend(crit_details)
            all_failures.extend(crit_failures)

        # ── 4. Consumer startup log checks ───────────────────────────────────
        log_details, log_failures = check_consumer_logs(
            run_subprocess=self._run_subprocess
        )
        all_details.extend(log_details)
        all_failures.extend(log_failures)

        # ── Determine overall status ─────────────────────────────────────────
        overall = Status.FAIL if all_failures else Status.PASS

        return CheckResult(
            dimension="Event Messaging",
            status=overall,
            details=all_details,
            failures=all_failures,
        )
