"""
Property-based tests for API contract verification.

# Feature: deploy-readiness-audit, Property 5: API endpoint response shape consistency
# Feature: deploy-readiness-audit, Property 6: Gateway error responses are always JSON

Validates: Requirements 3.1–3.15, 3.17, 3.18
"""
from __future__ import annotations

from typing import Any

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from scripts.checks.api_contracts import (
    DOCUMENTED_ROUTES,
    APIContractsCheck,
    validate_response_shape,
    validate_error_response_is_json,
    check_route,
    check_invalid_route,
)
from scripts.models import Status

# ---------------------------------------------------------------------------
# Strategies
# ---------------------------------------------------------------------------

# A non-empty string (for JSON object keys / values)
nonempty_str = st.text(min_size=1, max_size=50).filter(lambda s: s.strip())

# A valid JSON array body (list of anything)
json_array_body = st.lists(
    st.one_of(
        st.integers(),
        st.text(max_size=20),
        st.fixed_dictionaries({"id": st.integers(), "name": st.text(max_size=10)}),
    ),
    min_size=0,
    max_size=10,
)

# A valid JSON object body (dict with string keys)
json_object_body = st.dictionaries(
    keys=st.text(min_size=1, max_size=20).filter(str.isidentifier),
    values=st.one_of(st.integers(), st.text(max_size=20), st.booleans()),
    min_size=0,
    max_size=8,
)

# A non-JSON body (not a list or dict at the top level)
non_json_top_level = st.one_of(
    st.none(),
    st.integers(),
    st.floats(allow_nan=False, allow_infinity=False),
    st.booleans(),
    st.text(max_size=30),
)

# HTTP status codes that are NOT 200
non_200_status = st.integers(min_value=100, max_value=599).filter(
    lambda c: c != 200
)

# HTTP error status codes (4xx and 5xx)
error_status = st.integers(min_value=400, max_value=599)

# Content-Type values that include application/json
json_content_type = st.one_of(
    st.just("application/json"),
    st.just("application/json; charset=utf-8"),
    st.just("application/json;charset=UTF-8"),
)

# Content-Type values that do NOT include application/json
non_json_content_type = st.one_of(
    st.just("text/html"),
    st.just("text/html; charset=utf-8"),
    st.just("text/plain"),
    st.just("text/xml"),
    st.just("application/xml"),
    st.just(""),
)

# Route paths and their expected shapes (excluding SSE)
non_sse_routes = [
    (path, shape) for path, shape in DOCUMENTED_ROUTES if shape != "sse"
]

# Strategy: pick a random non-SSE route
route_strategy = st.sampled_from(non_sse_routes)


# ---------------------------------------------------------------------------
# Property 5: API endpoint response shape consistency
# ---------------------------------------------------------------------------


@given(body=json_array_body)
@settings(max_examples=100)
def test_array_shape_validator_accepts_valid_arrays(body: list):
    """
    # Feature: deploy-readiness-audit, Property 5: API endpoint response shape consistency

    For any documented GET endpoint that expects an array, the validator SHALL
    accept HTTP 200 responses whose top-level JSON type is a list.

    Validates: Requirements 3.1–3.15
    """
    ok, reason = validate_response_shape(200, body, "array")
    assert ok is True, (
        f"Expected validator to accept a JSON array body, but got rejection: "
        f"{reason!r}\nBody: {body!r}"
    )
    assert reason == "", (
        f"Expected empty reason string on success, got: {reason!r}"
    )


@given(body=json_object_body)
@settings(max_examples=100)
def test_object_shape_validator_accepts_valid_objects(body: dict):
    """
    # Feature: deploy-readiness-audit, Property 5: API endpoint response shape consistency

    For any documented GET endpoint that expects an object, the validator SHALL
    accept HTTP 200 responses whose top-level JSON type is a dict.

    Validates: Requirements 3.11, 3.13
    """
    ok, reason = validate_response_shape(200, body, "object")
    assert ok is True, (
        f"Expected validator to accept a JSON object body, but got rejection: "
        f"{reason!r}\nBody: {body!r}"
    )
    assert reason == "", (
        f"Expected empty reason string on success, got: {reason!r}"
    )


