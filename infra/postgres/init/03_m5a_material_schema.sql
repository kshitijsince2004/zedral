-- 03_m5a_material_schema.sql
-- M5a Material & Inventory Control schema

CREATE SCHEMA IF NOT EXISTS m5a_material;

CREATE TABLE m5a_material.coils (
  coil_id             TEXT PRIMARY KEY,
  sap_coil_ref        TEXT,
  parent_coil_id      TEXT REFERENCES m5a_material.coils,
  material_code       TEXT NOT NULL REFERENCES master.materials,
  grade               TEXT NOT NULL,
  gauge_mm            NUMERIC(6,3) NOT NULL,
  width_mm            INTEGER NOT NULL,
  weight_initial_mt   NUMERIC(10,3) NOT NULL,
  weight_remaining_mt NUMERIC(10,3) NOT NULL,
  heat_number         TEXT,
  supplier            TEXT,
  current_stage       TEXT NOT NULL DEFAULT 'expected' CHECK (current_stage IN (
    'expected', 'stores', 'pickling', 'rolling', 'annealing', 'rewind', 'fg', 'dispatched', 'rejected', 'scrapped'
  )),
  is_quality_hold     BOOLEAN NOT NULL DEFAULT FALSE,
  hold_reason         TEXT,
  hold_ncr_id         TEXT,
  is_aged_out         BOOLEAN NOT NULL DEFAULT FALSE,
  reserved_for_wo     TEXT,
  reservation_qty_mt  NUMERIC(10,3),
  reservation_set_at  TIMESTAMPTZ,
  reservation_set_by  TEXT,
  gr_date             DATE,
  arrived_at_stores   TIMESTAMPTZ,
  consumed_at         TIMESTAMPTZ,
  scrapped_at         TIMESTAMPTZ,
  dispatched_at       TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  raw_sap_payload     JSONB
);

CREATE TABLE m5a_material.coil_stage_history (
  history_id          BIGSERIAL PRIMARY KEY,
  coil_id             TEXT NOT NULL REFERENCES m5a_material.coils,
  from_stage          TEXT,
  to_stage            TEXT NOT NULL,
  transition_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  triggered_by        TEXT NOT NULL,
  user_id             TEXT,
  device_id           TEXT,
  related_wo_id       TEXT,
  related_event_id    UUID,
  notes               TEXT
);

CREATE TABLE m5a_material.wo_readiness (
  wo_id                   TEXT PRIMARY KEY,
  required_qty_mt         NUMERIC(10,3) NOT NULL,
  available_qty_mt        NUMERIC(10,3) NOT NULL,
  expected_qty_mt         NUMERIC(10,3) NOT NULL,
  shortfall_qty_mt        NUMERIC(10,3) NOT NULL,
  status                  TEXT NOT NULL CHECK (status IN ('ready', 'partial', 'pending', 'shortage')),
  earliest_ready_at       TIMESTAMPTZ,
  reserved_coils          JSONB,
  expected_coils          JSONB,
  shortage_resolution_path TEXT,
  calculated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE m5a_material.pre_allocations (
  alloc_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coil_id           TEXT NOT NULL REFERENCES m5a_material.coils,
  wo_id             TEXT NOT NULL,
  allocated_qty_mt  NUMERIC(10,3) NOT NULL,
  priority_class    CHAR(1),
  allocated_by      TEXT NOT NULL,
  allocated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  released_at       TIMESTAMPTZ,
  release_reason    TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE m5a_material.inbound_expected (
  expectation_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coil_id           TEXT REFERENCES m5a_material.coils,
  sap_doc_ref       TEXT NOT NULL,
  material_code     TEXT NOT NULL,
  grade             TEXT NOT NULL,
  gauge_mm          NUMERIC(6,3) NOT NULL,
  width_mm          INTEGER NOT NULL,
  expected_weight_mt NUMERIC(10,3) NOT NULL,
  supplier          TEXT,
  expected_at       DATE,
  is_overdue        BOOLEAN GENERATED ALWAYS AS (expected_at < CURRENT_DATE) STORED,
  is_received       BOOLEAN NOT NULL DEFAULT FALSE,
  received_at       TIMESTAMPTZ,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE m5a_material.shortage_forecast (
  forecast_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  horizon_days          INTEGER NOT NULL,
  total_wos_evaluated   INTEGER NOT NULL,
  total_shortage_wos    INTEGER NOT NULL,
  total_shortage_qty_mt NUMERIC(12,3) NOT NULL
);

CREATE TABLE m5a_material.shortage_forecast_lines (
  forecast_id       UUID NOT NULL REFERENCES m5a_material.shortage_forecast,
  wo_id             TEXT NOT NULL,
  required_date     DATE NOT NULL,
  required_qty_mt   NUMERIC(10,3) NOT NULL,
  available_qty_mt  NUMERIC(10,3) NOT NULL,
  expected_qty_mt   NUMERIC(10,3) NOT NULL,
  shortfall_qty_mt  NUMERIC(10,3) NOT NULL,
  earliest_remediation TEXT,
  PRIMARY KEY (forecast_id, wo_id)
);

CREATE TABLE m5a_material.sap_watermarks (
  entity              TEXT PRIMARY KEY,
  last_synced_at      TIMESTAMPTZ NOT NULL,
  last_sap_modified   TIMESTAMPTZ,
  rows_last_pull      INTEGER,
  status_last         TEXT,
  error_message_last  TEXT
);

-- Indexes
CREATE INDEX idx_coils_stage ON m5a_material.coils (current_stage);
CREATE INDEX idx_coils_material ON m5a_material.coils (material_code, grade, gauge_mm, width_mm);
CREATE INDEX idx_coils_reserved ON m5a_material.coils (reserved_for_wo) WHERE reserved_for_wo IS NOT NULL;
CREATE INDEX idx_coils_active ON m5a_material.coils (current_stage, is_quality_hold) WHERE current_stage NOT IN ('dispatched', 'scrapped');
CREATE INDEX idx_csh_coil_time ON m5a_material.coil_stage_history (coil_id, transition_at DESC);
CREATE INDEX idx_wor_status ON m5a_material.wo_readiness (status);
CREATE INDEX idx_alloc_coil_active ON m5a_material.pre_allocations (coil_id) WHERE is_active = TRUE;
CREATE INDEX idx_alloc_wo_active ON m5a_material.pre_allocations (wo_id) WHERE is_active = TRUE;
CREATE INDEX idx_inbound_pending ON m5a_material.inbound_expected (expected_at) WHERE is_received = FALSE;
