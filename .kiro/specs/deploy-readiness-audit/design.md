# Design Document — Deploy Readiness Audit

## Overview

The Deploy Readiness Audit is an automated verification system that checks whether the Zedral MES platform is ready for production deployment at the Hero Steels Ludhiana pilot plant. It covers four modules — M2 (Master Data), M1 (Demand & Order Management), M5a (Material & Inventory), and M6 (Dispatch & Execution) — across nine readiness dimensions.

The core deliverable is an `audit_runner.py` script (plus supporting check modules) that can be run against a live Docker Compose stack and produces a consolidated pass/fail checklist report. The report gates the deployment decision: all items green means `DEPLOYMENT GATE: OPEN`; any failure means `DEPLOYMENT GATE: BLOCKED`.

### Goals

- Provide a single command that verifies all nine readiness dimensions
- Produce a human-readable, archivable report with timestamp, Git SHA, and environment name
- Exit with code 0 on full pass, code 1 on any failure
- Be runnable in CI and locally against a running stack
- Identify gaps in the current codebase (missing healthchecks, missing env docs, etc.) so they can be fixed before go-live

### Non-Goals

- The audit runner does not fix issues — it only reports them
- It does not deploy the stack — it assumes the stack is already running
- It does not replace the existing pytest suites — it invokes them

---

## Architecture

### High-Level Flow

```mermaid
flowchart TD
    A[audit_runner.py] --> B[Check: Backend Health]
    A --> C[Check: DB Schema]
    A --> D[Check: API Contracts]
    A --> E[Check: Frontend Switchover]
    A --> F[Check: Event Messaging]
    A --> G[Check: Test Coverage]
    A --> H[Check: Security Hardening]
    A --> I[Check: Infrastructure]
    A --> J[Check: Floor Console]

    B --> K[CheckResult pass/fail/skip]
    C --> K
    D --> K
    E --> K
    F --> K
    G --> K
    H --> K
    I --> K
    J --> K

    K --> L[ReportBuilder]
    L --> M[Console output]
    L --> N[deploy-readiness-timestamp.txt]
    L --> O[Exit code 0 or 1]
```

### Component Layout

```
scripts/
  audit_runner.py          # Entry point: orchestrates all checks, builds report
  checks/
    __init__.py
    health.py              # Req 1: backend service health
    db_schema.py           # Req 2: database schema completeness
    api_contracts.py       # Req 3: API contract verification
    frontend.py            # Req 4 & 9: frontend switchover + floor console
    messaging.py           # Req 5: event messaging readiness
    test_coverage.py       # Req 6: test coverage gate
    security.py            # Req 7: security hardening
    infrastructure.py      # Req 8: docker/infra readiness
  models.py                # CheckResult, ChecklistReport data classes
  report.py                # ReportBuilder: formats and writes the report
```

The runner imports each check module, executes them (sequentially or in parallel where safe), collects `CheckResult` objects, and passes them to `ReportBuilder`.

### Execution Model

Checks that require a live stack (health, API contracts, messaging) are marked `infrastructure_dependent`. If the stack is unreachable, these are marked `SKIP` rather than `FAIL`. Checks that are purely static (security file scanning, docker-compose inspection, TypeScript typecheck) run regardless.

---

## Components and Interfaces

### `models.py`

```python
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional

class Status(str, Enum):
    PASS = "PASS"
    FAIL = "FAIL"
    SKIP = "SKIP"

@dataclass
class CheckResult:
    dimension: str          # e.g. "Backend Health"
    status: Status
    details: list[str]      # human-readable lines explaining the result
    failures: list[str]     # specific failure messages (empty on PASS)

@dataclass
class ChecklistReport:
    timestamp: str
    git_sha: str
    environment: str
    results: list[CheckResult] = field(default_factory=list)

    @property
    def gate_open(self) -> bool:
        return all(r.status != Status.FAIL for r in self.results)
```

### `checks/health.py`

Responsibilities:
- Poll `GET /health` on each of the four backend services (ports 8001–8004) with up to 5 retries at 10-second intervals
- Poll `GET /health` on the Gateway (port 8000)
- Verify the JSON body contains `"status": "ok"`, service name, and version
- Inspect `docker-compose.full.yml` to confirm `healthcheck` stanzas exist for m1-demand and m5a-material (Req 1.5, 1.6)

### `checks/db_schema.py`

Responsibilities:
- Connect to PostgreSQL (via `psycopg2` or `asyncpg`) and query `information_schema.tables` to verify all required tables exist in all four schemas
- Verify `timescaledb` and `uuid-ossp` extensions are present
- Verify seed data rows exist in the six required master tables
- Verify deferred FK constraints `fk_stoppage_code` and `fk_defect_code` are present in `pg_constraint`