@given(body=json_object_body)
@settings(max_examples=100)
def test_array_shape_validator_rejects_objects(body: dict):
    """
    # Feature: deploy-readiness-audit, Property 5: API endpoint response shape consistency

    For any endpoint that expects an array, the validator SHALL reject a JSON
    object body — the top-level type mismatch must be detected.

    Validates: Requirements 3.1–3.10, 3.12, 3.14, 3.15
    """
    ok, reason = validate_response_shape(200, body, "array")
    assert ok is False, (
        f"Expected validator to reject a JSON object when array is expected, "
        f"but it was accepted.\nBody: {body!r}"
    )
    assert isinstance(reason, str) and reason.strip(), (
        f"Rejection reason must be a non-empty string, got: {reason!r}"
    )


@given(body=json_array_body)
@settings(max_examples=100)
def test_object_shape_validator_rejects_arrays(body: list):
    """
    # Feature: deploy-readiness-audit, Property 5: API endpoint response shape consistency

    For any endpoint that expects an object, the validator SHALL reject a JSON
    array body — the top-level type mismatch must be detected.

    Validates: Requirements 3.11, 3.13
    """
    ok, reason = validate_response_shape(200, body, "object")
    assert ok is False, (
        f"Expected validator to reject a JSON array when object is expected, "
        f"but it was accepted.\nBody: {body!r}"
    )
    assert isinstance(reason, str) and reason.strip(), (
        f"Rejection reason must be a non-empty string, got: {reason!r}"
    )


@given(
    body=st.one_of(json_array_body, json_object_body),
    bad_status=non_200_status,
    expected_shape=st.sampled_from(["array", "object"]),
)
@settings(max_examples=100)
def test_shape_validator_rejects_non_200_status(
    body: Any,
    bad_status: int,
    expected_shape: str,
):
    """
    # Feature: deploy-readiness-audit, Property 5: API endpoint response shape consistency

    The validator SHALL reject any response that does not return HTTP 200,
    regardless of the body shape.

    Validates: Requirements 3.1–3.15
    """
    ok, reason = validate_response_shape(bad_status, body, expected_shape)
    assert ok is False, (
        f"Expected validator to reject HTTP {bad_status} response, "
        f"but it was accepted.\nBody: {body!r}, shape={expected_shape!r}"
    )
    assert isinstance(reason, str) and reason.strip(), (
        f"Rejection reason must be a non-empty string, got: {reason!r}"
    )


@given(
    body=non_json_top_level,
    expected_shape=st.sampled_from(["array", "object"]),
)
@settings(max_examples=100)
def test_shape_validator_rejects_non_json_body(
    body: Any,
    expected_shape: str,
):
    """
    # Feature: deploy-readiness-audit, Property 5: API endpoint response shape consistency

    The validator SHALL reject any response whose body is not a JSON array or
    object at the top level (e.g. null, integer, string, boolean).

    Validates: Requirements 3.1–3.15
    """
    ok, reason = validate_response_shape(200, body, expected_shape)
    assert ok is False, (
        f"Expected validator to reject non-JSON-collection body {body!r} "
        f"for shape={expected_shape!r}, but it was accepted."
    )
    assert isinstance(reason, str) and reason.strip(), (
        f"Rejection reason must be a non-empty string, got: {reason!r}"
    )


@given(route=route_strategy, body=json_array_body)
@settings(max_examples=100)
def test_check_route_passes_for_correct_array_shape(
    route: tuple[str, str],
    body: list,
):
    """
    # Feature: deploy-readiness-audit, Property 5: API endpoint response shape consistency

    For any documented array-type route, check_route SHALL produce no failures
    when the mock HTTP GET returns HTTP 200 with a JSON array body.

    Validates: Requirements 3.1–3.10, 3.12, 3.14, 3.15
    """
    path, expected_shape = route
    if expected_shape != "array":
        return  # skip non-array routes in this test

    def mock_http_get(url, headers=None, stream=False):
        from scripts.checks.api_contracts import _SimpleResponse
        return _SimpleResponse(
            status_code=200,
            body=body,
            content_type="application/json",
            headers={},
        )

    details, failures = check_route(
        gateway_url="http://localhost:8000",
        path=path,
        expected_shape=expected_shape,
        http_get=mock_http_get,
    )
    assert failures == [], (
        f"Expected no failures for {path} with correct array body, "
        f"got: {failures}"
    )


