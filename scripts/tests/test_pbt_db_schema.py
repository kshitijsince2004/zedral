"""
Property-based tests for DB schema completeness check.

# Feature: deploy-readiness-audit, Property 3: DB schema completeness after init
# Feature: deploy-readiness-audit, Property 4: Seed data presence after init

Validates: Requirements 2.1–2.7
"""
from __future__ import annotations

from typing import Any

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from scripts.checks.db_schema import (
    REQUIRED_EXTENSIONS,
    REQUIRED_FK_CONSTRAINTS,
    REQUIRED_TABLES,
    SEED_TABLES,
    DBSchemaCheck,
    check_extensions,
    check_fk_constraints,
    check_seed_data,
    check_tables,
)
from scripts.models import Status

# ---------------------------------------------------------------------------
# Helpers — build mock query functions
# ---------------------------------------------------------------------------

def _make_table_query_fn(
    present_tables: dict[str, set[str]],
    present_extensions: set[str] | None = None,
    seed_counts: dict[tuple[str, str], int] | None = None,
    present_constraints: set[str] | None = None,
) -> Any:
    """
    Build a mock query_fn that returns controlled results for each SQL query.

    The mock dispatches on keywords in the SQL string:
    - "information_schema.tables" → table presence
    - "pg_extension"              → extension presence
    - "pg_constraint"             → FK constraint presence
    - "COUNT(*)"                  → seed row counts
    """
    if present_extensions is None:
        present_extensions = set(REQUIRED_EXTENSIONS)
    if seed_counts is None:
        seed_counts = {(s, t): 1 for s, t in SEED_TABLES}
    if present_constraints is None:
        present_constraints = set(REQUIRED_FK_CONSTRAINTS)

    def query_fn(sql: str, params: tuple = ()) -> list[tuple]:
        sql_upper = sql.upper()

        if "INFORMATION_SCHEMA.TABLES" in sql_upper:
            # Return rows for all present tables
            rows = []
            for schema, tables in present_tables.items():
                for table in tables:
                    rows.append((schema, table))
            return rows

        if "PG_EXTENSION" in sql_upper:
            return [(ext,) for ext in present_extensions]

        if "PG_CONSTRAINT" in sql_upper:
            return [(c,) for c in present_constraints]

        if "COUNT(*)" in sql_upper:
            # Extract schema.table from the SQL: "SELECT COUNT(*) FROM schema.table"
            parts = sql.strip().split()
            # "FROM schema.table" → parts[-1] is "schema.table"
            qualified = parts[-1]
            if "." in qualified:
                schema, table = qualified.split(".", 1)
                count = seed_counts.get((schema, table), 0)
            else:
                count = 0
            return [(count,)]

        return []

    return query_fn


# ---------------------------------------------------------------------------
# Strategies
# ---------------------------------------------------------------------------

# All required table names as a flat list of (schema, table) pairs
_ALL_REQUIRED_PAIRS: list[tuple[str, str]] = [
    (schema, table)
    for schema, tables in REQUIRED_TABLES.items()
    for table in tables
]

# Strategy: a subset of required (schema, table) pairs to mark as MISSING
missing_tables_strategy = st.lists(
    st.sampled_from(_ALL_REQUIRED_PAIRS),
    min_size=0,
    max_size=len(_ALL_REQUIRED_PAIRS),
    unique=True,
)

# Strategy: a non-empty subset of required (schema, table) pairs to mark as MISSING
at_least_one_missing_strategy = st.lists(
    st.sampled_from(_ALL_REQUIRED_PAIRS),
    min_size=1,
    max_size=len(_ALL_REQUIRED_PAIRS),
    unique=True,
)

# Strategy: seed table row counts (0 = empty, positive = has data)
seed_count_strategy = st.fixed_dictionaries(
    {(s, t): st.integers(min_value=0, max_value=1000) for s, t in SEED_TABLES}
)

# Strategy: a subset of seed tables to mark as empty
empty_seed_tables_strategy = st.lists(
    st.sampled_from(SEED_TABLES),
    min_size=0,
    max_size=len(SEED_TABLES),
    unique=True,
)

# Strategy: at least one seed table is empty
at_least_one_empty_seed_strategy = st.lists(
    st.sampled_from(SEED_TABLES),
    min_size=1,
    max_size=len(SEED_TABLES),
    unique=True,
)


def _build_present_tables(
    missing: list[tuple[str, str]],
) -> dict[str, set[str]]:
    """Return a present_tables dict with the given pairs removed."""
    missing_set = set(missing)
    return {
        schema: {t for t in tables if (schema, t) not in missing_set}
        for schema, tables in REQUIRED_TABLES.items()
    }


# ---------------------------------------------------------------------------
# Property 3: DB schema completeness after init
# ---------------------------------------------------------------------------


