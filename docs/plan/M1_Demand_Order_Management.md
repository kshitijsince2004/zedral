Zedral Platform ��� M1 Production Document

Demand & Order Management �� Phase 1

Product & Systems Engineering

April 2026

Table of Contents

# Zedral Platform — Module M1 Production Document

## M1 — Demand & Order Management

**Document status:** Draft v0.1 · For engineering handover **Audience:** M1 module engineering team, adjacent module teams (M3, M4, M5a), pilot planner at Hero Steels **Owner:** Platform Engineering · M1 technical lead TBD **Depends on:** Phase 0 Foundation Document (platform architecture, event backbone, M2 Master Data Engine, SAP connector) **Phase:** 1 (Pilot Core Loop · Months 2–6) **Inherits:** All 10 Architectural Principles, event envelope standard, RBAC model, observability standards

## Table of Contents

- Scope & Non-Goals

- Personas & Jobs To Be Done

- Data Model

- Event Schemas

- Ingestion Flow

- Processing Logic

- Storage Strategy

- API Surface

- UI/UX Specification

- Integration with Other Modules

- SAP Bidirectional Mapping

- Failure Modes & Recovery

- Acceptance Criteria

- Build Plan

## 1. Scope & Non-Goals

### 1.1 What M1 Is

M1 — Demand & Order Management — is the **front door** of the Zedral platform. It is the module where incoming demand lives: sales orders from customers, production work orders derived from those sales orders, and the priority-ranked queue that governs what gets scheduled next.

Every work order that M4 schedules, every capacity check M3 runs, every material availability query M5a evaluates — all begin with an entity that lives in M1.

**M1 owns four primary responsibilities:**

- **Ingestion** — pull sales orders and production work orders from SAP (and accept manual entry as a fallback); persist them in a canonical Zedral data model

- **Validation** — reject or flag incoming orders that fail structural checks (missing routing, unknown material, invalid dates) before they pollute downstream modules

- **Prioritisation** — compute and maintain a priority score for every open work order, taking into account customer class, delivery proximity, dependency signals, and planner overrides

- **Publication** — expose the ranked queue via events on the backbone and via APIs to UI and adjacent modules

### 1.2 What M1 Is Not

Explicit non-goals. These are responsibilities that belong to other modules or other systems. If a design decision in M1 drifts toward these, the decision is wrong.

- **Not a schedule.** M1 does not decide *when* a work order runs on *which* line. That’s M4. M1 tells M4 *which orders are eligible and in what priority sequence*.

- **Not a capacity check.** M1 does not evaluate whether capacity exists. That’s M3. M1 hands off a demand queue; M3 overlays available hours.

- **Not a material check.** M1 does not verify that raw coil is available. That’s M5a. M1 may surface a material-readiness hint from M5a, but the authoritative check lives there.

- **Not an order entry system.** M1 does not replace SAP SD for customer order intake. Customers interact with Hero Steels’ sales process via SAP; M1 reads the result.

- **Not a pricing engine.** Monetary values (std cost, price, margin) are SAP’s domain; M1 may display them read-only but never compute or modify.

- **Not a CRM.** Customer relationship management, contacts, communications — out of scope.

- **Not a forecast engine.** Demand forecasting (statistical, seasonal, ML-based) is out of scope for v1. M1 works with firm, confirmed demand only.

- **Not a commitment engine.** Available-to-Promise (ATP), Capable-to-Promise (CTP) — out of scope for v1. Revisit Phase 3.

### 1.3 Edge Cases Explicitly In Scope

Some edge cases that routinely break this kind of module — v1 must handle these correctly:

- **Orphaned work orders** (WO exists in SAP without a sales order ref — internal stock build, MTO-to-stock) — accepted and flagged as internal

- **Split work orders** (one SAP WO split across multiple production runs) — tracked as parent/child in M1

- **Combined work orders** (multiple small SOs rolled into one WO for efficient running) — tracked via many-to-many SO↔WO relationship

- **Cancelled work orders** (WO cancelled in SAP after being pulled into M1) — cancelled in M1 with cascade to M4/M6

- **Modified work orders** (qty changed, due date moved, material changed) — updated in M1 with version tracking; downstream modules notified via events

- **Rush orders** (planner manually marks high-priority via override) — supported with audit trail

### 1.4 Edge Cases Deferred to Phase 2+

- **Firm-planned vs. order-planned distinction in SAP PP** — v1 treats both uniformly; Phase 2 may split handling

- **Co-product / by-product work orders** — v1 assumes single-product; not relevant in CRS but would matter for an upstream pickling line

- **Collaborative demand planning with customer signals (EDI feeds)** — Phase 3+

- **Multi-plant demand allocation** — single plant in v1

## 2. Personas & Jobs To Be Done

### 2.1 Primary Persona — The Production Planner

**Who they are.** At Hero Steels, the Production Planner is typically a 5–15-year veteran of steel operations, reports to the Head of Manufacturing, and owns the schedule for the CRS lines. Currently works from Excel sheets pulled from SAP, scheduling in their head, and walking the floor three times per shift.

**Context they operate in.** Morning shift starts 6:00 AM. Planner arrives 5:45 AM, reviews overnight production, checks today’s demand against available capacity, negotiates with sales on late orders, fights with maintenance over PM windows, and pushes a revised schedule to supervisors by 7:00 AM. Repeats at shift changes.

**Expertise level.** Deep domain knowledge. Comfortable with Excel. Not a software engineer. Values predictability, transparency, and the ability to override the system when the system is wrong.

**What M1 delivers to them.** The demand queue — a ranked, filterable, actionable view of every open work order. Not a black box. Not a calendar. Just: “here are your 47 open orders, here’s what I’m recommending you prioritise, here’s why, and here’s how to override me if you disagree.”

### 2.2 JTBDs for the Production Planner

**JTBD-1: Morning demand review.**

*“**When I start my shift, I need to see every open work order in one list, ranked by how urgent each is, with the top-of-list items clearly actionable — so I can decide within 15 minutes what the mills are running today.**”*

**JTBD-2: Rush order handling.**

*“**When a sales rep calls with a last-minute customer emergency, I need to inject the new order into the priority queue with a stated justification, see the impact on existing orders, and commit or back out within 5 minutes.**”*

**JTBD-3: Demand-vs-capacity reality check.**

*“**Before I commit to Sales on a delivery date, I need a one-glance view of whether we have the capacity to make the new order in time without pushing existing orders late — so I can say yes or no with conviction.**”*

**JTBD-4: Order tracking.**

*“**When a customer calls asking about their order, I need to search by PO number or customer name and see: is it in the queue, is it scheduled, is it running, is it done — without opening three SAP screens and one spreadsheet.**”*

**JTBD-5: Priority explanation.**

*“**When my GM questions why a certain order is ranked higher than another, I need to show them the scoring breakdown — customer class, delivery proximity, material readiness — so the conversation is about business rules, not about my memory.**”*

### 2.3 Secondary Personas

**Shift Supervisor.**

- **Access:** read-only

- **JTBD:** “I need to see what’s coming next, so I can brief my operators at shift change.”

- **UI surface:** simplified Demand Queue view; no override capability

**Plant Head / Head of Manufacturing.**

- **Access:** read-only with priority override capability (overrides the planner’s override — rare but needed)

- **JTBD:** “I need to see aggregate demand, commitment gaps, and the top at-risk orders for the week.”

- **UI surface:** executive rollup dashboard (data sourced from M1, rendered in M7 dashboards — not M1’s primary UI)

**Sales Rep** (Phase 2 expansion).

- Deferred. v1 does not provide a sales-facing surface. Sales interact via SAP SD.

## 3. Data Model

M1’s data lives in the m1_demand schema of the Core Postgres database. Every table follows the platform conventions: created_at / updated_at auditing, JSONB for flexibly-typed columns, indexed for the query patterns specified in §7 and §8.

### 3.1 Core Tables