### `checks/api_contracts.py`

Responsibilities:
- Issue HTTP GET requests through the Gateway for all 16 documented routes (Req 3.1–3.16)
- Verify HTTP 200 and correct response shape (JSON array vs JSON object)
- Test the SSE endpoint with `Accept: text/event-stream` and verify streaming response
- Test a known-invalid route and verify HTTP 404 with JSON body
- Test the upstream-unavailable path by temporarily checking the 502 error handler config in nginx.conf

### `checks/frontend.py`

Responsibilities (Req 4 & 9):
- Verify `apps/ops-console/.env.example` documents `VITE_USE_MOCK`, `VITE_API_BASE_URL`, and `VITE_USE_SSE`
- Verify `apps/floor-console/.env.example` documents `VITE_API_BASE_URL`, `VITE_USE_MOCK`, and `VITE_PLANT_ID`
- Inspect the Ops_Console source for `EnvValidationError` throw when `VITE_API_BASE_URL` is missing
- Run `npm run typecheck` in both app directories and capture exit code

### `checks/messaging.py`

Responsibilities:
- Use `rpk topic list` (via subprocess or Redpanda Admin API) to verify all required topics exist
- Verify the four critical topics have at least 3 partitions each
- Check service logs for consumer startup confirmation messages
- Verify idempotent bootstrap by checking `--if-not-exists` flag in `bootstrap.sh`

### `checks/test_coverage.py`

Responsibilities:
- Run `pytest` in each of the four service directories and `backend/shared/`
- Capture exit codes and failure counts
- Verify the specific named test files exist (e.g. `test_pbt_priority.py`, `test_pbt_m6.py`)
- Report per-service pass/fail

### `checks/security.py`

Responsibilities:
- Scan the repository for committed `.env` files containing production-like secrets
- Verify `AUTH_DISABLED` is not hardcoded to `"true"` in `docker-compose.full.yml` without a warning mechanism
- Verify `EVENT_SIGNING_SECRET` default is not the dev placeholder in production config
- Verify `POSTGRES_PASSWORD` default is not the dev placeholder in production config
- Verify `infra/keycloak/realm-export.json` defines `admin`, `supervisor`, and `operator` roles
- Verify nginx CORS map does not contain only localhost origins (flag for production update)

### `checks/infrastructure.py`

Responsibilities:
- Query Docker daemon (via `docker inspect` or Docker SDK) to verify all containers are running or exited-0
- Verify `docker-compose.full.yml` pins image versions (no `latest` tags for service images)
- Verify `infra/.env.example` documents all required variables
- Verify Redpanda `--memory=512M` flag is present in `docker-compose.yml`
- Verify `depends_on` conditions use `service_healthy` where appropriate

### `report.py`

Responsibilities:
- Format the `ChecklistReport` as a table with one row per dimension
- Print `DEPLOYMENT GATE: OPEN` or `DEPLOYMENT GATE: BLOCKED — N items failed`
- Write the report to `deploy-readiness-<timestamp>.txt` in the project root
- Include timestamp, Git SHA, and environment name in the header

---

## Data Models

### CheckResult flow

```
Check module → CheckResult(dimension, status, details, failures)
                    ↓
             ChecklistReport.results[]
                    ↓
             ReportBuilder → formatted text + file
```

### Report file format

```
=============================================================
ZEDRAL DEPLOY READINESS AUDIT
Timestamp : 2025-01-15T10:30:00+05:30
Git SHA   : a1b2c3d4e5f6
Environment: hsl_ludhiana_staging
=============================================================

Dimension              Status  Notes
─────────────────────────────────────────────────────────────
Backend Health         PASS
DB Schema              PASS
API Contracts          FAIL    GET /api/m5a/forecast/ returned 404
Frontend Switchover    PASS
Event Messaging        PASS
Test Coverage          FAIL    m6-dispatch: 2 test failures
Security Hardening     PASS
Infrastructure         PASS
Floor Console          PASS

─────────────────────────────────────────────────────────────
DEPLOYMENT GATE: BLOCKED — 2 items failed
=============================================================
```

### Environment variables consumed by the audit runner

| Variable | Default | Purpose |
|---|---|---|
| `AUDIT_TARGET_ENV` | `local` | Environment name in report |
| `AUDIT_GATEWAY_URL` | `http://localhost:8000` | Gateway base URL |
| `AUDIT_DB_URL` | `postgresql://zedral:zedral_dev_password@localhost:5432/zedral` | DB connection |
| `AUDIT_REDPANDA_BROKERS` | `localhost:9092` | Redpanda broker address |
| `AUDIT_SKIP_TESTS` | `false` | Skip pytest execution (for fast infra-only checks) |
| `AUDIT_SKIP_INFRA` | `false` | Skip stack-dependent checks if stack not running |

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Health check response shape

