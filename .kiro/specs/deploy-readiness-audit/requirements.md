# Requirements Document

## Introduction

This document defines what "production-ready" means for the Zedral MES platform's
first deployment wave: M2 (Master Data), M1 (Demand & Order Management),
M5a (Material & Inventory), and M6 (Dispatch & Execution). The goal is a staged
go-live at the Hero Steels Ludhiana pilot plant where these four modules operate
end-to-end before any additional modules are added.

The audit covers eight readiness dimensions: backend service completeness, frontend
module completeness, infrastructure and Docker readiness, database schema correctness,
API contract verification, event/messaging readiness, test coverage, and security
hardening. Each dimension produces a pass/fail checklist item that must be green
before the deployment gate is opened.

---

## Glossary

- **Audit_Runner**: The automated or manual process that executes all readiness checks
  and produces a consolidated pass/fail report.
- **Backend_Service**: One of the four FastAPI services — m2-master (port 8001),
  m1-demand (8002), m5a-material (8003), m6-dispatch (8004).
- **Checklist**: The ordered list of readiness items produced by the Audit_Runner.
- **DB_Schema**: The PostgreSQL schemas `master`, `m1_demand`, `m5a_material`,
  `m6_dispatch` initialised by the five SQL init files in `infra/postgres/init/`.
- **Deployment_Gate**: The decision point at which all Checklist items are green and
  the platform is approved for production use.
- **Floor_Console**: The React/Vite frontend at `apps/floor-console` used by
  operators and Andon boards.
- **Gateway**: The Nginx reverse proxy at port 8000 routing `/api/m1/`, `/api/m2/`,
  `/api/m5a/`, `/api/m6/` to the respective Backend_Services.
- **Mock_Mode**: The frontend operating mode where `VITE_USE_MOCK=true` and all API
  calls are served from in-memory fixtures instead of live Backend_Services.
- **Ops_Console**: The React/Vite frontend at `apps/ops-console` used by planners
  and supervisors.
- **Pilot_Seed**: The Hero Steels Ludhiana seed data in `infra/postgres/init/05_seed_data.sql`.
- **Redpanda**: The Kafka-compatible message broker used for inter-service events.
- **SSE**: Server-Sent Events endpoint at `/api/v1/live-status` on m6-dispatch used
  for real-time line status streaming.

---

## Requirements

### Requirement 1: Backend Service Health

**User Story:** As a deployment engineer, I want every Backend_Service to expose a
working health endpoint, so that the Gateway and orchestration tooling can confirm
all services are alive before routing traffic.

#### Acceptance Criteria

1. WHEN the Docker Compose stack is started with `docker compose -f infra/docker-compose.yml -f infra/docker-compose.full.yml up`, THE Audit_Runner SHALL confirm that `GET /health` on each of the four Backend_Services returns HTTP 200 within 30 seconds of container start.
2. WHEN `GET /health` is called on any Backend_Service, THE Backend_Service SHALL return a JSON body containing `"status": "ok"`, the service name, and the version string.
3. WHEN `GET /health` is called on the Gateway at port 8000, THE Gateway SHALL return HTTP 200 with `{"status":"ok","service":"nginx-gateway"}`.
4. IF a Backend_Service fails its health check after 5 retries with 10-second intervals, THEN THE Audit_Runner SHALL mark that service's Checklist item as FAIL and halt the deployment.
5. THE m1-demand Backend_Service SHALL include a `healthcheck` stanza in `docker-compose.full.yml` equivalent to the stanzas already present for m2-master and m6-dispatch.
6. THE m5a-material Backend_Service SHALL include a `healthcheck` stanza in `docker-compose.full.yml` equivalent to the stanzas already present for m2-master and m6-dispatch.

---

### Requirement 2: Database Schema Completeness

**User Story:** As a deployment engineer, I want the database to initialise cleanly
from the five SQL init files, so that all four modules have the tables, indexes, and
foreign keys they need on first boot.

#### Acceptance Criteria