-- =======================================================
-- Sales orders (synced from SAP SD)
-- =======================================================
CREATE TABLE m1_demand.sales_orders (
  so_id              TEXT PRIMARY KEY,                    -- Zedral natural key (= SAP SO number)
  sap_so_ref         TEXT NOT NULL,                       -- explicit SAP linkage
  customer_id        TEXT NOT NULL REFERENCES master.customers,
  customer_po_ref    TEXT,                                -- customer's own PO number
  order_date         DATE NOT NULL,
  required_date      DATE NOT NULL,
  total_qty_mt       NUMERIC(10,3) NOT NULL,
  status             TEXT NOT NULL,                       -- 'open' | 'partial' | 'fulfilled' | 'cancelled'
  sales_org          TEXT,                                -- SAP sales organisation
  sales_office       TEXT,
  currency           CHAR(3) DEFAULT 'INR',
  net_value          NUMERIC(14,2),                       -- total order value (read-only, for reference)
  sap_modified_at    TIMESTAMPTZ NOT NULL,                -- SAP's last-modified timestamp (watermark)
  ingested_at        TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now(),
  version            INTEGER DEFAULT 1,                   -- incremented on every update
  raw_sap_payload    JSONB                                -- full SAP OData response for audit / re-parse
);

CREATE INDEX idx_so_customer           ON m1_demand.sales_orders (customer_id);
CREATE INDEX idx_so_required_date      ON m1_demand.sales_orders (required_date);
CREATE INDEX idx_so_status_required    ON m1_demand.sales_orders (status, required_date)
                                       WHERE status IN ('open', 'partial');
CREATE INDEX idx_so_sap_modified       ON m1_demand.sales_orders (sap_modified_at);
CREATE INDEX idx_so_customer_po        ON m1_demand.sales_orders (customer_po_ref);

-- =======================================================
-- Sales order line items
-- =======================================================
CREATE TABLE m1_demand.sales_order_items (
  so_id              TEXT NOT NULL REFERENCES m1_demand.sales_orders ON DELETE CASCADE,
  item_no            INTEGER NOT NULL,                    -- SAP line item number
  material_code      TEXT NOT NULL REFERENCES master.materials,
  grade              TEXT NOT NULL,
  gauge_mm           NUMERIC(6,3) NOT NULL,
  width_mm           INTEGER NOT NULL,
  qty_mt             NUMERIC(10,3) NOT NULL,
  qty_fulfilled_mt   NUMERIC(10,3) DEFAULT 0,
  item_required_date DATE,                                -- may differ from order-level required_date
  customer_spec_ref  TEXT,                                -- link to customer-specific quality spec
  PRIMARY KEY (so_id, item_no)
);

-- =======================================================
-- Work orders (synced from SAP PP; THE central M1 entity)
-- =======================================================
CREATE TABLE m1_demand.work_orders (
  wo_id              TEXT PRIMARY KEY,                    -- Zedral natural key (= SAP WO number)
  sap_wo_ref         TEXT NOT NULL,
  parent_wo_id       TEXT REFERENCES m1_demand.work_orders, -- for split WOs
  material_code      TEXT NOT NULL REFERENCES master.materials,
  grade              TEXT NOT NULL,
  gauge_mm           NUMERIC(6,3) NOT NULL,
  width_mm           INTEGER NOT NULL,
  qty_planned_mt     NUMERIC(10,3) NOT NULL,
  qty_confirmed_mt   NUMERIC(10,3) DEFAULT 0,             -- populated by M7 via event
  qty_scrap_mt       NUMERIC(10,3) DEFAULT 0,
  required_date      DATE NOT NULL,
  planned_start_date DATE,                                -- from SAP; may be overridden by M4 schedule
  routing_id         TEXT REFERENCES master.routings,     -- resolved at ingestion; NULL if unresolved
  routing_valid      BOOLEAN DEFAULT FALSE,               -- set by validation worker
  priority_class     CHAR(1),                             -- 'A' | 'B' | 'C' — derived from customer + overrides
  priority_score     NUMERIC(6,3),                        -- calculated score, higher = more urgent
  priority_manual    BOOLEAN DEFAULT FALSE,               -- TRUE if planner overrode the score
  priority_reason    TEXT,                                -- override reason (audit)
  wo_type            TEXT NOT NULL,                       -- 'customer' | 'internal' | 'rework'
  status             TEXT NOT NULL,                       -- 'pending' | 'queued' | 'scheduled' | 'released'
                                                          --   | 'in_process' | 'complete' | 'cancelled'
                                                          --   | 'on_hold' | 'rejected'
  hold_reason        TEXT,                                -- when status='on_hold'
  rejection_reason   TEXT,                                -- when status='rejected' by validator
  sap_modified_at    TIMESTAMPTZ NOT NULL,
  ingested_at        TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now(),
  version            INTEGER DEFAULT 1,
  raw_sap_payload    JSONB
);

CREATE INDEX idx_wo_status_priority    ON m1_demand.work_orders (status, priority_score DESC)
                                       WHERE status IN ('queued', 'scheduled');
CREATE INDEX idx_wo_required_date      ON m1_demand.work_orders (required_date);
CREATE INDEX idx_wo_material           ON m1_demand.work_orders (material_code);
CREATE INDEX idx_wo_customer           ON m1_demand.work_orders (
                                         (raw_sap_payload->>'customer_id'));
CREATE INDEX idx_wo_sap_modified       ON m1_demand.work_orders (sap_modified_at);

-- =======================================================
-- WO to SO linkage (many-to-many)
-- One SO item may be split across multiple WOs
-- One WO may fulfill multiple SO items (rare but permitted)
-- =======================================================
CREATE TABLE m1_demand.wo_so_link (
  wo_id              TEXT NOT NULL REFERENCES m1_demand.work_orders,
  so_id              TEXT NOT NULL,
  so_item_no         INTEGER NOT NULL,
  allocated_qty_mt   NUMERIC(10,3) NOT NULL,
  PRIMARY KEY (wo_id, so_id, so_item_no),
  FOREIGN KEY (so_id, so_item_no) REFERENCES m1_demand.sales_order_items (so_id, item_no)
);

CREATE INDEX idx_wosolink_so ON m1_demand.wo_so_link (so_id, so_item_no);

-- =======================================================
-- Priority score history (audit + explainability)
-- =======================================================
CREATE TABLE m1_demand.priority_score_history (
  history_id         BIGSERIAL PRIMARY KEY,
  wo_id              TEXT NOT NULL REFERENCES m1_demand.work_orders,
  calculated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  priority_score     NUMERIC(6,3) NOT NULL,
  priority_class     CHAR(1) NOT NULL,
  score_components   JSONB NOT NULL,                      -- breakdown (see §6.2)
  trigger            TEXT NOT NULL,                       -- 'ingestion' | 'scheduled_recalc' | 'override' | 'event_driven'
  triggered_by       TEXT                                 -- user_id for overrides; NULL for system
);

CREATE INDEX idx_psh_wo_time ON m1_demand.priority_score_history (wo_id, calculated_at DESC);