*For any* backend service in the set {m2-master, m1-demand, m5a-material, m6-dispatch}, a successful `GET /health` response SHALL be a JSON object containing `"status": "ok"`, a non-empty service name field, and a non-empty version string field.

**Validates: Requirements 1.1, 1.2**

### Property 2: Health check retry exhaustion produces FAIL

*For any* backend service that returns a non-200 response on every attempt, after 5 retry attempts the audit runner SHALL record a `FAIL` status for that service's checklist item — never PASS or SKIP.

**Validates: Requirements 1.4**

### Property 3: DB schema completeness after init

*For any* table name in the required table set (all tables defined across `01_master_schema.sql` through `04_m6_dispatch_schema.sql`), after the five init files execute on a clean PostgreSQL instance, that table SHALL be present in `information_schema.tables` in the correct schema.

**Validates: Requirements 2.1–2.6**

### Property 4: Seed data presence after init

*For any* table name in the set {`master.work_centres`, `master.materials`, `master.customers`, `master.shifts`, `master.stoppage_codes`, `master.defect_codes`}, after `05_seed_data.sql` executes, that table SHALL contain at least one row.

**Validates: Requirements 2.7**

### Property 5: API endpoint response shape consistency

*For any* documented GET endpoint in the Gateway route table, the response SHALL be HTTP 200 with a JSON body whose top-level type matches the documented shape (array for list endpoints, object for singleton/aggregate endpoints) — never null, never a non-JSON content type.

**Validates: Requirements 3.1–3.15**

### Property 6: Gateway error responses are always JSON

*For any* request to an unrecognised route or any request when an upstream service is unavailable, the Gateway SHALL return a response with `Content-Type: application/json` and a parseable JSON body — never an HTML error page.

**Validates: Requirements 3.17, 3.18**

### Property 7: EventEnvelope signature round-trip

*For any* event payload dict and any non-empty signing secret string, building an `EventEnvelope` via `build_envelope()` and then re-computing the HMAC-SHA256 of the payload using the same secret SHALL produce a signature that matches the `signature` field on the envelope.

**Validates: Requirements 5.7, 5.8**

### Property 8: Topic bootstrap idempotence

*For any* initial set of pre-existing Redpanda topics (including the empty set), running the bootstrap script twice SHALL produce exactly the same final topic set as running it once, with no duplicate topics created and exit code 0 on both runs.

**Validates: Requirements 5.2**

### Property 9: Critical topics have sufficient partitions

*For any* topic in the set {`floor.dispatch.issued`, `demand.priority.recalculated`, `material.coil.shortage_detected`, `floor.shift.handover_submitted`}, the partition count SHALL be greater than or equal to 3.

**Validates: Requirements 5.5**

### Property 10: Test failure propagates to FAIL checklist status

*For any* pytest invocation that exits with a non-zero code, the audit runner SHALL record a `FAIL` status for the corresponding Test Coverage checklist item — never PASS or SKIP.

**Validates: Requirements 6.11**

### Property 11: Readiness calculation determinism

*For any* valid set of coil weight inputs, computing `wo_readiness` twice with identical inputs SHALL produce identical `available_qty_mt`, `shortfall_qty_mt`, and `status` values — the calculation is a pure function with no side effects on its output.

**Validates: Requirements 6.8**

### Property 12: No production secrets in committed .env files

*For any* file in the repository matching the pattern `*.env` or `.env*` (excluding `.env.example` files), the file content SHALL NOT contain any of the known dev placeholder secrets (`zedral_dev_password`, `dev-secret-change-in-production`, `admin_dev_password`).

**Validates: Requirements 7.7**

### Property 13: All required env vars documented in .env.example

*For any* environment variable name in the required set {`EVENT_SIGNING_SECRET`, `PLANT_ID`, `CORS_ORIGINS`, `AUTH_DISABLED`, `POSTGRES_PASSWORD`, `POSTGRES_USER`, `POSTGRES_DB`}, that variable name SHALL appear as a key in `infra/.env.example`.

**Validates: Requirements 8.4**

### Property 14: No latest image tags in docker-compose

*For any* service image declaration in `docker-compose.full.yml` that is a custom-built service (m2-master, m1-demand, m5a-material, m6-dispatch, nginx-gateway), the image tag SHALL NOT be `latest` — it SHALL be pinned to a specific version tag.

**Validates: Requirements 8.6**

### Property 15: Report gate logic correctness