1. WHEN the PostgreSQL container starts with the `infra/postgres/init/` directory mounted, THE DB_Schema SHALL execute all five init files (00 through 05) in lexicographic order without errors.
2. THE DB_Schema SHALL contain the `timescaledb` and `uuid-ossp` extensions after init file 00 runs.
3. THE DB_Schema SHALL contain all tables defined in `01_master_schema.sql` including `master.stoppage_codes`, `master.defect_codes`, and `master.rolls` introduced in v0.2.
4. THE DB_Schema SHALL contain all tables defined in `02_m1_demand_schema.sql` including `m1_demand.priority_overrides` and `m1_demand.sap_watermarks`.
5. THE DB_Schema SHALL contain all tables defined in `03_m5a_material_schema.sql` including `m5a_material.wo_readiness` and `m5a_material.inbound_expected`.
6. THE DB_Schema SHALL contain all tables defined in `04_m6_dispatch_schema.sql` including the v0.2 tables `m6_dispatch.production_passes`, `m6_dispatch.roll_assignments`, `m6_dispatch.roll_changes`, and `m6_dispatch.shift_crew_assignments`.
7. WHEN the Pilot_Seed file `05_seed_data.sql` is executed, THE DB_Schema SHALL contain at least one row in each of `master.work_centres`, `master.materials`, `master.customers`, `master.shifts`, `master.stoppage_codes`, and `master.defect_codes`.
8. IF any init SQL file fails during container startup, THEN THE PostgreSQL container SHALL exit with a non-zero code so that the Docker Compose health check fails and the Audit_Runner marks the DB Checklist item as FAIL.
9. THE DB_Schema SHALL enforce the deferred foreign key constraints `fk_stoppage_code` and `fk_defect_code` added in `04_m6_dispatch_schema.sql` without error when the Pilot_Seed data is present.

---

### Requirement 3: API Contract Verification

**User Story:** As a deployment engineer, I want every documented API route to return
the expected HTTP status and response shape, so that the frontends can connect to
live Backend_Services without runtime errors.

#### Acceptance Criteria

1. WHEN `GET /api/m2/work-centres/` is called through the Gateway, THE Gateway SHALL proxy the request to m2-master and return HTTP 200 with a JSON array.
2. WHEN `GET /api/m2/materials/` is called through the Gateway, THE Gateway SHALL proxy the request to m2-master and return HTTP 200 with a JSON array.
3. WHEN `GET /api/m2/customers/` is called through the Gateway, THE Gateway SHALL proxy the request to m2-master and return HTTP 200 with a JSON array.
4. WHEN `GET /api/m2/routings/` is called through the Gateway, THE Gateway SHALL proxy the request to m2-master and return HTTP 200 with a JSON array.
5. WHEN `GET /api/m2/operators/` is called through the Gateway, THE Gateway SHALL proxy the request to m2-master and return HTTP 200 with a JSON array.
6. WHEN `GET /api/m2/shifts/` is called through the Gateway, THE Gateway SHALL proxy the request to m2-master and return HTTP 200 with a JSON array.
7. WHEN `GET /api/m1/work-orders/` is called through the Gateway, THE Gateway SHALL proxy the request to m1-demand and return HTTP 200 with a JSON array.
8. WHEN `GET /api/m1/sales-orders/` is called through the Gateway, THE Gateway SHALL proxy the request to m1-demand and return HTTP 200 with a JSON array.
9. WHEN `GET /api/m1/queue/` is called through the Gateway, THE Gateway SHALL proxy the request to m1-demand and return HTTP 200 with a JSON array.
10. WHEN `GET /api/m5a/coils/` is called through the Gateway, THE Gateway SHALL proxy the request to m5a-material and return HTTP 200 with a JSON array.
11. WHEN `GET /api/m5a/readiness/` is called through the Gateway, THE Gateway SHALL proxy the request to m5a-material and return HTTP 200 with a JSON object.
12. WHEN `GET /api/m5a/inbound/` is called through the Gateway, THE Gateway SHALL proxy the request to m5a-material and return HTTP 200 with a JSON array.
13. WHEN `GET /api/m5a/forecast/` is called through the Gateway, THE Gateway SHALL proxy the request to m5a-material and return HTTP 200 with a JSON object.
14. WHEN `GET /api/m6/dispatch/` is called through the Gateway, THE Gateway SHALL proxy the request to m6-dispatch and return HTTP 200 with a JSON array.
15. WHEN `GET /api/m6/lines/` is called through the Gateway, THE Gateway SHALL proxy the request to m6-dispatch and return HTTP 200 with a JSON array.
16. WHEN `GET /api/m6/live-status` is called through the Gateway with `Accept: text/event-stream`, THE Gateway SHALL stream SSE frames from m6-dispatch with `proxy_buffering off`.
17. WHEN an invalid route is requested through the Gateway, THE Gateway SHALL return HTTP 404 with a JSON body.
18. WHEN an upstream Backend_Service is unavailable, THE Gateway SHALL return HTTP 502 with `{"detail":"Service unavailable"}` rather than an HTML error page.
19. IF a request body fails Pydantic validation in any Backend_Service, THEN THE Backend_Service SHALL return HTTP 422 with a JSON body describing the validation errors.