-- =======================================================
-- Manual overrides (separate table for auditability)
-- =======================================================
CREATE TABLE m1_demand.priority_overrides (
  override_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wo_id              TEXT NOT NULL REFERENCES m1_demand.work_orders,
  override_type      TEXT NOT NULL,                       -- 'rush' | 'defer' | 'hold' | 'release_hold'
  old_score          NUMERIC(6,3),
  new_score          NUMERIC(6,3),
  reason             TEXT NOT NULL,                       -- mandatory; free text, min 20 chars
  overridden_by      TEXT NOT NULL,                       -- user_id
  overridden_at      TIMESTAMPTZ DEFAULT now(),
  expires_at         TIMESTAMPTZ,                         -- optional auto-expiry; else permanent
  is_active          BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_override_wo_active ON m1_demand.priority_overrides (wo_id)
                                    WHERE is_active = TRUE;

-- =======================================================
-- SAP sync watermarks (one row per SAP entity)
-- =======================================================
CREATE TABLE m1_demand.sap_watermarks (
  entity             TEXT PRIMARY KEY,                    -- 'work_orders' | 'sales_orders'
  last_synced_at     TIMESTAMPTZ NOT NULL,                -- Zedral ingestion timestamp
  last_sap_modified  TIMESTAMPTZ NOT NULL,                -- max(sap_modified_at) from last pull
  rows_last_pull     INTEGER,
  duration_ms_last   INTEGER,
  status_last        TEXT,                                -- 'success' | 'partial' | 'failed'
  error_message_last TEXT
);

-- =======================================================
-- Validation errors (for WOs that failed structural validation)
-- =======================================================
CREATE TABLE m1_demand.validation_errors (
  error_id           BIGSERIAL PRIMARY KEY,
  wo_id              TEXT NOT NULL REFERENCES m1_demand.work_orders,
  error_type         TEXT NOT NULL,                       -- 'routing_missing' | 'material_unknown' | 'date_invalid' | ...
  error_detail       JSONB,
  detected_at        TIMESTAMPTZ DEFAULT now(),
  resolved_at        TIMESTAMPTZ,
  resolution_note    TEXT
);

### 3.2 Design Notes

**Why store**** ****raw_sap_payload**** ****as JSONB.** Two reasons. First, audit — if we misinterpret a SAP field, we can re-parse without re-pulling. Second, evolution — when SAP adds a field that becomes relevant, we can backfill from historical JSONB without a full re-sync. Storage cost: ~5 KB per WO × 500 WO/month × 12 months = ~30 MB/year. Negligible.

**Why a separate**** ****priority_score_history**** ****table.** Explainability. When the planner asks “why is this WO ranked fifth?” the answer is “because at its last recalculation at 09:15, its components scored: customer_class=20, delivery_proximity=35, material_ready=10, manual_adjustment=0, for a total of 65.” This table is the audit surface for that question.

**Why**** ****priority_overrides**** ****is separate from**** ****work_orders****.** An override is not a property of the WO — it is an event on the WO. Multiple overrides across a WO’s lifetime need to be queryable for audit. Collapsing override state into work_orders would lose history.

**Why status machine includes**** ****on_hold**** ****and**** ****rejected**** ****distinct from**** ****cancelled****.**

- cancelled — SAP-originated cancellation; the WO no longer exists as a business commitment

- on_hold — temporary planner/operator action; e.g., waiting for customer spec clarification

- rejected — M1 validator failed the WO structurally; it cannot be scheduled until corrected

The three are operationally distinct and must be distinguishable in the queue view.

### 3.3 Retention

- **Active WOs** (status ∈ pending, queued, scheduled, released, in_process, on_hold, rejected) — indefinite retention, no TTL

- **Closed WOs** (status ∈ complete, cancelled) — 2 years hot in Postgres, then archived to MinIO Parquet and purged from active tables

- **Priority history** — 1 year hot, 7 years archived (supports audit questions “why was this order deprioritised 3 years ago”)

- **Validation errors** — 90 days hot, 1 year archived

- **SAP watermarks** — permanent (< 50 rows total, negligible)

Archival runs nightly via the Platform Archival job (shared service, not M1-specific).

## 4. Event Schemas

M1 participates in the unified event backbone as both publisher and consumer. All schemas are registered in Apicurio (per Principle 8).

### 4.1 Events M1 Publishes

#### erp.work_order.received (v1.0)

Published when a WO is ingested from SAP for the first time. Downstream: M3 (capacity recalc), M4 (queue refresh), M5a (material availability check), M7 (analytics backfill).

{
  "event_type": "erp.work_order.received",
  "schema_version": "1.0",
  "aggregate_id": "wo_8893451",
  "payload": {
    "wo_id": "wo_8893451",
    "sap_wo_ref": "8893451",
    "material_code": "CR_045_1250_IS513",
    "grade": "IS513-D",
    "gauge_mm": 0.45,
    "width_mm": 1250,
    "qty_planned_mt": 18.45,
    "required_date": "2026-04-25",
    "planned_start_date": "2026-04-22",
    "customer_id": "cust_maruti_01",
    "so_links": [
      {"so_id": "so_44501", "item_no": 1, "allocated_qty_mt": 18.45}
    ],
    "wo_type": "customer",
    "routing_id": "rt_CR_045_1250_IS513_v3",
    "routing_valid": true
  }
}

#### erp.work_order.updated (v1.0)

Published when a WO changes (qty, date, status). Includes a changes delta.

{
  "event_type": "erp.work_order.updated",
  "aggregate_id": "wo_8893451",
  "payload": {
    "wo_id": "wo_8893451",
    "version": 3,
    "changes": {
      "qty_planned_mt": {"from": 18.45, "to": 20.00},
      "required_date": {"from": "2026-04-25", "to": "2026-04-28"}
    },
    "trigger": "sap_pull"
  }
}

#### erp.work_order.cancelled (v1.0)

Terminal event. Downstream: M4 removes from schedule, M5a releases reserved material, M7 records the cancellation.

{
  "event_type": "erp.work_order.cancelled",
  "aggregate_id": "wo_8893451",
  "payload": {
    "wo_id": "wo_8893451",
    "cancelled_in_sap_at": "2026-04-17T11:30:00Z",
    "reason": "customer_cancelled"
  }
}

#### erp.sales_order.received (v1.0) and .updated and .cancelled

Equivalent set for sales orders. Primarily consumed for audit and for the order-lookup UI.

#### demand.priority.recalculated (v1.0)

Published whenever a WO’s priority score changes materially (delta > 0.1 or class change). Downstream: M4 uses this to decide whether to trigger a re-optimisation.

{
  "event_type": "demand.priority.recalculated",
  "aggregate_id": "wo_8893451",
  "payload": {
    "wo_id": "wo_8893451",
    "previous_score": 62.5,
    "new_score": 78.0,
    "previous_class": "B",
    "new_class": "A",
    "score_components": {
      "customer_class": 30,
      "delivery_proximity": 35,
      "material_readiness": 10,
      "dependency_signal": 0,
      "manual_adjustment": 3
    },
    "trigger": "scheduled_recalc"
  }
}

#### demand.priority.overridden (v1.0)

Published when a planner manually overrides a score. Distinct from recalculated because it carries audit semantics (user_id, reason).

{
  "event_type": "demand.priority.overridden",
  "aggregate_id": "wo_8893451",
  "payload": {
    "wo_id": "wo_8893451",
    "override_type": "rush",
    "new_score": 95.0,
    "reason": "Customer escalation: Maruti line stoppage risk",
    "overridden_by": "planner_042",
    "expires_at": null
  }
}

#### demand.validation.failed (v1.0)

Published when a WO fails structural validation. Routed to an ops notification queue.

{
  "event_type": "demand.validation.failed",
  "aggregate_id": "wo_8893451",
  "payload": {
    "wo_id": "wo_8893451",
    "errors": [
      {"type": "routing_missing", "detail": "No active routing for material_code=CR_045_1250_IS513"},
      {"type": "required_date_past", "detail": "required_date is in the past"}
    ]
  }
}

### 4.2 Events M1 Consumes

#### master.materials.updated

When M2 updates a material master, M1 re-validates any WOs referencing it (a material change may fix or break routing validity).

#### master.customers.updated

When customer priority class changes, M1 recalculates priority score for all open WOs for that customer.

#### master.routings.updated

When a routing is activated or deactivated, M1 re-validates all WOs referencing the affected material.

#### floor.production.completed (from M6, routed via M7)

When production is confirmed against a WO, M1 updates qty_confirmed_mt and may transition status to complete.

#### material.coil.shortage_detected (from M5a)

When M5a detects a shortage for a WO, M1 records it as a dependency signal, adjusting priority score.

### 4.3 Event Ordering Guarantees

WO events partition by wo_id, ensuring strict ordering per WO. Sales order events partition by so_id. Customer-level events (e.g., priority class change affecting many WOs) partition by customer_id.

### 4.4 Schema Evolution Policy

Additive changes (new optional fields) are minor-version bumps. Breaking changes (removing or retyping fields) require a dual-publish window per Principle 8.

## 5. Ingestion Flow

Three paths. In priority order: SAP pull (primary), manual entry (fallback), file import (one-time migration).

### 5.1 SAP Pull — The Primary Path

**Cadence.** Every 15 minutes for work orders; every 30 minutes for sales orders. Tunable via the runtime config table.

**Mechanism.** The SAP Sync Worker (a shared Phase 0 service, not M1-specific) pulls on schedule:

GET /sap/opu/odata/sap/ProductionOrder_SRV/ProductionOrderSet
  ?$filter=ModifiedAt gt '{last_watermark}'
  &$expand=Components,Operations
  &$top=200
  &$orderby=ModifiedAt asc

**Pagination.** SAP may return more than 200 rows in a busy window. The worker iterates with $skiptoken until the response is shorter than $top, advancing the watermark on each page.

**Transformation.** SAP field names map to Zedral canonical names via a field mapping config (owned by M1, reviewed quarterly). Example mappings:

| SAP field | Zedral field | Transformation |
| --- | --- | --- |
| AUFNR | wo_id | Strip leading zeros; prefix wo_ |
| MATNR | material_code | Direct copy |
| GAMNG | qty_planned_mt | Convert from KG to MT (divide by 1000) |
| GLTRP | required_date | Parse YYYYMMDD → ISO-8601 |
| GSTRP | planned_start_date | Same |
| WERKS | plant validation | Reject if ≠ configured plant |
| KDAUF | so_id (via link table) | Lookup + link |
| STATUS | Zedral status | Mapping rules below |

**SAP status → Zedral status mapping.**

| SAP status | Zedral status |
| --- | --- |
| CRTD (Created) | pending |
| REL (Released) | queued (if valid) / rejected (if invalid) |
| TECO (Technically complete) | complete |
| CLSD (Closed) | complete |
| DLFL (Deletion flag) | cancelled |

**Upsert logic.** For each transformed WO:

IF wo_id NOT IN work_orders:
  INSERT with version=1
  PUBLISH erp.work_order.received
ELSE IF sap_modified_at > stored sap_modified_at:
  Diff stored vs. new
  IF changes present:
    UPDATE with version = version + 1
    PUBLISH erp.work_order.updated with `changes` delta
  ELSE:
    UPDATE sap_modified_at only (no event)
ELSE:
  Skip (no-op)

**Watermark advancement.** Only after a successful page is committed to the database, the watermark advances to max(sap_modified_at) in that page. This makes the pull at-least-once (same page may be re-processed on failure) — safe because upsert is idempotent.

**Load budget.** The SAP load budget (Phase 0 §7.1) constrains:

- ≤ 10 concurrent OData connections

- ≤ 100 requests/minute sustained

- ≤ 500 KB payload per request (enforced via $top=200)

- Skipped during SAP’s 00:00–03:00 IST batch window

### 5.2 Manual Entry — Fallback Path

**Use cases.**

- SAP is down during a business-critical moment; planner needs to add a rush WO immediately

- A customer emergency creates a WO outside the normal SAP flow (pilot-day realities)

- v1 bootstrap, before SAP integration is live

**Flow.**

- Planner uses the Ops Console New Work Order form

- Form validates against master data (material must exist in M2; customer must exist in M2)

- Submitted WO is assigned a temporary Zedral-origin ID: wo_zdl_<timestamp>_<rand>

- WO marked origin = 'manual' in metadata

- Event published same as SAP-origin

- Next SAP sync pulls this WO’s eventual SAP equivalent (planner records SAP WO number when available); M1 reconciles by matching qty + date + material

**Reconciliation workflow.** When a manual WO is later backed by a SAP WO:

- Planner enters the SAP WO number in the Ops Console

- M1 merges: the SAP-origin WO becomes authoritative; the manual record is archived with a link for audit

- A single erp.work_order.updated event is published noting the ID change

### 5.3 File Import — One-Time Migration

**Use case.** Hero Steels has historical work orders (6–12 months) in Excel that predate Zedral. For baseline analytics, these can be imported.

**Flow.**

- Admin uploads CSV file via Ops Console

- M1 validates against a defined CSV schema (columns, types, required fields documented in docs/m1/csv-import-schema.md)

- Rows that pass validation are inserted with origin = 'migration', status = 'complete'

- Rows that fail validation are written to a quarantine table with row-number-linked error reasons

- Events for migrated WOs are suppressed (they’re historical; no downstream action needed)

**Non-goal.** File import is not a recurring integration path. It is for v1 bootstrap only. After pilot go-live, any need for CSV import is a signal that a new SAP integration should be built.

### 5.4 Ingestion Observability

Per Phase 0 §11, the SAP Sync Worker emits standard metrics tagged with source_system=sap_m1:

- integration_events_ingested_total{source_system="sap_m1", event_type="work_order"}

- integration_lag_seconds{source_system="sap_m1"} — time between SAP ModifiedAt and Zedral ingested_at

- integration_failures_total{source_system="sap_m1", error_category="parse|network|semantic"}

- m1_sap_pull_duration_seconds{entity="work_orders"}

- m1_sap_rows_pulled_total{entity="work_orders"}

Alerts:

- No successful work order pull for > 45 minutes (3× the interval) — WARN

- No successful pull for > 2 hours — CRITICAL

- Parse failure rate > 5% of pulled rows in a window — WARN

## 6. Processing Logic

M1’s two core processing functions: **validation** and **priority scoring**.

### 6.1 Work Order Validator

Runs on every WO insert or update. Output: routing_valid flag set on the WO, validation errors recorded, demand.validation.failed event published if any error found.

**Validation rules.**

| # | Rule | Failure mode |
| --- | --- | --- |
| V1 | material_code must exist in master.materials | material_unknown |
| V2 | material_code must have an active routing in master.routings | routing_missing |
| V3 | qty_planned_mt > 0 | quantity_invalid |
| V4 | required_date must not be in the past (grace: 3 days) | required_date_past |
| V5 | required_date must not be more than 180 days in the future | required_date_too_far |
| V6 | grade must match the grade in the routing | grade_mismatch |
| V7 | gauge_mm must be within the capable range for at least one CRS line | gauge_out_of_range |
| V8 | customer_id (if present) must exist in master.customers | customer_unknown |
| V9 | planned_start_date (if present) must be ≤ required_date | dates_inconsistent |

**On failure.**

- WO status set to rejected

- Errors logged in validation_errors table

- demand.validation.failed event published

- Notification sent to planner role (§8.3 of Phase 0)

- WO does NOT enter the scheduler queue

**On correction.**

- Planner fixes the underlying issue (e.g., master data corrected in M2)

- master.<entity>.updated event triggers revalidation

- If now valid, status transitions from rejected → pending, validator records resolution

**Soft validation warnings.** Not all validation is hard-fail. Some are warnings:

- Customer priority class unknown (treat as class C)

- Routing version deprecated but still active (warning only)

- Planned start date in the past (warning; schedule will bump it)

Warnings surface in the UI but do not block scheduling.

### 6.2 Priority Scoring Algorithm

**Design intent.** The score must be:

- **Explainable** — a planner can read the component breakdown and agree or disagree with specific factors

- **Tunable** — weights are configurable (in M2 or runtime config), not hardcoded

- **Monotonic** — more urgency, more readiness, higher customer class → higher score (no surprising flips)

- **Bounded** — scores in a consistent range (0–100) so UI rendering is predictable

**Formula (v1).**

priority_score = Σ (weight_i × component_i)

where:

| Component | Weight (default) | Range | Rationale |
| --- | --- | --- | --- |
| customer_class | 0.30 | A=100, B=60, C=30, unknown=30 | Business priority |
| delivery_proximity | 0.35 | 0–100 (linear decay from 100 at 0 days to 0 at 30+ days) | Time urgency |
| material_readiness | 0.10 | 100 if stock adequate, 0 if shortage | From M5a signal |
| dependency_signal | 0.05 | 100 if upstream WO complete, 0 if blocked | From M5a / M4 |
| wo_age | 0.10 | 0–100 (sigmoid: older WOs rise) | Prevents WO starvation |
| manual_adjustment | 0.10 | 0–100 from active override | Planner influence |

Default weights sum to 1.0. All weights configurable per plant (Hero Steels may weight delivery proximity higher; a second customer with tight customer-class distinction may weight it differently).

**Delivery proximity sub-formula.**

days_to_required = (required_date - today).days
if days_to_required <= 0:
    return 100  # overdue — max urgency
elif days_to_required >= 30:
    return 0
else:
    return 100 * (1 - days_to_required / 30)

**WO age sub-formula.** Age kicks in after 7 days to prevent older WOs being starved by newer-urgent ones.

days_in_queue = (today - ingested_at).days
if days_in_queue <= 7:
    return 0
elif days_in_queue >= 30:
    return 100
else:
    return 100 * (days_in_queue - 7) / 23

**Priority class derivation.**

| priority_score range | priority_class |
| --- | --- |
| ≥ 75 | A |
| 50–74 | B |
| < 50 | C |

### 6.3 Scoring Trigger Points

Scores are recalculated on:

- **WO ingestion or update** — immediate recalculation

- **Every 15 minutes on a schedule** — baseline refresh (handles delivery_proximity drift, wo_age drift)

- **On consumed event** — any of master.customers.updated, material.coil.shortage_detected, floor.production.completed triggers recalc for affected WOs

- **On planner override** — immediate recalc with override applied

**Batch recalc (scheduled).** A worker runs every 15 minutes:

FOR wo IN work_orders WHERE status IN ('pending', 'queued', 'scheduled'):
  new_score = compute_priority_score(wo)
  IF abs(new_score - wo.priority_score) > 0.1 OR class changed:
    UPDATE work_orders SET priority_score = new_score, ...
    INSERT priority_score_history
    PUBLISH demand.priority.recalculated
  ELSE:
    Skip (no event storm)

The 0.1 threshold prevents event storms from trivial score drift (e.g., a 0.03 change as a day ticks by).

### 6.4 Override Handling

Overrides are first-class operations with audit. Five override types:

| Type | Effect |
| --- | --- |
| rush | Forces priority_score = 95 (near-max) |
| defer | Caps priority_score ≤ 40 (near C class) |
| hold | Transitions WO to on_hold status (removes from scheduler queue entirely) |
| release_hold | Transitions WO from on_hold → queued |
| score_adjust | Adds/subtracts a specific delta (−20 to +20) |

Every override:

- Requires a reason (min 20 chars; enforced in API)

- Records user_id, timestamp

- Publishes demand.priority.overridden

- May have an expiry (auto-revert at expiry); default = permanent until manually released

**Override conflict resolution.** If multiple active overrides on a WO:

- hold / release_hold take precedence (status gate)

- Among score-affecting types (rush, defer, score_adjust), the most recently applied wins

- Planners see all active overrides in the UI

## 7. Storage Strategy

### 7.1 Postgres as Primary Store

All M1 tables live in a single Postgres database (per Phase 0 §3.2.2). Schema: m1_demand.

**Why Postgres, not a purpose-built OLTP DB.** Per Phase 0 §9, Postgres is the platform standard. M1 is not a high-write, low-latency workload (SAP pulls are 200-row bursts every 15 min; manual edits are single-digit-per-minute). Postgres handles this with orders of magnitude of headroom.

**Connection pooling.** PgBouncer in transaction-pooling mode, 40 connections per service. M1 service uses a dedicated pool separate from M4’s scheduler pool (M4 runs heavy queries that shouldn’t starve M1 of connections).

### 7.2 Indexing Strategy

Indexes are designed for the query patterns in §8. Key indexes:

- idx_wo_status_priority (partial index on active statuses) — supports the main demand queue query

- idx_wo_required_date — supports date-range queries

- idx_wo_customer — supports “show me all WOs for customer X”

- idx_wo_sap_modified — supports incremental sync watermarking

- idx_psh_wo_time on priority history — supports “show me score over time for this WO”

Indexes reviewed quarterly via pg_stat_statements analysis. Unused indexes removed.

### 7.3 Partitioning

At v1 scale (500 WO/month × 12 months × 5 years of active data = 30K rows), no partitioning needed.

**Trigger for partitioning.** When work_orders exceeds 1M rows or queries against it exceed 100ms p95 → partition by required_date month (Postgres declarative partitioning). Estimated trigger: year 3+ or second large-customer onboarding.

**Events in Redpanda — natively partitioned.** WO events partition on wo_id (see Phase 0 §4.2). Retention per topic is topic-specific.

**priority_score_history** is the highest-churn table (every WO scored every 15 min, conditionally recorded). At 500 active WOs × 96 recalcs/day × 0.1 = 4.8K inserts/day → 1.7M rows/year. This table moves to TimescaleDB hypertable partitioning if/when it starts impacting query performance — estimated year 2.

### 7.4 Hot / Warm / Cold

| Data | Hot (Postgres) | Warm (MinIO Parquet) | Cold (customer tape) |
| --- | --- | --- | --- |
| Active WOs | Indefinite | — | — |
| Closed WOs | 2 years | 5 years | 7 years |
| Priority history | 1 year | 5 years | — |
| Validation errors | 90 days | 1 year | — |
| SAP raw payloads (JSONB) | 1 year | 5 years | 7 years |
| Events (Redpanda) | Per topic retention | Via Kafka Connect S3 sink | — |

### 7.5 Backup and Recovery

Per Phase 0 §12.6:

- Nightly logical backup of m1_demand schema via pg_dump to MinIO

- Continuous WAL archiving to MinIO for PITR (point-in-time recovery)

- Quarterly restore drill validates recovery within 4-hour RTO

**M1-specific recovery considerations:**

- Watermarks must be preserved across restores — a lost watermark triggers a full re-pull from SAP (safe but expensive)

- Manual-origin WOs have no SAP source — backup is the only recovery; this data must survive

- Priority history is reconstructable from events if lost — downgrading priority_score_history from hot retention is acceptable in extreme recovery scenarios

## 8. API Surface

All endpoints served at /api/m1/* via the API Gateway. Auth: Keycloak OIDC bearer token. RBAC per Phase 0 §8.1.

### 8.1 Read APIs

#### GET /api/m1/work-orders

The workhorse endpoint. Paginated, filterable, sortable.

**Query parameters:**

| Param | Type | Description |
| --- | --- | --- |
| status | enum[] | Filter by status (multiple allowed) |
| customer_id | string | Filter by customer |
| material_code | string | Filter by material |
| grade | string | Filter by grade |
| priority_class | enum[] | ‘A’, ‘B’, ‘C’ |
| required_date_from | date | — |
| required_date_to | date | — |
| search | string | Free-text search on wo_id, material_code, customer name |
| sort | enum | priority_score_desc (default), required_date_asc, ingested_at_desc |
| limit | integer | Default 50, max 500 |
| offset | integer | — |

**Response:**

{
  "total": 247,
  "limit": 50,
  "offset": 0,
  "items": [
    {
      "wo_id": "wo_8893451",
      "material_code": "CR_045_1250_IS513",
      "grade": "IS513-D",
      "gauge_mm": 0.45,
      "width_mm": 1250,
      "qty_planned_mt": 18.45,
      "qty_confirmed_mt": 0,
      "required_date": "2026-04-25",
      "customer": {"id": "cust_maruti_01", "name": "Maruti Suzuki India Ltd"},
      "priority_score": 78.3,
      "priority_class": "A",
      "priority_manual": false,
      "status": "queued",
      "routing_valid": true,
      "validation_warnings": []
    }
    /* ...49 more... */
  ]
}

