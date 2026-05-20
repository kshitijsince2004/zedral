-- ============================================================================
-- ZEDRAL PLATFORM DATABASE SCHEMA
-- ============================================================================
--
-- Version:     1.0.0
-- Date:        2025-01-21
-- Description: Production-ready PostgreSQL 16 + TimescaleDB migration covering
--              four operational modules for mid-market Indian steel manufacturers.
--              Anchor pilot: Hero Steels Limited (Ludhiana) - CRS operations.
--
-- Schemas Created:
--   - master       : Shared reference data (plants, work centres, materials,
--                    customers, routings, changeover matrix, resource calendars,
--                    operator skills, rolls, stoppage codes, defect codes,
--                    emission factors, line share by family)
--   - m1_demand    : Demand and order management (sales orders, work orders,
--                    priority scoring, SAP watermarks, validation errors)
--   - m5a_material : Material and inventory control (coils, stage tracking,
--                    WO readiness, pre-allocations, inbound expected,
--                    shortage forecasting)
--   - m6_dispatch  : Dispatch and execution control (dispatch lists, items,
--                    execution events, stoppages, rejects, shift handovers,
--                    setup timings, production passes, roll assignments)
--
-- Deferred Modules (schemas not created in this migration):
--   - m3_capacity  : RCCP snapshots (planned for future release)
--   - m4_schedule  : APS scheduling engine (planned for future release)
--   - m7_performance: KPI tracking (planned for future release)
--   - m8_energy    : Energy monitoring (planned for future release)
--
-- Technology Stack:
--   - PostgreSQL 16
--   - TimescaleDB extension (enabled for future hypertables)
--   - pgcrypto extension (provides gen_random_uuid())
--
-- Prerequisites:
--   - PostgreSQL 16 instance with TimescaleDB installed
--   - Superuser or CREATEROLE privileges for extension creation
--
-- Usage:
--   psql -f 001_zedral_schema.sql
--
-- Idempotency:
--   This migration uses IF NOT EXISTS guards throughout and ON CONFLICT DO NOTHING
--   for seed data, making it safe to re-run without errors.
--
-- ============================================================================


-- ============================================================================
-- EXTENSIONS
-- ============================================================================

-- Enable TimescaleDB extension for time-series data with automatic partitioning
-- CASCADE ensures dependent extensions are also installed
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- Enable pgcrypto extension for gen_random_uuid() function
CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ============================================================================
-- SCHEMA DECLARATIONS
-- ============================================================================

-- Create schemas for the four in-scope modules
-- Each schema corresponds to a distinct domain within the Zedral platform

-- master: Shared reference data used across all modules
-- Contains plants, work centres, materials, customers, routings, changeover matrix,
-- resource calendars, operator skills, rolls, stoppage codes, defect codes,
-- emission factors, and line share by family
CREATE SCHEMA IF NOT EXISTS master;

-- m1_demand: Demand and order management
-- Contains sales orders, sales order items, work orders, WO-SO links,
-- priority score history, priority overrides, SAP watermarks, and validation errors
CREATE SCHEMA IF NOT EXISTS m1_demand;

-- m5a_material: Material and inventory control
-- Contains coils, coil stage history, WO readiness, pre-allocations,
-- inbound expected, shortage forecast, shortage forecast lines, and SAP watermarks
CREATE SCHEMA IF NOT EXISTS m5a_material;

-- m6_dispatch: Dispatch and execution control
-- Contains dispatch lists, dispatch items, execution events, stoppages, rejects,
-- shift handovers, setup timings, production passes, roll assignments, roll changes,
-- shift crew assignments, and config
CREATE SCHEMA IF NOT EXISTS m6_dispatch;


-- ============================================================================
-- MASTER SCHEMA
-- ============================================================================

-- master: Shared reference data used across all modules
-- Contains canonical plant entities, routing definitions, changeover times,
-- and resource availability that other modules reference.


-- ============================================================================
-- master.plants
-- ============================================================================
-- One row per manufacturing site.
-- The plant_id is a natural key used across all modules for multi-plant scenarios.