---

### Requirement 4: Frontend Mock-to-Live Switchover

**User Story:** As a deployment engineer, I want the Ops_Console and Floor_Console
to connect to live Backend_Services when `VITE_USE_MOCK=false`, so that operators
see real data rather than seed fixtures.

#### Acceptance Criteria

1. WHEN `VITE_USE_MOCK=false` and `VITE_API_BASE_URL=http://localhost:8000` are set in the Ops_Console `.env`, THE Ops_Console SHALL route all API calls through the Gateway instead of returning mock data.
2. WHEN `VITE_USE_MOCK=false` and `VITE_API_BASE_URL` is not set, THE Ops_Console SHALL throw an `EnvValidationError` at module load time and display an error rather than silently using an empty base URL.
3. WHEN `VITE_USE_MOCK=true` (the default), THE Ops_Console SHALL serve all four module views (M1, M2, M5a, M6) without any network requests to the Gateway.
4. THE Ops_Console M1 module SHALL fetch work orders from `GET /api/m1/work-orders/` when not in Mock_Mode.
5. THE Ops_Console M2 module SHALL fetch materials, work centres, customers, routings, operators, and shifts from the corresponding `/api/m2/` endpoints when not in Mock_Mode.
6. THE Ops_Console M5a module SHALL fetch coils, readiness, inbound, forecast, pipeline, and KPIs from the corresponding `/api/m5a/` endpoints when not in Mock_Mode.
7. THE Ops_Console M6 module SHALL fetch lines, alerts, and dispatch list from the corresponding `/api/m6/` endpoints when not in Mock_Mode.
8. WHEN `VITE_USE_SSE=true` is set, THE Ops_Console M6 module SHALL open an EventSource to `/api/m6/live-status` for real-time line updates instead of polling.
9. THE Floor_Console SHALL have a `.env.example` file documenting `VITE_API_BASE_URL`, `VITE_USE_MOCK`, and `VITE_PLANT_ID` before deployment.
10. IF the Gateway returns HTTP 502 or 503 for any API call, THEN THE Ops_Console SHALL display an error state in the affected module rather than crashing the entire application.

---

### Requirement 5: Event Messaging Readiness

**User Story:** As a deployment engineer, I want all Redpanda topics to be created
and all Kafka consumers to start without errors, so that inter-service events flow
correctly from day one.

#### Acceptance Criteria

1. WHEN the `redpanda-init` container runs `bootstrap.sh`, THE Redpanda broker SHALL contain all topics listed in the script including `erp.*`, `master.*`, `demand.*`, `floor.*`, `material.*`, `asset.*`, and `energy.*` topics.
2. WHEN the `redpanda-init` container runs `bootstrap.sh` a second time, THE Redpanda broker SHALL not create duplicate topics and SHALL exit with code 0 (idempotent bootstrap).
3. WHEN m1-demand starts, THE m1-demand Backend_Service SHALL successfully start the `run_shortage_consumer` background task and log confirmation within 30 seconds.
4. WHEN m5a-material starts, THE m5a-material Backend_Service SHALL successfully start the `run_erp_consumers` background task and log confirmation within 30 seconds.
5. THE Audit_Runner SHALL verify that the `floor.dispatch.issued`, `demand.priority.recalculated`, `material.coil.shortage_detected`, and `floor.shift.handover_submitted` topics exist and have at least 3 partitions each.
6. IF the Redpanda broker is unreachable at service startup, THEN each Backend_Service SHALL log a connection error and retry with exponential backoff rather than crashing immediately.
7. WHEN an event is published by any Backend_Service, THE event SHALL conform to the `EventEnvelope` schema defined in `backend/shared/zedral_common/event_envelope.py` including `event_id`, `event_type`, `source_service`, `plant_id`, `occurred_at`, and `payload` fields.
8. THE EventEnvelope SHALL include a `signature` field computed from the `EVENT_SIGNING_SECRET` environment variable so that consumers can verify event authenticity.