Required role: any authenticated role.

#### GET /api/m1/work-orders/{wo_id}

Full detail for a single WO — all fields, SO links, priority score history (last 10), active overrides, validation errors if any.

#### GET /api/m1/work-orders/{wo_id}/priority-history

Full score history (paginated). Supports the “explain this priority” planner question.

#### GET /api/m1/demand-summary

Aggregate view. Used by M3, by the dashboard, and by the executive rollup.

**Response:**

{
  "as_of": "2026-04-17T14:00:00Z",
  "total_open_wos": 47,
  "total_open_qty_mt": 892.3,
  "by_status": {
    "pending": 3,
    "queued": 38,
    "scheduled": 5,
    "on_hold": 1
  },
  "by_priority_class": {"A": 12, "B": 20, "C": 15},
  "by_required_date_bucket": {
    "overdue": 2,
    "this_week": 14,
    "next_week": 18,
    "later": 13
  },
  "by_grade_family": {"low_carbon": 25, "medium_carbon": 18, "high_strength": 4},
  "rejected_count": 2
}

Required role: any authenticated role (data is operational, not commercially sensitive).

#### GET /api/m1/work-orders/queue

Priority-ranked top-N queue for schedulers to consume. Returns only WOs with status ∈ ('queued', 'scheduled') and routing_valid = true.

