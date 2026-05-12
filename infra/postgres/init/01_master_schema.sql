-- 01_master_schema.sql
-- M2 Master Data schema — foundation for all other modules

CREATE SCHEMA IF NOT EXISTS master;

-- Work Centres (CRS-1, CRS-2, CRS-3, PKL-1, ANN-1, RWD-1)
CREATE TABLE master.work_centres (
  wc_id           TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('Rolling', 'Processing')),
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  gauge_min_mm    NUMERIC(6,3),
  gauge_max_mm    NUMERIC(6,3),
  width_min_mm    INTEGER,
  width_max_mm    INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Materials (HR coils, CR coils, FG)
CREATE TABLE master.materials (
  material_code   TEXT PRIMARY KEY,
  grade           TEXT NOT NULL,
  gauge_mm        NUMERIC(6,3) NOT NULL,
  width_mm        INTEGER NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('HR', 'CR', 'FG')),
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Customers
CREATE TABLE master.customers (
  customer_id     TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  priority        TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Shifts (A, B, C)
CREATE TABLE master.shifts (
  shift_id        TEXT PRIMARY KEY,
  name            CHAR(1) NOT NULL CHECK (name IN ('A', 'B', 'C')),
  start_time      TIME NOT NULL,
  end_time        TIME NOT NULL,
  linked_wc_ids   JSONB NOT NULL DEFAULT '[]',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Operators
CREATE TABLE master.operators (
  operator_id     TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  skill           TEXT NOT NULL CHECK (skill IN ('Junior', 'Mid', 'Senior')),
  work_centre_id  TEXT REFERENCES master.work_centres,
  shift_name      CHAR(1),
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Routings (material × work centre production rules)
CREATE TABLE master.routings (
  routing_id          TEXT PRIMARY KEY,
  material_code       TEXT NOT NULL REFERENCES master.materials,
  wc_id               TEXT NOT NULL REFERENCES master.work_centres,
  std_run_rate_mt_hr  NUMERIC(8,3) NOT NULL,
  setup_time_min      INTEGER NOT NULL,
  yield_pct           NUMERIC(5,2) NOT NULL CHECK (yield_pct BETWEEN 0 AND 100),
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (material_code, wc_id)
);

-- Changeover Matrix (setup times between grade transitions)
CREATE TABLE master.changeover_matrix (
  wc_id           TEXT NOT NULL REFERENCES master.work_centres,
  grade_from      TEXT NOT NULL,
  grade_to        TEXT NOT NULL,
  gauge_step      TEXT NOT NULL DEFAULT 'same',
  width_step      TEXT NOT NULL DEFAULT 'same',
  roll_change_reqd BOOLEAN NOT NULL DEFAULT FALSE,
  setup_min       INTEGER NOT NULL,
  sample_count    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (wc_id, grade_from, grade_to, gauge_step, width_step)
);

-- Emission Factors (CEA grid factor for Scope 2 emissions)
CREATE TABLE master.emission_factors (
  factor_id       TEXT PRIMARY KEY,
  factor_value    NUMERIC(8,5) NOT NULL,
  unit            TEXT NOT NULL,
  source          TEXT NOT NULL,
  effective_from  DATE NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_materials_type_status ON master.materials (type, status);
CREATE INDEX idx_operators_wc ON master.operators (work_centre_id) WHERE work_centre_id IS NOT NULL;
CREATE INDEX idx_routings_material ON master.routings (material_code) WHERE is_active = TRUE;
CREATE INDEX idx_routings_wc ON master.routings (wc_id) WHERE is_active = TRUE;

-- ── v0.2: Stoppage Code Catalogue ───────────────────────────────────────────
CREATE TABLE master.stoppage_codes (
  code            VARCHAR(50) PRIMARY KEY,
  display_name    TEXT NOT NULL,
  bucket          TEXT NOT NULL,
  is_planned      BOOLEAN NOT NULL DEFAULT FALSE,
  is_external     BOOLEAN NOT NULL DEFAULT FALSE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order      INT NOT NULL DEFAULT 0
);

-- ── v0.2: Defect Code Catalogue ──────────────────────────────────────────────
CREATE TABLE master.defect_codes (
  code                VARCHAR(50) PRIMARY KEY,
  display_name        TEXT NOT NULL,
  family              TEXT NOT NULL,
  severity_default    TEXT,
  default_disposition TEXT,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order          INT NOT NULL DEFAULT 0
);

-- ── v0.2: Rolls Register ─────────────────────────────────────────────────────
CREATE TABLE master.rolls (
  roll_id                     TEXT PRIMARY KEY,
  wc_id                       TEXT REFERENCES master.work_centres,
  roll_type                   TEXT NOT NULL CHECK (roll_type IN ('work', 'backup', 'intermediate')),
  position                    TEXT CHECK (position IN ('top', 'bottom', 'intermediate_1', 'intermediate_2')),
  material_grade              TEXT,
  diameter_mm                 NUMERIC(8,2),
  barrel_length_mm            NUMERIC(8,2),
  -- v0.2 extended columns
  current_wc_id               TEXT REFERENCES master.work_centres,
  current_position            TEXT,
  cumulative_tonnage_mt       NUMERIC(10,3) NOT NULL DEFAULT 0,
  tonnage_since_grind_mt      NUMERIC(10,3) NOT NULL DEFAULT 0,
  last_grind_date             DATE,
  grind_cycle_count           INT NOT NULL DEFAULT 0,
  roll_finish                 TEXT,
  expected_life_mt            NUMERIC(10,3),
  status                      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'in_grind', 'condemned', 'spare')),
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rolls_wc ON master.rolls (current_wc_id) WHERE current_wc_id IS NOT NULL;
CREATE INDEX idx_rolls_status ON master.rolls (status) WHERE status = 'active';