---

### Requirement 6: Test Coverage Gate

**User Story:** As a deployment engineer, I want all existing tests to pass before
deployment, so that known regressions are caught before they reach production.

#### Acceptance Criteria

1. WHEN `pytest` is run in `backend/services/m2-master/`, THE test suite SHALL pass with zero failures.
2. WHEN `pytest` is run in `backend/services/m1-demand/`, THE test suite SHALL pass with zero failures including the property-based tests in `test_pbt_priority.py`.
3. WHEN `pytest` is run in `backend/services/m5a-material/`, THE test suite SHALL pass with zero failures including the property-based tests in `test_pbt_readiness.py`.
4. WHEN `pytest` is run in `backend/services/m6-dispatch/`, THE test suite SHALL pass with zero failures including `test_pbt_m6.py`, `test_event_idempotency.py`, and `test_status_machine.py`.
5. WHEN `pytest` is run in `backend/shared/`, THE test suite SHALL pass with zero failures including `test_pbt_event_envelope.py` and `test_event_envelope.py`.
6. THE priority scoring property tests SHALL verify all six properties: determinism (P4), rush override adds exactly 50 (P5), hold override zeroes score (P6), expired override treated as no override (P7), queue ordering (P8), and score always non-negative.
7. THE M6 property tests SHALL verify all three properties: event ID uniqueness (P12), status machine determinism (P13), and coil reservation exclusivity (P14).
8. THE M5a property tests SHALL verify the readiness calculation round-trip property: for any valid set of coil weights, computing readiness then re-computing with the same inputs SHALL produce an identical result.
9. WHEN `npm run typecheck` is run in `apps/ops-console/`, THE TypeScript compiler SHALL report zero errors.
10. WHEN `npm run typecheck` is run in `apps/floor-console/`, THE TypeScript compiler SHALL report zero errors.
11. THE Audit_Runner SHALL treat any test failure as a FAIL on the Checklist and block the Deployment_Gate.

---

### Requirement 7: Security Hardening Before Go-Live

**User Story:** As a deployment engineer, I want all development-only security
bypasses removed or replaced before the platform goes live, so that production data
is protected.

#### Acceptance Criteria

1. WHEN deploying to production, THE deployment configuration SHALL set `AUTH_DISABLED=false` in all Backend_Service environment variables so that JWT validation via Keycloak is enforced.
2. WHEN deploying to production, THE deployment configuration SHALL replace `EVENT_SIGNING_SECRET=dev-secret-change-in-production` with a randomly generated secret of at least 32 characters.
3. WHEN deploying to production, THE deployment configuration SHALL replace `POSTGRES_PASSWORD=zedral_dev_password` with a strong password not present in any committed file.
4. THE Gateway `nginx.conf` CORS map SHALL be updated to list only the production frontend origin(s) rather than `localhost:5173` and `localhost:5174`.
5. THE Keycloak `realm-export.json` SHALL define at least three roles — `admin`, `supervisor`, and `operator` — matching the `RBACRole` type used in the Ops_Console.
6. IF `AUTH_DISABLED=true` is detected at startup in a non-development environment, THEN THE Backend_Service SHALL log a prominent warning message indicating that authentication is disabled.
7. THE Audit_Runner SHALL check that no `.env` file containing production secrets is committed to the repository and SHALL mark the Checklist item as FAIL if any such file is found.

---

### Requirement 8: Infrastructure and Docker Readiness

**User Story:** As a deployment engineer, I want the full Docker Compose stack to
start cleanly and all containers to reach a healthy state, so that the platform can
be reliably started and restarted.

#### Acceptance Criteria

