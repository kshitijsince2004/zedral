"""
checks/db_schema.py — Database Schema Completeness check.

Responsibilities:
- Connect to PostgreSQL via psycopg2 and query information_schema.tables
  to verify all required tables exist across all four schemas.
- Verify timescaledb and uuid-ossp extensions are present in pg_extension.
- Verify seed data rows exist in the six required master tables via
  SELECT COUNT(*).
- Verify deferred FK constraints fk_stoppage_code and fk_defect_code are
  present in pg_constraint.
- Mark as FAIL on connection error (10-second timeout, no retry).
- Returns a CheckResult with dimension "DB Schema".
"""
from __future__ import annotations

import os
from typing import Any, Callable, Optional

from models import CheckResult, Status

# ---------------------------------------------------------------------------
# Required tables (schema → set of table names)
# ---------------------------------------------------------------------------

REQUIRED_TABLES: dict[str, set[str]] = {
    "master": {
        "stoppage_codes",
        "defect_codes",
        "rolls",
        "work_centres",
        "materials",
        "customers",
        "shifts",
    },
    "m1_demand": {
        "priority_overrides",
        "sap_watermarks",
    },
    "m5a_material": {
        "wo_readiness",
        "inbound_expected",
    },
    "m6_dispatch": {
        "production_passes",
        "roll_assignments",
        "roll_changes",
        "shift_crew_assignments",
    },
}

# ---------------------------------------------------------------------------
# Required extensions
# ---------------------------------------------------------------------------

REQUIRED_EXTENSIONS: set[str] = {"timescaledb", "uuid-ossp"}

# ---------------------------------------------------------------------------
# Seed tables — must have at least 1 row after 05_seed_data.sql runs
# ---------------------------------------------------------------------------

SEED_TABLES: list[tuple[str, str]] = [
    ("master", "work_centres"),
    ("master", "materials"),
    ("master", "customers"),
    ("master", "shifts"),
    ("master", "stoppage_codes"),
    ("master", "defect_codes"),
]

# ---------------------------------------------------------------------------
# Required deferred FK constraints
# ---------------------------------------------------------------------------

REQUIRED_FK_CONSTRAINTS: set[str] = {"fk_stoppage_code", "fk_defect_code"}

# ---------------------------------------------------------------------------
# Default DB URL
# ---------------------------------------------------------------------------

_DEFAULT_DB_URL = os.environ.get(
    "AUDIT_DB_URL",
    "postgresql://zedral:zedral_dev_password@localhost:5432/zedral",
)

_CONNECTION_TIMEOUT = 10  # seconds


# ---------------------------------------------------------------------------
# Query helpers (pure functions, injectable for testing)
# ---------------------------------------------------------------------------

def _build_default_query_fn(db_url: str) -> Callable[[str, tuple], list[tuple]]:
    """
    Build a query function that connects to PostgreSQL via psycopg2.

    Returns a callable ``query_fn(sql, params) -> list[tuple]``.
    Raises ``RuntimeError`` if psycopg2 is not available.
    Raises ``ConnectionError`` on connection failure.
    """
    try:
        import psycopg2  # type: ignore
    except ImportError as exc:
        raise RuntimeError(
            "psycopg2 is not installed — cannot connect to PostgreSQL. "
            "Install it with: pip install psycopg2-binary"
        ) from exc

    # Parse connect_timeout from URL or use default
    # psycopg2 accepts connect_timeout as a DSN keyword
    import urllib.parse

    parsed = urllib.parse.urlparse(db_url)
    # Build DSN kwargs
    dsn_kwargs: dict[str, Any] = {
        "host": parsed.hostname or "localhost",
        "port": parsed.port or 5432,
        "dbname": (parsed.path or "/zedral").lstrip("/"),
        "user": parsed.username or "zedral",
        "password": parsed.password or "",
        "connect_timeout": _CONNECTION_TIMEOUT,
    }

    try:
        conn = psycopg2.connect(**dsn_kwargs)
    except psycopg2.OperationalError as exc:
        raise ConnectionError(f"Cannot connect to PostgreSQL: {exc}") from exc

    def query_fn(sql: str, params: tuple = ()) -> list[tuple]:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            return cur.fetchall()

    return query_fn


# ---------------------------------------------------------------------------
# Individual check functions (pure, accept query_fn for testability)
# ---------------------------------------------------------------------------

def check_tables(
    query_fn: Callable[[str, tuple], list[tuple]],
) -> tuple[list[str], list[str]]:
    """
    Verify all required tables exist in information_schema.tables.

    Returns (details, failures).
    """
    details: list[str] = []
    failures: list[str] = []

    rows = query_fn(
        "SELECT table_schema, table_name FROM information_schema.tables "
        "WHERE table_schema = ANY(%s)",
        (list(REQUIRED_TABLES.keys()),),
    )
    present: dict[str, set[str]] = {schema: set() for schema in REQUIRED_TABLES}
    for schema, table in rows:
        if schema in present:
            present[schema].add(table)

    for schema, required in REQUIRED_TABLES.items():
        missing = required - present.get(schema, set())
        if missing:
            for tbl in sorted(missing):
                failures.append(f"Missing table: {schema}.{tbl}")
        else:
            details.append(f"Schema {schema!r}: all {len(required)} required tables present ✓")

    return details, failures


