-- 04_m6_dispatch_schema.sql
-- M6 Dispatch & Execution Control schema

CREATE SCHEMA IF NOT EXISTS m6_dispatch;

CREATE TABLE m6_dispatch.dispatch_lists (
  dispatch_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id     UUID,
  wc_id           TEXT NOT NULL REFERENCES master.work_centres,
  shift_date      DATE NOT NULL,
  shift           CHAR(1) NOT NULL CHECK (shift IN ('A', 'B', 'C')),
  shift_start     TIMESTAMPTZ NOT NULL,
  shift_end       TIMESTAMPTZ NOT NULL,
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at    TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'superseded', 'complete')),
  superseded_by   UUID REFERENCES m6_dispatch.dispatch_lists,
  generated_by    TEXT
);

CREATE TABLE m6_dispatch.dispatch_items (
  item_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_id         UUID NOT NULL REFERENCES m6_dispatch.dispatch_lists ON DELETE CASCADE,
  op_id               UUID,
  wo_id               TEXT,
  sequence_in_shift   INTEGER NOT NULL,
  op_type             TEXT NOT NULL DEFAULT 'production' CHECK (op_type IN ('production', 'setup', 'pm')),
  planned_setup_start TIMESTAMPTZ,
  planned_setup_end   TIMESTAMPTZ,
  planned_prod_start  TIMESTAMPTZ,
  planned_prod_end    TIMESTAMPTZ,
  planned_qty_mt      NUMERIC(10,3),
  expected_coils      JSONB,
  special_notes       TEXT,
  predecessor_item_id UUID REFERENCES m6_dispatch.dispatch_items,
  changeover_reason   TEXT,
  actual_status       TEXT NOT NULL DEFAULT 'pending' CHECK (actual_status IN (
    'pending', 'setup_in_progress', 'production_in_progress', 'stopped', 'complete', 'cancelled', 'skipped'
  )),
  actual_setup_start  TIMESTAMPTZ,
  actual_setup_end    TIMESTAMPTZ,
  actual_prod_start   TIMESTAMPTZ,
  actual_prod_end     TIMESTAMPTZ,
  actual_qty_mt       NUMERIC(10,3),
  actual_scrap_mt     NUMERIC(10,3),
  actual_operator_id  TEXT,
  notes_runtime       TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Append-only floor events (the source of truth)
CREATE TABLE m6_dispatch.execution_events (
  event_id          UUID PRIMARY KEY,
  dispatch_item_id  UUID REFERENCES m6_dispatch.dispatch_items,
  wc_id             TEXT NOT NULL,
  wo_id             TEXT,
  event_type        TEXT NOT NULL,
  occurred_at       TIMESTAMPTZ NOT NULL,
  recorded_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  operator_id       TEXT NOT NULL,
  device_id         TEXT NOT NULL,
  shift             CHAR(1),
  payload           JSONB NOT NULL,
  signature         TEXT NOT NULL
);

-- Materialised stoppages (derived from events for fast queries)
CREATE TABLE m6_dispatch.stoppages (
  stoppage_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wc_id             TEXT NOT NULL,
  wo_id             TEXT,
  dispatch_item_id  UUID REFERENCES m6_dispatch.dispatch_items,
  shift             CHAR(1),
  started_at        TIMESTAMPTZ NOT NULL,
  ended_at          TIMESTAMPTZ,
  duration_min      INTEGER GENERATED ALWAYS AS (
    CASE WHEN ended_at IS NOT NULL
    THEN EXTRACT(EPOCH FROM (ended_at - started_at))::INTEGER / 60
    ELSE NULL END
  ) STORED,
  reason_category   TEXT NOT NULL,
  reason_detail     TEXT,
  reported_by       TEXT NOT NULL,
  resolution_action TEXT,
  is_active         BOOLEAN GENERATED ALWAYS AS (ended_at IS NULL) STORED,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE m6_dispatch.rejects (
  reject_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wc_id             TEXT NOT NULL,
  wo_id             TEXT,
  dispatch_item_id  UUID REFERENCES m6_dispatch.dispatch_items,
  coil_id           TEXT,
  reported_at       TIMESTAMPTZ NOT NULL,
  reported_by       TEXT NOT NULL,
  defect_category   TEXT NOT NULL,
  defect_detail     TEXT,
  affected_qty_mt   NUMERIC(10,3),
  disposition       TEXT NOT NULL DEFAULT 'pending' CHECK (disposition IN ('rework', 'downgrade', 'scrap', 'pending')),
  disposition_by    TEXT,
  disposition_at    TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE m6_dispatch.shift_handovers (
  handover_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wc_id               TEXT NOT NULL,
  shift_date          DATE NOT NULL,
  outgoing_shift      CHAR(1) NOT NULL,
  incoming_shift      CHAR(1) NOT NULL,
  outgoing_operator   TEXT NOT NULL,
  incoming_operator   TEXT,
  outgoing_signed_at  TIMESTAMPTZ,
  incoming_signed_at  TIMESTAMPTZ,
  jobs_completed      JSONB,
  jobs_in_progress    JSONB,
  pending_items       JSONB,
  machine_state_note  TEXT,
  safety_notes        TEXT,
  handover_complete   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE m6_dispatch.setup_timings (
  timing_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wc_id               TEXT NOT NULL,
  dispatch_item_id    UUID REFERENCES m6_dispatch.dispatch_items,
  grade_from          TEXT,
  grade_to            TEXT NOT NULL,
  gauge_from_mm       NUMERIC(6,3),
  gauge_to_mm         NUMERIC(6,3) NOT NULL,
  width_from_mm       INTEGER,
  width_to_mm         INTEGER NOT NULL,
  gauge_step          TEXT,
  width_step          TEXT,
  roll_change_reqd    BOOLEAN,
  actual_start        TIMESTAMPTZ NOT NULL,
  actual_end          TIMESTAMPTZ NOT NULL,
  actual_duration_min INTEGER NOT NULL,
  planned_duration_min INTEGER,
  variance_min        INTEGER GENERATED ALWAYS AS (actual_duration_min - planned_duration_min) STORED,
  was_abandoned       BOOLEAN NOT NULL DEFAULT FALSE,
  notes               TEXT,
  observed_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE m6_dispatch.config (
  config_key    TEXT PRIMARY KEY,
  config_value  JSONB NOT NULL,
  updated_by    TEXT,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_dl_wc_shift ON m6_dispatch.dispatch_lists (wc_id, shift_date, shift);
CREATE INDEX idx_dl_published ON m6_dispatch.dispatch_lists (wc_id, shift_date, shift) WHERE status = 'published';
CREATE INDEX idx_di_dispatch_seq ON m6_dispatch.dispatch_items (dispatch_id, sequence_in_shift);
CREATE INDEX idx_di_wo ON m6_dispatch.dispatch_items (wo_id) WHERE wo_id IS NOT NULL;
CREATE INDEX idx_di_active ON m6_dispatch.dispatch_items (actual_status, dispatch_id) WHERE actual_status IN ('setup_in_progress', 'production_in_progress', 'stopped');
CREATE INDEX idx_ee_wc_time ON m6_dispatch.execution_events (wc_id, occurred_at DESC);
CREATE INDEX idx_ee_type_time ON m6_dispatch.execution_events (event_type, occurred_at DESC);
CREATE INDEX idx_stopp_wc_time ON m6_dispatch.stoppages (wc_id, started_at DESC);
CREATE INDEX idx_stopp_active ON m6_dispatch.stoppages (wc_id) WHERE is_active = TRUE;
CREATE INDEX idx_rej_wo ON m6_dispatch.rejects (wo_id);
CREATE INDEX idx_ho_wc_date ON m6_dispatch.shift_handovers (wc_id, shift_date DESC);

-- ── v0.2: Production Passes (multi-pass cold rolling) ───────────────────────
CREATE TABLE m6_dispatch.production_passes (
  pass_id               SERIAL PRIMARY KEY,
  dispatch_item_id      UUID NOT NULL REFERENCES m6_dispatch.dispatch_items ON DELETE CASCADE,
  pass_number           INT NOT NULL,
  is_final              BOOLEAN NOT NULL DEFAULT FALSE,
  thickness_in_mm       NUMERIC(6,3),
  thickness_out_mm      NUMERIC(6,3) NOT NULL,
  reduction_pct         NUMERIC(5,2) GENERATED ALWAYS AS (
    CASE WHEN thickness_in_mm IS NOT NULL AND thickness_in_mm > 0
    THEN ROUND((thickness_in_mm - thickness_out_mm) / thickness_in_mm * 100, 2)
    ELSE NULL END
  ) STORED,
  rw_tension            NUMERIC(8,2),
  coolant_temp_c        NUMERIC(5,1),
  coolant_press_kg_cm2  NUMERIC(6,2),
  started_at            TIMESTAMPTZ,
  ended_at              TIMESTAMPTZ,
  duration_sec          INT GENERATED ALWAYS AS (
    CASE WHEN ended_at IS NOT NULL AND started_at IS NOT NULL
    THEN EXTRACT(EPOCH FROM (ended_at - started_at))::INT
    ELSE NULL END
  ) STORED,
  operator_id           TEXT,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (dispatch_item_id, pass_number)
);

-- ── v0.2: Roll Assignments ───────────────────────────────────────────────────
CREATE TABLE m6_dispatch.roll_assignments (
  assignment_id       SERIAL PRIMARY KEY,
  dispatch_item_id    UUID NOT NULL REFERENCES m6_dispatch.dispatch_items ON DELETE CASCADE,
  roll_top_id         TEXT REFERENCES master.rolls,
  roll_bottom_id      TEXT REFERENCES master.rolls,
  assigned_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  tonnage_rolled_mt   NUMERIC(10,3) NOT NULL DEFAULT 0
);

-- ── v0.2: Roll Changes ───────────────────────────────────────────────────────
CREATE TABLE m6_dispatch.roll_changes (
  change_id                           SERIAL PRIMARY KEY,
  wc_id                               TEXT NOT NULL REFERENCES master.work_centres,
  occurred_at                         TIMESTAMPTZ NOT NULL,
  out_roll_top_id                     TEXT REFERENCES master.rolls,
  out_roll_bottom_id                  TEXT REFERENCES master.rolls,
  out_cumulative_since_last_change_mt NUMERIC(10,3),
  out_roll_finish_rating              TEXT,
  in_roll_top_id                      TEXT NOT NULL REFERENCES master.rolls,
  in_roll_bottom_id                   TEXT NOT NULL REFERENCES master.rolls,
  in_roll_finish                      TEXT,
  reason                              TEXT NOT NULL CHECK (reason IN (
    'scheduled_grind', 'wear_threshold', 'breakage', 'grade_change', 'quality_issue'
  )),
  operator_id                         TEXT,
  crane_operator_id                   TEXT,
  dispatch_item_id                    UUID REFERENCES m6_dispatch.dispatch_items,
  duration_min                        NUMERIC(6,1),
  linked_stoppage_id                  UUID REFERENCES m6_dispatch.stoppages,
  created_at                          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── v0.2: Shift Crew Assignments ─────────────────────────────────────────────
CREATE TABLE m6_dispatch.shift_crew_assignments (
  assignment_id     SERIAL PRIMARY KEY,
  wc_id             TEXT NOT NULL REFERENCES master.work_centres,
  shift_date        DATE NOT NULL,
  shift             CHAR(1) NOT NULL CHECK (shift IN ('A', 'B', 'C')),
  line_incharge_id  TEXT,
  crew_members      JSONB NOT NULL DEFAULT '[]',
  crane_operator_id TEXT,
  shift_manager_id  TEXT,
  confirmed_at      TIMESTAMPTZ,
  confirmed_by      TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (wc_id, shift_date, shift)
);

-- ── v0.2: Extend dispatch_items ──────────────────────────────────────────────
ALTER TABLE m6_dispatch.dispatch_items
  ADD COLUMN IF NOT EXISTS is_rerolling BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS rerolling_reason TEXT;

-- ── v0.2: Extend shift_handovers with digital signature workflow ─────────────
ALTER TABLE m6_dispatch.shift_handovers
  ADD COLUMN IF NOT EXISTS incharge_signed_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS incharge_signature_event_id TEXT,
  ADD COLUMN IF NOT EXISTS manager_approved_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS manager_approval_event_id   TEXT,
  ADD COLUMN IF NOT EXISTS manager_correction_requested BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS correction_reason           TEXT,
  ADD COLUMN IF NOT EXISTS is_immutable                BOOLEAN NOT NULL DEFAULT FALSE;

-- ── v0.2: FK constraints for catalogue-driven classification ─────────────────
ALTER TABLE m6_dispatch.stoppages
  ADD CONSTRAINT fk_stoppage_code FOREIGN KEY (reason_category)
  REFERENCES master.stoppage_codes(code) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE m6_dispatch.rejects
  ADD CONSTRAINT fk_defect_code FOREIGN KEY (defect_category)
  REFERENCES master.defect_codes(code) DEFERRABLE INITIALLY DEFERRED;

-- ── v0.2: Indexes ────────────────────────────────────────────────────────────
CREATE INDEX idx_passes_item ON m6_dispatch.production_passes (dispatch_item_id, pass_number);
CREATE INDEX idx_roll_changes_wc ON m6_dispatch.roll_changes (wc_id, occurred_at DESC);
CREATE INDEX idx_crew_wc_date ON m6_dispatch.shift_crew_assignments (wc_id, shift_date);
CREATE UNIQUE INDEX idx_ee_event_id ON m6_dispatch.execution_events (event_id);