1. WHEN `docker compose -f infra/docker-compose.yml -f infra/docker-compose.full.yml up --build` is run on a clean machine, THE Audit_Runner SHALL confirm all seven containers (postgres, redpanda, redpanda-init, keycloak, m2-master, m1-demand, m5a-material, m6-dispatch, nginx-gateway) reach a running or exited-0 state within 5 minutes.
2. THE `docker-compose.full.yml` `nginx-gateway` service SHALL declare `depends_on` conditions for m1-demand and m5a-material using `service_healthy` rather than `service_started` once Requirement 1 acceptance criteria 5 and 6 are satisfied.
3. WHEN any Backend_Service container is restarted with `docker compose restart`, THE Backend_Service SHALL reconnect to PostgreSQL and Redpanda and resume normal operation within 30 seconds.
4. THE `infra/.env.example` file SHALL document every environment variable required by the full stack including `EVENT_SIGNING_SECRET`, `PLANT_ID`, `CORS_ORIGINS`, and `AUTH_DISABLED`.
5. WHEN `docker compose -f infra/docker-compose.yml -f infra/docker-compose.full.yml down -v` is run followed by `up --build`, THE DB_Schema SHALL re-initialise cleanly from the init files without manual intervention.
6. THE `infra/docker-compose.full.yml` SHALL pin all service images to specific version tags rather than `latest` to ensure reproducible builds.
7. IF the PostgreSQL container is not yet healthy when a Backend_Service starts, THEN the Backend_Service SHALL wait for the `service_healthy` condition defined in `depends_on` before attempting database connections.
8. THE Redpanda single-node configuration SHALL allocate at least 512 MB of memory as specified in the `--memory=512M` flag and the Audit_Runner SHALL verify this setting is present.

---

### Requirement 9: Floor Console Deployment Readiness

**User Story:** As a deployment engineer, I want the Floor_Console to be deployable
alongside the Ops_Console, so that operators on the shop floor can use their Andon
interface from day one.

#### Acceptance Criteria

1. THE Floor_Console SHALL have a `.env.example` file at `apps/floor-console/.env.example` documenting all required environment variables before deployment.
2. WHEN `npm run build` is run in `apps/floor-console/`, THE build SHALL complete without errors and produce a `dist/` directory.
3. WHEN `npm run build` is run in `apps/ops-console/`, THE build SHALL complete without errors and produce a `dist/` directory.
4. THE Gateway `nginx.conf` SHALL include location blocks to serve the built `dist/` assets for both Ops_Console and Floor_Console, or the deployment documentation SHALL specify an alternative static file serving strategy.
5. WHEN `VITE_USE_MOCK=false` is set in the Floor_Console, THE Floor_Console SHALL connect to the Gateway at the configured `VITE_API_BASE_URL` for all M6 dispatch and live-status data.
6. THE Floor_Console SHALL display a meaningful error screen when the Gateway is unreachable rather than a blank page.

---

### Requirement 10: Deployment Checklist Report

**User Story:** As a deployment engineer, I want a single consolidated pass/fail
report covering all readiness dimensions, so that I can make a clear go/no-go
decision before each deployment attempt.

#### Acceptance Criteria

1. THE Audit_Runner SHALL produce a Checklist report with one row per requirement group (Backend Health, DB Schema, API Contracts, Frontend Switchover, Event Messaging, Test Coverage, Security, Infrastructure, Floor Console).
2. WHEN all Checklist rows are PASS, THE Audit_Runner SHALL print `DEPLOYMENT GATE: OPEN` and exit with code 0.
3. WHEN any Checklist row is FAIL, THE Audit_Runner SHALL print `DEPLOYMENT GATE: BLOCKED — N items failed` and exit with code 1.
4. THE Checklist report SHALL include the timestamp of the audit run, the Git commit SHA being audited, and the target environment name.
5. THE Checklist report SHALL be written to a file named `deploy-readiness-<timestamp>.txt` in the project root so that it can be archived as a deployment artefact.
6. IF the Audit_Runner cannot reach the Docker Compose stack (e.g. containers not running), THEN THE Audit_Runner SHALL mark all infrastructure-dependent Checklist items as SKIP rather than FAIL and note that the stack must be running for a full audit.