**Query parameters:** limit (default 100, max 500), include_scheduled (bool, default true).

Consumed heavily by M4 before each scheduling run. Response must be < 500ms p95 (cached, invalidated on score recalc events).

### 8.2 Write APIs

#### POST /api/m1/work-orders

Create a manual WO. Required role: planner or higher.

Request body validates against the WO schema. Server assigns wo_id = wo_zdl_<uuid>, origin = manual, runs validation, publishes erp.work_order.received event.

#### PATCH /api/m1/work-orders/{wo_id}/priority

Apply an override. Required role: planner or higher.

**Request body:**

{
  "override_type": "rush",
  "reason": "Customer escalation: Maruti line stoppage imminent, need by tomorrow",
  "expires_at": null
}

Validation: reason min 20 chars; override_type enum; expires_at nullable but if set must be in the future.

Effect: inserts priority_overrides row, triggers recalc, publishes demand.priority.overridden.

#### PATCH /api/m1/work-orders/{wo_id}/status

Change WO status. Restricted transitions (per the status machine). Required role varies by transition:

| Transition | Role |
| --- | --- |
| rejected → pending | planner (after validation fix) |
| queued → on_hold | planner |
| on_hold → queued | planner |
| Any → cancelled | planner, confirms via SAP sync |

#### POST /api/m1/work-orders/{wo_id}/reconcile

