"""
checks/health.py — Backend Service Health check.

Responsibilities:
- Poll GET /health on each of the four backend services (ports 8001–8004)
  with up to 5 retries at 10-second intervals.
- Poll GET /health on the Gateway (port 8000).
- Verify the JSON body contains "status": "ok", a non-empty service name
  field, and a non-empty version string.
- Parse infra/docker-compose.full.yml to confirm healthcheck stanzas exist
  for m1-demand and m5a-material (Requirements 1.5, 1.6).
- Mark service as FAIL after 5 failed retries.
- Mark service as SKIP if connection refused (stack not running).
- Returns a CheckResult with dimension "Backend Health".
"""
from __future__ import annotations

import time
from pathlib import Path
from typing import Any, Callable, Optional

try:
    import yaml  # PyYAML
    _YAML_AVAILABLE = True
except ImportError:
    _YAML_AVAILABLE = False

try:
    import requests as _requests_lib
    _REQUESTS_AVAILABLE = True
except ImportError:
    _REQUESTS_AVAILABLE = False

from models import CheckResult, Status

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_BACKEND_SERVICES: list[dict[str, Any]] = [
    {"name": "m2-master",    "port": 8001},
    {"name": "m1-demand",    "port": 8002},
    {"name": "m5a-material", "port": 8003},
    {"name": "m6-dispatch",  "port": 8004},
]

_MAX_RETRIES = 5
_DEFAULT_RETRY_DELAY = 10  # seconds

# Services that MUST have a healthcheck stanza in docker-compose.full.yml
_REQUIRED_HEALTHCHECK_SERVICES = {"m1-demand", "m5a-material"}

_COMPOSE_PATH = Path(__file__).parent.parent.parent / "infra" / "docker-compose.full.yml"


# ---------------------------------------------------------------------------
# Response validation
# ---------------------------------------------------------------------------

def validate_health_response(body: dict[str, Any]) -> tuple[bool, str]:
    """
    Validate a parsed JSON health response body.

    Returns (True, "") on success, or (False, reason) on failure.

    A valid response must contain:
    - "status": "ok"
    - A non-empty service name field (key "service")
    - A non-empty version string field (key "version")
    """
    if not isinstance(body, dict):
        return False, "Response body is not a JSON object"

    # Check status field
    if body.get("status") != "ok":
        return False, f"Expected status 'ok', got {body.get('status')!r}"

    # Check service name field
    service_name = body.get("service", "")
    if not isinstance(service_name, str) or not service_name.strip():
        return False, f"Missing or empty 'service' field: {service_name!r}"

    # Check version field
    version = body.get("version", "")
    if not isinstance(version, str) or not version.strip():
        return False, f"Missing or empty 'version' field: {version!r}"

    return True, ""


# ---------------------------------------------------------------------------
# Docker-compose healthcheck inspection
# ---------------------------------------------------------------------------

def check_compose_healthchecks(
    compose_path: Path = _COMPOSE_PATH,
) -> tuple[list[str], list[str]]:
    """
    Parse docker-compose.full.yml and verify that m1-demand and m5a-material
    have healthcheck stanzas.

    Returns (details, failures) where:
    - details: informational lines
    - failures: failure messages (empty if all checks pass)
    """
    details: list[str] = []
    failures: list[str] = []

    if not compose_path.exists():
        failures.append(
            f"docker-compose.full.yml not found at {compose_path}"
        )
        return details, failures

    if not _YAML_AVAILABLE:
        failures.append(
            "PyYAML not available — cannot parse docker-compose.full.yml"
        )
        return details, failures

    try:
        with compose_path.open("r", encoding="utf-8") as fh:
            compose = yaml.safe_load(fh)
    except Exception as exc:
        failures.append(f"Failed to parse docker-compose.full.yml: {exc}")
        return details, failures

    services = compose.get("services", {}) if isinstance(compose, dict) else {}

    for svc_name in sorted(_REQUIRED_HEALTHCHECK_SERVICES):
        svc_def = services.get(svc_name, {})
        if not isinstance(svc_def, dict):
            failures.append(
                f"{svc_name}: service definition not found in docker-compose.full.yml"
            )
            continue

        if "healthcheck" in svc_def:
            details.append(f"{svc_name}: healthcheck stanza present ✓")
        else:
            failures.append(
                f"{svc_name}: missing healthcheck stanza in docker-compose.full.yml"
            )

    return details, failures


# ---------------------------------------------------------------------------
# HTTP polling helpers
# ---------------------------------------------------------------------------

def _default_http_get(url: str, timeout: int = 5) -> tuple[int, Any]:
    """
    Perform a GET request and return (status_code, json_body_or_None).

    Raises ConnectionError if the connection is refused or the host is
    unreachable (so callers can distinguish SKIP from FAIL).
    """
    if not _REQUESTS_AVAILABLE:
        # Fall back to urllib
        import urllib.request
        import urllib.error
        import json as _json

        try:
            with urllib.request.urlopen(url, timeout=timeout) as resp:
                body = _json.loads(resp.read().decode("utf-8"))
                return resp.status, body
        except urllib.error.URLError as exc:
            reason = str(exc.reason) if hasattr(exc, "reason") else str(exc)
            if "refused" in reason.lower() or "connect" in reason.lower():
                raise ConnectionError(f"Connection refused: {url}") from exc
            raise ConnectionError(f"URL error: {exc}") from exc

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


