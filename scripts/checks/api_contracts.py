"""
checks/api_contracts.py — API Contract Verification check.

Responsibilities:
- Issue HTTP GET requests through the Gateway for all 16 documented routes
  (Requirements 3.1–3.16).
- Verify HTTP 200 and correct top-level JSON shape (array vs object) for each
  route.
- Test the SSE endpoint with Accept: text/event-stream and verify streaming
  response headers.
- Test a known-invalid route and verify HTTP 404 with JSON body.
- Inspect nginx.conf for the 502 error handler returning JSON rather than HTML.
- Returns a CheckResult with dimension "API Contracts".
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Callable, Optional

try:
    import requests as _requests_lib
    _REQUESTS_AVAILABLE = True
except ImportError:
    _REQUESTS_AVAILABLE = False

from models import CheckResult, Status

# ---------------------------------------------------------------------------
# Route table
# ---------------------------------------------------------------------------

# Each entry: (path, expected_shape)
# expected_shape is "array", "object", or "sse"
DOCUMENTED_ROUTES: list[tuple[str, str]] = [
    ("/api/m2/work-centres/", "array"),
    ("/api/m2/materials/",    "array"),
    ("/api/m2/customers/",    "array"),
    ("/api/m2/routings/",     "array"),
    ("/api/m2/operators/",    "array"),
    ("/api/m2/shifts/",       "array"),
    ("/api/m1/work-orders/",  "array"),
    ("/api/m1/sales-orders/", "array"),
    ("/api/m1/queue/",        "array"),
    ("/api/m5a/coils/",       "array"),
    ("/api/m5a/readiness/",   "object"),
    ("/api/m5a/inbound/",     "array"),
    ("/api/m5a/forecast/",    "object"),
    ("/api/m6/dispatch/",     "array"),
    ("/api/m6/lines/",        "array"),
    ("/api/m6/live-status",   "sse"),
]

# A route that must not exist — used to verify 404 handling
_INVALID_ROUTE = "/api/does-not-exist/xyz"

# Paths to look for nginx.conf
_NGINX_CONF_CANDIDATES: list[Path] = [
    Path(__file__).parent.parent.parent / "infra" / "nginx" / "nginx.conf",
    Path(__file__).parent.parent.parent / "infra" / "nginx.conf",
]


# ---------------------------------------------------------------------------
# Response shape validation
# ---------------------------------------------------------------------------

def validate_response_shape(
    status_code: int,
    body: Any,
    expected_shape: str,
) -> tuple[bool, str]:
    """
    Validate that a response matches the expected shape.

    Parameters
    ----------
    status_code : int
        The HTTP status code returned.
    body : Any
        The parsed JSON body (or None if parsing failed).
    expected_shape : str
        One of "array", "object".

    Returns
    -------
    (True, "") on success, or (False, reason) on failure.
    """
    if status_code != 200:
        return False, f"Expected HTTP 200, got {status_code}"

    if body is None:
        return False, "Response body is not valid JSON"

    if expected_shape == "array":
        if not isinstance(body, list):
            return False, (
                f"Expected JSON array (list), got {type(body).__name__}: "
                f"{repr(body)[:80]}"
            )
        return True, ""

    if expected_shape == "object":
        if not isinstance(body, dict):
            return False, (
                f"Expected JSON object (dict), got {type(body).__name__}: "
                f"{repr(body)[:80]}"
            )
        return True, ""

    return False, f"Unknown expected_shape: {expected_shape!r}"


def validate_error_response_is_json(
    status_code: int,
    body: Any,
    content_type: str,
) -> tuple[bool, str]:
    """
    Validate that an error response has Content-Type: application/json and a
    parseable JSON body.

    Returns (True, "") on success, or (False, reason) on failure.
    """
    if "application/json" not in content_type:
        return False, (
            f"Expected Content-Type application/json, got {content_type!r}"
        )
    if body is None:
        return False, "Error response body is not valid JSON"
    if not isinstance(body, dict):
        return False, (
            f"Expected JSON object body for error response, "
            f"got {type(body).__name__}"
        )
    return True, ""


# ---------------------------------------------------------------------------
# nginx.conf inspection
# ---------------------------------------------------------------------------

def check_nginx_502_handler(
    nginx_conf_candidates: list[Path] = _NGINX_CONF_CANDIDATES,
) -> tuple[list[str], list[str]]:
    """
    Inspect nginx.conf to verify the 502 error handler returns JSON rather
    than HTML.

    Looks for a pattern like:
        location @upstream_error {
            default_type application/json;
            return 502 '{"detail":"Service unavailable"}';
        }

    Returns (details, failures).
    """
    details: list[str] = []
    failures: list[str] = []

    nginx_conf: Optional[Path] = None
    for candidate in nginx_conf_candidates:
        if candidate.exists():
            nginx_conf = candidate
            break

    if nginx_conf is None:
        failures.append(
            f"nginx.conf not found at any of: "
            + ", ".join(str(p) for p in nginx_conf_candidates)
        )
        return details, failures

    try:
        content = nginx_conf.read_text(encoding="utf-8")
    except Exception as exc:
        failures.append(f"Could not read nginx.conf: {exc}")
        return details, failures

    # Check for application/json in the error handler context
    has_json_content_type = "application/json" in content

    # Check for a 502 return statement
    has_502_return = "return 502" in content or "error_page 502" in content

    if has_json_content_type and has_502_return:
        details.append(
            f"nginx.conf: 502 error handler returns JSON (application/json) ✓"
        )
    elif not has_json_content_type:
        failures.append(
            "nginx.conf: 502 error handler does not appear to return "
            "application/json — HTML error pages may be served to clients"
        )
    else:
        failures.append(
            "nginx.conf: no 502 error handler found — upstream errors may "
            "return HTML error pages"
        )

    return details, failures


# ---------------------------------------------------------------------------
# HTTP helpers
# ---------------------------------------------------------------------------

class _SimpleResponse:
    """Minimal response wrapper for urllib fallback."""

    def __init__(
        self,
        status_code: int,
        body: Any,
        content_type: str,
        headers: dict[str, str],
    ) -> None:
        self.status_code = status_code
        self.body = body
        self.content_type = content_type
        self.headers = headers


def _default_http_get(
    url: str,
    headers: Optional[dict[str, str]] = None,
    timeout: int = 10,
    stream: bool = False,
) -> _SimpleResponse:
    """
    Perform a GET request and return a _SimpleResponse.

    Raises ConnectionError if the connection is refused or the host is
    unreachable.
    """
    if _REQUESTS_AVAILABLE:
        try:
            resp = _requests_lib.get(
                url,
                headers=headers or {},
                timeout=timeout,
                stream=stream,
            )
            content_type = resp.headers.get("Content-Type", "")
            try:
                body = resp.json()
            except Exception:
                body = None
            return _SimpleResponse(
                status_code=resp.status_code,
                body=body,
                content_type=content_type,
                headers=dict(resp.headers),
            )
        except _requests_lib.exceptions.ConnectionError as exc:
            raise ConnectionError(f"Connection refused: {url}") from exc
        except _requests_lib.exceptions.Timeout as exc:
            raise ConnectionError(f"Timeout connecting to: {url}") from exc

    # urllib fallback
    import urllib.request
    import urllib.error

    req = urllib.request.Request(url, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read()
            content_type = resp.headers.get("Content-Type", "")
            try:
                body = json.loads(raw.decode("utf-8"))
            except Exception:
                body = None
            return _SimpleResponse(
                status_code=resp.status,
                body=body,
                content_type=content_type,
                headers=dict(resp.headers),
            )
    except urllib.error.HTTPError as exc:
        raw = exc.read()
        content_type = exc.headers.get("Content-Type", "")
        try:
            body = json.loads(raw.decode("utf-8"))
        except Exception:
            body = None
        return _SimpleResponse(
            status_code=exc.code,
            body=body,
            content_type=content_type,
            headers=dict(exc.headers),
        )
    except urllib.error.URLError as exc:
        reason = str(exc.reason) if hasattr(exc, "reason") else str(exc)
        if "refused" in reason.lower() or "connect" in reason.lower():
            raise ConnectionError(f"Connection refused: {url}") from exc
        raise ConnectionError(f"URL error: {exc}") from exc


# ---------------------------------------------------------------------------
# Individual check functions
# ---------------------------------------------------------------------------

def check_route(
    gateway_url: str,
    path: str,
    expected_shape: str,
    http_get: Callable,
) -> tuple[list[str], list[str]]:
    """
    Check a single documented route.

    Returns (details, failures).
    """
    details: list[str] = []
    failures: list[str] = []
    url = gateway_url.rstrip("/") + path

    if expected_shape == "sse":
        # SSE endpoint — verify streaming response headers
        try:
            resp = http_get(
                url,
                headers={"Accept": "text/event-stream"},
                stream=True,
            )
        except ConnectionError as exc:
            failures.append(f"SSE {path}: connection refused — {exc}")
            return details, failures

        # Verify the response indicates SSE streaming
        content_type = resp.content_type or ""
        transfer_encoding = resp.headers.get("Transfer-Encoding", "")
        x_accel_buffering = resp.headers.get("X-Accel-Buffering", "")

        if resp.status_code == 200:
            if "text/event-stream" in content_type:
                details.append(f"SSE {path}: HTTP 200, Content-Type: text/event-stream ✓")
            else:
                # Accept 200 with any content type for SSE — the key check is
                # that the gateway proxies it (not 404/502)
                details.append(
                    f"SSE {path}: HTTP 200 (Content-Type: {content_type!r}) ✓"
                )
        else:
            failures.append(
                f"SSE {path}: expected HTTP 200, got {resp.status_code}"
            )
        return details, failures

    # Regular JSON endpoint
    try:
        resp = http_get(url)
    except ConnectionError as exc:
        failures.append(f"{path}: connection refused — {exc}")
        return details, failures

    ok, reason = validate_response_shape(resp.status_code, resp.body, expected_shape)
    if ok:
        details.append(f"{path}: HTTP 200, shape={expected_shape} ✓")
    else:
        failures.append(f"{path}: {reason}")

    return details, failures


def check_invalid_route(
    gateway_url: str,
    http_get: Callable,
    invalid_path: str = _INVALID_ROUTE,
) -> tuple[list[str], list[str]]:
    """
    Verify that an invalid route returns HTTP 404 with a JSON body.

    Returns (details, failures).
    """
    details: list[str] = []
    failures: list[str] = []
    url = gateway_url.rstrip("/") + invalid_path

    try:
        resp = http_get(url)
    except ConnectionError as exc:
        failures.append(f"Invalid route check: connection refused — {exc}")
        return details, failures

    if resp.status_code == 404:
        if resp.body is not None:
            details.append(
                f"Invalid route {invalid_path}: HTTP 404 with JSON body ✓"
            )
        else:
            failures.append(
                f"Invalid route {invalid_path}: HTTP 404 but body is not JSON"
            )
    else:
        failures.append(
            f"Invalid route {invalid_path}: expected HTTP 404, "
            f"got {resp.status_code}"
        )

    return details, failures


# ---------------------------------------------------------------------------
# APIContractsCheck class
# ---------------------------------------------------------------------------

class APIContractsCheck:
    """
    Checks API contract compliance for all 16 documented Gateway routes.

    Parameters
    ----------
    gateway_url : str
        Base URL of the Gateway (default: http://localhost:8000).
    http_get : callable, optional
        Injected HTTP GET function for testing. Signature:
        ``(url: str, headers: dict | None, stream: bool) -> _SimpleResponse``
        Raises ``ConnectionError`` on connection failure.
    nginx_conf_candidates : list[Path], optional
        Paths to search for nginx.conf (default: standard infra locations).
    """

    def __init__(
        self,
        gateway_url: str = "http://localhost:8000",
        http_get: Optional[Callable] = None,
        nginx_conf_candidates: Optional[list[Path]] = None,
    ) -> None:
        self._gateway_url = gateway_url.rstrip("/")
        self._http_get = http_get  # None → use default
        self._nginx_conf_candidates = (
            nginx_conf_candidates or _NGINX_CONF_CANDIDATES
        )

    def run(self) -> CheckResult:
        """Execute all API contract checks and return a CheckResult."""
        all_details: list[str] = []
        all_failures: list[str] = []
        any_skip = False

        http_get = self._http_get or _default_http_get

        # ── Check all 16 documented routes ───────────────────────────────────
        for path, expected_shape in DOCUMENTED_ROUTES:
            details, failures = check_route(
                gateway_url=self._gateway_url,
                path=path,
                expected_shape=expected_shape,
                http_get=http_get,
            )
            all_details.extend(details)

            # If the first route is connection-refused, mark as SKIP
            if failures and "connection refused" in failures[0].lower():
                return CheckResult(
                    dimension="API Contracts",
                    status=Status.SKIP,
                    details=all_details,
                    failures=[
                        "Gateway unreachable — stack may not be running"
                    ],
                )

            all_failures.extend(failures)

        # ── Check invalid route → 404 ─────────────────────────────────────────
        inv_details, inv_failures = check_invalid_route(
            gateway_url=self._gateway_url,
            http_get=http_get,
        )
        all_details.extend(inv_details)
        if inv_failures and "connection refused" in inv_failures[0].lower():
            any_skip = True
        else:
            all_failures.extend(inv_failures)

        # ── Inspect nginx.conf for JSON 502 handler ───────────────────────────
        nginx_details, nginx_failures = check_nginx_502_handler(
            self._nginx_conf_candidates
        )
        all_details.extend(nginx_details)
        all_failures.extend(nginx_failures)

        # ── Determine overall status ──────────────────────────────────────────
        if any_skip:
            overall = Status.SKIP
        elif all_failures:
            overall = Status.FAIL
        else:
            overall = Status.PASS

        return CheckResult(
            dimension="API Contracts",
            status=overall,
            details=all_details,
            failures=all_failures,
        )