@given(missing_tables_strategy)
@settings(max_examples=100)
def test_check_tables_detects_missing_tables(
    missing: list[tuple[str, str]],
):
    """
    # Feature: deploy-readiness-audit, Property 3: DB schema completeness after init

    For any table name in the required table set, after init files execute,
    that table SHALL be present in information_schema.tables in the correct schema.

    The checker MUST:
    - Return no failures when all required tables are present.
    - Return at least one failure for each missing table.

    Validates: Requirements 2.1–2.6
    """
    present_tables = _build_present_tables(missing)
    query_fn = _make_table_query_fn(present_tables)

    details, failures = check_tables(query_fn)

    if not missing:
        # All tables present → no failures
        assert failures == [], (
            f"Expected no failures when all tables are present, got: {failures}"
        )
    else:
        # At least one table missing → at least one failure per missing table
        assert len(failures) >= len(missing), (
            f"Expected at least {len(missing)} failure(s) for missing tables "
            f"{missing!r}, got {len(failures)}: {failures}"
        )
        # Each missing table must appear in the failures list
        for schema, table in missing:
            qualified = f"{schema}.{table}"
            assert any(qualified in f for f in failures), (
                f"Missing table {qualified!r} not reported in failures: {failures}"
            )


@given(at_least_one_missing_strategy)
@settings(max_examples=100)
def test_check_tables_always_fails_when_any_table_missing(
    missing: list[tuple[str, str]],
):
    """
    # Feature: deploy-readiness-audit, Property 3: DB schema completeness after init

    When at least one required table is absent, check_tables MUST return
    at least one failure — never an empty failures list.

    Validates: Requirements 2.1–2.6
    """
    present_tables = _build_present_tables(missing)
    query_fn = _make_table_query_fn(present_tables)

    _, failures = check_tables(query_fn)

    assert len(failures) >= 1, (
        f"Expected at least 1 failure when tables {missing!r} are missing, "
        f"but got 0 failures"
    )


@given(missing_tables_strategy)
@settings(max_examples=100)
def test_dbschema_check_status_reflects_table_presence(
    missing: list[tuple[str, str]],
):
    """
    # Feature: deploy-readiness-audit, Property 3: DB schema completeness after init

    The DBSchemaCheck.run() result status MUST be:
    - PASS when all required tables are present (and extensions/seeds/FKs are OK).
    - FAIL when any required table is missing.

    Validates: Requirements 2.1–2.6
    """
    present_tables = _build_present_tables(missing)
    query_fn = _make_table_query_fn(present_tables)

    checker = DBSchemaCheck(query_fn=query_fn)
    result = checker.run()

    if not missing:
        assert result.status == Status.PASS, (
            f"Expected PASS when all tables present, got {result.status!r}. "
            f"Failures: {result.failures}"
        )
    else:
        assert result.status == Status.FAIL, (
            f"Expected FAIL when tables {missing!r} are missing, "
            f"got {result.status!r}"
        )


# ---------------------------------------------------------------------------
# Property 4: Seed data presence after init
# ---------------------------------------------------------------------------


@given(empty_seed_tables_strategy)
@settings(max_examples=100)
def test_check_seed_data_detects_empty_tables(
    empty_tables: list[tuple[str, str]],
):
    """
    # Feature: deploy-readiness-audit, Property 4: Seed data presence after init

    For any table in the seed set, after seed SQL executes, that table SHALL
    contain at least one row.

    The checker MUST:
    - Return no failures when all seed tables have at least 1 row.
    - Return at least one failure for each empty seed table.

    Validates: Requirements 2.7
    """
    empty_set = set(empty_tables)
    seed_counts = {
        (s, t): (0 if (s, t) in empty_set else 1)
        for s, t in SEED_TABLES
    }
    query_fn = _make_table_query_fn(
        present_tables={schema: set(tables) for schema, tables in REQUIRED_TABLES.items()},
        seed_counts=seed_counts,
    )

    details, failures = check_seed_data(query_fn)

    if not empty_tables:
        assert failures == [], (
            f"Expected no failures when all seed tables have rows, got: {failures}"
        )
    else:
        assert len(failures) >= len(empty_tables), (
            f"Expected at least {len(empty_tables)} failure(s) for empty seed tables "
            f"{empty_tables!r}, got {len(failures)}: {failures}"
        )
        for schema, table in empty_tables:
            qualified = f"{schema}.{table}"
            assert any(qualified in f for f in failures), (
                f"Empty seed table {qualified!r} not reported in failures: {failures}"
            )


@given(at_least_one_empty_seed_strategy)
@settings(max_examples=100)
def test_check_seed_data_always_fails_when_any_table_empty(
    empty_tables: list[tuple[str, str]],
):
    """
    # Feature: deploy-readiness-audit, Property 4: Seed data presence after init

    When at least one seed table is empty, check_seed_data MUST return at
    least one failure — never an empty failures list.

    Validates: Requirements 2.7
    """
    empty_set = set(empty_tables)
    seed_counts = {
        (s, t): (0 if (s, t) in empty_set else 5)
        for s, t in SEED_TABLES
    }
    query_fn = _make_table_query_fn(
        present_tables={schema: set(tables) for schema, tables in REQUIRED_TABLES.items()},
        seed_counts=seed_counts,
    )

    _, failures = check_seed_data(query_fn)

    assert len(failures) >= 1, (
        f"Expected at least 1 failure when seed tables {empty_tables!r} are empty, "
        f"but got 0 failures"
    )