def _poll_service(
    name: str,
    url: str,
    max_retries: int = _MAX_RETRIES,
    retry_delay: float = _DEFAULT_RETRY_DELAY,
    http_get: Optional[Callable[[str], tuple[int, Any]]] = None,
) -> tuple[Status, list[str], list[str]]:
    """
    Poll a single service health endpoint with retries.

    Returns (status, details, failures).

    - PASS: HTTP 200 with valid JSON body on any attempt
    - SKIP: Connection refused on the first attempt (stack not running)
    - FAIL: All retries exhausted without a successful response
    """
    if http_get is None:
        http_get = _default_http_get

    details: list[str] = []
    failures: list[str] = []
    connection_refused_count = 0

    for attempt in range(1, max_retries + 1):
        try:
            status_code, body = http_get(url)
        except ConnectionError as exc:
            connection_refused_count += 1
            details.append(
                f"{name} attempt {attempt}/{max_retries}: connection refused — {exc}"
            )
            # If the very first attempt is refused, mark as SKIP immediately
            if attempt == 1:
                return (
                    Status.SKIP,
                    details,
                    [f"{name}: connection refused — stack may not be running"],
                )
            # Subsequent refusals still count toward retry exhaustion
            if attempt < max_retries:
                time.sleep(retry_delay)
            continue

        if status_code == 200:
            if body is not None:
                valid, reason = validate_health_response(body)
                if valid:
                    details.append(
                        f"{name} attempt {attempt}/{max_retries}: HTTP 200 ✓"
                    )
                    return Status.PASS, details, []
                else:
                    failures.append(
                        f"{name} attempt {attempt}/{max_retries}: "
                        f"HTTP 200 but invalid body — {reason}"
                    )
            else:
                failures.append(
                    f"{name} attempt {attempt}/{max_retries}: "
                    f"HTTP 200 but body is not valid JSON"
                )
        else:
            failures.append(
                f"{name} attempt {attempt}/{max_retries}: HTTP {status_code}"
            )

        if attempt < max_retries:
            time.sleep(retry_delay)

    # All retries exhausted
    return (
        Status.FAIL,
        details,
        failures + [f"{name}: FAIL after {max_retries} retries"],
    )


# ---------------------------------------------------------------------------
# HealthCheck class
# ---------------------------------------------------------------------------

class HealthCheck:
    """
    Checks backend service health for all four services and the Gateway.

    Parameters
    ----------
    gateway_url : str
        Base URL of the Gateway (default: http://localhost:8000).
    retry_delay : float
        Seconds to wait between retries (default: 10, overridable for testing).
    http_get : callable, optional
        Injected HTTP GET function for testing. Signature:
        ``(url: str) -> (status_code: int, body: Any)``
        Raises ``ConnectionError`` on connection failure.
    compose_path : Path, optional
        Path to docker-compose.full.yml (default: infra/docker-compose.full.yml).
    """

    def __init__(
        self,
        gateway_url: str = "http://localhost:8000",
        retry_delay: float = _DEFAULT_RETRY_DELAY,
        http_get: Optional[Callable[[str], tuple[int, Any]]] = None,
        compose_path: Optional[Path] = None,
    ) -> None:
        self._gateway_url = gateway_url.rstrip("/")
        self._retry_delay = retry_delay
        self._http_get = http_get  # None → use default
        self._compose_path = compose_path or _COMPOSE_PATH

    def run(self) -> CheckResult:
        """Execute all health checks and return a CheckResult."""
        all_details: list[str] = []
        all_failures: list[str] = []
        any_fail = False
        any_skip = False

        # ── Backend services (ports 8001–8004) ──────────────────────────────
        for svc in _BACKEND_SERVICES:
            url = f"http://localhost:{svc['port']}/health"
            status, details, failures = _poll_service(
                name=svc["name"],
                url=url,
                max_retries=_MAX_RETRIES,
                retry_delay=self._retry_delay,
                http_get=self._http_get,
            )
            all_details.extend(details)
            all_failures.extend(failures)
            if status == Status.FAIL:
                any_fail = True
            elif status == Status.SKIP:
                any_skip = True

        # ── Gateway (port 8000) ──────────────────────────────────────────────
        gateway_health_url = f"{self._gateway_url}/health"
        gw_status, gw_details, gw_failures = _poll_service(
            name="nginx-gateway",
            url=gateway_health_url,
            max_retries=_MAX_RETRIES,
            retry_delay=self._retry_delay,
            http_get=self._http_get,
        )
        all_details.extend(gw_details)
        all_failures.extend(gw_failures)
        if gw_status == Status.FAIL:
            any_fail = True
        elif gw_status == Status.SKIP:
            any_skip = True

        # ── docker-compose.full.yml healthcheck stanzas ──────────────────────
        compose_details, compose_failures = check_compose_healthchecks(
            self._compose_path
        )
        all_details.extend(compose_details)
        all_failures.extend(compose_failures)
        if compose_failures:
            any_fail = True

        # ── Determine overall status ─────────────────────────────────────────
        if any_fail:
            overall = Status.FAIL
        elif any_skip:
            overall = Status.SKIP
        else:
            overall = Status.PASS

        return CheckResult(
            dimension="Backend Health",
            status=overall,
            details=all_details,
            failures=all_failures,
        )