Used for manual-origin WOs that gain a SAP identity. Merges and archives. Required role: planner.

### 8.3 Admin APIs

#### POST /api/m1/sync/trigger

Force a SAP sync outside the schedule. Required role: sap_admin.

#### GET /api/m1/sync/status

Current watermarks and last-sync status. Required role: any.

#### POST /api/m1/priority-weights

Update the priority scoring weights. Required role: master_data_admin. Triggers a full recalc across all open WOs.

#### GET /api/m1/validation-errors

Paginated list of WOs currently in rejected status with error details. Supports the planner’s error-resolution workflow.

### 8.4 API Versioning

Versioned via URL prefix: /api/m1/v1/... on breaking changes. v1 is implicit until v2 ships. Deprecation policy: 6-month overlap window.

### 8.5 Rate Limits

- Read APIs: 600 req/min per user (supports intensive dashboard polling)

- Write APIs: 60 req/min per user (overrides are intentional, not spam)

- Admin APIs: 10 req/min per user

- Priority weight updates: 1 per 5 minutes (prevents thrashing)

Limits enforced at the API Gateway (Traefik with rate-limit middleware).

## 9. UI/UX Specification

M1 contributes two primary screens to the Ops Console and zero to the Floor Console. Supervisors get a read-only variant. All screens inherit the platform design system (shadcn/ui + Tailwind per Phase 0 §9).

### 9.1 Screen 1 — Demand Queue

**The planner’s home screen.** The first thing they see at 5:45 AM.

**Layout (desktop):**

- **Top bar:** plant selector (single in v1), user menu, notification bell

- **Filter rail (left, collapsible):** status, priority class, customer, grade, required-date range, search

- **Main table (center):** WO list — ranked by priority score by default

- **Detail pane (right, slide-in):** full WO detail when a row is clicked

**Columns in the main table:**

| Column | Width | Notes |
| --- | --- | --- |
| Priority | 60px | Color-coded badge: A (red), B (amber), C (green) + numeric score |
| WO ID | 100px | Clickable → detail pane |
| Customer | 160px | Truncated, hover for full name |
| Material | 140px | Grade + gauge + width compact format |
| Qty (MT) | 80px | Right-aligned, 3 decimals |
| Required | 110px | Date + “in N days” or “overdue by N” |
| Status | 100px | Badge |
| Overdue flag | 24px | Red exclamation if past required_date |
| Material ✓ | 24px | Green check / red ✗ based on M5a signal |
| Quick actions | 80px | Override / Hold / Release buttons (role-gated) |

**Default sort.** Priority score descending. Planner can re-sort by any column.

**Bulk actions.** Multi-select → bulk override, bulk hold/release, bulk export to CSV.

**Virtualised rendering.** With hundreds of WOs, the table must render in under 200ms. TanStack Table virtualised rows.

### 9.2 Screen 2 — Work Order Detail

**Triggered by:** clicking a row in Demand Queue. Can also be reached directly via /ops/work-orders/{wo_id}.

**Sections (top to bottom in the detail pane):**

- **Header** — WO ID, status badge, priority badge, customer, required date + countdown

- **Order details** — material, grade, gauge, width, qty planned / confirmed / scrap

- **Linked sales orders** — table of SOs this WO fulfills, with allocated qty and customer PO ref

- **Priority breakdown** — visual bar-chart showing score components (customer_class, delivery_proximity, material_readiness, dependency_signal, wo_age, manual_adjustment). Hover on each bar for the weight and raw value.

- **Priority history chart** — mini line chart showing score over time (last 30 days), annotated with override events

- **Override history** — table of active and historical overrides with user + reason

- **Routing ****&**** operations preview** — the sequence of operations this WO will go through (read from M2)

- **Schedule preview** — if scheduled, shows from M4: which line, what shift (read-only embed)

- **Material readiness** — status from M5a (read-only embed)

- **Audit trail** — SAP modification history, Zedral version history, events published

**Actions available in detail pane (role-gated):**

- **Override priority** — opens modal (§9.3)

- **Put on hold / release hold** — inline confirmation

- **Re-validate** — triggers validator re-run (useful after master data fix)

- **View in SAP** — opens new tab to SAP GUI with this WO (via SAP URL schema — configurable per deployment)

### 9.3 Priority Override Modal

**Triggered by:** “Override priority” button.

**Form fields:**

- **Override type** (radio): Rush, Defer, Hold, Score adjust (±20)

- **New score preview** (read-only, computed): shows what score will be after override

- **Reason** (textarea, required, min 20 chars): mandatory free text

- **Expires at** (optional date-time): auto-revert time; default empty (permanent)

- **Impact preview** (computed): shows what changes downstream — “This WO will move from queue position 8 → 2. Will likely delay WO 8891234 by 2 hours.”

**Submit button** is disabled until reason ≥ 20 chars and override type selected.

After submit: inline confirmation, queue refreshes, badge animates on the affected WO.

### 9.4 New Work Order Form

**Triggered by:** “New Work Order” button on Demand Queue (role: planner+).

Structured form with:

- Material code (autocomplete from M2)

- Grade, gauge, width (auto-filled from material, editable)

- Quantity (MT)

- Required date

- Customer (optional; autocomplete from M2)

- Sales order ref (optional)

- Reason / notes (free text)

On submit: validation runs immediately; form shows inline errors before submission. On success: modal closes, queue shows new WO with temporary ID.

### 9.5 Validation Error Resolution View

**Triggered by:** click on “rejected” count in the sidebar or filter status=rejected.

Lists WOs currently in rejected status with:

- Error type + detail

- Suggested resolution (e.g., “Create routing in M2 for material X”)

- One-click link to the relevant M2 master data page

- “Re-validate” button to re-run validation after fix

Planner’s weekly-cleanup-screen.

### 9.6 Accessibility and Responsiveness

- WCAG 2.1 AA minimum

- Keyboard navigation for all actions (planners use mouse-and-keyboard; muscle memory matters)

- Screen reader labels on all icons

