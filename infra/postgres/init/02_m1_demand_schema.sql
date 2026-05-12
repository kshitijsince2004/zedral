-- 02_m1_demand_schema.sql
-- M1 Demand & Work Order Management schema

CREATE SCHEMA IF NOT EXISTS m1_demand;

CREATE TABLE m1_demand.sales_orders (
  so_id             TEXT PRIMARY KEY,
  sap_so_ref        TEXT NOT NULL,
  customer_id       TEXT NOT NULL REFERENCES master.customers,
  customer_po_ref   TEXT,
  order_date        DATE NOT NULL,
  required_date     DATE NOT NULL,
  total_qty_mt      NUMERIC(10,3) NOT NULL,
  status            TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'partial', 'fulfilled', 'cancelled')),
  net_value         NUMERIC(14,2),
  sap_modified_at   TIMESTAMPTZ NOT NULL,
  ingested_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  version           INTEGER NOT NULL DEFAULT 1,
  raw_sap_payload   JSONB
);

CREATE TABLE m1_demand.sales_order_items (
  so_id             TEXT NOT NULL REFERENCES m1_demand.sales_orders ON DELETE CASCADE,
  item_no           INTEGER NOT NULL,
  material_code     TEXT NOT NULL REFERENCES master.materials,
  grade             TEXT NOT NULL,
  gauge_mm          NUMERIC(6,3) NOT NULL,
  width_mm          INTEGER NOT NULL,
  qty_mt            NUMERIC(10,3) NOT NULL,
  qty_fulfilled_mt  NUMERIC(10,3) NOT NULL DEFAULT 0,
  item_required_date DATE,
  PRIMARY KEY (so_id, item_no)
);

CREATE TABLE m1_demand.work_orders (
  wo_id             TEXT PRIMARY KEY,
  sap_wo_ref        TEXT NOT NULL,
  parent_wo_id      TEXT REFERENCES m1_demand.work_orders,
  material_code     TEXT NOT NULL REFERENCES master.materials,
  grade             TEXT NOT NULL,
  gauge_mm          NUMERIC(6,3) NOT NULL,
  width_mm          INTEGER NOT NULL,
  qty_planned_mt    NUMERIC(10,3) NOT NULL,
  qty_confirmed_mt  NUMERIC(10,3) NOT NULL DEFAULT 0,
  qty_scrap_mt      NUMERIC(10,3) NOT NULL DEFAULT 0,
  required_date     DATE NOT NULL,
  planned_start_date DATE,
  routing_id        TEXT REFERENCES master.routings,
  routing_valid     BOOLEAN NOT NULL DEFAULT FALSE,
  priority_class    CHAR(1) CHECK (priority_class IN ('A', 'B', 'C')),
  priority_score    NUMERIC(6,3),
  priority_manual   BOOLEAN NOT NULL DEFAULT FALSE,
  priority_reason   TEXT,
  wo_type           TEXT NOT NULL DEFAULT 'customer' CHECK (wo_type IN ('customer', 'internal', 'rework', 'manual')),
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'scheduled', 'released', 'in_process', 'complete', 'cancelled', 'on_hold', 'rejected')),
  hold_reason       TEXT,
  rejection_reason  TEXT,
  sap_modified_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  ingested_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  version           INTEGER NOT NULL DEFAULT 1,
  raw_sap_payload   JSONB
);

CREATE TABLE m1_demand.wo_so_link (
  wo_id             TEXT NOT NULL REFERENCES m1_demand.work_orders,
  so_id             TEXT NOT NULL,
  so_item_no        INTEGER NOT NULL,
  allocated_qty_mt  NUMERIC(10,3) NOT NULL,
  PRIMARY KEY (wo_id, so_id, so_item_no),
  FOREIGN KEY (so_id, so_item_no) REFERENCES m1_demand.sales_order_items (so_id, item_no)
);

CREATE TABLE m1_demand.priority_score_history (
  history_id        BIGSERIAL PRIMARY KEY,
  wo_id             TEXT NOT NULL REFERENCES m1_demand.work_orders,
  calculated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  priority_score    NUMERIC(6,3) NOT NULL,
  priority_class    CHAR(1) NOT NULL,
  score_components  JSONB NOT NULL,
  trigger           TEXT NOT NULL,
  triggered_by      TEXT
);

CREATE TABLE m1_demand.priority_overrides (
  override_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wo_id             TEXT NOT NULL REFERENCES m1_demand.work_orders,
  override_type     TEXT NOT NULL CHECK (override_type IN ('rush', 'defer', 'hold', 'release_hold')),
  old_score         NUMERIC(6,3),
  new_score         NUMERIC(6,3),
  reason            TEXT NOT NULL,
  overridden_by     TEXT NOT NULL,
  overridden_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at        TIMESTAMPTZ,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE m1_demand.sap_watermarks (
  entity            TEXT PRIMARY KEY,
  last_synced_at    TIMESTAMPTZ NOT NULL,
  last_sap_modified TIMESTAMPTZ NOT NULL,
  rows_last_pull    INTEGER,
  status_last       TEXT,
  error_message_last TEXT
);

CREATE TABLE m1_demand.validation_errors (
  error_id          BIGSERIAL PRIMARY KEY,
  wo_id             TEXT NOT NULL REFERENCES m1_demand.work_orders,
  error_type        TEXT NOT NULL,
  error_detail      JSONB,
  detected_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at       TIMESTAMPTZ,
  resolution_note   TEXT
);

-- Indexes
CREATE INDEX idx_wo_status_priority ON m1_demand.work_orders (status, priority_score DESC) WHERE status IN ('queued', 'scheduled');
CREATE INDEX idx_wo_required_date ON m1_demand.work_orders (required_date);
CREATE INDEX idx_wo_material ON m1_demand.work_orders (material_code);
CREATE INDEX idx_psh_wo_time ON m1_demand.priority_score_history (wo_id, calculated_at DESC);
CREATE INDEX idx_override_wo_active ON m1_demand.priority_overrides (wo_id) WHERE is_active = TRUE;
