# Zedral MES — Hero Steels Pilot

Full-stack Manufacturing Execution System covering M1 (Demand), M2 (Master Data), M5a (Material), and M6 (Dispatch & Execution).

## Quick Start

### 1. Environment Setup

```bash
cp infra/.env.example infra/.env
# Edit infra/.env — set POSTGRES_PASSWORD and EVENT_SIGNING_SECRET at minimum
```

### 2. Start the Full Stack

```bash
docker compose -f infra/docker-compose.yml -f infra/docker-compose.full.yml up
```

This starts:
- PostgreSQL (port 5432) — schemas and seed data applied automatically on first run
- Redpanda (port 9092 / 19092) — topics bootstrapped automatically
- M2 Master Data Service (port 8001)
- M1 Demand Service (port 8002)
- M5a Material Service (port 8003)
- M6 Dispatch Service (port 8004)
- Nginx API Gateway (port 8000)

### 3. Connect the Frontends

Ops Console (`:5173`) and Floor Console (`:5174`) both point to the Nginx gateway at `http://localhost:8000`.

```bash
# Ops Console
cd apps/ops-console
cp .env.example .env
# Set VITE_API_BASE_URL=http://localhost:8000
bun run dev

# Floor Console
cd apps/floor-console
cp .env.example .env
bun run dev
```

## Service Ports

| Service | Port | Module |
|---------|------|--------|
| Nginx Gateway | 8000 | All (routes /api/m1/, /api/m2/, /api/m5a/, /api/m6/) |
| M2 Master Data | 8001 | Work centres, materials, operators, routings, shifts |
| M1 Demand | 8002 | Work orders, priority scoring, demand queue |
| M5a Material | 8003 | Coils, readiness, inbound, shortage forecast |
| M6 Dispatch | 8004 | Dispatch lists, execution events, live status, SSE |

## Database

Schemas are applied in order on first `docker compose up`:

```
infra/postgres/init/
  00_extensions.sql     — pgcrypto, uuid-ossp
  01_master_schema.sql  — M2 master tables + stoppage/defect catalogues + rolls
  02_m1_demand_schema.sql
  03_m5a_material_schema.sql
  04_m6_dispatch_schema.sql
  05_seed_data.sql      — Hero Steels pilot data (work centres, operators, WOs, coils)
```

To reset and re-seed:

```bash
docker compose -f infra/docker-compose.yml down -v
docker compose -f infra/docker-compose.yml -f infra/docker-compose.full.yml up
```

## Running Tests

Each service has its own test suite. Run from the service directory:

```bash
# M1 unit + property tests
cd backend/services/m1-demand
pip install -e ../../shared pytest hypothesis
pytest tests/ -v

# M5a unit + property tests
cd backend/services/m5a-material
pytest tests/ -v

# M6 unit + property tests
cd backend/services/m6-dispatch
pytest tests/ -v

# Shared library tests (event envelope)
cd backend/shared
pytest tests/ -v
```

For DB integration tests, set `TEST_DATABASE_URL`:

```bash
TEST_DATABASE_URL=postgresql://zedral:zedral_dev_password@localhost:5432/zedral pytest tests/ -v
```

## API Gateway Routing

The Nginx gateway at `:8000` rewrites paths:

| Frontend calls | Routed to |
|----------------|-----------|
| `/api/m2/*` | `m2-master:8001/api/v1/*` |
| `/api/m1/*` | `m1-demand:8002/api/v1/*` |
| `/api/m5a/*` | `m5a-material:8003/api/v1/*` |
| `/api/m6/*` | `m6-dispatch:8004/api/v1/*` |

SSE (`text/event-stream`) is supported on `/api/m6/live-status` — buffering is disabled for that upstream.

## Environment Variables

All services share this pattern (see `infra/.env.example`):

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDPANDA_BROKERS` | Kafka/Redpanda broker address |
| `CORS_ORIGINS` | Comma-separated allowed origins |
| `AUTH_DISABLED` | Set `true` for local dev (bypasses JWT) |
| `PLANT_ID` | Plant identifier stamped on all events |
| `EVENT_SIGNING_SECRET` | HMAC-SHA256 key for event envelope signing |