- Color-coding always paired with text/icons (don’t rely on color alone)

- Breakpoints: desktop (primary, 1280px+), tablet (secondary, 1024px), mobile (deprioritised — planners use desktop)

### 9.7 UI Performance SLOs

Per Phase 0 §11.5:

- Demand Queue initial render: < 800ms p95

- Filter application: < 200ms p95

- Detail pane open: < 300ms p95

- Override submission: < 500ms p95 end-to-end (including backend score recalc)

Measured via Real-User Monitoring (RUM) embedded in the frontend bundle.

## 10. Integration with Other Modules

M1 sits upstream of nearly every other module. Its outputs are inputs for the entire plant flow.

### 10.1 M1 → M2 (Master Data) — Read-Only

M1 consumes from M2:

- master.materials — validate material_code, enrich display

- master.customers — validate customer_id, derive priority_class

- master.routings — validate routing existence, link routing_id

Via M2 API calls (cached per Phase 0 §5.5). Cache invalidated on master.*.updated events.

### 10.2 M1 → M3 (Capacity) — Event-Driven

M3 consumes M1’s event stream to:

- Refresh load profile when new WOs land (erp.work_order.received)

- Recalculate utilisation on quantity changes (erp.work_order.updated)

- Release load when WOs cancel (erp.work_order.cancelled)

No direct API calls in this direction. M3 subscribes to the backbone.

### 10.3 M1 → M4 (Scheduler) — Both Event and API

M4 uses M1 in two ways:

- **Triggers re-optimisation** on demand.priority.recalculated (significant changes) or erp.work_order.received for rush-class WOs

- **Pulls the queue** via GET /api/m1/work-orders/queue at the start of each scheduling run

M4 does not store its own copy of the queue — it reads M1’s canonical view on each run. Ensures M4’s schedule is always based on freshest demand.

### 10.4 M1 → M5a (Material) — Bidirectional

- M1 publishes erp.work_order.received — M5a reserves coil stock if available

- M5a publishes material.coil.shortage_detected — M1 records as a dependency signal, lowering the WO’s material_readiness score component

- M5a publishes material.coil.allocated — M1 raises material_readiness back

### 10.5 M1 → M6 (Dispatch) — Read-Only

M6 reads M1’s WO detail when building dispatch lists. M6 never writes back to M1 directly — production confirmations flow through M7.

### 10.6 M1 ← M7 (OEE / Analytics) — Event-Driven

When production is confirmed:

- M7 publishes production.wo.confirmed (with qty_good, qty_scrap)

- M1 updates qty_confirmed_mt, qty_scrap_mt

- If qty_confirmed_mt >= qty_planned_mt, M1 transitions WO to complete

### 10.7 M1 ← M5b (Quality) — Event-Driven (Phase 2)

Phase 2: if a quality NCR causes a WO rework, M1 receives a signal to split the WO into a rework child. v1 defers this.

### 10.8 M1 ↔ SAP — See §11

## 11. SAP Bidirectional Mapping

### 11.1 Inbound (SAP → M1)

**Entities pulled:**

| SAP service | SAP module | Frequency | Zedral target |
| --- | --- | --- | --- |
| ProductionOrder_SRV | PP | Every 15 min | m1_demand.work_orders, wo_so_link |
| SalesOrder_SRV | SD | Every 30 min | m1_demand.sales_orders, sales_order_items |

(Customer master, material master, routing master are owned by M2’s SAP sync, not M1. M1 reads them via the M2 API.)

**Field mappings documented in**** ****docs/m1/sap-field-mappings.yaml** — a living reference updated whenever Hero Steels’ SAP customisations are discovered.

### 11.2 Outbound (M1 → SAP)

**In v1, M1 does not write to SAP directly.** All SAP writes are production-related (confirmations, status updates) and originate from M7 after floor execution.

**Possible write-backs deferred to Phase 2+:**

- Manual-origin WO reconciliation — after a Zedral-origin WO is matched to a SAP WO, an acknowledgment back to SAP to record the linkage (would require a custom SAP extension — deferred)

- Override acknowledgment — writing the override reason into SAP’s long-text field on the WO (nice-to-have; Phase 2)

### 11.3 SAP Extension Requirements (Customer Prerequisite)

As flagged in Phase 0 §7.1:

- ProductionOrder_SRV standard; must be enabled

- ProductionOrder_SRV extension for confirmation write-back (owned by M7; noted here for completeness)

- SalesOrder_SRV standard; must be enabled

Customer Basis team lead time: 6 weeks. **This is the critical-path item for Phase 1 go-live.**

### 11.4 Reconciliation with SAP

**Nightly reconciliation job:** M1 queries SAP for the count of open WOs and cross-checks against M1’s count. Mismatches trigger an ops alert. Causes of mismatch:

- WO cancelled in SAP but cancellation not yet pulled (resolves at next sync)

- WO created in SAP but SAP’s $filter=ModifiedAt doesn’t include it (indicates SAP index or timezone bug)

- WO present in M1 but deleted from SAP (rare; indicates SAP admin action)

Reconciliation output goes to the Integration Health Grafana dashboard.

## 12. Failure Modes & Recovery

A deliberately paranoid review. The more we anticipate, the less we pager.

### 12.1 SAP Sync Failures

| Mode | Detection | Recovery |
| --- | --- | --- |
| SAP unreachable (network) | HTTP connection error | Exponential backoff retry up to 1 hr, then alert; manual-entry fallback documented |
| SAP 500 errors | HTTP 5xx | Same as above |
| SAP 401 (auth) | HTTP 401 | Alert immediately; token refresh; re-auth if persistent |
| SAP 429 (rate limit) | HTTP 429 | Respect Retry-After; reduce concurrency; alert if sustained |
| SAP returns unexpected schema | Parse error | Quarantine row, alert, do not advance watermark, continue with remaining rows |
| SAP returns deleted WO that never existed in M1 | DELETE semantics | Log, ignore (not a failure) |
| Watermark regression (SAP time jumps backward) | Sanity check | Alert; do not advance watermark; manual operator resolution |

### 12.2 Data Validation Failures

Handled per §6.1. These are not system failures — they are data quality signals. The planner is the recovery path.

### 12.3 Priority Calculation Failures

| Mode | Detection | Recovery |
| --- | --- | --- |
| Weights config invalid (sum ≠ 1.0, negative weights) | Startup validation | Service fails to start; fall back to last-known-good weights |
| Component calculation throws (e.g., required_date is null) | Caught exception | Log error; set that component to 0; continue for other components |
| Override applied with invalid score | API validation | 400 error at API layer; no override persisted |

### 12.4 Event Publishing Failures

| Mode | Detection | Recovery |
| --- | --- | --- |
| Redpanda unreachable at publish time | aiokafka error | Transactional outbox pattern — event persisted in m1_demand.outbox, separate relay worker publishes with retry |
| Schema registry unreachable | Apicurio error | Use cached schema for that event type; alert |
| Event published but consumer fails repeatedly | DLQ growth | Ops review via daily DLQ report |

The outbox pattern means **M1’s API responses never block on Redpanda availability**. The API returns success as soon as Postgres commit is durable; the relay handles the event flight asynchronously.

### 12.5 Database Failures

| Mode | Detection | Recovery |
| --- | --- | --- |
| Postgres primary down | Connection error | Service fails fast; HA (Phase 2+) fails over to replica; v1 relies on Core Server uptime |
| Disk full | Disk monitor alert | Prometheus alerts before critical; ops purges oldest archivable data |
| Slow query (> 1s p95 sustained) | pg_stat_statements | Weekly review; index tuning |

### 12.6 Runtime Failures

| Mode | Detection | Recovery |
| --- | --- | --- |
| Service container crash | Health check fail | Docker restart policy; alert after 3 crashes in 10 min |
| Memory leak (gradual RSS growth) | Prometheus gauge | Restart on threshold; follow-up investigation |
| Degenerate API request (huge pagination) | Rate limits + query timeouts | 429 / timeout; log; refine limits |

### 12.7 Data Drift Scenarios