def check_extensions(
    query_fn: Callable[[str, tuple], list[tuple]],
) -> tuple[list[str], list[str]]:
    """
    Verify required PostgreSQL extensions are installed.

    Returns (details, failures).
    """
    details: list[str] = []
    failures: list[str] = []

    rows = query_fn(
        "SELECT extname FROM pg_extension WHERE extname = ANY(%s)",
        (list(REQUIRED_EXTENSIONS),),
    )
    present = {row[0] for row in rows}

    for ext in sorted(REQUIRED_EXTENSIONS):
        if ext in present:
            details.append(f"Extension {ext!r} present ✓")
        else:
            failures.append(f"Missing extension: {ext}")

    return details, failures


def check_seed_data(
    query_fn: Callable[[str, tuple], list[tuple]],
) -> tuple[list[str], list[str]]:
    """
    Verify each seed table has at least one row.

    Returns (details, failures).
    """
    details: list[str] = []
    failures: list[str] = []

    for schema, table in SEED_TABLES:
        qualified = f"{schema}.{table}"
        try:
            rows = query_fn(
                f"SELECT COUNT(*) FROM {qualified}",  # noqa: S608 — table name is from a fixed list
                (),
            )
            count = rows[0][0] if rows else 0
            if count >= 1:
                details.append(f"Seed table {qualified}: {count} row(s) ✓")
            else:
                failures.append(f"Seed table {qualified} is empty (0 rows)")
        except Exception as exc:
            failures.append(f"Could not query seed table {qualified}: {exc}")

    return details, failures


def check_fk_constraints(
    query_fn: Callable[[str, tuple], list[tuple]],
) -> tuple[list[str], list[str]]:
    """
    Verify deferred FK constraints fk_stoppage_code and fk_defect_code exist
    in pg_constraint.

    Returns (details, failures).
    """
    details: list[str] = []
    failures: list[str] = []

    rows = query_fn(
        "SELECT conname FROM pg_constraint "
        "WHERE conname = ANY(%s) AND contype = 'f'",
        (list(REQUIRED_FK_CONSTRAINTS),),
    )
    present = {row[0] for row in rows}

    for constraint in sorted(REQUIRED_FK_CONSTRAINTS):
        if constraint in present:
            details.append(f"FK constraint {constraint!r} present ✓")
        else:
            failures.append(f"Missing FK constraint: {constraint}")

    return details, failures


# ---------------------------------------------------------------------------
# DBSchemaCheck class
# ---------------------------------------------------------------------------

class DBSchemaCheck:
    """
    Checks database schema completeness.

    Parameters
    ----------
    db_url : str, optional
        PostgreSQL connection URL. Defaults to the ``AUDIT_DB_URL`` environment
        variable or the local dev URL.
    query_fn : callable, optional
        Injected query function for testing. Signature:
        ``(sql: str, params: tuple) -> list[tuple]``
        If provided, no real DB connection is made.
    """

    def __init__(
        self,
        db_url: str = _DEFAULT_DB_URL,
        query_fn: Optional[Callable[[str, tuple], list[tuple]]] = None,
    ) -> None:
        self._db_url = db_url
        self._query_fn = query_fn  # None → build from db_url at run time

    def run(self) -> CheckResult:
        """Execute all DB schema checks and return a CheckResult."""
        all_details: list[str] = []
        all_failures: list[str] = []

        # ── Resolve query function ───────────────────────────────────────────
        if self._query_fn is not None:
            query_fn = self._query_fn
        else:
            try:
                query_fn = _build_default_query_fn(self._db_url)
            except RuntimeError as exc:
                # psycopg2 not installed
                return CheckResult(
                    dimension="DB Schema",
                    status=Status.FAIL,
                    details=[],
                    failures=[str(exc)],
                )
            except ConnectionError as exc:
                # Cannot connect to DB
                return CheckResult(
                    dimension="DB Schema",
                    status=Status.FAIL,
                    details=[],
                    failures=[str(exc)],
                )

        # ── Run individual checks ────────────────────────────────────────────
        for check_fn in (
            check_tables,
            check_extensions,
            check_seed_data,
            check_fk_constraints,
        ):
            try:
                details, failures = check_fn(query_fn)
            except Exception as exc:
                all_failures.append(f"{check_fn.__name__} raised an error: {exc}")
                continue
            all_details.extend(details)
            all_failures.extend(failures)

        # ── Determine overall status ─────────────────────────────────────────
        overall = Status.FAIL if all_failures else Status.PASS

        return CheckResult(
            dimension="DB Schema",
            status=overall,
            details=all_details,
            failures=all_failures,
        )
