# Implementation Plan: Deploy Readiness Audit

## Overview

Build the `scripts/audit_runner.py` entry point and supporting check modules that verify all nine readiness dimensions of the Zedral MES platform before production deployment. The runner produces a consolidated pass/fail checklist report and exits with code 0 (gate open) or 1 (gate blocked).

## Tasks

- [x] 1. Scaffold project structure and core data models
  - Create `scripts/` directory with `audit_runner.py`, `models.py`, `report.py`, and `checks/__init__.py`
  - Implement `Status` enum (PASS, FAIL, SKIP) and `CheckResult` dataclass with `dimension`, `status`, `details`, `failures` fields
  - Implement `ChecklistReport` dataclass with `timestamp`, `git_sha`, `environment`, `results` fields and `gate_open` property
  - _Requirements: 10.1, 10.2, 10.3_

  - [x] 1.1 Write unit tests for `ChecklistReport.gate_open`
    - Test all-PASS → True, any-FAIL → False, SKIP-only → True, mixed PASS/SKIP → True
    - _Requirements: 10.2, 10.3_

  - [x] 1.2 Write property test for report gate logic
    - **Property 15: Report gate logic correctness**
    - **Validates: Requirements 10.2, 10.3**

- [x] 2. Implement `report.py` — ReportBuilder
  - Format `ChecklistReport` as the table layout defined in the design (dimension, status, notes columns)
  - Print `DEPLOYMENT GATE: OPEN` or `DEPLOYMENT GATE: BLOCKED — N items failed` to stdout
  - Write report to `deploy-readiness-<timestamp>.txt` in project root; log to stderr on write failure but still print to stdout
  - Include timestamp, Git SHA, and environment name in the report header
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [x] 2.1 Write unit tests for ReportBuilder
    - Test correct formatting for known inputs, correct exit code mapping, file naming pattern
    - _Requirements: 10.4, 10.5_

  - [x] 2.2 Write property test for report metadata completeness
    - **Property 16: Report metadata completeness**
    - **Validates: Requirements 10.4**

- [x] 3. Implement `checks/health.py` — Backend Service Health
  - Poll `GET /health` on ports 8001–8004 and port 8000 (Gateway) with up to 5 retries at 10-second intervals
  - Verify JSON body contains `"status": "ok"`, non-empty service name, and non-empty version string
  - Parse `docker-compose.full.yml` to confirm `healthcheck` stanzas exist for m1-demand and m5a-material
  - Mark service as FAIL after 5 failed retries; mark as SKIP if connection refused (stack not running)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 3.1 Write property test for health check response shape
    - **Property 1: Health check response shape**
    - **Validates: Requirements 1.1, 1.2**

  - [x] 3.2 Write property test for retry exhaustion producing FAIL
    - **Property 2: Health check retry exhaustion produces FAIL**
    - **Validates: Requirements 1.4**

- [x] 4. Implement `checks/db_schema.py` — Database Schema Completeness
  - Connect to PostgreSQL via `psycopg2` and query `information_schema.tables` for all required tables across all four schemas
  - Verify `timescaledb` and `uuid-ossp` extensions are present in `pg_extension`
  - Verify seed data rows exist in the six required master tables via `SELECT COUNT(*)`
  - Verify deferred FK constraints `fk_stoppage_code` and `fk_defect_code` in `pg_constraint`
  - Mark as FAIL on connection error (10-second timeout, no retry)
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9_

  - [x] 4.1 Write property test for DB schema completeness after init
    - **Property 3: DB schema completeness after init**
    - **Validates: Requirements 2.1–2.6**

  - [x] 4.2 Write property test for seed data presence after init
    - **Property 4: Seed data presence after init**
    - **Validates: Requirements 2.7**

- [x] 5. Implement `checks/api_contracts.py` — API Contract Verification
  - Issue HTTP GET requests through the Gateway for all 16 documented routes (Req 3.1–3.16)
  - Verify HTTP 200 and correct top-level JSON shape (array vs object) for each route
  - Test SSE endpoint with `Accept: text/event-stream` and verify streaming response headers
  - Test a known-invalid route and verify HTTP 404 with JSON body
  - Inspect `nginx.conf` for the 502 error handler returning JSON rather than HTML
  - _Requirements: 3.1–3.19_

  - [x] 5.1 Write property test for API endpoint response shape consistency
    - **Property 5: API endpoint response shape consistency**
    - **Validates: Requirements 3.1–3.15**

  - [x] 5.2 Write property test for Gateway error responses always being JSON
    - **Property 6: Gateway error responses are always JSON**
    - **Validates: Requirements 3.17, 3.18**

- [x] 6. Implement `checks/frontend.py` — Frontend Switchover and Floor Console
  - Verify `apps/ops-console/.env.example` documents `VITE_USE_MOCK`, `VITE_API_BASE_URL`, and `VITE_USE_SSE`
  - Verify `apps/floor-console/.env.example` documents `VITE_API_BASE_URL`, `VITE_USE_MOCK`, and `VITE_PLANT_ID`
  - Inspect Ops_Console source for `EnvValidationError` throw when `VITE_API_BASE_URL` is missing
  - Run `npm run typecheck` in both app directories via subprocess and capture exit codes
  - _Requirements: 4.1, 4.2, 4.3, 4.9, 9.1, 9.2, 9.3_