Some subtle scenarios that aren’t failures but are operational hazards.

- **Stuck status scenarios.** A WO sits in rejected for weeks because no one acts. Mitigation: weekly “Stale rejected WOs” report to planner.

- **Abandoned manual overrides.** Override set with no expiry, never released, even though the originating reason is stale. Mitigation: monthly report of overrides older than 30 days for planner review.

- **Watermark drift.** SAP writes become more infrequent during a slow period; watermark advances slowly; on next surge, a large pull floods M1. Mitigation: the page-based pagination in §5.1 already handles this — large pulls are chunked and processed as they stream.

## 13. Acceptance Criteria

The pilot-ready definition of done for M1. Every item must be green before Hero Steels go-live.

### 13.1 Functional Acceptance

- ☐ SAP work order pull runs on schedule; Hero Steels’ 500+ open WOs pulled and visible in Ops Console within 30 min of first connection

- ☐ SAP sales order pull runs on schedule

- ☐ Manual WO creation works end-to-end (form → validation → event → visible in queue)

- ☐ Manual WO reconciliation with SAP WO works end-to-end

- ☐ Validation rules V1–V9 all implemented and tested with negative test cases

- ☐ Priority scoring runs on ingestion, update, and 15-min schedule

- ☐ Priority overrides — all 5 types — work correctly

- ☐ Override audit trail visible in UI

- ☐ Demand queue renders < 800ms with 500+ WOs

- ☐ Filters (status, customer, date, priority) all functional

- ☐ Detail pane shows all required sections including priority breakdown and history

- ☐ Events erp.work_order.received/.updated/.cancelled, demand.priority.recalculated/.overridden/.validation.failed all publish correctly per schema

- ☐ M3 and M4 confirmed consuming events and pulling queue via API

- ☐ 48-hour continuous soak test at 2× expected SAP load without failures

### 13.2 Non-Functional Acceptance

- ☐ API p95 latency meets SLOs (§8.5)

- ☐ Integration lag < 5 s p95 (event occurred_at → backbone recorded_at)

- ☐ Priority recalc at 500 WOs completes < 5 s per batch

- ☐ All APIs auth-gated; RBAC matrix enforced

- ☐ Audit log entries for all write operations

- ☐ Prometheus metrics emitted for all standard + M1-specific metrics

- ☐ Structured logs with correlation IDs

- ☐ All 10 Architectural Principles verified (opsec-lint green in CI)

### 13.3 Pilot Validation

- ☐ Hero Steels planner can run a full morning demand review in < 15 min (JTBD-1)

- ☐ Planner can inject a rush order and see impact in < 5 min (JTBD-2)

- ☐ Planner can find any WO by customer PO number in < 10 sec (JTBD-4)

- ☐ GM can review priority explanation for any WO with planner present (JTBD-5)

- ☐ 30-day pilot observation shows zero lost WOs (SAP vs. M1 reconciliation daily: 100% match after SAP sync latency)

### 13.4 Documentation

- ☐ OpenAPI spec published for all endpoints

- ☐ Event schemas published to Apicurio and versioned

- ☐ Runbook for SAP sync failure

- ☐ Runbook for priority recalc failure

- ☐ User guide for the planner (PDF, 8–12 pages, screenshots + step-by-steps)

- ☐ Hiring JD starter for M1 engineer (derived from this doc)

### 13.5 Rollback Plan

If M1 fails post-go-live:

- Planner falls back to SAP GUI + Excel for order queue (status quo)

- M1 continues collecting events from SAP (no data loss on recovery)

- On repair: resume from last watermark; no manual catch-up needed

- Rollback to previous version via the standard Zedral Update rollback (§12.3 of Phase 0)

## 14. Build Plan

### 14.1 Phases

| Sub-phase | Duration | Deliverable | Dependencies |
| --- | --- | --- | --- |
| **Phase 1.M1.0** — Foundation | Week 1 | Service skeleton, Postgres schema, CI wiring | Phase 0 Foundation complete |
| **Phase 1.M1.1** — SAP ingestion | Weeks 2–3 | Work order + sales order pull, watermarking, raw_sap_payload storage | SAP OData services published |
| **Phase 1.M1.2** — Validation | Week 3 | Validator worker, V1–V9 rules, error table, event publishing | — |
| **Phase 1.M1.3** — Priority scoring | Weeks 3–4 | Scoring algorithm, batch recalc, event publishing, history table | — |
| **Phase 1.M1.4** — APIs | Week 4 | All read and write endpoints, OpenAPI spec | — |
| **Phase 1.M1.5** — Overrides | Week 5 | Override types, audit, expiry | — |
| **Phase 1.M1.6** — UI (Queue + Detail) | Weeks 5–6 | Demand Queue + Detail pane + Override modal | APIs complete |
| **Phase 1.M1.7** — Manual entry | Week 6 | New WO form + reconciliation flow | — |
| **Phase 1.M1.8** — Integration test | Week 7 | M1 ↔ M3 ↔ M4 ↔ M5a end-to-end | Other modules scaffolded |
| **Phase 1.M1.9** — Soak + pilot prep | Week 8 | 48-hour soak, docs, runbooks, training | — |

**Total:** 8 weeks, parallelisable with other module builds after Week 4.

### 14.2 Team

1 M1 engineer primary + fractional frontend engineer (shared with other modules for UI work).

**Hiring JD starter for M1 engineer:**

- **Must have:** 4+ years Python backend, Postgres, REST API design, event-driven systems (Kafka / Redpanda / RabbitMQ)

- **Strong plus:** SAP OData experience, manufacturing/ERP domain, pytest + testcontainers

- **Nice to have:** Industrial/OT exposure, Indian steel or auto-parts manufacturing background, OR-Tools exposure

### 14.3 Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- | --- |
| R1 | SAP Basis team delays OData service publication | High | High | Raise early; escalate via customer executive sponsor; manual entry fallback for pilot |
| R2 | Hero Steels customer master in SAP has inconsistencies (duplicate customers, missing priority class) | High | Medium | Data cleanup workstream parallel to build; soft validation + warnings rather than hard reject |
| R3 | Priority scoring weights prove wrong for Hero Steels reality | Medium | Low | Weights are config; tunable in days post-go-live |
| R4 | 500+ WO pagination causes UI performance issues | Low | Medium | Virtualised rendering from day 1; load testing at 2000 WOs |
| R5 | Reconciliation logic misses edge cases (split/merged WOs) | Medium | High | Extensive test corpus built from Hero Steels historical data before go-live |
| R6 | Manual WO entry used excessively because SAP is slow | Medium | Medium | Not a product problem — surfaced in monthly review with customer |

### 14.4 Dependencies on Other Modules / Teams

| Dependency | What | Needed by |
| --- | --- | --- |
| Phase 0 Foundation | Platform, event backbone, M2 service | Week 1 |
| SAP connector (shared service) | Working OData pull | Week 2 |
| M2 Master Data | Materials, customers, routings populated | Week 2 |
| M5a | material.coil.shortage_detected event defined (even if not yet published) | Week 3 |
| M3, M4 | Subscription to M1 events, queue API consumption | Week 7 (integration test) |
| Ops Console shell | Auth, layout, navigation | Week 5 (for UI work) |

### 14.5 Exit Criteria Going to Phase 2

Before Phase 2 (M5b Quality, M5c Maintenance) begins depending on M1 output:

- 30 days of production stability at Hero Steels

- Zero P0/P1 M1 incidents in the 30-day window

- Planner reports ≥ 3/5 satisfaction on JTBDs (measured via pilot feedback survey)

- Integration with M3/M4/M5a verified and performant

- ADRs for any in-flight design decisions formalised

## Revision History

| Version | Date | Author | Changes |
| --- | --- | --- | --- |
| v0.1 | 2026-04-17 | Product & Systems Engineering | Initial draft |

*End of M1 — Demand **&** Order Management Production Document*

*Total: ~8,800 words · Est. reading time: 45 minutes · Est. review cycle: 3–4 hours with engineering team*

*Next module in sequence:** ****M3 — Capacity Planning ******&****** RCCP***