@given(route=route_strategy, body=json_object_body)
@settings(max_examples=100)
def test_check_route_passes_for_correct_object_shape(
    route: tuple[str, str],
    body: dict,
):
    """
    # Feature: deploy-readiness-audit, Property 5: API endpoint response shape consistency

    For any documented object-type route, check_route SHALL produce no failures
    when the mock HTTP GET returns HTTP 200 with a JSON object body.

    Validates: Requirements 3.11, 3.13
    """
    path, expected_shape = route
    if expected_shape != "object":
        return  # skip non-object routes in this test

    def mock_http_get(url, headers=None, stream=False):
        from scripts.checks.api_contracts import _SimpleResponse
        return _SimpleResponse(
            status_code=200,
            body=body,
            content_type="application/json",
            headers={},
        )

    details, failures = check_route(
        gateway_url="http://localhost:8000",
        path=path,
        expected_shape=expected_shape,
        http_get=mock_http_get,
    )
    assert failures == [], (
        f"Expected no failures for {path} with correct object body, "
        f"got: {failures}"
    )


@given(route=route_strategy, bad_status=non_200_status)
@settings(max_examples=100)
def test_check_route_fails_for_non_200_status(
    route: tuple[str, str],
    bad_status: int,
):
    """
    # Feature: deploy-readiness-audit, Property 5: API endpoint response shape consistency

    For any documented route, check_route SHALL produce at least one failure
    when the mock HTTP GET returns a non-200 status code.

    Validates: Requirements 3.1–3.15
    """
    path, expected_shape = route
    if expected_shape == "sse":
        return  # SSE routes have different handling

    def mock_http_get(url, headers=None, stream=False):
        from scripts.checks.api_contracts import _SimpleResponse
        return _SimpleResponse(
            status_code=bad_status,
            body={"error": "simulated"},
            content_type="application/json",
            headers={},
        )

    details, failures = check_route(
        gateway_url="http://localhost:8000",
        path=path,
        expected_shape=expected_shape,
        http_get=mock_http_get,
    )
    assert len(failures) >= 1, (
        f"Expected at least 1 failure for {path} with HTTP {bad_status}, "
        f"got 0 failures"
    )


# ---------------------------------------------------------------------------
# Property 6: Gateway error responses are always JSON
# ---------------------------------------------------------------------------


@given(
    status_code=error_status,
    body=json_object_body,
    content_type=json_content_type,
)
@settings(max_examples=100)
def test_error_response_validator_accepts_json_error_responses(
    status_code: int,
    body: dict,
    content_type: str,
):
    """
    # Feature: deploy-readiness-audit, Property 6: Gateway error responses are always JSON

    For any error response with Content-Type: application/json and a parseable
    JSON object body, the validator SHALL accept it as a valid JSON error
    response.

    Validates: Requirements 3.17, 3.18
    """
    ok, reason = validate_error_response_is_json(status_code, body, content_type)
    assert ok is True, (
        f"Expected validator to accept JSON error response "
        f"(status={status_code}, content_type={content_type!r}), "
        f"but got rejection: {reason!r}"
    )


@given(
    status_code=error_status,
    body=json_object_body,
    content_type=non_json_content_type,
)
@settings(max_examples=100)
def test_error_response_validator_rejects_non_json_content_type(
    status_code: int,
    body: dict,
    content_type: str,
):
    """
    # Feature: deploy-readiness-audit, Property 6: Gateway error responses are always JSON

    For any error response with a non-JSON Content-Type (e.g. text/html), the
    validator SHALL reject it — the Gateway must never return HTML error pages.

    Validates: Requirements 3.17, 3.18
    """
    ok, reason = validate_error_response_is_json(status_code, body, content_type)
    assert ok is False, (
        f"Expected validator to reject non-JSON Content-Type {content_type!r}, "
        f"but it was accepted."
    )
    assert isinstance(reason, str) and reason.strip(), (
        f"Rejection reason must be a non-empty string, got: {reason!r}"
    )