- [x] 7. Implement `checks/messaging.py` — Event Messaging Readiness
  - Use Redpanda Admin API (HTTP) or `rpk topic list` via subprocess to verify all required topics exist
  - Verify the four critical topics (`floor.dispatch.issued`, `demand.priority.recalculated`, `material.coil.shortage_detected`, `floor.shift.handover_submitted`) have at least 3 partitions each
  - Inspect `bootstrap.sh` for `--if-not-exists` flag to verify idempotent bootstrap
  - Check service container logs for consumer startup confirmation messages
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 7.1 Write property test for topic bootstrap idempotence
    - **Property 8: Topic bootstrap idempotence**
    - **Validates: Requirements 5.2**

  - [x] 7.2 Write property test for critical topics having sufficient partitions
    - **Property 9: Critical topics have sufficient partitions**
    - **Validates: Requirements 5.5**

- [x] 8. Implement `checks/test_coverage.py` — Test Coverage Gate
  - Run `pytest` in each of the five directories (`backend/services/m2-master/`, `m1-demand/`, `m5a-material/`, `m6-dispatch/`, `backend/shared/`) via subprocess
  - Capture exit codes and failure counts; report per-service pass/fail
  - Verify the specific named test files exist before running (e.g. `test_pbt_priority.py`, `test_pbt_m6.py`, `test_pbt_event_envelope.py`)
  - Mark as FAIL if `pytest` is not found or a test directory does not exist
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10, 6.11_

  - [x] 8.1 Write property test for test failure propagation to FAIL checklist status
    - **Property 10: Test failure propagates to FAIL checklist status**
    - **Validates: Requirements 6.11**

- [x] 9. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Implement `checks/security.py` — Security Hardening
  - Scan repository for committed `.env` files (excluding `.env.example`) containing dev placeholder secrets (`zedral_dev_password`, `dev-secret-change-in-production`, `admin_dev_password`)
  - Verify `AUTH_DISABLED` is not hardcoded to `"true"` in `docker-compose.full.yml`
  - Verify `infra/keycloak/realm-export.json` defines `admin`, `supervisor`, and `operator` roles
  - Flag nginx CORS map if it contains only localhost origins
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [x] 10.1 Write unit tests for secret detection logic
    - Test correct identification of dev placeholder strings in file content
    - _Requirements: 7.7_

  - [x] 10.2 Write property test for no production secrets in committed .env files
    - **Property 12: No production secrets in committed .env files**
    - **Validates: Requirements 7.7**

- [x] 11. Implement `checks/infrastructure.py` — Infrastructure and Docker Readiness
  - Query Docker daemon via `docker inspect` subprocess to verify all containers are running or exited-0
  - Parse `docker-compose.full.yml` to verify no `latest` image tags on custom service images
  - Verify `infra/.env.example` documents all required variables (`EVENT_SIGNING_SECRET`, `PLANT_ID`, `CORS_ORIGINS`, `AUTH_DISABLED`, etc.)
  - Verify Redpanda `--memory=512M` flag is present in `docker-compose.yml`
  - Verify `depends_on` conditions use `service_healthy` where appropriate
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8_

  - [x] 11.1 Write unit tests for docker-compose parsing
    - Test detection of missing `healthcheck` stanzas and `latest` image tags
    - _Requirements: 8.2, 8.6_

  - [x] 11.2 Write property test for no latest image tags in docker-compose
    - **Property 14: No latest image tags in docker-compose**
    - **Validates: Requirements 8.6**

  - [x] 11.3 Write property test for all required env vars documented in .env.example
    - **Property 13: All required env vars documented in .env.example**
    - **Validates: Requirements 8.4**

- [x] 12. Implement `audit_runner.py` — Entry Point and Orchestration
  - Parse environment variables (`AUDIT_TARGET_ENV`, `AUDIT_GATEWAY_URL`, `AUDIT_DB_URL`, `AUDIT_REDPANDA_BROKERS`, `AUDIT_SKIP_TESTS`, `AUDIT_SKIP_INFRA`)
  - Detect stack reachability; mark infrastructure-dependent checks as SKIP when stack is unreachable
  - Instantiate and run all nine check modules, collecting `CheckResult` objects
  - Pass results to `ReportBuilder` and exit with code 0 or 1
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [x] 12.1 Write property test for infrastructure-dependent checks skipping when stack unreachable
    - **Property 17: Infrastructure-dependent checks skip when stack unreachable**
    - **Validates: Requirements 10.6**

- [x] 13. Implement EventEnvelope property test (extended)
  - Add `test_pbt_event_envelope_signature` to `scripts/tests/test_pbt_event_envelope.py` using `hypothesis`
  - Generate random payloads and secrets, build envelope via `build_envelope()`, verify HMAC-SHA256 round-trip matches `signature` field
  - _Requirements: 5.7, 5.8_

  - [x] 13.1 Write property test for EventEnvelope signature round-trip
    - **Property 7: EventEnvelope signature round-trip**
    - **Validates: Requirements 5.7, 5.8**

- [x] 14. Wire up `scripts/tests/` test suite
  - Create `scripts/tests/__init__.py` and `conftest.py` with fixtures for mock stack, mock DB, and mock subprocess calls
  - Create `scripts/tests/test_models.py` and `scripts/tests/test_report.py` with all unit tests from tasks 1 and 2
  - Ensure `pytest scripts/tests/ -m "not integration"` runs cleanly with no stack required
  - _Requirements: 6.1–6.11_

- [x] 15. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests use `hypothesis` with a minimum of 100 examples per property
- Each property test file includes a comment: `# Feature: deploy-readiness-audit, Property N: <property_text>`
- Integration tests (requiring a live stack) are tagged `@pytest.mark.integration` and run separately