CREATE TABLE IF NOT EXISTS master.plants (
    plant_id    TEXT PRIMARY KEY,                    -- e.g. 'hsl_ludhiana'
    name        TEXT NOT NULL,                       -- Full legal name
    location    TEXT NOT NULL,                       -- City/region
    timezone    TEXT NOT NULL,                       -- IANA timezone, e.g. 'Asia/Kolkata'
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE master.plants IS 'Manufacturing sites (plants). One row per plant. plant_id is a natural key.';

-- Seed Hero Steels Limited (Ludhiana)
INSERT INTO master.plants (plant_id, name, location, timezone)
VALUES ('hsl_ludhiana', 'Hero Steels Limited', 'Ludhiana', 'Asia/Kolkata')
ON CONFLICT (plant_id) DO NOTHING;


-- ============================================================================
-- master.work_centres
-- ============================================================================
-- CRS production lines and other work centres.
-- gauge/width ranges define the capability envelope for scheduling.
-- rated_speed_mt_hr is used for capacity calculations.

CREATE TABLE IF NOT EXISTS master.work_centres (
    wc_id              TEXT PRIMARY KEY,             -- e.g. 'CRS-1', 'CRS-2', 'CRS-3'
    plant_id           TEXT REFERENCES master.plants,
    name               TEXT NOT NULL,                -- Display name
    wc_type            TEXT NOT NULL,                -- e.g. 'crs_6hi', 'temper'
    gauge_min_mm       NUMERIC(6,3),                 -- Minimum gauge capability
    gauge_max_mm       NUMERIC(6,3),                 -- Maximum gauge capability
    width_min_mm       INTEGER,                      -- Minimum width capability
    width_max_mm       INTEGER,                      -- Maximum width capability
    rated_speed_mt_hr  NUMERIC(8,2),                 -- Rated throughput in MT/hr
    is_active          BOOLEAN DEFAULT TRUE,
    created_at         TIMESTAMPTZ DEFAULT now(),
    updated_at         TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE master.work_centres IS 'Production lines (work centres). gauge/width ranges define capability envelope. rated_speed_mt_hr used for capacity planning.';

-- Seed CRS-1, CRS-2, CRS-3 for Hero Steels
INSERT INTO master.work_centres (wc_id, plant_id, name, wc_type, gauge_min_mm, gauge_max_mm, width_min_mm, width_max_mm, rated_speed_mt_hr, is_active)
VALUES
    ('CRS-1', 'hsl_ludhiana', 'CRS Line 1', 'crs_6hi', 0.15, 2.0, 600, 1350, 25.0, TRUE),
    ('CRS-2', 'hsl_ludhiana', 'CRS Line 2', 'crs_6hi', 0.15, 2.0, 600, 1350, 25.0, TRUE),
    ('CRS-3', 'hsl_ludhiana', 'CRS Line 3 (Temper)', 'temper', 0.20, 3.0, 600, 1350, 30.0, TRUE)
ON CONFLICT (wc_id) DO NOTHING;


-- ============================================================================
-- master.materials
-- ============================================================================
-- SAP material master. One row per unique material code.
-- gauge_mm and width_mm are key dimensions for scheduling and allocation.

CREATE TABLE IF NOT EXISTS master.materials (
    material_code  TEXT PRIMARY KEY,                 -- SAP material number
    description    TEXT,                             -- Material description
    material_type  TEXT,                             -- e.g. 'HR_COIL', 'CR_COIL'
    grade          TEXT,                             -- e.g. 'IS513-CR1', 'IS513-CR2'
    gauge_mm       NUMERIC(6,3),                     -- Thickness in mm
    width_mm       INTEGER,                          -- Width in mm
    is_active      BOOLEAN DEFAULT TRUE,
    created_at     TIMESTAMPTZ DEFAULT now(),
    updated_at     TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE master.materials IS 'SAP material master. material_code is natural key. gauge_mm and width_mm are key dimensions for scheduling.';


-- ============================================================================
-- master.customers
-- ============================================================================
-- Customer master with priority classification.
-- priority_class is used for work order priority scoring.

CREATE TABLE IF NOT EXISTS master.customers (
    customer_id      TEXT PRIMARY KEY,               -- SAP customer number
    name             TEXT NOT NULL,
    priority_class   CHAR(1) CHECK (priority_class IN ('A', 'B', 'C')),  -- A = highest priority
    sap_customer_ref TEXT,                           -- Additional SAP reference
    created_at       TIMESTAMPTZ DEFAULT now(),
    updated_at       TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE master.customers IS 'Customer master. priority_class (A/B/C) used for WO priority scoring. A = highest priority.';


-- ============================================================================
-- master.routings
-- ============================================================================
-- Routing definitions: sequence of operations to produce a material.
-- is_multi_pass indicates if multiple rolling passes are required (6-HI mill).

CREATE TABLE IF NOT EXISTS master.routings (
    routing_id    TEXT PRIMARY KEY,
    material_code TEXT REFERENCES master.materials,
    version       INTEGER DEFAULT 1,
    is_active     BOOLEAN DEFAULT TRUE,
    is_multi_pass BOOLEAN DEFAULT FALSE,             -- true for 6-HI multi-pass rolling
    created_at    TIMESTAMPTZ DEFAULT now(),
    updated_at    TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE master.routings IS 'Routing definitions: sequence of operations to produce a material. is_multi_pass = true for 6-HI multi-pass rolling.';


-- ============================================================================
-- master.routing_operations
-- ============================================================================
-- Individual operations within a routing.
-- Each routing has one or more operations with sequence numbers.
-- std_rate_mt_hr is the standard production rate for capacity planning.

CREATE TABLE IF NOT EXISTS master.routing_operations (
    routing_id      TEXT REFERENCES master.routings,
    op_seq          INTEGER,                         -- Operation sequence number
    wc_type         TEXT,                            -- Work centre type for this op
    std_rate_mt_hr  NUMERIC(8,2) NOT NULL,           -- Standard rate in MT/hr
    min_qty_mt      NUMERIC(10,3),                   -- Minimum batch size
    max_qty_mt      NUMERIC(10,3),                   -- Maximum batch size
    PRIMARY KEY (routing_id, op_seq)
);

COMMENT ON TABLE master.routing_operations IS 'Individual operations within a routing. std_rate_mt_hr is standard production rate for capacity planning.';


-- ============================================================================
-- master.changeover_matrix
-- ============================================================================
-- Core scheduling input: maps (from-state) → (to-state) → setup_min.
-- Populated from historical setup timing observations.
-- Used by APS scheduler to calculate changeover times between jobs.

CREATE TABLE IF NOT EXISTS master.changeover_matrix (
    matrix_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wc_id             TEXT REFERENCES master.work_centres,
    grade_from        TEXT,
    grade_to          TEXT NOT NULL,
    gauge_from_mm     NUMERIC(6,3),
    gauge_to_mm       NUMERIC(6,3) NOT NULL,
    width_from_mm     INTEGER,
    width_to_mm       INTEGER NOT NULL,
    gauge_step        TEXT,                          -- 'same', 'up', 'down'
    width_step        TEXT,                          -- 'same', 'up', 'down'
    roll_change_reqd  BOOLEAN DEFAULT FALSE,
    setup_min         INTEGER NOT NULL CHECK (setup_min > 0),  -- Setup time must be positive
    sample_count      INTEGER DEFAULT 0,             -- Number of observations
    last_updated_from TEXT,                          -- 'seed', 'observed', 'planner'
    created_at        TIMESTAMPTZ DEFAULT now(),
    updated_at        TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE master.changeover_matrix IS 'Changeover setup times: (from-state) → (to-state) → setup_min. Core scheduling input for APS. setup_min must be > 0.';

-- Index for scheduler lookup: find setup_min for a transition
CREATE INDEX IF NOT EXISTS idx_changeover_matrix_lookup
    ON master.changeover_matrix (wc_id, grade_from, grade_to, gauge_step, width_step);


-- ============================================================================
-- master.resource_calendars
-- ============================================================================
-- Shift availability per work centre per day.
-- Used by RCCP and APS for capacity calculations.

CREATE TABLE IF NOT EXISTS master.resource_calendars (
    calendar_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wc_id          TEXT REFERENCES master.work_centres,
    calendar_date  DATE NOT NULL,
    shift          CHAR(1) NOT NULL,                 -- 'A', 'B', 'C'
    shift_start    TIMESTAMPTZ NOT NULL,
    shift_end      TIMESTAMPTZ NOT NULL,
    available_hrs  NUMERIC(5,2) NOT NULL CHECK (available_hrs >= 0),  -- Must be non-negative
    is_holiday     BOOLEAN DEFAULT FALSE,
    pm_hrs         NUMERIC(5,2) DEFAULT 0,           -- Planned maintenance hours
    notes          TEXT,
    UNIQUE (wc_id, calendar_date, shift)
);

COMMENT ON TABLE master.resource_calendars IS 'Shift availability per work centre per day. available_hrs must be >= 0. Used by RCCP and APS for capacity.';

-- Index for capacity planning: available hours for a WC on a date
CREATE INDEX IF NOT EXISTS idx_resource_calendars_lookup
    ON master.resource_calendars (wc_id, calendar_date);


-- ============================================================================
-- master.operator_skills
-- ============================================================================
-- Operator certification matrix: which operators can run which WC/grade combinations.

CREATE TABLE IF NOT EXISTS master.operator_skills (
    operator_id   TEXT NOT NULL,
    wc_id         TEXT REFERENCES master.work_centres,
    grade_family  TEXT NOT NULL,
    certified     BOOLEAN DEFAULT FALSE,
    certified_at  DATE,
    PRIMARY KEY (operator_id, wc_id, grade_family)
);

COMMENT ON TABLE master.operator_skills IS 'Operator certification matrix. Tracks which operators are certified for which WC/grade combinations.';


-- ============================================================================
-- master.rolls
-- ============================================================================
-- v0.2: Full roll lifecycle tracking for 6-HI mill.
-- Tracks cumulative tonnage, grind cycles, and expected life for roll management.

CREATE TABLE IF NOT EXISTS master.rolls (
    roll_id                  TEXT PRIMARY KEY,
    wc_id                    TEXT REFERENCES master.work_centres,  -- Home work centre
    roll_type                TEXT NOT NULL,                        -- 'work_roll_top', 'work_roll_bottom', 'intermediate', 'backup'
    roll_finish              TEXT,                                 -- Surface finish designation
    current_wc_id            TEXT REFERENCES master.work_centres,  -- Current location (if different from home)
    current_position         TEXT,                                 -- 'top', 'bottom', 'intermediate_top', etc.
    cumulative_tonnage_mt    NUMERIC(10,3) DEFAULT 0 CHECK (cumulative_tonnage_mt >= 0),
    tonnage_since_grind_mt   NUMERIC(10,3) DEFAULT 0 CHECK (tonnage_since_grind_mt >= 0),
    last_grind_date          DATE,
    grind_cycle_count        INTEGER DEFAULT 0,
    expected_life_mt         NUMERIC(10,3),                        -- Expected total life in tonnes
    is_active                BOOLEAN DEFAULT TRUE,
    created_at               TIMESTAMPTZ DEFAULT now(),
    updated_at               TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE master.rolls IS 'v0.2: Roll lifecycle tracking. cumulative_tonnage_mt and tonnage_since_grind_mt must be >= 0. Used for roll change scheduling.';


-- ============================================================================
-- master.stoppage_codes
-- ============================================================================
-- Catalogue of stoppage classification codes.
-- rollup_bucket groups detailed codes into 7 categories for reporting.
-- Hero Steels uses 16 specific codes mapped to these buckets.

CREATE TABLE IF NOT EXISTS master.stoppage_codes (
    code_id        TEXT PRIMARY KEY,
    code           TEXT NOT NULL UNIQUE,
    description    TEXT NOT NULL,
    rollup_bucket  TEXT NOT NULL CHECK (rollup_bucket IN (
        'breakdown',        -- Equipment failure
        'material_wait',    -- Waiting for material
        'quality_hold',     -- Quality issue
        'tool_change',      -- Roll change, setup
        'power',            -- Power outage
        'operator_break',   -- Operator break
        'other'             -- Other reasons
    )),
    is_active      BOOLEAN DEFAULT TRUE,
    sort_order     INTEGER,
    created_at     TIMESTAMPTZ DEFAULT now(),
    updated_at     TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE master.stoppage_codes IS 'Stoppage classification codes. rollup_bucket has 7 values: breakdown, material_wait, quality_hold, tool_change, power, operator_break, other. Hero Steels uses 16 codes.';

-- Seed 16 Hero Steels stoppage codes
INSERT INTO master.stoppage_codes (code_id, code, description, rollup_bucket, is_active, sort_order)
VALUES
    -- Breakdown codes (equipment failures)
    ('HS_ST_001', 'BD-ROLL', 'Roll failure / breakage', 'breakdown', TRUE, 1),
    ('HS_ST_002', 'BD-GEAR', 'Gearbox failure', 'breakdown', TRUE, 2),
    ('HS_ST_003', 'BD-ELEC', 'Electrical fault', 'breakdown', TRUE, 3),
    ('HS_ST_004', 'BD-HYD', 'Hydraulic system failure', 'breakdown', TRUE, 4),
    
    -- Material wait codes
    ('HS_ST_005', 'MW-COIL', 'Waiting for HR coil from stores', 'material_wait', TRUE, 5),
    ('HS_ST_006', 'MW-CRANE', 'Waiting for crane', 'material_wait', TRUE, 6),
    
    -- Quality hold codes
    ('HS_ST_007', 'QH-TEST', 'Waiting for lab test results', 'quality_hold', TRUE, 7),
    ('HS_ST_008', 'QH-INSPECT', 'Quality inspection hold', 'quality_hold', TRUE, 8),
    
    -- Tool change codes (roll changes, setup)
    ('HS_ST_009', 'TC-ROLL', 'Planned roll change', 'tool_change', TRUE, 9),
    ('HS_ST_010', 'TC-SETUP', 'Grade/gauge changeover', 'tool_change', TRUE, 10),
    
    -- Power codes
    ('HS_ST_011', 'PWR-OUT', 'Power outage', 'power', TRUE, 11),
    ('HS_ST_012', 'PWR-FLUCT', 'Power fluctuation', 'power', TRUE, 12),
    
    -- Operator break codes
    ('HS_ST_013', 'OP-BREAK', 'Operator tea/lunch break', 'operator_break', TRUE, 13),
    ('HS_ST_014', 'OP-SHIFT', 'Shift changeover', 'operator_break', TRUE, 14),
    
    -- Other codes
    ('HS_ST_015', 'OTH-MEET', 'Production meeting', 'other', TRUE, 15),
    ('HS_ST_016', 'OTH-OTHER', 'Other unplanned stoppage', 'other', TRUE, 16)
ON CONFLICT (code_id) DO NOTHING;


-- ============================================================================
-- master.defect_codes
-- ============================================================================
-- Catalogue of quality defect codes for cold rolling.
-- Hero Steels uses 20+ codes covering edge, surface, shape, and dimensional defects.

CREATE TABLE IF NOT EXISTS master.defect_codes (
    code_id          TEXT PRIMARY KEY,
    code             TEXT NOT NULL UNIQUE,
    description      TEXT NOT NULL,
    defect_category  TEXT NOT NULL,                  -- 'edge', 'surface', 'shape', 'dimensional'
    severity         TEXT,                           -- 'critical', 'major', 'minor'
    is_active        BOOLEAN DEFAULT TRUE,
    sort_order       INTEGER,
    created_at       TIMESTAMPTZ DEFAULT now(),
    updated_at       TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE master.defect_codes IS 'Quality defect codes for cold rolling. defect_category: edge, surface, shape, dimensional. Hero Steels uses 20+ codes.';

-- Seed 24 Hero Steels defect codes covering major cold-rolling defect categories
INSERT INTO master.defect_codes (code_id, code, description, defect_category, severity, is_active, sort_order)
VALUES
    -- Edge defects
    ('HS_DF_001', 'EDGE-CRACK', 'Edge cracking', 'edge', 'major', TRUE, 1),
    ('HS_DF_002', 'EDGE-TEAR', 'Edge tear', 'edge', 'major', TRUE, 2),
    ('HS_DF_003', 'EDGE-BURR', 'Edge burr', 'edge', 'minor', TRUE, 3),
    ('HS_DF_004', 'EDGE-WAVY', 'Wavy edge', 'edge', 'minor', TRUE, 4),
    
    -- Surface defects
    ('HS_DF_005', 'SURF-SCRATCH', 'Surface scratch', 'surface', 'major', TRUE, 5),
    ('HS_DF_006', 'SURF-ROLL-MARK', 'Roll mark on surface', 'surface', 'major', TRUE, 6),
    ('HS_DF_007', 'SURF-PICKUP', 'Material pickup on surface', 'surface', 'major', TRUE, 7),
    ('HS_DF_008', 'SURF-SCALE', 'Scale residue', 'surface', 'minor', TRUE, 8),
    ('HS_DF_009', 'SURF-RUST', 'Rust spots', 'surface', 'major', TRUE, 9),
    ('HS_DF_010', 'SURF-INDENT', 'Surface indentation', 'surface', 'minor', TRUE, 10),
    ('HS_DF_011', 'SURF-OIL', 'Oil stain', 'surface', 'minor', TRUE, 11),
    ('HS_DF_012', 'SURF-STREAK', 'Surface streak', 'surface', 'minor', TRUE, 12),
    
    -- Shape defects
    ('HS_DF_013', 'SHAPE-CENTER-WAVE', 'Center wave', 'shape', 'major', TRUE, 13),
    ('HS_DF_014', 'SHAPE-EDGE-WAVE', 'Edge wave', 'shape', 'major', TRUE, 14),
    ('HS_DF_015', 'SHAPE-CROSS-BOW', 'Cross bow', 'shape', 'major', TRUE, 15),
    ('HS_DF_016', 'SHAPE-LONG-BOW', 'Longitudinal bow', 'shape', 'major', TRUE, 16),
    ('HS_DF_017', 'SHAPE-TWIST', 'Coil twist', 'shape', 'major', TRUE, 17),
    ('HS_DF_018', 'SHAPE-CAMBER', 'Camber defect', 'shape', 'minor', TRUE, 18),
    
    -- Dimensional defects
    ('HS_DF_019', 'DIM-THICK-HIGH', 'Thickness above tolerance', 'dimensional', 'major', TRUE, 19),
    ('HS_DF_020', 'DIM-THICK-LOW', 'Thickness below tolerance', 'dimensional', 'major', TRUE, 20),
    ('HS_DF_021', 'DIM-THICK-VAR', 'Thickness variation', 'dimensional', 'major', TRUE, 21),
    ('HS_DF_022', 'DIM-WIDTH-HIGH', 'Width above tolerance', 'dimensional', 'minor', TRUE, 22),
    ('HS_DF_023', 'DIM-WIDTH-LOW', 'Width below tolerance', 'dimensional', 'minor', TRUE, 23),
    ('HS_DF_024', 'DIM-LENGTH', 'Length out of specification', 'dimensional', 'minor', TRUE, 24)
ON CONFLICT (code_id) DO NOTHING;


-- ============================================================================
-- master.emission_factors
-- ============================================================================
-- Emission factors for carbon footprint calculation.
-- Scope 2 = indirect emissions from purchased electricity.
-- CEA = Central Electricity Authority (India) grid factor.

CREATE TABLE IF NOT EXISTS master.emission_factors (
    factor_id        TEXT PRIMARY KEY,               -- e.g. 'cea_grid_FY26'
    source           TEXT NOT NULL,                  -- 'CEA', 'DISCOM', etc.
    fiscal_year      TEXT NOT NULL,                  -- e.g. 'FY2025-26'
    scope            CHAR(1) NOT NULL,               -- '2' for Scope 2 (grid electricity)
    kg_co2e_per_kwh  NUMERIC(8,5) NOT NULL,          -- kg CO2 equivalent per kWh
    valid_from       DATE NOT NULL,                  -- Start of validity period
    valid_to         DATE,                           -- End of validity period (NULL = current)
    citation         TEXT,                           -- Reference document
    created_at       TIMESTAMPTZ DEFAULT now(),
    updated_at       TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE master.emission_factors IS 'Emission factors for carbon footprint. Scope 2 = grid electricity. CEA grid factor is authoritative for India.';

-- Seed CEA grid emission factor for FY2025-26
INSERT INTO master.emission_factors (factor_id, source, fiscal_year, scope, kg_co2e_per_kwh, valid_from, citation)
VALUES ('cea_grid_FY26', 'CEA', 'FY2025-26', '2', 0.82000, '2025-04-01', 'Central Electricity Authority Grid Emission Factor')
ON CONFLICT (factor_id) DO NOTHING;


-- ============================================================================
-- master.line_share_by_family
-- ============================================================================
-- Historical proportion of production allocated to each CRS line for a grade family.
-- Used by scheduler to distribute work across eligible lines.

CREATE TABLE IF NOT EXISTS master.line_share_by_family (
    wc_id           TEXT REFERENCES master.work_centres,
    grade_family    TEXT NOT NULL,                   -- e.g. 'IS513', 'DD11'
    share_pct       NUMERIC(5,2) NOT NULL,           -- Percentage share (0-100)
    based_on_days   INTEGER,                         -- Number of days of history used
    calculated_at   TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (wc_id, grade_family)
);

COMMENT ON TABLE master.line_share_by_family IS 'Historical production share per line per grade family. Used by scheduler to distribute work across eligible CRS lines.';


-- ============================================================================
-- M1_DEMAND SCHEMA
-- ============================================================================

-- m1_demand: Demand and order management
-- Contains sales orders, sales order items, work orders, WO-SO links,
-- priority score history, priority overrides, SAP watermarks, and validation errors.
-- Data is sourced from SAP SD (sales orders) and SAP PP (work orders).


-- ============================================================================
-- m1_demand.sales_orders
-- ============================================================================
-- Sales orders from SAP SD module.
-- One row per sales order with customer reference, dates, and status.
-- raw_sap_payload stores the complete OData response for audit and replay.

CREATE TABLE IF NOT EXISTS m1_demand.sales_orders (
    so_id             TEXT PRIMARY KEY,                -- SAP sales order ID
    sap_so_ref        TEXT NOT NULL,                  -- SAP document reference
    customer_id       TEXT NOT NULL REFERENCES master.customers,
    customer_po_ref   TEXT,                           -- Customer's purchase order
    order_date        DATE NOT NULL,
    required_date     DATE NOT NULL,                  -- Customer requested delivery date
    total_qty_mt      NUMERIC(10,3) NOT NULL,         -- Total quantity in metric tonnes
    status            TEXT NOT NULL CHECK (status IN ('open', 'partial', 'fulfilled', 'cancelled')),
    sales_org         TEXT,                           -- Sales organization
    currency          CHAR(3) DEFAULT 'INR',
    net_value         NUMERIC(14,2),                  -- Total order value
    sap_modified_at   TIMESTAMPTZ NOT NULL,           -- Last modified timestamp from SAP
    ingested_at       TIMESTAMPTZ DEFAULT now(),      -- When this row was ingested
    updated_at        TIMESTAMPTZ DEFAULT now(),
    version           INTEGER DEFAULT 1,              -- Optimistic locking version
    raw_sap_payload   JSONB                           -- Full SAP OData response for audit
);

COMMENT ON TABLE m1_demand.sales_orders IS 'Sales orders from SAP SD. status: open/partial/fulfilled/cancelled. raw_sap_payload stores full OData response for audit.';

-- Index for customer queries
CREATE INDEX IF NOT EXISTS idx_sales_orders_customer
    ON m1_demand.sales_orders (customer_id);

-- Index for SAP sync queries (find orders modified since last sync)
CREATE INDEX IF NOT EXISTS idx_sales_orders_sap_modified
    ON m1_demand.sales_orders (sap_modified_at);


-- ============================================================================
-- m1_demand.sales_order_items
-- ============================================================================
-- Line items within a sales order.
-- CASCADE DELETE: when a sales order is deleted, its items are removed.
-- Each item has material, dimensions, and quantity.

CREATE TABLE IF NOT EXISTS m1_demand.sales_order_items (
    so_id              TEXT REFERENCES m1_demand.sales_orders ON DELETE CASCADE,
    item_no            INTEGER NOT NULL,              -- Line item number
    material_code      TEXT NOT NULL REFERENCES master.materials,
    grade              TEXT NOT NULL,                 -- Material grade
    gauge_mm           NUMERIC(6,3) NOT NULL,         -- Thickness in mm
    width_mm           INTEGER NOT NULL,              -- Width in mm
    qty_mt             NUMERIC(10,3) NOT NULL,        -- Ordered quantity in MT
    qty_fulfilled_mt   NUMERIC(10,3) DEFAULT 0,       -- Quantity fulfilled
    item_required_date DATE,                          -- Item-level required date
    customer_spec_ref  TEXT,                          -- Customer specification reference
    PRIMARY KEY (so_id, item_no)
);

COMMENT ON TABLE m1_demand.sales_order_items IS 'Line items within a sales order. CASCADE DELETE from sales_orders. Each item has material, dimensions, quantity.';


-- ============================================================================
-- m1_demand.work_orders
-- ============================================================================
-- Work orders (production orders) from SAP PP module.
-- Status machine: pending → queued → scheduled → released → in_process → complete
-- Terminal states: cancelled, on_hold, rejected
-- qty_planned_mt must be > 0 (CHECK constraint).
-- Partial index on (status, priority_score) for queued/scheduled WOs.

CREATE TABLE IF NOT EXISTS m1_demand.work_orders (
    wo_id              TEXT PRIMARY KEY,              -- Work order ID
    sap_wo_ref         TEXT NOT NULL,                 -- SAP production order reference
    parent_wo_id       TEXT REFERENCES m1_demand.work_orders,  -- For sub-work orders
    material_code      TEXT NOT NULL REFERENCES master.materials,
    grade              TEXT NOT NULL,
    gauge_mm           NUMERIC(6,3) NOT NULL,
    width_mm           INTEGER NOT NULL,
    qty_planned_mt     NUMERIC(10,3) NOT NULL CHECK (qty_planned_mt > 0),  -- Must be positive
    qty_confirmed_mt   NUMERIC(10,3) DEFAULT 0,       -- Quantity confirmed produced
    qty_scrap_mt       NUMERIC(10,3) DEFAULT 0,       -- Scrap quantity
    required_date      DATE NOT NULL,                 -- Required completion date
    planned_start_date DATE,                          -- Planned start date from scheduler
    routing_id         TEXT REFERENCES master.routings,
    routing_valid      BOOLEAN DEFAULT FALSE,         -- Routing validation status
    priority_class     CHAR(1),                       -- 'A', 'B', 'C' from customer priority
    priority_score     NUMERIC(6,3),                  -- Calculated priority score
    priority_manual    BOOLEAN DEFAULT FALSE,         -- Manual override flag
    priority_reason    TEXT,                          -- Reason for priority override
    wo_type            TEXT NOT NULL CHECK (wo_type IN ('customer', 'internal', 'rework')),
    status             TEXT NOT NULL CHECK (status IN (
        'pending',      -- Initial state
        'queued',       -- Queued for scheduling
        'scheduled',    -- Assigned to a schedule
        'released',     -- Released for production
        'in_process',   -- Currently being produced
        'complete',     -- Production complete
        'cancelled',    -- Cancelled (terminal)
        'on_hold',      -- On hold (terminal)
        'rejected'      -- Rejected (terminal)
    )),
    hold_reason        TEXT,                          -- Reason for on_hold status
    rejection_reason   TEXT,                          -- Reason for rejection
    sap_modified_at    TIMESTAMPTZ NOT NULL,
    ingested_at        TIMESTAMPTZ DEFAULT now(),
    updated_at         TIMESTAMPTZ DEFAULT now(),
    version            INTEGER DEFAULT 1,
    raw_sap_payload    JSONB
);

COMMENT ON TABLE m1_demand.work_orders IS 'Work orders from SAP PP. Status machine: pending → queued → scheduled → released → in_process → complete. Terminal states: cancelled, on_hold, rejected. qty_planned_mt > 0.';

-- Partial index for priority queue queries (only queued/scheduled WOs)
CREATE INDEX IF NOT EXISTS idx_work_orders_priority_queue
    ON m1_demand.work_orders (status, priority_score DESC)
    WHERE status IN ('queued', 'scheduled');

-- Index for date-based queries
CREATE INDEX IF NOT EXISTS idx_work_orders_required_date
    ON m1_demand.work_orders (required_date);

-- Index for SAP sync queries
CREATE INDEX IF NOT EXISTS idx_work_orders_sap_modified
    ON m1_demand.work_orders (sap_modified_at);


-- ============================================================================
-- m1_demand.wo_so_link
-- ============================================================================
-- Many-to-many link between work orders and sales order items.
-- One WO can fulfil multiple SO items; one SO item can draw from multiple WOs.
-- Composite FK to sales_order_items ensures referential integrity.

CREATE TABLE IF NOT EXISTS m1_demand.wo_so_link (
    wo_id            TEXT REFERENCES m1_demand.work_orders,
    so_id            TEXT,
    so_item_no       INTEGER,
    allocated_qty_mt NUMERIC(10,3) NOT NULL,          -- Quantity allocated from WO to SO item
    PRIMARY KEY (wo_id, so_id, so_item_no),
    FOREIGN KEY (so_id, so_item_no) REFERENCES m1_demand.sales_order_items
);

COMMENT ON TABLE m1_demand.wo_so_link IS 'Many-to-many link: WOs to SO items. One WO can fulfil multiple SO items; one SO item can draw from multiple WOs.';


-- ============================================================================
-- m1_demand.priority_score_history
-- ============================================================================
-- BIGSERIAL: High-volume append-only audit trail for priority score changes.
-- score_components JSONB stores breakdown of scoring factors.
-- trigger values: ingestion, scheduled_recalc, override, event_driven.

CREATE TABLE IF NOT EXISTS m1_demand.priority_score_history (
    history_id       BIGSERIAL PRIMARY KEY,           -- Auto-incrementing ID
    wo_id            TEXT NOT NULL REFERENCES m1_demand.work_orders,
    calculated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    priority_score   NUMERIC(6,3) NOT NULL,
    priority_class   CHAR(1) NOT NULL,                -- 'A', 'B', 'C'
    score_components JSONB NOT NULL,                  -- Breakdown of scoring factors
    trigger          TEXT NOT NULL CHECK (trigger IN (
        'ingestion',        -- Initial ingestion from SAP
        'scheduled_recalc', -- Scheduled recalculation
        'override',         -- Manual override
        'event_driven'      -- Triggered by an event
    )),
    triggered_by     TEXT                              -- User or system that triggered
);

COMMENT ON TABLE m1_demand.priority_score_history IS 'BIGSERIAL append-only audit trail for priority scores. trigger: ingestion/scheduled_recalc/override/event_driven. score_components stores factor breakdown.';

-- Index for WO priority history queries
CREATE INDEX IF NOT EXISTS idx_priority_score_history_wo
    ON m1_demand.priority_score_history (wo_id, calculated_at DESC);


-- ============================================================================
-- m1_demand.priority_overrides
-- ============================================================================
-- Manual priority overrides by planners.
-- override_type: rush, defer, hold, release_hold.
-- Partial index on active overrides only.

CREATE TABLE IF NOT EXISTS m1_demand.priority_overrides (
    override_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wo_id          TEXT NOT NULL REFERENCES m1_demand.work_orders,
    override_type  TEXT NOT NULL CHECK (override_type IN ('rush', 'defer', 'hold', 'release_hold')),
    old_score      NUMERIC(6,3),                      -- Previous priority score
    new_score      NUMERIC(6,3),                      -- New priority score
    reason         TEXT NOT NULL,                     -- Justification for override
    overridden_by  TEXT NOT NULL,                     -- User who made the override
    overridden_at  TIMESTAMPTZ DEFAULT now(),
    expires_at     TIMESTAMPTZ,                       -- Optional expiry time
    is_active      BOOLEAN DEFAULT TRUE
);

COMMENT ON TABLE m1_demand.priority_overrides IS 'Manual priority overrides. override_type: rush/defer/hold/release_hold. is_active indicates if override is still in effect.';

-- Partial index for active overrides only
CREATE INDEX IF NOT EXISTS idx_priority_overrides_active
    ON m1_demand.priority_overrides (wo_id)
    WHERE is_active = TRUE;


-- ============================================================================
-- m1_demand.sap_watermarks
-- ============================================================================
-- Tracks last-synced timestamp per SAP entity for incremental pulls.
-- entity values: 'work_orders', 'sales_orders'.
-- Used by SAP_Sync_Worker to determine delta pull starting point.

CREATE TABLE IF NOT EXISTS m1_demand.sap_watermarks (
    entity              TEXT PRIMARY KEY CHECK (entity IN ('work_orders', 'sales_orders')),
    last_synced_at      TIMESTAMPTZ NOT NULL,         -- When Zedral last synced
    last_sap_modified   TIMESTAMPTZ NOT NULL,         -- Last SAP modification timestamp seen
    rows_last_pull      INTEGER,                      -- Rows retrieved in last pull
    duration_ms_last    INTEGER,                      -- Duration of last pull in ms
    status_last         TEXT,                         -- 'success', 'error', 'partial'
    error_message_last  TEXT                          -- Error message if failed
);

COMMENT ON TABLE m1_demand.sap_watermarks IS 'SAP sync watermarks. entity: work_orders/sales_orders. Used by SAP_Sync_Worker for incremental delta pulls.';


-- ============================================================================
-- m1_demand.validation_errors
-- ============================================================================
-- BIGSERIAL append-only error log for work order validation failures.
-- error_detail JSONB stores structured error information.
-- Resolved errors have resolved_at and resolution_note populated.

CREATE TABLE IF NOT EXISTS m1_demand.validation_errors (
    error_id         BIGSERIAL PRIMARY KEY,
    wo_id            TEXT NOT NULL REFERENCES m1_demand.work_orders,
    error_type       TEXT NOT NULL,                   -- Category of validation error
    error_detail     JSONB,                           -- Structured error information
    detected_at      TIMESTAMPTZ DEFAULT now(),
    resolved_at      TIMESTAMPTZ,                     -- NULL if unresolved
    resolution_note  TEXT                              -- Resolution description
);

COMMENT ON TABLE m1_demand.validation_errors IS 'BIGSERIAL append-only validation error log. error_detail stores structured error info. Resolved errors have resolved_at populated.';


-- ============================================================================
-- M5A_MATERIAL SCHEMA
-- ============================================================================

-- m5a_material: Material and inventory control
-- Contains coils, coil stage history, WO readiness, pre-allocations,
-- inbound expected, shortage forecast, shortage forecast lines, and SAP watermarks.
-- Tracks every HR, intermediate, and finished-goods coil through its full lifecycle.


-- ============================================================================
-- m5a_material.coils
-- ============================================================================
-- Every HR, intermediate, and finished-goods coil tracked through its lifecycle.
-- Stage machine: expected → stores → pickling → rolling → annealing → rewind → fg → dispatched
-- Terminal stages: rejected, scrapped
-- parent_coil_id enables slit/split parent-child relationships.
-- CHECK constraints ensure weight_remaining_mt is within valid bounds.

CREATE TABLE IF NOT EXISTS m5a_material.coils (
    coil_id              TEXT PRIMARY KEY,              -- Unique coil identifier
    sap_coil_ref         TEXT,                          -- SAP coil reference
    parent_coil_id       TEXT REFERENCES m5a_material.coils,  -- Slit/split parent coil
    material_code        TEXT NOT NULL REFERENCES master.materials,
    grade                TEXT NOT NULL,                 -- Material grade
    gauge_mm             NUMERIC(6,3) NOT NULL,         -- Thickness in mm
    width_mm             INTEGER NOT NULL,              -- Width in mm
    weight_initial_mt    NUMERIC(10,3) NOT NULL,        -- Initial weight in metric tonnes
    weight_remaining_mt  NUMERIC(10,3) NOT NULL,        -- Remaining weight (consumed during production)
    heat_number          TEXT,                          -- Heat/ladle number for traceability
    supplier             TEXT,                          -- Supplier name
    manufacturer_lot     TEXT,                          -- Manufacturer lot number
    current_stage        TEXT NOT NULL CHECK (current_stage IN (
        'expected',      -- Expected to arrive (not yet received)
        'stores',        -- In stores/warehouse
        'pickling',      -- In pickling process
        'rolling',       -- In rolling process
        'annealing',     -- In annealing process
        'rewind',        -- In rewind process
        'fg',            -- Finished goods (ready for dispatch)
        'dispatched',    -- Dispatched to customer (terminal)
        'rejected',      -- Quality rejected (terminal)
        'scrapped'       -- Scrapped (terminal)
    )),
    is_quality_hold      BOOLEAN DEFAULT FALSE,         -- Quality hold flag
    hold_reason          TEXT,                          -- Reason for quality hold
    hold_ncr_id          TEXT,                          -- NCR reference if applicable
    is_aged_out          BOOLEAN DEFAULT FALSE,         -- Aged out flag (inventory aging)
    age_check_date       DATE,                          -- Date of last age check
    reserved_for_wo      TEXT,                          -- WO this coil is reserved for
    reservation_qty_mt   NUMERIC(10,3),                 -- Quantity reserved
    reservation_set_at   TIMESTAMPTZ,                   -- When reservation was set
    reservation_set_by   TEXT,                          -- Who set the reservation
    gr_date              DATE,                          -- Goods receipt date
    arrived_at_stores    TIMESTAMPTZ,                   -- When arrived at stores
    consumed_at          TIMESTAMPTZ,                   -- When consumed in production
    scrapped_at          TIMESTAMPTZ,                   -- When scrapped
    dispatched_at        TIMESTAMPTZ,                   -- When dispatched
    created_at           TIMESTAMPTZ DEFAULT now(),
    updated_at           TIMESTAMPTZ DEFAULT now(),
    raw_sap_payload      JSONB,                         -- Full SAP payload for audit
    
    -- CHECK constraint: weight_remaining must be >= 0 and <= weight_initial
    CONSTRAINT chk_weight_remaining_bounds 
        CHECK (weight_remaining_mt >= 0 AND weight_remaining_mt <= weight_initial_mt)
);

COMMENT ON TABLE m5a_material.coils IS 'Coil inventory with stage tracking. Stage machine: expected → stores → pickling → rolling → annealing → rewind → fg → dispatched. Terminal: rejected, scrapped. weight_remaining_mt must be >= 0 and <= weight_initial_mt.';

-- Index for stage-based queries
CREATE INDEX IF NOT EXISTS idx_coils_stage
    ON m5a_material.coils (current_stage);

-- Index for material/grade/gauge/width lookups (allocation queries)
CREATE INDEX IF NOT EXISTS idx_coils_material_dims
    ON m5a_material.coils (material_code, grade, gauge_mm, width_mm);

-- Partial index for reserved coils only
CREATE INDEX IF NOT EXISTS idx_coils_reserved
    ON m5a_material.coils (reserved_for_wo)
    WHERE reserved_for_wo IS NOT NULL;

-- Partial index for active quality hold queries (excludes dispatched/scrapped)
CREATE INDEX IF NOT EXISTS idx_coils_stage_quality_hold
    ON m5a_material.coils (current_stage, is_quality_hold)
    WHERE current_stage NOT IN ('dispatched', 'scrapped');


-- ============================================================================
-- m5a_material.coil_stage_history
-- ============================================================================
-- BIGSERIAL: Append-only stage transition audit trail.
-- Records every stage transition for every coil.
-- triggered_by values: sap_sync, operator_scan, quality_release, reservation, planner_override.
-- Used for traceability and stage timeline visualization.

CREATE TABLE IF NOT EXISTS m5a_material.coil_stage_history (
    history_id      BIGSERIAL PRIMARY KEY,              -- Auto-incrementing ID
    coil_id         TEXT NOT NULL REFERENCES m5a_material.coils,
    from_stage      TEXT,                               -- Previous stage (NULL for initial)
    to_stage        TEXT NOT NULL,                      -- New stage
    transition_at   TIMESTAMPTZ NOT NULL DEFAULT now(), -- When transition occurred
    triggered_by    TEXT NOT NULL CHECK (triggered_by IN (
        'sap_sync',        -- Synced from SAP
        'operator_scan',   -- Operator scanned coil
        'quality_release', -- Quality released coil
        'reservation',     -- Coil reserved for WO
        'planner_override' -- Planner manually changed stage
    )),
    user_id         TEXT,                               -- User who triggered (if applicable)
    device_id       TEXT,                               -- Device used for scan (if applicable)
    related_wo_id   TEXT,                               -- Related work order (if applicable)
    related_event_id UUID,                              -- Related execution event (if applicable)
    notes           TEXT                                -- Additional notes
);

COMMENT ON TABLE m5a_material.coil_stage_history IS 'BIGSERIAL append-only stage transition audit. triggered_by: sap_sync/operator_scan/quality_release/reservation/planner_override. Used for traceability and stage timeline.';

-- Index for coil history queries (most recent first)
CREATE INDEX IF NOT EXISTS idx_coil_stage_history_coil
    ON m5a_material.coil_stage_history (coil_id, transition_at DESC);


-- ============================================================================
-- m5a_material.wo_readiness
-- ============================================================================
-- Denormalised fast-read: one row per WO, recomputed by M5a worker.
-- Tracks material availability status for each work order.
-- status values: ready, partial, pending, shortage.
-- reserved_coils and expected_coils are JSONB arrays for flexible tracking.

CREATE TABLE IF NOT EXISTS m5a_material.wo_readiness (
    wo_id                    TEXT PRIMARY KEY,          -- Work order ID
    required_qty_mt          NUMERIC(10,3) NOT NULL,    -- Total material required
    available_qty_mt         NUMERIC(10,3) NOT NULL,    -- Currently available in stores
    expected_qty_mt          NUMERIC(10,3) NOT NULL,    -- Expected to arrive
    shortfall_qty_mt         NUMERIC(10,3) NOT NULL,    -- Shortfall (required - available - expected)
    status                   TEXT NOT NULL CHECK (status IN (
        'ready',     -- All material available
        'partial',   -- Partial material available
        'pending',   -- Waiting for material to arrive
        'shortage'   -- Material shortage exists
    )),
    earliest_ready_at        TIMESTAMPTZ,               -- Earliest time all material will be ready
    reserved_coils           JSONB,                     -- Array of reserved coil IDs with quantities
    expected_coils           JSONB,                     -- Array of expected coil IDs with ETA
    shortage_resolution_path TEXT,                      -- Suggested resolution for shortage
    calculated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE m5a_material.wo_readiness IS 'Denormalised WO material readiness. status: ready/partial/pending/shortage. reserved_coils and expected_coils are JSONB arrays. Recomputed by M5a worker.';

-- Index for status-based queries
CREATE INDEX IF NOT EXISTS idx_wo_readiness_status
    ON m5a_material.wo_readiness (status);


-- ============================================================================
-- m5a_material.pre_allocations
-- ============================================================================
-- Pre-allocations of coils to work orders before formal reservation.
-- Used during planning to tentatively assign coils to WOs.
-- is_active flag allows soft-delete when allocation is released.
-- Partial indexes on coil_id and wo_id for active allocations only.

CREATE TABLE IF NOT EXISTS m5a_material.pre_allocations (
    alloc_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coil_id         TEXT NOT NULL REFERENCES m5a_material.coils,
    wo_id           TEXT NOT NULL,                      -- Work order being allocated to
    allocated_qty_mt NUMERIC(10,3) NOT NULL,            -- Quantity allocated
    priority_class  CHAR(1),                            -- Priority class of allocation
    allocated_by    TEXT NOT NULL,                      -- User who made the allocation
    allocated_at    TIMESTAMPTZ DEFAULT now(),          -- When allocation was made
    released_at     TIMESTAMPTZ,                        -- When allocation was released (NULL if active)
    release_reason  TEXT,                               -- Reason for release
    is_active       BOOLEAN DEFAULT TRUE                -- Active flag (FALSE when released)
);

COMMENT ON TABLE m5a_material.pre_allocations IS 'Pre-allocations of coils to WOs during planning. is_active = FALSE when released. Used for tentative assignment before formal reservation.';

-- Partial index for active allocations by coil
CREATE INDEX IF NOT EXISTS idx_pre_allocations_coil_active
    ON m5a_material.pre_allocations (coil_id)
    WHERE is_active = TRUE;

-- Partial index for active allocations by WO
CREATE INDEX IF NOT EXISTS idx_pre_allocations_wo_active
    ON m5a_material.pre_allocations (wo_id)
    WHERE is_active = TRUE;


-- ============================================================================
-- m5a_material.inbound_expected
-- ============================================================================
-- Expected inbound coils (HR coils in transit, purchase orders, etc.).
-- is_overdue is a GENERATED column computed from expected_at vs current date.
-- Partial index on expected_at for unreceived coils only.

CREATE TABLE IF NOT EXISTS m5a_material.inbound_expected (
    expectation_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coil_id            TEXT REFERENCES m5a_material.coils,  -- NULL if not yet assigned
    sap_doc_ref        TEXT NOT NULL,                      -- SAP document reference (PO, inbound delivery)
    material_code      TEXT NOT NULL,                      -- Material code
    grade              TEXT NOT NULL,                      -- Material grade
    gauge_mm           NUMERIC(6,3) NOT NULL,              -- Thickness in mm
    width_mm           INTEGER NOT NULL,                   -- Width in mm
    expected_weight_mt NUMERIC(10,3) NOT NULL,             -- Expected weight in MT
    supplier           TEXT,                               -- Supplier name
    expected_at        DATE,                               -- Expected arrival date
    is_overdue         BOOLEAN DEFAULT FALSE,              -- Overdue flag (updated by application or scheduled job)
    is_received        BOOLEAN DEFAULT FALSE,              -- Received flag
    received_at        TIMESTAMPTZ,                        -- When received
    notes              TEXT,                               -- Additional notes
    created_at         TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE m5a_material.inbound_expected IS 'Expected inbound coils. is_overdue computed by application logic. Partial index on unreceived coils only.';

-- Partial index for unreceived expected coils by date
CREATE INDEX IF NOT EXISTS idx_inbound_expected_unreceived
    ON m5a_material.inbound_expected (expected_at)
    WHERE is_received = FALSE;


-- ============================================================================
-- m5a_material.shortage_forecast
-- ============================================================================
-- Aggregate shortage forecast generated periodically.
-- One row per forecast run with aggregate statistics.
-- horizon_days indicates how many days into the future the forecast covers.

CREATE TABLE IF NOT EXISTS m5a_material.shortage_forecast (
    forecast_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    generated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    horizon_days           INTEGER NOT NULL,              -- Forecast horizon in days
    total_wos_evaluated    INTEGER NOT NULL,              -- Total WOs analyzed
    total_shortage_wos     INTEGER NOT NULL,              -- WOs with shortage
    total_shortage_qty_mt  NUMERIC(12,3) NOT NULL         -- Total shortage quantity
);

COMMENT ON TABLE m5a_material.shortage_forecast IS 'Aggregate shortage forecast. One row per forecast run. horizon_days indicates forecast window. Generated periodically by M5a worker.';


-- ============================================================================
-- m5a_material.shortage_forecast_lines
-- ============================================================================
-- Detailed lines for each shortage forecast.
-- One row per WO that has a shortage within the forecast horizon.
-- PRIMARY KEY is composite (forecast_id, wo_id).
-- earliest_remediation suggests how to resolve the shortage.

CREATE TABLE IF NOT EXISTS m5a_material.shortage_forecast_lines (
    forecast_id          UUID NOT NULL REFERENCES m5a_material.shortage_forecast,
    wo_id                TEXT NOT NULL,                  -- Work order with shortage
    required_date        DATE NOT NULL,                  -- Required date for material
    required_qty_mt      NUMERIC(10,3) NOT NULL,         -- Required quantity
    available_qty_mt     NUMERIC(10,3) NOT NULL,         -- Currently available
    expected_qty_mt      NUMERIC(10,3) NOT NULL,         -- Expected to arrive
    shortfall_qty_mt     NUMERIC(10,3) NOT NULL,         -- Shortfall amount
    earliest_remediation TEXT,                           -- Suggested resolution
    PRIMARY KEY (forecast_id, wo_id)
);

COMMENT ON TABLE m5a_material.shortage_forecast_lines IS 'Detailed shortage forecast lines. One row per WO with shortage. PRIMARY KEY (forecast_id, wo_id). earliest_remediation suggests resolution.';


-- ============================================================================
-- m5a_material.sap_watermarks
-- ============================================================================
-- Tracks last-synced timestamp per SAP entity for incremental pulls.
-- entity values: 'mb52_stock' (stock levels), 'mb51_movements' (goods movements).
-- Used by SAP_Sync_Worker to determine delta pull starting point.

CREATE TABLE IF NOT EXISTS m5a_material.sap_watermarks (
    entity              TEXT PRIMARY KEY CHECK (entity IN ('mb52_stock', 'mb51_movements')),
    last_synced_at      TIMESTAMPTZ NOT NULL,            -- When Zedral last synced
    last_sap_modified   TIMESTAMPTZ,                     -- Last SAP modification timestamp seen
    rows_last_pull      INTEGER,                         -- Rows retrieved in last pull
    duration_ms_last    INTEGER,                         -- Duration of last pull in ms
    status_last         TEXT,                            -- 'success', 'error', 'partial'
    error_message_last  TEXT                             -- Error message if failed
);

COMMENT ON TABLE m5a_material.sap_watermarks IS 'SAP sync watermarks. entity: mb52_stock/mb51_movements. Used by SAP_Sync_Worker for incremental delta pulls.';


-- ============================================================================
-- M6_DISPATCH SCHEMA
-- ============================================================================

-- m6_dispatch: Dispatch and execution control
-- Contains dispatch lists, dispatch items, execution events, stoppages, rejects,
-- shift handovers, setup timings, production passes, roll assignments, roll changes,
-- shift crew assignments, and config.
-- Manages shift-level dispatch lists, shop-floor execution events, and operational tracking.


-- ============================================================================
-- m6_dispatch.dispatch_lists
-- ============================================================================
-- Shift-level ordered list of jobs for one work centre.
-- status values: draft, published, superseded, complete.
-- DEFERRABLE UNIQUE constraint allows multiple draft lists during transitions.
-- One dispatch list per WC per shift per day with a given status.

CREATE TABLE IF NOT EXISTS m6_dispatch.dispatch_lists (
    dispatch_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id    UUID NOT NULL,                        -- Reference to M4 schedule
    wc_id          TEXT NOT NULL REFERENCES master.work_centres,
    shift_date     DATE NOT NULL,                        -- Date of the shift
    shift          CHAR(1) NOT NULL,                     -- 'A', 'B', 'C'
    shift_start    TIMESTAMPTZ NOT NULL,                 -- Shift start timestamp
    shift_end      TIMESTAMPTZ NOT NULL,                 -- Shift end timestamp
    generated_at   TIMESTAMPTZ DEFAULT now(),            -- When list was generated
    published_at   TIMESTAMPTZ,                          -- When list was published
    status         TEXT NOT NULL CHECK (status IN ('draft', 'published', 'superseded', 'complete')),
    superseded_by  UUID REFERENCES m6_dispatch.dispatch_lists,  -- New list that replaced this one
    generated_by   TEXT,                                 -- User or system that generated
    created_at     TIMESTAMPTZ DEFAULT now(),
    updated_at     TIMESTAMPTZ DEFAULT now(),
    
    -- DEFERRABLE constraint allows multiple draft lists during shift transitions
    CONSTRAINT uq_dispatch_lists_wc_shift_status 
        UNIQUE (wc_id, shift_date, shift, status) DEFERRABLE INITIALLY DEFERRED
);

COMMENT ON TABLE m6_dispatch.dispatch_lists IS 'Shift-level ordered job list for one WC. status: draft/published/superseded/complete. DEFERRABLE UNIQUE allows multiple drafts during transitions.';

-- Index for shift dispatch list lookup
CREATE INDEX IF NOT EXISTS idx_dispatch_lists_shift
    ON m6_dispatch.dispatch_lists (wc_id, shift_date, shift);


-- ============================================================================
-- m6_dispatch.dispatch_items
-- ============================================================================
-- Individual jobs within a dispatch list.
-- CASCADE DELETE: when a dispatch list is deleted, its items are removed.
-- actual_status values: pending, setup_in_progress, production_in_progress, 
--                       stopped, complete, cancelled, skipped.
-- Partial index on wo_id for non-NULL values only.

CREATE TABLE IF NOT EXISTS m6_dispatch.dispatch_items (
    item_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispatch_id          UUID NOT NULL REFERENCES m6_dispatch.dispatch_lists ON DELETE CASCADE,
    op_id                UUID NOT NULL,                 -- Reference to M4 scheduled operation
    wo_id                TEXT,                          -- Work order (NULL for non-production ops)
    sequence_in_shift    INTEGER NOT NULL,              -- Order within the shift
    op_type              TEXT NOT NULL CHECK (op_type IN ('production', 'setup', 'pm', 'roll_change', 'idle_block')),
    planned_setup_start  TIMESTAMPTZ,                   -- Planned setup start time
    planned_setup_end    TIMESTAMPTZ,                   -- Planned setup end time
    planned_prod_start   TIMESTAMPTZ,                   -- Planned production start time
    planned_prod_end     TIMESTAMPTZ,                   -- Planned production end time
    planned_qty_mt       NUMERIC(10,3),                 -- Planned quantity
    expected_coils       JSONB,                         -- Array of expected coil IDs
    work_instruction_ref TEXT,                          -- Reference to work instructions
    special_notes        TEXT,                          -- Special instructions
    predecessor_item_id  UUID REFERENCES m6_dispatch.dispatch_items,  -- Previous item in sequence
    changeover_reason    TEXT,                          -- Reason for changeover
    is_rerolling         BOOLEAN DEFAULT FALSE,         -- Flag for rerolling job
    rerolling_reason     TEXT,                          -- Reason for rerolling
    actual_status        TEXT NOT NULL DEFAULT 'pending' CHECK (actual_status IN (
        'pending',               -- Not yet started
        'setup_in_progress',     -- Setup is being performed
        'production_in_progress',-- Production is underway
        'stopped',               -- Stopped (stoppage)
        'complete',              -- Completed
        'cancelled',             -- Cancelled
        'skipped'                -- Skipped
    )),
    actual_setup_start   TIMESTAMPTZ,                   -- Actual setup start time
    actual_setup_end     TIMESTAMPTZ,                   -- Actual setup end time
    actual_prod_start    TIMESTAMPTZ,                   -- Actual production start time
    actual_prod_end      TIMESTAMPTZ,                   -- Actual production end time
    actual_qty_mt        NUMERIC(10,3),                 -- Actual quantity produced
    actual_scrap_mt      NUMERIC(10,3),                 -- Scrap quantity
    actual_operator_id   TEXT,                          -- Operator who performed the work
    notes_runtime        TEXT,                          -- Runtime notes
    created_at           TIMESTAMPTZ DEFAULT now(),
    updated_at           TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE m6_dispatch.dispatch_items IS 'Individual jobs within a dispatch list. CASCADE DELETE from dispatch_lists. actual_status: pending/setup_in_progress/production_in_progress/stopped/complete/cancelled/skipped.';

-- Index for ordered job list within a dispatch
CREATE INDEX IF NOT EXISTS idx_dispatch_items_sequence
    ON m6_dispatch.dispatch_items (dispatch_id, sequence_in_shift);

-- Partial index for WO cross-reference (only non-NULL wo_id)
CREATE INDEX IF NOT EXISTS idx_dispatch_items_wo
    ON m6_dispatch.dispatch_items (wo_id)
    WHERE wo_id IS NOT NULL;


-- ============================================================================
-- m6_dispatch.execution_events
-- ============================================================================
-- APPEND-ONLY table for shop-floor execution facts. Never updated or deleted.
-- event_id uses UUID-v7 (time-ordered, application-generated).
-- HMAC signature in 'signature' column ensures tamper evidence.
-- event_type values: setup_started, setup_ended, setup_abandoned, production_started,
-- production_ended, stoppage_started, stoppage_ended, coil_mounted, coil_swapped,
-- reject_raised, shift_handover, rush_injected, note_added, pass_started, pass_completed,
-- roll_changed, crew_confirmed, shift_report_signed, shift_report_approved.

CREATE TABLE IF NOT EXISTS m6_dispatch.execution_events (
    event_id          UUID PRIMARY KEY,                 -- UUID-v7 time-ordered, application-generated
    dispatch_item_id  UUID REFERENCES m6_dispatch.dispatch_items,
    wc_id             TEXT NOT NULL,
    wo_id             TEXT,
    event_type        TEXT NOT NULL CHECK (event_type IN (
        'setup_started',        -- Setup began
        'setup_ended',          -- Setup completed
        'setup_abandoned',      -- Setup was abandoned
        'production_started',   -- Production began
        'production_ended',     -- Production completed
        'stoppage_started',     -- Stoppage began
        'stoppage_ended',       -- Stoppage ended
        'coil_mounted',         -- Coil mounted on line
        'coil_swapped',         -- Coil swapped/replaced
        'reject_raised',        -- Quality reject raised
        'shift_handover',       -- Shift handover event
        'rush_injected',        -- Rush order injected
        'note_added',           -- Note added by operator
        'pass_started',         -- Rolling pass started (v0.2)
        'pass_completed',       -- Rolling pass completed (v0.2)
        'roll_changed',         -- Roll changed (v0.2)
        'crew_confirmed',       -- Crew confirmed (v0.2)
        'shift_report_signed',  -- Shift report signed (v0.2)
        'shift_report_approved' -- Shift report approved (v0.2)
    )),
    occurred_at       TIMESTAMPTZ NOT NULL,             -- When the event actually occurred
    recorded_at       TIMESTAMPTZ NOT NULL DEFAULT now(), -- When recorded in DB
    operator_id       TEXT NOT NULL,                    -- Operator who triggered event
    device_id         TEXT NOT NULL,                    -- Device used to record event
    shift             CHAR(1),                          -- Shift (A/B/C)
    payload           JSONB NOT NULL,                   -- Event-specific data
    signature         TEXT NOT NULL                     -- HMAC-SHA256 signature for tamper evidence
);

COMMENT ON TABLE m6_dispatch.execution_events IS 'APPEND-ONLY shop-floor events. Never UPDATE or DELETE. event_id is UUID-v7 (time-ordered). HMAC signature ensures tamper evidence. 19 event_type values for comprehensive floor tracking.';
COMMENT ON COLUMN m6_dispatch.execution_events.event_id IS 'UUID-v7 time-ordered, application-generated';

-- Index for real-time event feed per WC (most recent first)
CREATE INDEX IF NOT EXISTS idx_execution_events_wc_time
    ON m6_dispatch.execution_events (wc_id, occurred_at DESC);

-- Index for dispatch item events
CREATE INDEX IF NOT EXISTS idx_execution_events_dispatch_item
    ON m6_dispatch.execution_events (dispatch_item_id);

-- Index for event type filtering
CREATE INDEX IF NOT EXISTS idx_execution_events_type_time
    ON m6_dispatch.execution_events (event_type, occurred_at DESC);

-- Index for recorded_at time-range scans
CREATE INDEX IF NOT EXISTS idx_execution_events_recorded
    ON m6_dispatch.execution_events (recorded_at DESC);


-- ============================================================================
-- m6_dispatch.stoppages
-- ============================================================================
-- Production stoppages with computed duration and active status.
-- duration_min and is_active are GENERATED columns.
-- FK to master.stoppage_codes for classification.
-- Partial index for active stoppages only.

CREATE TABLE IF NOT EXISTS m6_dispatch.stoppages (
    stoppage_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wc_id             TEXT NOT NULL,
    wo_id             TEXT,
    dispatch_item_id  UUID REFERENCES m6_dispatch.dispatch_items,
    shift             CHAR(1),                          -- 'A', 'B', 'C'
    started_at        TIMESTAMPTZ NOT NULL,            -- When stoppage started
    ended_at          TIMESTAMPTZ,                      -- When stoppage ended (NULL if ongoing)
    duration_min      INTEGER GENERATED ALWAYS AS (
        CASE WHEN ended_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (ended_at - started_at))/60 
        ELSE NULL END
    ) STORED,                                         -- Computed duration in minutes
    stoppage_code_id  TEXT REFERENCES master.stoppage_codes,  -- Classification code
    reason_category   TEXT NOT NULL,                    -- High-level category
    reason_detail     TEXT,                             -- Detailed reason
    reported_by       TEXT NOT NULL,                    -- Who reported the stoppage
    resolution_action TEXT,                             -- What was done to resolve
    m5c_breakdown_id  UUID,                             -- Reference to M5C breakdown (if applicable)
    m5b_ncr_id        UUID,                             -- Reference to M5B NCR (if applicable)
    is_active         BOOLEAN GENERATED ALWAYS AS (ended_at IS NULL) STORED,  -- TRUE if ongoing
    created_at        TIMESTAMPTZ DEFAULT now(),
    updated_at        TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE m6_dispatch.stoppages IS 'Production stoppages. duration_min and is_active are GENERATED columns. FK to master.stoppage_codes. Partial index for active stoppages.';

-- Index for stoppage history per WC (most recent first)
CREATE INDEX IF NOT EXISTS idx_stoppages_wc_time
    ON m6_dispatch.stoppages (wc_id, started_at DESC);

-- Partial index for active stoppages on a WC
CREATE INDEX IF NOT EXISTS idx_stoppages_active
    ON m6_dispatch.stoppages (wc_id)
    WHERE is_active = TRUE;


-- ============================================================================
-- m6_dispatch.rejects
-- ============================================================================
-- Quality rejects raised during production.
-- FK to master.defect_codes for classification.
-- Tracks defect category, affected quantity, and disposition.

CREATE TABLE IF NOT EXISTS m6_dispatch.rejects (
    reject_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wc_id             TEXT NOT NULL,
    wo_id             TEXT,
    dispatch_item_id  UUID REFERENCES m6_dispatch.dispatch_items,
    coil_id           TEXT,                             -- Coil with defect
    reported_at       TIMESTAMPTZ NOT NULL,            -- When defect was reported
    reported_by       TEXT NOT NULL,                    -- Who reported the defect
    defect_code_id    TEXT REFERENCES master.defect_codes,  -- Classification code
    defect_category   TEXT NOT NULL,                    -- High-level category
    defect_detail     TEXT,                             -- Detailed description
    affected_qty_mt   NUMERIC(10,3),                    -- Quantity affected
    photo_ref         TEXT,                             -- Reference to photo evidence
    m5b_ncr_id        UUID,                             -- Reference to M5B NCR (if applicable)
    disposition       TEXT,                             -- Disposition decision
    disposition_by    TEXT,                             -- Who decided disposition
    disposition_at    TIMESTAMPTZ,                      -- When disposition was decided
    created_at        TIMESTAMPTZ DEFAULT now(),
    updated_at        TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE m6_dispatch.rejects IS 'Quality rejects. FK to master.defect_codes. Tracks defect category, quantity, and disposition.';

-- Index for reject queries by WC and time
CREATE INDEX IF NOT EXISTS idx_rejects_wc_time
    ON m6_dispatch.rejects (wc_id, reported_at DESC);

-- Index for reject queries by dispatch item
CREATE INDEX IF NOT EXISTS idx_rejects_dispatch_item
    ON m6_dispatch.rejects (dispatch_item_id);


-- ============================================================================
-- m6_dispatch.shift_handovers
-- ============================================================================
-- Structured handover between outgoing and incoming shift operators.
-- jobs_completed, jobs_in_progress, pending_items are JSONB arrays.
-- Tracks machine state and safety notes for shift continuity.

CREATE TABLE IF NOT EXISTS m6_dispatch.shift_handovers (
    handover_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wc_id               TEXT NOT NULL,
    shift_date          DATE NOT NULL,                  -- Date of the outgoing shift
    outgoing_shift      CHAR(1) NOT NULL,               -- Outgoing shift (A/B/C)
    incoming_shift      CHAR(1) NOT NULL,               -- Incoming shift (A/B/C)
    outgoing_operator   TEXT NOT NULL,                  -- Outgoing operator ID
    incoming_operator   TEXT,                           -- Incoming operator ID
    outgoing_signed_at  TIMESTAMPTZ,                    -- When outgoing operator signed
    incoming_signed_at  TIMESTAMPTZ,                    -- When incoming operator signed
    jobs_completed      JSONB,                          -- Array of completed jobs
    jobs_in_progress    JSONB,                          -- Array of in-progress jobs
    pending_items       JSONB,                          -- Array of pending items
    machine_state_note  TEXT,                           -- Machine state description
    safety_notes        TEXT,                           -- Safety-related notes
    handover_complete   BOOLEAN DEFAULT FALSE,          -- TRUE when both signed
    created_at          TIMESTAMPTZ DEFAULT now(),
    updated_at          TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE m6_dispatch.shift_handovers IS 'Shift handover records. jobs_completed, jobs_in_progress, pending_items are JSONB arrays. handover_complete = TRUE when both operators signed.';

-- Index for handover queries by WC and date (most recent first)
CREATE INDEX IF NOT EXISTS idx_shift_handovers_wc_date
    ON m6_dispatch.shift_handovers (wc_id, shift_date DESC);


-- ============================================================================
-- m6_dispatch.setup_timings
-- ============================================================================
-- Observed setup times for changeover matrix learning.
-- variance_min is GENERATED column (actual - planned).
-- Composite index supports matrix learning queries.

CREATE TABLE IF NOT EXISTS m6_dispatch.setup_timings (
    timing_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wc_id                TEXT NOT NULL,
    dispatch_item_id     UUID REFERENCES m6_dispatch.dispatch_items,
    grade_from           TEXT,                          -- From grade
    grade_to             TEXT NOT NULL,                 -- To grade
    gauge_from_mm        NUMERIC(6,3),                  -- From gauge
    gauge_to_mm          NUMERIC(6,3) NOT NULL,         -- To gauge
    width_from_mm        INTEGER,                       -- From width
    width_to_mm          INTEGER NOT NULL,              -- To width
    gauge_step           TEXT,                          -- 'same', 'up', 'down'
    width_step           TEXT,                          -- 'same', 'up', 'down'
    roll_change_reqd     BOOLEAN,                       -- Was roll change required
    setup_reason         TEXT,                          -- Reason for setup
    actual_start         TIMESTAMPTZ NOT NULL,          -- Actual setup start
    actual_end           TIMESTAMPTZ NOT NULL,          -- Actual setup end
    actual_duration_min  INTEGER NOT NULL,              -- Actual duration in minutes
    planned_duration_min INTEGER,                       -- Planned duration from matrix
    variance_min         INTEGER GENERATED ALWAYS AS 
        (actual_duration_min - planned_duration_min) STORED,  -- Computed variance
    was_abandoned        BOOLEAN DEFAULT FALSE,         -- Was setup abandoned
    notes                TEXT,                          -- Additional notes
    observed_at          TIMESTAMPTZ DEFAULT now(),
    created_at           TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE m6_dispatch.setup_timings IS 'Observed setup times for matrix learning. variance_min is GENERATED (actual - planned). Feeds back into changeover_matrix.';

-- Composite index for changeover matrix learning queries
CREATE INDEX IF NOT EXISTS idx_setup_timings_matrix_learning
    ON m6_dispatch.setup_timings (wc_id, grade_from, grade_to, gauge_step, width_step, roll_change_reqd);


-- ============================================================================
-- m6_dispatch.production_passes (v0.2)
-- ============================================================================
-- One row per rolling pass for 6-HI cold rolling mill.
-- Cold rolling requires 3-6 passes per coil.
-- duration_min is GENERATED column.
-- CHECK constraint ensures pass_number >= 1.

CREATE TABLE IF NOT EXISTS m6_dispatch.production_passes (
    pass_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispatch_item_id  UUID NOT NULL REFERENCES m6_dispatch.dispatch_items ON DELETE CASCADE,
    pass_number       INTEGER NOT NULL CHECK (pass_number >= 1),  -- Pass number (1, 2, 3, ...)
    started_at        TIMESTAMPTZ,                      -- When pass started
    ended_at          TIMESTAMPTZ,                      -- When pass ended
    duration_min      INTEGER GENERATED ALWAYS AS (
        CASE WHEN ended_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (ended_at - started_at))/60 
        ELSE NULL END
    ) STORED,                                         -- Computed duration
    thickness_in_mm   NUMERIC(6,3),                     -- Input thickness
    thickness_out_mm  NUMERIC(6,3),                     -- Output thickness
    reduction_pct     NUMERIC(5,2),                     -- Reduction percentage
    rolling_force_kn  NUMERIC(10,2),                    -- Rolling force in kN
    rolling_speed_mpm NUMERIC(8,2),                     -- Rolling speed in m/min
    tension_front_kn  NUMERIC(10,2),                    -- Front tension in kN
    tension_back_kn   NUMERIC(10,2),                    -- Back tension in kN
    coolant_flow_lpm  NUMERIC(8,2),                     -- Coolant flow in L/min
    operator_id       TEXT,                             -- Operator for this pass
    notes             TEXT,                             -- Pass-specific notes
    created_at        TIMESTAMPTZ DEFAULT now(),
    
    -- One pass number per dispatch item
    CONSTRAINT uq_production_passes_item_number UNIQUE (dispatch_item_id, pass_number)
);

COMMENT ON TABLE m6_dispatch.production_passes IS 'v0.2: Rolling pass records. Cold rolling requires 3-6 passes per coil. duration_min is GENERATED. pass_number >= 1 enforced.';

-- Index for pass sequence within a dispatch item
CREATE INDEX IF NOT EXISTS idx_production_passes_item
    ON m6_dispatch.production_passes (dispatch_item_id, pass_number);


-- ============================================================================
-- m6_dispatch.roll_assignments (v0.2)
-- ============================================================================
-- Tracks which rolls are assigned to which dispatch items.
-- FK to master.rolls for roll lifecycle tracking.
-- removed_at and removal_reason track when roll is removed.

CREATE TABLE IF NOT EXISTS m6_dispatch.roll_assignments (
    assignment_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispatch_item_id UUID NOT NULL REFERENCES m6_dispatch.dispatch_items,
    roll_id          TEXT NOT NULL REFERENCES master.rolls,
    position         TEXT NOT NULL,                     -- 'work_top', 'work_bottom', 'intermediate_top', etc.
    assigned_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    assigned_by      TEXT NOT NULL,
    removed_at       TIMESTAMPTZ,                       -- When roll was removed
    removal_reason   TEXT,                              -- Why roll was removed
    created_at       TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE m6_dispatch.roll_assignments IS 'v0.2: Roll-to-dispatch assignments. FK to master.rolls. Tracks which rolls are used for each job.';

-- Index for roll assignment queries by dispatch item
CREATE INDEX IF NOT EXISTS idx_roll_assignments_dispatch_item
    ON m6_dispatch.roll_assignments (dispatch_item_id);

-- Index for roll assignment queries by roll
CREATE INDEX IF NOT EXISTS idx_roll_assignments_roll
    ON m6_dispatch.roll_assignments (roll_id);


-- ============================================================================
-- m6_dispatch.roll_changes (v0.2)
-- ============================================================================
-- Roll change events during production.
-- FKs to master.rolls for roll_out and roll_in.
-- FK to master.work_centres for WC.
-- duration_min is GENERATED column.

CREATE TABLE IF NOT EXISTS m6_dispatch.roll_changes (
    change_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wc_id            TEXT NOT NULL REFERENCES master.work_centres,
    dispatch_item_id UUID REFERENCES m6_dispatch.dispatch_items,
    roll_out_id      TEXT REFERENCES master.rolls,      -- Roll being removed
    roll_in_id       TEXT REFERENCES master.rolls,      -- Roll being installed
    position         TEXT NOT NULL,                     -- 'work_top', 'work_bottom', etc.
    change_reason    TEXT NOT NULL,                     -- Why the change was needed
    started_at       TIMESTAMPTZ NOT NULL,              -- When change started
    ended_at         TIMESTAMPTZ,                       -- When change ended
    duration_min     INTEGER GENERATED ALWAYS AS (
        CASE WHEN ended_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (ended_at - started_at))/60 
        ELSE NULL END
    ) STORED,                                         -- Computed duration
    performed_by     TEXT NOT NULL,                     -- Who performed the change
    notes            TEXT,
    created_at       TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE m6_dispatch.roll_changes IS 'v0.2: Roll change events. FKs to master.rolls and master.work_centres. duration_min is GENERATED. Tracks roll changeover time.';

-- Index for roll change queries by WC and time
CREATE INDEX IF NOT EXISTS idx_roll_changes_wc_time
    ON m6_dispatch.roll_changes (wc_id, started_at DESC);


-- ============================================================================
-- m6_dispatch.shift_crew_assignments (v0.2)
-- ============================================================================
-- Crew assignments per WC per shift.
-- crew_members is JSONB array of {operator_id, role}.
-- UNIQUE constraint ensures one crew assignment per WC per shift.

CREATE TABLE IF NOT EXISTS m6_dispatch.shift_crew_assignments (
    assignment_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wc_id          TEXT NOT NULL REFERENCES master.work_centres,
    shift_date     DATE NOT NULL,
    shift          CHAR(1) NOT NULL,                    -- 'A', 'B', 'C'
    line_incharge  TEXT NOT NULL,                       -- Line incharge operator
    shift_manager  TEXT,                                -- Shift manager (if applicable)
    crew_members   JSONB NOT NULL,                      -- Array of {operator_id, role}
    crane_operator TEXT,                                -- Crane operator (if applicable)
    confirmed_at   TIMESTAMPTZ,                         -- When crew was confirmed
    confirmed_by   TEXT,                                -- Who confirmed the crew
    created_at     TIMESTAMPTZ DEFAULT now(),
    updated_at     TIMESTAMPTZ DEFAULT now(),
    
    -- One crew assignment per WC per shift
    CONSTRAINT uq_shift_crew_assignments UNIQUE (wc_id, shift_date, shift)
);

COMMENT ON TABLE m6_dispatch.shift_crew_assignments IS 'v0.2: Crew assignments per WC per shift. crew_members is JSONB array of {operator_id, role}. UNIQUE (wc_id, shift_date, shift).';

-- Index for crew assignment queries
CREATE INDEX IF NOT EXISTS idx_shift_crew_assignments_shift
    ON m6_dispatch.shift_crew_assignments (wc_id, shift_date DESC);


-- ============================================================================
-- m6_dispatch.config
-- ============================================================================
-- Configuration key-value store for dispatch module.
-- config_value is JSONB for flexible configuration.
-- 5 config keys seeded at deploy time.

CREATE TABLE IF NOT EXISTS m6_dispatch.config (
    config_key  TEXT PRIMARY KEY,
    config_value JSONB NOT NULL,
    updated_by  TEXT,
    updated_at  TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE m6_dispatch.config IS 'Dispatch module configuration. JSONB values for flexibility. 5 keys seeded: shift_start_times, dispatch_horizon_hours, frozen_window_minutes, stoppage_reason_required_min, rush_inject_requires_supervisor.';

-- Seed 5 config rows
INSERT INTO m6_dispatch.config (config_key, config_value)
VALUES
    ('shift_start_times', '{"A":"06:00","B":"14:00","C":"22:00"}'),
    ('dispatch_horizon_hours', '24'),
    ('frozen_window_minutes', '120'),
    ('stoppage_reason_required_min', '5'),
    ('rush_inject_requires_supervisor', 'true')
ON CONFLICT (config_key) DO NOTHING;
