"""
conftest.py — shared pytest fixtures for scripts/tests/.

Provides:
- mock_http_get: injectable HTTP GET stub returning configurable responses
- mock_query_fn: injectable DB query stub returning configurable row sets
- mock_subprocess_runner: injectable subprocess stub for docker/pytest/npm calls
- healthy_http_get: pre-configured HTTP GET that returns a valid health response
- unreachable_http_get: pre-configured HTTP GET that raises ConnectionError
- all_tables_query_fn: pre-configured DB query returning all required tables/extensions
"""
from __future__ import annotations

import json
from typing import Any
from unittest.mock import MagicMock

import pytest

from scripts.checks.db_schema import (
    REQUIRED_EXTENSIONS,
    REQUIRED_FK_CONSTRAINTS,
    REQUIRED_TABLES,
    SEED_TABLES,
)


# ---------------------------------------------------------------------------
# Mock stack (HTTP GET)
# ---------------------------------------------------------------------------

def _make_http_get(responses: dict[str, tuple[int, Any]]):
    """
    Return an http_get callable that looks up (status_code, body) by URL.

    If a URL is not in *responses*, raises ConnectionError (stack not running).
    """
    def http_get(url: str) -> tuple[int, Any]:
        if url not in responses:
            raise ConnectionError(f"Connection refused: {url}")
        return responses[url]
    return http_get


@pytest.fixture
def mock_http_get():
    """
    Factory fixture: call it with a dict mapping URL → (status_code, body)
    to get an injectable http_get function.

    Usage::

        def test_something(mock_http_get):
            get = mock_http_get({"http://localhost:8001/health": (200, {...})})
            result = HealthCheck(http_get=get).run()
    """
    return _make_http_get


@pytest.fixture
def healthy_http_get():
    """
    Pre-configured http_get that returns a valid health response for all five
    service health endpoints (ports 8000–8004).
    """
    responses = {}
    for port, name in [
        (8000, "nginx-gateway"),
        (8001, "m2-master"),
        (8002, "m1-demand"),
        (8003, "m5a-material"),
        (8004, "m6-dispatch"),
    ]:
        responses[f"http://localhost:{port}/health"] = (
            200,
            {"status": "ok", "service": name, "version": "1.0.0"},
        )
    return _make_http_get(responses)


@pytest.fixture
def unreachable_http_get():
    """
    Pre-configured http_get that always raises ConnectionError (stack not running).
    """
    def http_get(url: str) -> tuple[int, Any]:
        raise ConnectionError(f"Connection refused: {url}")
    return http_get


# ---------------------------------------------------------------------------
# Mock DB (query_fn)
# ---------------------------------------------------------------------------

def _make_query_fn(table_map: dict[str, list[tuple]]):
    """
    Return a query_fn callable that returns rows from *table_map* keyed by
    a substring of the SQL query.

    Keys recognised:
    - "information_schema.tables" → list of (schema, table_name) tuples
    - "pg_extension"              → list of (extname,) tuples
    - "pg_constraint"             → list of (conname,) tuples
    - "COUNT(*)"                  → list of (count,) tuples (used for seed data)
    """
    def query_fn(sql: str, params: tuple = ()) -> list[tuple]:
        for key, rows in table_map.items():
            if key in sql:
                return rows
        return []
    return query_fn


@pytest.fixture
def mock_query_fn():
    """
    Factory fixture: call it with a dict mapping SQL-substring → row list
    to get an injectable query_fn.

    Usage::

        def test_something(mock_query_fn):
            qfn = mock_query_fn({"information_schema.tables": [("master", "rolls")]})
            result = DBSchemaCheck(query_fn=qfn).run()
    """
    return _make_query_fn


@pytest.fixture
def all_tables_query_fn():
    """
    Pre-configured query_fn that returns all required tables, extensions,
    seed data rows, and FK constraints — simulates a fully initialised DB.
    """
    table_rows = [
        (schema, table)
        for schema, tables in REQUIRED_TABLES.items()
        for table in tables
    ]
    ext_rows = [(ext,) for ext in REQUIRED_EXTENSIONS]
    fk_rows = [(name,) for name in REQUIRED_FK_CONSTRAINTS]
    seed_rows = [(1,)]  # COUNT(*) returns 1 for every seed table

    return _make_query_fn({
        "information_schema.tables": table_rows,
        "pg_extension": ext_rows,
        "pg_constraint": fk_rows,
        "COUNT(*)": seed_rows,
    })


@pytest.fixture
def empty_db_query_fn():
    """
    Pre-configured query_fn that returns empty results for everything —
    simulates a blank (uninitialised) database.
    """
    return _make_query_fn({})


# ---------------------------------------------------------------------------
# Mock subprocess runner
# ---------------------------------------------------------------------------

def _make_subprocess_runner(responses: dict[str, tuple[int, str, str]]):
    """
    Return a subprocess runner callable that looks up (returncode, stdout, stderr)
    by the first element of the args list (the command name) or by a joined
    string of the args.

    Lookup order:
    1. Exact match on " ".join(args)
    2. Match on args[0] (command name)
    3. Default: (0, "", "")
    """
    def run_subprocess(args: list[str]) -> tuple[int, str, str]:
        joined = " ".join(str(a) for a in args)
        if joined in responses:
            return responses[joined]
        cmd = args[0] if args else ""
        if cmd in responses:
            return responses[cmd]
        return 0, "", ""
    return run_subprocess


@pytest.fixture
def mock_subprocess_runner():
    """
    Factory fixture: call it with a dict mapping command string → (rc, stdout, stderr)
    to get an injectable subprocess runner.

    Usage::

        def test_something(mock_subprocess_runner):
            runner = mock_subprocess_runner({"pytest": (0, "5 passed", "")})
            result = TestCoverageCheck(subprocess_runner=runner).run()
    """
    return _make_subprocess_runner


@pytest.fixture
def passing_subprocess_runner():
    """
    Pre-configured subprocess runner where all commands exit 0 with empty output.
    """
    return _make_subprocess_runner({})


@pytest.fixture
def failing_pytest_runner():
    """
    Pre-configured subprocess runner where pytest exits with code 1 (test failures).
    """
    def run_subprocess(args: list[str]) -> tuple[int, str, str]:
        if args and args[0] == "pytest":
            return 1, "", "1 failed"
        return 0, "", ""
    return run_subprocess
