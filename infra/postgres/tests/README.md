# Zedral Database Schema Migration Tests

This directory contains comprehensive tests for the Zedral Database Schema migration.

## Test Coverage

### Unit Tests (Task 6)

1. **Migration Smoke Test (6.2)**
   - Verifies migration applies without errors
   - Verifies table counts per schema match expected values

2. **Idempotency Test (6.3)**
   - Applies migration twice
   - Verifies no errors on second run
   - Verifies seed row counts unchanged (no duplicates)

3. **Seed Data Verification Tests (6.4)**
   - `master.plants`: 1 row, plant_id = 'hsl_ludhiana'
   - `master.work_centres`: 3 rows (CRS-1, CRS-2, CRS-3) with correct gauge/width ranges
   - `master.stoppage_codes`: exactly 16 rows, all 7 rollup buckets represented
   - `master.defect_codes`: at least 20 rows
   - `master.emission_factors`: row with factor_id = 'cea_grid_FY26', kg_co2e_per_kwh = 0.82
   - `m6_dispatch.config`: 5 config keys present

4. **Extension Verification Test (6.5)**
   - Verifies `timescaledb` and `pgcrypto` extensions are present

5. **Index Existence Test (6.6)**
   - Verifies all documented indexes exist for all 4 in-scope schemas

6. **FK Constraint Test (6.7)**
   - Attempts insert into `m6_dispatch.stoppages` with non-existent `stoppage_code_id`
   - Asserts FK violation is raised

7. **Cascade Delete Test (6.8)**
   - Inserts a sales order with items
   - Deletes the sales order
   - Asserts items are also deleted

## Prerequisites

- Docker (for TimescaleDB container)
- Python 3.10+
- pip

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Run all tests
python run_tests.py

# Run specific tests
python run_tests.py -k "test_migration_applies"

# Run with verbose output
python run_tests.py -v

# Run only seed data tests
python run_tests.py -k "TestSeedData"
```

## Manual Test Execution

If you prefer to run tests manually with your own PostgreSQL instance:

```bash
# Set environment variables
export TEST_POSTGRES_HOST=localhost
export TEST_POSTGRES_PORT=5432
export TEST_POSTGRES_USER=postgres
export TEST_POSTGRES_PASSWORD=postgres
export TEST_POSTGRES_DB=zedral_test

# Run pytest directly
pytest -v
```

## Test Structure

```
infra/postgres/tests/
├── __init__.py          # Package marker
├── conftest.py          # Pytest fixtures and Docker container management
├── test_migration.py    # All 8 migration test cases
├── pytest.ini           # Pytest configuration
├── requirements.txt     # Python dependencies
├── run_tests.py         # Test runner script
└── README.md            # This file
```

## Docker Container

Tests use `timescale/timescaledb:latest-pg16` Docker image which provides:
- PostgreSQL 16
- TimescaleDB extension (pre-installed)
- pgcrypto extension (available via CASCADE)

The test runner:
1. Starts a fresh container per test session
2. Creates isolated databases per test function
3. Cleans up containers after tests complete

## Requirements Validated

| Test | Requirements |
|------|-------------|
| Migration Smoke | 10.10, 10.11 |
| Idempotency | 1.10, 10.4, 10.5, 10.7, 10.8 |
| Plants Seed | 2.15 |
| Work Centres Seed | 2.16 |
| Stoppage Codes Seed | 2.18 |
| Defect Codes Seed | 2.19 |
| Emission Factors Seed | 2.17 |
| Dispatch Config Seed | 7.13 |
| Extensions | 1.2, 1.3, 10.6 |
| Index Existence | 2.20, 3.9, 6.9, 7.14, 11.1–11.10 |
| FK Constraint | 7.4 |
| Cascade Delete | 3.2 |