*For any* list of `CheckResult` objects: if the list contains at least one result with `status == FAIL`, the audit runner SHALL exit with code 1 and the report SHALL contain `DEPLOYMENT GATE: BLOCKED`; if no result has `status == FAIL`, the audit runner SHALL exit with code 0 and the report SHALL contain `DEPLOYMENT GATE: OPEN`.

**Validates: Requirements 10.2, 10.3**

### Property 16: Report metadata completeness

*For any* generated report, the report text SHALL contain a non-empty timestamp string, a non-empty Git SHA string, and a non-empty environment name string — all three fields are always present regardless of check outcomes.

**Validates: Requirements 10.4**

### Property 17: Infrastructure-dependent checks skip when stack unreachable

*For any* check marked as `infrastructure_dependent`, when the Docker Compose stack is unreachable (connection refused on all service ports), that check's result SHALL have `status == SKIP` — never `FAIL` — and the report SHALL note that the stack must be running for a full audit.

**Validates: Requirements 10.6**

---

## Error Handling

### Stack not running

If the Docker Compose stack is not running when the audit runner starts, all infrastructure-dependent checks (Backend Health, API Contracts, Event Messaging) are marked `SKIP` with the note "Stack must be running for a full audit." Static checks (Security, Infrastructure file inspection, Frontend) still run.

### Partial stack failure

If some containers are healthy and others are not, each check reports independently. A single service failure does not cascade to mark all checks as FAIL.

### Database connection failure

If the DB check cannot connect, it marks the DB Schema dimension as FAIL with the connection error message. It does not retry indefinitely — one connection attempt with a 10-second timeout.

### Test runner failure

If `pytest` cannot be found or the test directory does not exist, the Test Coverage check marks that service as FAIL with a descriptive message rather than crashing the audit runner.

### Report write failure

If the report file cannot be written (e.g. permission error), the audit runner logs the error to stderr but still prints the report to stdout and exits with the appropriate code.

---

## Testing Strategy

### Unit tests

Unit tests cover the pure logic components:

- `models.py`: `ChecklistReport.gate_open` returns correct value for various combinations of PASS/FAIL/SKIP results
- `report.py`: `ReportBuilder` formats the report correctly for known inputs; exit code is 0 for all-PASS, 1 for any-FAIL
- `checks/security.py`: secret detection logic correctly identifies dev placeholder strings
- `checks/infrastructure.py`: docker-compose parsing correctly identifies missing `healthcheck` stanzas and `latest` image tags

Unit tests use `pytest` with `unittest.mock` to stub HTTP calls, subprocess calls, and DB connections.

### Property-based tests

Property tests use `hypothesis` (Python) with a minimum of 100 examples per property.

Each test is tagged with a comment referencing the design property:
```python
# Feature: deploy-readiness-audit, Property N: <property_text>
```

- **Property 7** (`test_pbt_event_envelope_signature`): Generate random payloads and secrets, build envelope, verify HMAC round-trip. Extends `backend/shared/tests/test_pbt_event_envelope.py`.

- **Property 8** (`test_pbt_topic_bootstrap_idempotence`): Generate random sets of pre-existing topics, run the bootstrap logic twice, verify no duplicates and exit code 0 both times.

- **Property 10** (`test_pbt_test_failure_propagation`): Generate random pytest exit codes, verify that any non-zero code maps to FAIL checklist status.

- **Property 12** (`test_pbt_no_secrets_in_env_files`): Generate random file contents with and without dev placeholder strings, verify the secret scanner correctly identifies them.

- **Property 13** (`test_pbt_env_example_completeness`): Generate random subsets of required env var names, verify the checker correctly identifies missing variables.

- **Property 14** (`test_pbt_no_latest_image_tags`): Generate random docker-compose service definitions with various image tags, verify the checker correctly flags `latest` tags.

- **Property 15** (`test_pbt_report_gate_logic`): Generate random lists of `CheckResult` objects with arbitrary status combinations, verify gate logic produces correct exit code and message.

- **Property 17** (`test_pbt_skip_when_unreachable`): Generate random infrastructure-dependent check configurations, verify that connection failure always produces SKIP not FAIL.

### Integration tests

Integration tests require the full Docker Compose stack and are tagged `@pytest.mark.integration`. They are run separately from unit/property tests:

```bash
# Unit + property tests (no stack required)
pytest scripts/tests/ -m "not integration"

# Full integration tests (stack must be running)
pytest scripts/tests/ -m integration
```

Integration tests cover:
- End-to-end audit runner execution against a live stack
- Actual health endpoint responses
- Actual DB schema verification
- Actual API contract checks

### Test configuration

```
scripts/
  tests/
    __init__.py
    test_models.py
    test_report.py
    test_pbt_report.py        # property tests for report logic
    test_pbt_event_envelope.py # property tests for event envelope (extended)
    conftest.py               # fixtures, mock stack setup
```