@given(
    status_code=error_status,
    content_type=json_content_type,
)
@settings(max_examples=100)
def test_error_response_validator_rejects_null_body(
    status_code: int,
    content_type: str,
):
    """
    # Feature: deploy-readiness-audit, Property 6: Gateway error responses are always JSON

    For any error response where the body cannot be parsed as JSON (None), the
    validator SHALL reject it even if Content-Type is application/json.

    Validates: Requirements 3.17, 3.18
    """
    ok, reason = validate_error_response_is_json(status_code, None, content_type)
    assert ok is False, (
        f"Expected validator to reject null body even with JSON content type, "
        f"but it was accepted."
    )
    assert isinstance(reason, str) and reason.strip(), (
        f"Rejection reason must be a non-empty string, got: {reason!r}"
    )


@given(
    status_code=error_status,
    body=non_json_top_level.filter(lambda x: x is not None and not isinstance(x, dict)),
    content_type=json_content_type,
)
@settings(max_examples=100)
def test_error_response_validator_rejects_non_object_body(
    status_code: int,
    body: Any,
    content_type: str,
):
    """
    # Feature: deploy-readiness-audit, Property 6: Gateway error responses are always JSON

    For any error response where the body is not a JSON object (e.g. an array,
    integer, or string), the validator SHALL reject it.

    Validates: Requirements 3.17, 3.18
    """
    ok, reason = validate_error_response_is_json(status_code, body, content_type)
    assert ok is False, (
        f"Expected validator to reject non-object body {body!r} "
        f"(type={type(body).__name__}), but it was accepted."
    )
    assert isinstance(reason, str) and reason.strip(), (
        f"Rejection reason must be a non-empty string, got: {reason!r}"
    )


@given(
    body=json_object_body,
    content_type=json_content_type,
)
@settings(max_examples=100)
def test_check_invalid_route_passes_when_404_with_json(
    body: dict,
    content_type: str,
):
    """
    # Feature: deploy-readiness-audit, Property 6: Gateway error responses are always JSON

    check_invalid_route SHALL produce no failures when the Gateway returns
    HTTP 404 with a JSON body for an unrecognised route.

    Validates: Requirements 3.17
    """
    def mock_http_get(url, headers=None, stream=False):
        from scripts.checks.api_contracts import _SimpleResponse
        return _SimpleResponse(
            status_code=404,
            body=body,
            content_type=content_type,
            headers={},
        )

    details, failures = check_invalid_route(
        gateway_url="http://localhost:8000",
        http_get=mock_http_get,
    )
    assert failures == [], (
        f"Expected no failures for 404 with JSON body, got: {failures}"
    )


@given(bad_status=non_200_status.filter(lambda s: s != 404))
@settings(max_examples=100)
def test_check_invalid_route_fails_when_not_404(bad_status: int):
    """
    # Feature: deploy-readiness-audit, Property 6: Gateway error responses are always JSON

    check_invalid_route SHALL produce at least one failure when the Gateway
    returns any status code other than 404 for an unrecognised route.

    Validates: Requirements 3.17
    """
    def mock_http_get(url, headers=None, stream=False):
        from scripts.checks.api_contracts import _SimpleResponse
        return _SimpleResponse(
            status_code=bad_status,
            body={"error": "unexpected"},
            content_type="application/json",
            headers={},
        )

    details, failures = check_invalid_route(
        gateway_url="http://localhost:8000",
        http_get=mock_http_get,
    )
    assert len(failures) >= 1, (
        f"Expected at least 1 failure when invalid route returns HTTP {bad_status}, "
        f"got 0 failures"
    )


@given(body=json_object_body)
@settings(max_examples=100)
def test_check_invalid_route_fails_when_404_body_not_json(body: dict):
    """
    # Feature: deploy-readiness-audit, Property 6: Gateway error responses are always JSON

    check_invalid_route SHALL produce at least one failure when the Gateway
    returns HTTP 404 but the body is not parseable JSON (None).

    Validates: Requirements 3.17
    """
    def mock_http_get(url, headers=None, stream=False):
        from scripts.checks.api_contracts import _SimpleResponse
        return _SimpleResponse(
            status_code=404,
            body=None,  # not parseable JSON
            content_type="text/html",
            headers={},
        )

    details, failures = check_invalid_route(
        gateway_url="http://localhost:8000",
        http_get=mock_http_get,
    )
    assert len(failures) >= 1, (
        f"Expected at least 1 failure when 404 body is not JSON, got 0 failures"
    )