@given(seed_count_strategy)
@settings(max_examples=100)
def test_check_seed_data_passes_only_when_all_tables_have_rows(
    seed_counts: dict[tuple[str, str], int],
):
    """
    # Feature: deploy-readiness-audit, Property 4: Seed data presence after init

    check_seed_data MUST return no failures if and only if every seed table
    has a count >= 1.

    Validates: Requirements 2.7
    """
    query_fn = _make_table_query_fn(
        present_tables={schema: set(tables) for schema, tables in REQUIRED_TABLES.items()},
        seed_counts=seed_counts,
    )

    _, failures = check_seed_data(query_fn)

    all_have_rows = all(seed_counts.get((s, t), 0) >= 1 for s, t in SEED_TABLES)

    if all_have_rows:
        assert failures == [], (
            f"Expected no failures when all seed tables have rows, got: {failures}"
        )
    else:
        assert len(failures) >= 1, (
            f"Expected at least 1 failure when some seed tables are empty, "
            f"got 0 failures. Counts: {seed_counts}"
        )


@given(empty_seed_tables_strategy)
@settings(max_examples=100)
def test_dbschema_check_status_reflects_seed_data(
    empty_tables: list[tuple[str, str]],
):
    """
    # Feature: deploy-readiness-audit, Property 4: Seed data presence after init

    The DBSchemaCheck.run() result status MUST be:
    - PASS when all seed tables have at least 1 row (and all other checks pass).
    - FAIL when any seed table is empty.

    Validates: Requirements 2.7
    """
    empty_set = set(empty_tables)
    seed_counts = {
        (s, t): (0 if (s, t) in empty_set else 1)
        for s, t in SEED_TABLES
    }
    query_fn = _make_table_query_fn(
        present_tables={schema: set(tables) for schema, tables in REQUIRED_TABLES.items()},
        seed_counts=seed_counts,
    )

    checker = DBSchemaCheck(query_fn=query_fn)
    result = checker.run()

    if not empty_tables:
        assert result.status == Status.PASS, (
            f"Expected PASS when all seed tables have rows, got {result.status!r}. "
            f"Failures: {result.failures}"
        )
    else:
        assert result.status == Status.FAIL, (
            f"Expected FAIL when seed tables {empty_tables!r} are empty, "
            f"got {result.status!r}"
        )


# ---------------------------------------------------------------------------
# Additional: connection failure produces FAIL
# ---------------------------------------------------------------------------


def test_dbschema_check_fails_on_connection_error():
    """
    When the DB connection fails, DBSchemaCheck.run() MUST return FAIL
    with a descriptive message — never PASS or SKIP.
    """
    def failing_query_fn(sql: str, params: tuple = ()) -> list[tuple]:
        raise ConnectionError("Connection refused: localhost:5432")

    # We can't inject a failing query_fn directly through the constructor
    # because the connection error happens before query_fn is called.
    # Instead, test via a query_fn that raises on first call.
    def error_query_fn(sql: str, params: tuple = ()) -> list[tuple]:
        raise Exception("simulated DB error")

    checker = DBSchemaCheck(query_fn=error_query_fn)
    result = checker.run()

    assert result.status == Status.FAIL, (
        f"Expected FAIL on DB error, got {result.status!r}"
    )
    assert len(result.failures) >= 1, "Failures list must not be empty on FAIL"


def test_dbschema_check_dimension_is_db_schema():
    """The CheckResult dimension must always be 'DB Schema'."""
    query_fn = _make_table_query_fn(
        present_tables={schema: set(tables) for schema, tables in REQUIRED_TABLES.items()}
    )
    checker = DBSchemaCheck(query_fn=query_fn)
    result = checker.run()
    assert result.dimension == "DB Schema"


def test_dbschema_check_pass_when_all_present():
    """Full happy-path: all tables, extensions, seed data, and FKs present → PASS."""
    query_fn = _make_table_query_fn(
        present_tables={schema: set(tables) for schema, tables in REQUIRED_TABLES.items()},
        present_extensions=set(REQUIRED_EXTENSIONS),
        seed_counts={(s, t): 5 for s, t in SEED_TABLES},
        present_constraints=set(REQUIRED_FK_CONSTRAINTS),
    )
    checker = DBSchemaCheck(query_fn=query_fn)
    result = checker.run()
    assert result.status == Status.PASS, (
        f"Expected PASS for full happy-path, got {result.status!r}. "
        f"Failures: {result.failures}"
    )