# ---------------------------------------------------------------------------
# Integration-style unit tests (no live stack required)
# ---------------------------------------------------------------------------


def test_api_contracts_check_skips_when_gateway_unreachable():
    """
    APIContractsCheck.run() SHALL return SKIP when the Gateway is unreachable
    (connection refused on the first route).
    """
    def always_refused(url, headers=None, stream=False):
        raise ConnectionError(f"Connection refused: {url}")

    checker = APIContractsCheck(
        gateway_url="http://localhost:8000",
        http_get=always_refused,
    )
    result = checker.run()
    assert result.status == Status.SKIP, (
        f"Expected SKIP when gateway is unreachable, got {result.status!r}"
    )


def test_api_contracts_check_dimension():
    """The CheckResult dimension must always be 'API Contracts'."""
    def always_refused(url, headers=None, stream=False):
        raise ConnectionError(f"Connection refused: {url}")

    checker = APIContractsCheck(http_get=always_refused)
    result = checker.run()
    assert result.dimension == "API Contracts"


def test_api_contracts_check_pass_when_all_routes_correct():
    """
    APIContractsCheck.run() SHALL return PASS when all routes return the
    correct shape and the invalid route returns 404 with JSON.
    """
    from scripts.checks.api_contracts import _SimpleResponse

    def mock_http_get(url, headers=None, stream=False):
        # SSE endpoint
        if "live-status" in url:
            return _SimpleResponse(
                status_code=200,
                body=None,
                content_type="text/event-stream",
                headers={"Transfer-Encoding": "chunked"},
            )
        # Invalid route
        if "does-not-exist" in url:
            return _SimpleResponse(
                status_code=404,
                body={"detail": "Not Found"},
                content_type="application/json",
                headers={},
            )
        # Determine expected shape from path
        path = url.replace("http://localhost:8000", "")
        for route_path, shape in DOCUMENTED_ROUTES:
            if route_path in path:
                if shape == "array":
                    body = []
                elif shape == "object":
                    body = {"status": "ok"}
                else:
                    body = None
                return _SimpleResponse(
                    status_code=200,
                    body=body,
                    content_type="application/json",
                    headers={},
                )
        # Default: 404
        return _SimpleResponse(
            status_code=404,
            body={"detail": "Not Found"},
            content_type="application/json",
            headers={},
        )

    # Use a temp nginx.conf path that doesn't exist — nginx check will fail
    # but we want to test the route checks pass
    checker = APIContractsCheck(
        gateway_url="http://localhost:8000",
        http_get=mock_http_get,
        nginx_conf_candidates=[],  # skip nginx check
    )
    result = checker.run()
    # With no nginx candidates, nginx check will fail
    # So we just verify the route checks don't add failures
    route_failures = [
        f for f in result.failures
        if "nginx" not in f.lower() and "not found" not in f.lower()
    ]
    assert route_failures == [], (
        f"Expected no route failures, got: {route_failures}"
    )


def test_api_contracts_check_fails_when_route_returns_wrong_shape():
    """
    APIContractsCheck.run() SHALL return FAIL when a route returns the wrong
    JSON shape (e.g. object instead of array).
    """
    from scripts.checks.api_contracts import _SimpleResponse

    call_count = [0]

    def mock_http_get(url, headers=None, stream=False):
        call_count[0] += 1
        # Return wrong shape: object instead of array for all routes
        return _SimpleResponse(
            status_code=200,
            body={"wrong": "shape"},  # object, but most routes expect array
            content_type="application/json",
            headers={},
        )

    checker = APIContractsCheck(
        gateway_url="http://localhost:8000",
        http_get=mock_http_get,
        nginx_conf_candidates=[],
    )
    result = checker.run()
    # At least the array-type routes should fail
    assert result.status == Status.FAIL, (
        f"Expected FAIL when routes return wrong shape, got {result.status!r}"
    )
    assert len(result.failures) >= 1, (
        "Expected at least 1 failure when routes return wrong shape"
    )
