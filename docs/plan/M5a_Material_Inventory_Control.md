Zedral Platform ��� M5a Production Document

Material \& Inventory Control �� Phase 1

Product \& Systems Engineering

April 2026

Table of Contents

# Zedral Platform — Module M5a Production Document

## M5a — Material & Inventory Control

**Document status:** Draft v0.1 · For engineering handover **Audience:** M5a module engineering team, adjacent module teams (M1 demand, M4 scheduler, M6 dispatch, M7 OEE), Hero Steels material planner, stores team, CRS line operators **Owner:** Platform Engineering · M5a technical lead TBD **Depends on:** Phase 0 Foundation · M1 Demand & Order Management · M2 Master Data Engine · SAP MM connector **Phase:** 1 (Pilot Core Loop · Months 2–6) **Inherits:** All 10 Architectural Principles, especially **Principle 1 (One Event, Many Views)** for coil lifecycle tracking

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

### 1.1 What M5a Is

M5a is the **physical material tracking layer** for cold rolling. It answers four operational questions that are currently answered by walking the floor with a clipboard at Hero Steels:

- **What’s in stock?** Which HR coils are physically present, what grade/gauge/width, what total tonnage?

- **Where is each coil right now?** At stores? Pickling? On the rolling line? At annealing? At rewind?

- **What can we run today?** For each open WO, is the required HR coil available — and is it actually ready (not blocked by quality hold, age limit, or stage delay)?

- **What are we going to be short of?** Looking 14 days out against scheduled demand, where will we run out of feedstock?

M5a is the gate between demand and execution. M4 cannot schedule a WO that M5a says has no material. M6 cannot dispatch a job that M5a says hasn’t reached the line.

**M5a owns five responsibilities:**

- **Coil inventory mastering** — maintain a canonical record of every HR coil and every WIP intermediate, sourced from SAP MM and updated by floor scan events

- **WIP location tracking** — know which physical stage every coil is at (stores / pickling / rolling / annealing / rewind / FG / dispatched)

- **Material readiness signalling** — for each open WO, publish a continuous “ready / pending / shortage” signal to M4 and M1

- **Shortage forecasting** — compare scheduled demand against incoming supply to predict shortages 14 days out

- **Coil consumption posting** — when production confirms via M6/M7, generate the goods issue write-back to SAP MM

### 1.2 What M5a Is Not

- **Not a warehouse management system in the broad sense.** No bin locations, no putaway optimisation, no cycle counting workflow in v1. We track coils at the *stage* level (stores → pickling → rolling), not at the bin/rack level.

- **Not a procurement system.** Purchase orders, vendor management, goods receipts at the dock — owned by SAP MM. M5a observes inbound coils as they appear in MM data; M5a does not create POs.

- **Not a quality system.** A coil’s quality status (passed / on-hold / rejected) is owned by M5b. M5a *consumes* the quality status to compute readiness, but does not adjudicate quality.

- **Not a coil-grade reclassification engine.** If a coil arrives nominally as one grade but the spectrometer shows it’s a different grade, that’s a quality decision flowing from M5b. M5a follows.

- **Not a transportation / logistics system.** Inbound truck scheduling, outbound dispatch trucks — out of scope. Once a coil leaves on a truck, M5a marks it dispatched and stops tracking.

- **Not a coil-genealogy engine.** Coil-to-coil parent-child genealogy (which HR coil produced which CR coil produced which slit coil) is *partially* tracked in v1 (parent HR coil ID retained on CR coil) but full multi-generation genealogy with split/merge is Phase 2.

- **Not a lot-traceability engine for finished goods at the customer end.** When the customer reports a complaint and asks “which heat number was this from?”, v1 supports the lookup via heat_number on coil_inventory, but does not produce regulator-grade traceability reports (Phase 3 if a customer demands it).

### 1.3 The Stage Model — Important Conceptual Anchor

CRS material flow is well-defined. M5a hard-codes the canonical stages:

[SAP GR]  →  STORES  →  PICKLING  →  ROLLING  →  ANNEALING  →  REWIND  →  FG  →  DISPATCHED
   ↓          (HR)       (P&O)        (CR coil)    (annealed)   (slit/    (ready    (left
   M5a                                                            cut)      ship)     plant)
   pulls
   from MM

Each stage transition is an event. Every coil’s full history is reconstructable from the event log. v1 captures all stages; Phase 2 may add intra-stage location (e.g., “in stores, bay B-3” — for now, “in stores” is enough resolution).

**Special intra-stage states** that v1 supports:

- quality_hold — physically at a stage but blocked from advancing pending quality decision (overlay on the location, not a separate stage)

- reserved — earmarked for a specific WO (locks against being consumed by a different WO)

- aged_out — exceeded the customer-permitted aging window (e.g., > 90 days at FG); requires re-inspection before despatch

### 1.4 Edge Cases In Scope

- **Partial coils** — a coil consumed across multiple WOs (one HR coil → 60% to WO-A, 40% to WO-B); tracked as remaining_weight_mt

- **Coil splits at slitting** — one CR coil becomes N slit coils; modelled as parent → children

- **Coil rejects mid-process** — a coil that fails quality at rolling and gets sent back to HR remelt or scrapped

- **Late-arriving coils** — SAP shows GR posted but the physical coil hasn’t reached stores yet; modelled as expected state

- **Misreads at scan** — operator scans wrong coil ID; reconciliation workflow

- **Cross-WO consumption** — a coil reserved for WO-A is urgently needed for WO-B; planner override workflow with audit

- **Aging WIP** — a coil sitting at annealing for 6 days; surfaced as risk

- **Pre-ordered slitting** — slitting plan from a customer order that doesn’t have a final WO yet (covered via pre-allocations table)

### 1.5 Edge Cases Deferred to Phase 2+

- **Coil-level RFID / barcode hardware integration** — v1 uses operator scan via the Andon terminal (typing/scanning of coil ID); RFID gateway is Phase 2

- **Bin-level location** within stores — Phase 2

- **Multi-source feedstock** (HR coil from multiple suppliers blended in one WO) — Phase 3

- **Returnable packaging / pallet tracking** — out of scope

- **Cycle counting and reconciliation workflows** — Phase 2

- **Shortage prediction with statistical models** — v1 is deterministic (scheduled demand vs. incoming supply); Phase 3 may add probabilistic forecasting

- **Multi-plant inventory pooling** — single plant in v1

- **Heat-level genealogy** to mill source — informational only in v1; full traceability Phase 3

## 2. Personas & Jobs To Be Done

### 2.1 Primary Persona — The Material Planner

**Who they are.** At Hero Steels, the Material Planner sits between Procurement and Production. Owns coil inventory levels, expedites incoming HR coils, allocates coils to WOs, and is on the receiving end of every production-floor “where’s my coil?” call. Currently uses Excel + SAP MB52 + walking the floor.

**Daily rhythm.** First action of the day: pull SAP MB52, pull the open WO queue, mentally cross-reference. Spends 3–4 hours a day on coil-related calls. Late afternoon: chase tomorrow’s expected GRs.

### 2.2 JTBDs for the Material Planner

**JTBD-1: Morning material reality check.**

*“**Within 60 seconds of opening the dashboard, I need to see: open WOs grouped by material readiness — green (ready), amber (in transit / partially ready), red (shortage) — across the next 14 days. So I know which calls to make this morning.**”*

**JTBD-2: Per-WO material status.**

*“**When the planner calls and asks** **‘**is wo_8893451 ready to run?**’**, I need to answer in 5 seconds: yes (coil X is at line CRS-2 reserved for it) / partial (we have 60% of the qty, balance expected Friday) / no (coil not received, GR shows due Tuesday).**”*

**JTBD-3: Shortage forecast.**

*“**Once a week I need to run a 14-day shortage forecast — list every WO that’s going to be material-short by required date, with the gap quantity and the expected resolution path (PO expedite, alternate grade, re-route).**”*

**JTBD-4: Inbound expediting.**

*“**For coils that are GR’d in SAP but haven’t physically arrived, I need a list with supplier, expected date, age of expectation. Older than 3 days — I escalate.**”*

**JTBD-5: Cross-WO reallocation.**

*“**When the planner needs to rush WO-X and the only coil that fits is reserved for WO-Y, I need to reassign with reason recorded — and the system should automatically flag WO-Y as now material-short.**”*

### 2.3 Secondary Personas

**Stores Operator.** Receives physical coils, scans inbound. JTBD: “When a truck arrives and I unload coil HR-XYZ, I scan, confirm grade/gauge/width, and the system records receipt — without me opening SAP or filling a paper log.”

**CRS Line Operator.** Picks up the next coil for production. JTBD: “Before I start a job, I scan the coil being mounted. The system confirms it’s the right coil for this WO. If wrong, I get an immediate alert before damage is done.”

**Production Planner (M1/M3/M4 user).** Doesn’t directly use M5a UI but consumes M5a’s signals throughout — material readiness icon on every WO row in the demand queue, shortage badge on Gantt operations.

**Quality Engineer.** When raising an NCR (M5b), needs to know coil location. Reads from M5a.

## 3. Data Model

M5a’s data lives in m5a_material schema. The central entity is coils — every coil that has ever existed in the plant.

### 3.1 Core Tables

-- =======================================================
-- COILS — central entity; every HR + intermediate + FG coil
-- =======================================================
CREATE TABLE m5a_material.coils (
  coil_id            TEXT PRIMARY KEY,                   -- Zedral natural key
  sap_coil_ref       TEXT,                               -- SAP material doc number; NULL for Zedral-created intermediates
  parent_coil_id     TEXT REFERENCES m5a_material.coils, -- HR parent for CR; CR parent for slit, etc.
  material_code      TEXT NOT NULL REFERENCES master.materials,
  grade              TEXT NOT NULL,
  gauge_mm           NUMERIC(6,3) NOT NULL,
  width_mm           INTEGER NOT NULL,
  weight_initial_mt  NUMERIC(10,3) NOT NULL,
  weight_remaining_mt NUMERIC(10,3) NOT NULL,            -- decremented on consumption
  heat_number        TEXT,                               -- for HR coils, the source heat / cast
  supplier           TEXT,                               -- for HR coils
  manufacturer_lot   TEXT,
  -- Physical state
  current_stage      TEXT NOT NULL,                       -- 'expected' | 'stores' | 'pickling' | 'rolling'
                                                           --   | 'annealing' | 'rewind' | 'fg' | 'dispatched'
                                                           --   | 'rejected' | 'scrapped'
  is_quality_hold    BOOLEAN DEFAULT FALSE,
  hold_reason        TEXT,
  hold_ncr_id        TEXT,                               -- M5b NCR reference
  is_aged_out        BOOLEAN DEFAULT FALSE,
  age_check_date     DATE,
  -- Reservation state
  reserved_for_wo    TEXT,                               -- exclusive reservation
  reservation_qty_mt NUMERIC(10,3),
  reservation_set_at TIMESTAMPTZ,
  reservation_set_by TEXT,
  -- Lifecycle dates
  gr_date            DATE,                               -- SAP goods receipt date (HR)
  arrived_at_stores  TIMESTAMPTZ,                        -- physical arrival
  consumed_at        TIMESTAMPTZ,                        -- when fully consumed
  scrapped_at        TIMESTAMPTZ,
  dispatched_at      TIMESTAMPTZ,
  -- Audit
  created_at         TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now(),
  raw_sap_payload    JSONB
);

CREATE INDEX idx_coils_stage           ON m5a_material.coils (current_stage);
CREATE INDEX idx_coils_material        ON m5a_material.coils (material_code, grade, gauge_mm, width_mm);
CREATE INDEX idx_coils_reserved        ON m5a_material.coils (reserved_for_wo)
                                       WHERE reserved_for_wo IS NOT NULL;
CREATE INDEX idx_coils_active          ON m5a_material.coils (current_stage, is_quality_hold)
                                       WHERE current_stage NOT IN ('dispatched', 'scrapped');
CREATE INDEX idx_coils_parent          ON m5a_material.coils (parent_coil_id)
                                       WHERE parent_coil_id IS NOT NULL;
CREATE INDEX idx_coils_heat            ON m5a_material.coils (heat_number);

-- =======================================================
-- COIL STAGE HISTORY — the audit trail of every transition
-- Reconstructable from events but stored hot for fast queries
-- =======================================================
CREATE TABLE m5a_material.coil_stage_history (
  history_id         BIGSERIAL PRIMARY KEY,
  coil_id            TEXT NOT NULL REFERENCES m5a_material.coils,
  from_stage         TEXT,
  to_stage           TEXT NOT NULL,
  transition_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  triggered_by       TEXT NOT NULL,                       -- 'sap_sync' | 'operator_scan' | 'quality_release' | 'reservation' | 'planner_override'
  user_id            TEXT,
  device_id          TEXT,
  related_wo_id      TEXT,
  related_event_id   UUID,
  notes              TEXT
);

CREATE INDEX idx_csh_coil_time ON m5a_material.coil_stage_history (coil_id, transition_at DESC);

-- =======================================================
-- WO MATERIAL READINESS — denormalised for fast reads
-- One row per open WO; updated whenever inputs change
-- =======================================================
CREATE TABLE m5a_material.wo_readiness (
  wo_id              TEXT PRIMARY KEY,
  required_qty_mt    NUMERIC(10,3) NOT NULL,
  available_qty_mt   NUMERIC(10,3) NOT NULL,             -- sum of reserved/eligible coils
  expected_qty_mt    NUMERIC(10,3) NOT NULL,             -- + qty arriving before required_date
  shortfall_qty_mt   NUMERIC(10,3) NOT NULL,             -- max(0, required - (available + expected))
  status             TEXT NOT NULL,                       -- 'ready' | 'partial' | 'pending' | 'shortage'
  earliest_ready_at  TIMESTAMPTZ,                         -- when WO becomes runnable
  reserved_coils     JSONB,                               -- [{"coil_id": "...", "qty_mt": ...}, ...]
  expected_coils     JSONB,                               -- [{"coil_id": "...", "expected_at": "..."}, ...]
  shortage_resolution_path TEXT,                          -- planner-assigned: 'expedite' | 'alt_grade' | 'reschedule' | NULL
  calculated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_wor_status ON m5a_material.wo_readiness (status);
CREATE INDEX idx_wor_calc   ON m5a_material.wo_readiness (calculated_at DESC);

-- =======================================================
-- PRE-ALLOCATIONS — coil-to-WO assignments before consumption
-- Allows planner to lock coils to WOs before production starts
-- =======================================================
CREATE TABLE m5a_material.pre_allocations (
  alloc_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coil_id            TEXT NOT NULL REFERENCES m5a_material.coils,
  wo_id              TEXT NOT NULL,
  allocated_qty_mt   NUMERIC(10,3) NOT NULL,
  priority_class     CHAR(1),                              -- snapshot of WO priority at alloc time
  allocated_by       TEXT NOT NULL,
  allocated_at       TIMESTAMPTZ DEFAULT now(),
  released_at        TIMESTAMPTZ,
  release_reason     TEXT,
  is_active          BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_alloc_coil_active ON m5a_material.pre_allocations (coil_id) WHERE is_active = TRUE;
CREATE INDEX idx_alloc_wo_active   ON m5a_material.pre_allocations (wo_id)   WHERE is_active = TRUE;

-- =======================================================
-- INBOUND EXPECTATIONS — coils GR'd in SAP, not yet at stores
-- =======================================================
CREATE TABLE m5a_material.inbound_expected (
  expectation_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coil_id            TEXT REFERENCES m5a_material.coils,  -- NULL until coil_id assigned
  sap_doc_ref        TEXT NOT NULL,
  material_code      TEXT NOT NULL,
  grade              TEXT NOT NULL,
  gauge_mm           NUMERIC(6,3) NOT NULL,
  width_mm           INTEGER NOT NULL,
  expected_weight_mt NUMERIC(10,3) NOT NULL,
  supplier           TEXT,
  expected_at        DATE,                                  -- planner-set or SAP-derived
  expectation_age_days INTEGER GENERATED ALWAYS AS
    (DATE_PART('day', now() - expected_at)) STORED,
  is_overdue         BOOLEAN GENERATED ALWAYS AS
    (expected_at < CURRENT_DATE) STORED,
  is_received        BOOLEAN DEFAULT FALSE,
  received_at        TIMESTAMPTZ,
  notes              TEXT,
  created_at         TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_inbound_pending
  ON m5a_material.inbound_expected (expected_at)
  WHERE is_received = FALSE;

-- =======================================================
-- SHORTAGE FORECAST — output of the forecast engine
-- =======================================================
CREATE TABLE m5a_material.shortage_forecast (
  forecast_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  horizon_days       INTEGER NOT NULL,
  total_wos_evaluated INTEGER NOT NULL,
  total_shortage_wos INTEGER NOT NULL,
  total_shortage_qty_mt NUMERIC(12,3) NOT NULL
);

CREATE TABLE m5a_material.shortage_forecast_lines (
  forecast_id        UUID NOT NULL REFERENCES m5a_material.shortage_forecast,
  wo_id              TEXT NOT NULL,
  required_date      DATE NOT NULL,
  required_qty_mt    NUMERIC(10,3) NOT NULL,
  available_qty_mt   NUMERIC(10,3) NOT NULL,
  expected_qty_mt    NUMERIC(10,3) NOT NULL,
  shortfall_qty_mt   NUMERIC(10,3) NOT NULL,
  earliest_remediation TEXT,                                -- 'po_expedite' | 'alt_grade_in_stock' | 'no_remediation'
  PRIMARY KEY (forecast_id, wo_id)
);

-- =======================================================
-- SAP sync watermark
-- =======================================================
CREATE TABLE m5a_material.sap_watermarks (
  entity             TEXT PRIMARY KEY,                     -- 'mb52_stock' | 'mb51_movements'
  last_synced_at     TIMESTAMPTZ NOT NULL,
  last_sap_modified  TIMESTAMPTZ,
  rows_last_pull     INTEGER,
  duration_ms_last   INTEGER,
  status_last        TEXT,
  error_message_last TEXT
);

### 3.2 Design Notes

**Why**** ****coils**** ****is one big table covering HR + intermediates + FG.** Conceptually they’re all the same thing — a physical piece of steel with a weight, location, and lifecycle. Splitting into separate tables (hr_coils, cr_coils, fg_coils) destroys uniformity for queries like “show me all material at a stage” and complicates the parent_coil_id genealogy. A material_type discriminator on master.materials already encodes the distinction.

**Why**** ****wo_readiness**** ****is denormalised.** The Demand Queue UI in M1 needs to show a “material ready ✓ / pending / ✗” icon for every row, every render. Computing this on read by joining coils + pre_allocations + inbound_expected per WO would be 50–100ms per WO × 50 WOs = 5 seconds. Pre-computed and cached: < 5ms total.

**Why**** ****coil_stage_history**** ****exists despite events being the source of truth.** Events live in Redpanda for 30 days. Query patterns like “show me the full lifecycle of coil HR-12345” need to work going back months. Materialising the history into Postgres is cheap (~10 transitions per coil × 100 coils/month = 1,000 rows/month) and enables fast UI.

**Why**** ****parent_coil_id**** ****instead of a separate genealogy table.** Single-parent in v1 (a CR coil has one HR parent; a slit coil has one CR parent). Simpler than a many-to-many genealogy table. Phase 2 may need many-to-many (blended feedstock, scrap remelt) — at which point a coil_genealogy table would replace this single column with a documented migration.

### 3.3 Retention

- **Active coils** (current_stage not in dispatched, scrapped) — indefinite

- **Dispatched / scrapped coils** — 2 years hot, 5 years warm, 7 years cold (genealogy / quality dispute)

- **Stage history** — 1 year hot, 7 years warm (regulatory / quality)

- **Pre-allocations** — active indefinite; released → 90 days hot, then archived

- **Inbound expected** — received → 90 days hot; pending → indefinite (these are open commitments)

- **Shortage forecasts** — keep last 90 days for trend analysis; archive older

## 4. Event Schemas

### 4.1 Events M5a Publishes

#### material.coil.received (v1.0)

Published when an HR coil is physically received at stores (operator scan or SAP MM movement type 101).

{
  "event_type": "material.coil.received",
  "aggregate_id": "coil_HR_298451",
  "payload": {
    "coil_id": "coil_HR_298451",
    "material_code": "HR_400_1250_IS5986",
    "grade": "IS5986-Fe410",
    "gauge_mm": 4.0,
    "width_mm": 1250,
    "weight_mt": 22.5,
    "heat_number": "H-2026-04-1234",
    "supplier": "JSW Steel",
    "received_at": "2026-04-18T08:30:00Z",
    "received_by": "stores_op_03",
    "sap_doc_ref": "GR_5008924"
  }
}

#### material.coil.staged (v1.0)

Published on every stage transition (stores → pickling → rolling → …).

{
  "event_type": "material.coil.staged",
  "aggregate_id": "coil_HR_298451",
  "payload": {
    "coil_id": "coil_HR_298451",
    "from_stage": "stores",
    "to_stage": "pickling",
    "transition_at": "2026-04-18T14:22:00Z",
    "triggered_by": "operator_scan",
    "user_id": "pkl_op_07",
    "related_wo_id": "wo_8893451"
  }
}

#### material.coil.reserved (v1.0)

Published when a coil is pre-allocated to a WO.

{
  "event_type": "material.coil.reserved",
  "aggregate_id": "coil_HR_298451",
  "payload": {
    "coil_id": "coil_HR_298451",
    "wo_id": "wo_8893451",
    "allocated_qty_mt": 22.5,
    "allocated_by": "matplanner_01"
  }
}

#### material.coil.consumed (v1.0)

Published when production confirms consumption (triggered by M7 production confirmation).

{
  "event_type": "material.coil.consumed",
  "aggregate_id": "coil_HR_298451",
  "payload": {
    "coil_id": "coil_HR_298451",
    "wo_id": "wo_8893451",
    "consumed_qty_mt": 22.5,
    "remaining_after_mt": 0,
    "production_event_id": "...",
    "child_coil_id": "coil_CR_198445"
  }
}

#### material.coil.allocated (v1.0)

Published when a previously-pending WO becomes material-ready (transition to wo_readiness.status = 'ready').

{
  "event_type": "material.coil.allocated",
  "aggregate_id": "wo_8893451",
  "payload": {
    "wo_id": "wo_8893451",
    "ready_at": "2026-04-18T08:30:00Z",
    "reserved_coils": [{"coil_id": "coil_HR_298451", "qty_mt": 22.5}]
  }
}

#### material.coil.shortage_detected (v1.0)

Published when a WO transitions to shortage status. Critical for M1 (priority signal), M3 (capacity planning), M4 (scheduler exclusion).

{
  "event_type": "material.coil.shortage_detected",
  "aggregate_id": "wo_8893520",
  "payload": {
    "wo_id": "wo_8893520",
    "required_qty_mt": 18.0,
    "available_qty_mt": 12.0,
    "shortfall_qty_mt": 6.0,
    "earliest_remediation": "po_expedite",
    "expected_remediation_date": "2026-04-22"
  }
}

#### material.coil.shortage_resolved (v1.0)

Published when a shortage clears (new coil received, or planner reallocated).

#### material.coil.quality_hold_set / .quality_hold_released (v1.0)

Published on quality status changes (driven by M5b events).

#### material.coil.aged_out (v1.0)

Published nightly for any coil exceeding age limits.

#### material.shortage_forecast.computed (v1.0)

Published when the weekly shortage forecast completes. Carries summary stats; full detail in DB.

### 4.2 Events M5a Consumes

| Event | From | M5a Behaviour |
| --- | --- | --- |
| erp.work_order.received | M1 | Compute initial readiness; create wo_readiness row |
| erp.work_order.updated | M1 | If qty/material changed: recompute readiness |
| erp.work_order.cancelled | M1 | Release any active pre-allocations; recompute readiness |
| floor.production.completed | M6 → M7 | Emit material.coil.consumed; decrement weight; transition stage; possibly create child coil |
| floor.coil.scanned | M6 | If at line: transition to rolling; validate against expected coil for current job |
| quality.coil.hold | M5b (Phase 2) | Set is_quality_hold = TRUE; downstream WOs become pending |
| quality.coil.released | M5b (Phase 2) | Clear hold; recompute readiness |
| master.materials.updated | M2 | If grade definition changed: recompute readiness for affected WOs |

### 4.3 Event Volume

At Hero Steels:

- Coils received: ~10–15/day (HR coils from suppliers)

- Stage transitions: ~50–80/day (each coil makes ~5–7 transitions through the process)

- Reservations: ~20/day

- Consumption events: ~10–15/day

- Shortage events: ~3–8/day (volatile)

Total: ~100–200 M5a events/day. Comfortable backbone load.

## 5. Ingestion Flow

Three input paths, in priority order:

- **SAP MM pull** (primary for HR coils and stock baseline)

- **Operator scan via Andon terminal** (primary for stage transitions)

- **Quality module events** (for hold/release — Phase 2)

### 5.1 SAP MM Pull

**Cadence.** Every 30 minutes. Tunable.

**OData services consumed:**

- StockOverview_SRV (MB52 equivalent) — current stock by material × plant × storage location

- MaterialDocument_SRV (MB51 equivalent) — material movement history (movement types 101 GR, 261 GI, etc.)

**Transformation logic.**

def sync_sap_stock():
    # 1. Pull MB52 — gives current weight per material × storage location
    stock_rows = sap_client.get_stock_overview(plant=PLANT, modified_after=watermark)

    # 2. Pull MB51 — gives the movement history that produced the stock
    movements = sap_client.get_material_movements(plant=PLANT, modified_after=watermark)

    # 3. Process movements to coil-level state
    for movement in movements:
        if movement.movement_type == '101':  # Goods Receipt
            handle_gr(movement)
        elif movement.movement_type == '261':  # Goods Issue to production
            handle_gi(movement)
        elif movement.movement_type == '262':  # Reversal of GI
            handle_gi_reversal(movement)
        # ... other movement types

    # 4. Reconcile total stock at material level — alert on mismatch
    for material in materials_in_scope:
        sap_total = sum(stock_rows where material_code = material)
        m5a_total = sum(coils where material_code = material and active)
        if abs(sap_total - m5a_total) > tolerance:
            log_reconciliation_alert(material, sap_total, m5a_total)

def handle_gr(movement):
    # SAP movement 101 = Goods Receipt against PO
    # We treat each movement document as a coil arrival
    coil_id = generate_coil_id(movement)
    if coil_exists(coil_id):
        update_coil_from_sap(coil_id, movement)
    else:
        create_coil_in_inbound_expected(coil_id, movement)
        # Coil exists in SAP but not yet physically scanned at stores;
        # actual physical arrival will be confirmed by operator scan

**Critical design point: SAP knows nothing about physical location stages.** SAP shows total stock per storage location. M5a tracks per-coil per-stage. When SAP says “5 HR coils in storage location 0001”, M5a tracks 5 individual coils with their own stage histories. The reconciliation aggregates M5a back to SAP’s grain to detect drift.

### 5.2 Operator Scan via Andon Terminal

**Mechanism.** When a coil moves between stages, the receiving-stage operator scans the coil ID (typed or barcode-scanned) on the Andon terminal. The scan triggers a stage transition event.

**Scan flow.**

- Operator opens “Coil Receive” screen on Andon terminal at their stage (e.g., pickling)

- Operator scans/types coil ID

- M5a validates:

- Coil exists in m5a_material.coils?

- Coil’s current_stage is the expected upstream stage? (e.g., for pickling, expect stores)

- Coil’s grade/gauge matches the active WO at this line?

- If valid: confirm dialog → operator clicks confirm → stage transition committed, event published

- If invalid: alert with reason → operator can:

- Cancel and rescan

- Override with reason (“scanned wrong, this is right physical coil”)

- Escalate to supervisor

**Why scan validation matters.** Mounting the wrong coil on a rolling mill is an expensive mistake — wrong gauge can damage rolls (₹5–10L per roll set), wrong grade can cause an entire batch reject. Pre-scan validation is the operational safety net.

### 5.3 Quality Hold Events (Phase 2)

When M5b ships, quality.coil.hold and quality.coil.released events drive M5a’s is_quality_hold flag. v1: M5a exposes API for direct hold/release operation by the quality engineer (manual intervention until M5b is automated).

### 5.4 Initial Bootstrap (Pilot Day-1)

When Zedral first goes live at Hero Steels, the coil inventory has hundreds of physical coils with no Zedral records. Bootstrap:

- Pull SAP MB52 for all CRS-relevant materials → creates initial coil records with current_stage = 'stores' (default; planner adjusts as needed)

- Stores manager walks inventory; for any coil not at stores, manually overrides current_stage (one-time effort)

- Open WOs → readiness computed based on coil presence

After bootstrap, the system is self-maintaining via SAP sync + scan events.

## 6. Processing Logic

Three computational engines:

- **Readiness recalculator** — keeps wo_readiness accurate

- **Reservation resolver** — manages coil-to-WO pre-allocations

- **Shortage forecaster** — runs weekly to predict future shortages

### 6.1 Readiness Recalculator

**Trigger.** Any of:

- WO event (received / updated / cancelled)

- Coil event (received / staged / reserved / consumed / quality hold)

- Master data change affecting material definitions

- Scheduled refresh (every 15 minutes for all open WOs)

**Algorithm.** For each affected WO:

def compute_readiness(wo):
    needed_mt = wo.qty_planned_mt
    
    # Step 1: Find coils currently reserved for this WO
    reserved_coils = pre_allocations.active().for_wo(wo.wo_id)
    reserved_qty = sum(a.allocated_qty_mt for a in reserved_coils
                        if coils[a.coil_id].is_eligible_for(wo))
    
    # Step 2: Find unreserved-eligible coils that match WO's material spec
    unreserved_eligible = coils.query(
        material_code=wo.material_code,
        grade=wo.grade,
        gauge_mm=wo.gauge_mm,
        width_mm=wo.width_mm,
        current_stage__in=['stores', 'pickling'],
        is_quality_hold=False,
        is_aged_out=False,
        reserved_for_wo__isnull=True
    )
    available_qty = reserved_qty + sum(c.weight_remaining_mt for c in unreserved_eligible)
    
    # Step 3: Find inbound expected coils that match and arrive before required_date
    expected = inbound_expected.query(
        material_code=wo.material_code,
        grade=wo.grade,
        gauge_mm=wo.gauge_mm,
        width_mm=wo.width_mm,
        is_received=False,
        expected_at__lte=wo.required_date
    )
    expected_qty = sum(e.expected_weight_mt for e in expected)
    
    # Step 4: Compute status
    shortfall = max(0, needed_mt - (available_qty + expected_qty))
    
    if available_qty >= needed_mt:
        status = 'ready'
        earliest_ready_at = max(c.ready_at for c in reserved_coils)
    elif available_qty > 0 and (available_qty + expected_qty) >= needed_mt:
        status = 'partial'
        earliest_ready_at = max(e.expected_at for e in expected)
    elif shortfall > 0:
        status = 'shortage'
        earliest_ready_at = None
    else:
        status = 'pending'
        earliest_ready_at = max(e.expected_at for e in expected)
    
    # Step 5: Persist + publish if status changed
    previous = wo_readiness.get(wo.wo_id)
    upsert_readiness(wo, status, available_qty, expected_qty, shortfall, earliest_ready_at)
    
    if previous and previous.status != status:
        if status == 'ready':
            publish('material.coil.allocated', wo.wo_id, ...)
        elif status == 'shortage':
            publish('material.coil.shortage_detected', wo.wo_id, ...)
        elif previous.status == 'shortage' and status != 'shortage':
            publish('material.coil.shortage_resolved', wo.wo_id, ...)

**Eligibility rules (Step 2’s**** ****is_eligible_for****).** A coil is eligible for a WO if:

- Material code matches (or is a documented substitute per M2)

- Grade matches exactly

- Gauge within ±0.05 mm tolerance (configurable per material)

- Width matches exactly (no slitting in v1)

- Not on quality hold

- Not aged out

- Not already reserved for a different WO (or the reservation is releasable)

### 6.2 Reservation Resolver

**Auto-reservation.** When a high-priority WO is created without explicit allocation, M5a auto-reserves the best matching available coils (FIFO by gr_date, “oldest first” — minimises aging).

**Manual reservation.** Material planner can explicitly reserve via UI or API.

**Conflict resolution.** When the same coil is needed by two WOs:

- If neither has a manual allocation: priority rules — higher priority class wins; tie-break by earlier required_date

- If one has manual allocation: manual wins; system surfaces the conflict

- If both have manual allocation: system surfaces, requires planner resolution

**Auto-release rules.** Reservations auto-release when:

- WO is cancelled

- WO is completed (all coils consumed)

- Coil enters quality_hold or aged_out (released to free planner action)

- Reservation is older than 14 days and the WO is not yet scheduled (warns before release)

### 6.3 Shortage Forecaster

**Cadence.** Weekly Monday 06:00 + on-demand.

**Algorithm.**

def forecast_shortages(horizon_days=14):
    forecast = create_forecast(horizon_days)
    
    # Get all open WOs whose required_date is within horizon
    in_horizon = work_orders.open().required_date_within(horizon_days)
    
    for wo in in_horizon:
        readiness = wo_readiness.get(wo.wo_id)
        if readiness.status == 'shortage':
            # Find best remediation
            remediation = find_remediation(wo, readiness)
            forecast.add_line(wo, readiness, remediation)
    
    publish('material.shortage_forecast.computed', forecast.summary)

def find_remediation(wo, readiness):
    # Option A: Find HR coil PO that could be expedited
    expedite_candidate = find_expedite_candidate(wo)
    if expedite_candidate:
        return f'po_expedite:{expedite_candidate.po_ref}'
    
    # Option B: Find alternate grade in stock that customer might accept
    alt_grades = master.materials.alternate_grades_for(wo.grade)
    for alt_grade in alt_grades:
        if has_stock(alt_grade, wo.gauge_mm, wo.width_mm, qty=readiness.shortfall_qty_mt):
            return f'alt_grade_in_stock:{alt_grade}'
    
    # Option C: No automatic remediation
    return 'no_remediation'

**Remediation suggestions are advisory.** The planner decides whether to act on them. M5a doesn’t auto-substitute or auto-expedite.

### 6.4 Aging Worker

**Daily job (02:00).** For each coil:

- If current_stage = 'fg' and (now - arrived_at_fg > 90 days): set is_aged_out = TRUE, publish material.coil.aged_out

- If current_stage = 'stores' and (now - arrived_at_stores > 180 days): warn (configurable threshold by material type)

- If current_stage = 'annealing' for > 7 days: warn (likely stuck — alert maintenance + planner)

### 6.5 Reconciliation Worker

**Daily job (03:00).** Compares M5a coil sums against SAP MB52 stock:

-- M5a side
SELECT material_code, SUM(weight_remaining_mt) as m5a_total
FROM m5a_material.coils
WHERE current_stage IN ('stores', 'pickling', 'rolling', 'annealing', 'rewind', 'fg')
GROUP BY material_code;

-- vs. SAP MB52 latest snapshot
SELECT material_code, SUM(qty_mt) as sap_total FROM sap_stock_snapshot ...

For any material where abs(m5a_total - sap_total) > tolerance_kg, raise a reconciliation alert.

Common drift causes:

- Operator scanned out a coil but no goods issue posted (M5a high)

- SAP movement happened that M5a missed during sync downtime (M5a low)

- Weighing tolerance accumulated over many coils (small drift, expected)

### 6.6 Coil ID Generation

Coil IDs are deterministic and human-readable when possible:

- HR coils with SAP refs: coil_HR_<sap_doc_number>

- CR coils (Zedral-created from production): coil_CR_<parent_HR_short>_<seq> (e.g., coil_CR_298451_001)

- Slit coils: coil_SL_<parent_CR_short>_<seq>

- Operator-entered coils (manual creation, fallback): coil_M_<plant>_<timestamp>_<seq>

## 7. Storage Strategy

### 7.1 Volume Estimation

At Hero Steels:

- Active coils: ~500–1,000 at any time (across all stages)

- New coils per day: ~10–15 HR + ~10–15 CR + slit coils

- Stage transitions per day: ~50–80

- Annual coil records: ~7,000

Storage at 5 years: ~35,000 coil rows + ~150,000 stage history rows. Trivial.

### 7.2 Indexing

Designed for the dominant queries:

- **“****Show all coils at stage X****”** — idx_coils_stage

- **“****Show all coils matching this material spec****”** — idx_coils_material

- **“****Is coil X reserved?****”** — idx_coils_reserved

- **“****Lifecycle of coil X****”** — idx_csh_coil_time

- **“****All overdue inbound****”** — idx_inbound_pending

### 7.3 Materialised View

A view m5a_material.current_stock_by_material that pre-aggregates active stock per (material_code, grade, gauge, width) for fast UI rendering:

CREATE MATERIALIZED VIEW m5a_material.current_stock_by_material AS
SELECT
  material_code, grade, gauge_mm, width_mm,
  COUNT(*) as coil_count,
  SUM(weight_remaining_mt) as total_qty_mt,
  COUNT(*) FILTER (WHERE is_quality_hold) as on_hold_count,
  SUM(weight_remaining_mt) FILTER (WHERE is_quality_hold) as on_hold_qty_mt,
  SUM(weight_remaining_mt) FILTER (WHERE reserved_for_wo IS NULL) as free_qty_mt
FROM m5a_material.coils
WHERE current_stage IN ('stores', 'pickling', 'rolling', 'annealing', 'rewind', 'fg')
GROUP BY material_code, grade, gauge_mm, width_mm;

CREATE INDEX ON m5a_material.current_stock_by_material (material_code, grade, gauge_mm, width_mm);

Refreshed by trigger on coil events; concurrent refresh permitted.

### 7.4 Hot / Warm / Cold

| Data | Hot | Warm | Cold |
| --- | --- | --- | --- |
| Active coils | Indefinite | — | — |
| Closed coils | 2 yr | 5 yr | 7 yr |
| Stage history | 1 yr | 5 yr | 7 yr |
| Pre-allocations | Active indefinite; closed 90 days | 5 yr | — |
| Inbound expected | Active indefinite; received 90 days | 5 yr | — |
| Shortage forecasts | 90 days | 1 yr | — |

## 8. API Surface

All endpoints at /api/m5a/*.

### 8.1 Read APIs

#### GET /api/m5a/coils

Search/list coils with filters.

**Query params:** material_code, grade, gauge_mm, width_mm, current_stage, is_quality_hold, reserved_for_wo, gr_date_from/to, search (coil ID prefix), sort, limit, offset.

**Response:** paginated coil list with summary fields per row.

#### GET /api/m5a/coils/{coil_id}

Full coil detail including stage history, parent/child relationships, current pre-allocation, quality status.

#### GET /api/m5a/wo-readiness

The Material Planner’s morning view. List of all open WOs with readiness status.

**Response:**

{
  "as_of": "2026-04-18T08:30:00Z",
  "summary": {
    "total_wos": 47,
    "ready": 24,
    "partial": 12,
    "pending": 8,
    "shortage": 3
  },
  "items": [
    {
      "wo_id": "wo_8893451",
      "material": "CR_045_1250_IS513 / IS513-D",
      "required_qty_mt": 18.45,
      "available_qty_mt": 22.5,
      "expected_qty_mt": 0,
      "shortfall_qty_mt": 0,
      "status": "ready",
      "earliest_ready_at": "2026-04-18T08:00:00Z",
      "reserved_coils": [{"coil_id": "coil_HR_298451", "qty_mt": 22.5}]
    }
    /* ... */
  ]
}

#### GET /api/m5a/wo-readiness/{wo_id}

Per-WO drill-down. Used by M1 detail pane.

#### GET /api/m5a/stock-summary

Aggregate stock view by material spec.

#### GET /api/m5a/inbound-expected

Pending inbound coils. Used by Material Planner’s expediting view.

#### GET /api/m5a/shortage-forecast/latest

Most recent forecast. Used by JTBD-3 weekly view.

### 8.2 Write APIs

#### POST /api/m5a/coils/{coil_id}/scan

Operator scan event from Andon terminal. Triggers stage transition.

**Request body:**

{
  "to_stage": "pickling",
  "device_id": "andon_pickling_01",
  "active_wo_id": "wo_8893451",
  "override_validation": false,
  "override_reason": null
}

Response: success → confirmation + new stage state; failure → validation error with explanation.

#### POST /api/m5a/coils/{coil_id}/reserve

Reserve a coil for a WO. Required role: material_planner or planner.

#### DELETE /api/m5a/coils/{coil_id}/reserve

Release a reservation.

#### POST /api/m5a/coils/{coil_id}/quality-hold

Place a coil on hold. Required role: quality_engineer.

#### DELETE /api/m5a/coils/{coil_id}/quality-hold

Release a hold.

#### POST /api/m5a/coils/manual

Create a coil manually (for bootstrap or recovery scenarios). Required role: material_planner.

#### PATCH /api/m5a/coils/{coil_id}

Adjust coil attributes (stage override, weight correction). Required role: material_planner. Audited.

#### POST /api/m5a/inbound-expected

Manually create an inbound expectation (for coils GR’d outside SAP). Required role: material_planner.

#### POST /api/m5a/shortage-forecast/run

Trigger an on-demand forecast.

### 8.3 Admin APIs

- POST /api/m5a/sync/trigger — force SAP MM sync

- GET /api/m5a/reconciliation/latest — latest reconciliation report

- POST /api/m5a/reconciliation/run — force reconciliation

### 8.4 Rate Limits

- Reads: 600/min/user

- Scan endpoint: 1,200/min (high-frequency floor operation)

- Reservation operations: 60/min

- Manual coil creation: 10/min

## 9. UI/UX Specification

M5a contributes screens to both the Ops Console (Material Planner’s domain) and the Floor Console (Operator scan workflows).

### 9.1 Ops Console — Material Planner Workspace

**Screen 1 — Material Readiness Dashboard.** The Material Planner’s home screen.

Layout: - Top: Summary row (Ready / Partial / Pending / Shortage counts with click-to-filter) - Middle: WO list table with columns: - WO ID, Customer, Material spec, Required date - Required qty / Available qty / Expected qty / Shortfall - Status badge (color-coded) - Earliest ready date - Quick actions (Reserve, Drill-down) - Right rail: Filter and search

**Screen 2 — Coil Inventory Browser.** Search / list view across all coils.

- Table view with filters and sort

- Each row clickable → Coil Detail

- Bulk actions: bulk-reserve, bulk hold/release (for emergency scenarios)

- Export to CSV for ad-hoc analysis

**Screen 3 — Coil Detail.**

- Header: coil ID, current stage, current allocation, quality status

- Lifecycle timeline: visual chart of stage history

- Genealogy tree: parent (HR) and children (CR, slit, etc.)

- Quality events: history of holds and releases

- Audit log: every change with user + timestamp

- Actions: reserve, release, hold, release hold, scrap, override stage

**Screen 4 — Inbound Expediting.**

- Table of pending inbound coils sorted by overdue first

- Columns: SAP doc ref, supplier, material spec, expected_at, age_days, overdue indicator

- Quick action: “Mark received” (for coils that arrived but no scan happened)

- Color escalation: green (on-time), amber (1–3 days overdue), red (>3 days)

**Screen 5 — Shortage Forecast.**

- Top: forecast generation timestamp, summary numbers

- Table of WOs in shortage with required date, shortfall, suggested remediation

- Group by remediation type (expedite / alt-grade / no-remediation)

- Action: “Apply remediation” workflow

### 9.2 Floor Console — Operator Scan Surface

**Screen — Coil Receive (per-stage).** Lives on each Andon terminal.

- Large scan input field (touch-optimised)

- Scan triggers immediate validation

- On success: large green confirmation with coil details, “Receive next coil” prompt

- On failure: large red alert with explanation:

- “Coil grade IS513-D, but active job needs IS5986” → “Stop. Don’t mount.”

- “Coil already at rolling stage” → “Did you mean a different coil?”

- Override button (pin-protected, supervisor approval)

**Screen — Mount Confirmation (line operator).** Variant of Coil Receive specifically for the rolling line.

- Shows the active WO and required spec prominently at the top

- Operator scans the coil

- System confirms match against active WO

- Mount confirmation dialog with checkbox list (“Coil ID confirmed”, “Mounted on top mandrel”, “Threading complete”)

- Submit logs scan event + start ready-for-production state

### 9.3 Embedded Components

**Material readiness badge.** A small icon component used across other modules (M1 demand queue, M4 Gantt, M3 capacity drill-down):

- 🟢 Ready

- 🟡 Partial / Pending

- 🔴 Shortage

- ⚪ Not yet evaluated

Hovering shows a tooltip with the breakdown (qty available, qty expected, shortfall).

### 9.4 Performance SLOs

- Material Readiness Dashboard load: < 600ms p95

- Coil search (1,000+ coils): < 400ms p95

- Coil scan validation: < 200ms p95 (critical for floor responsiveness)

- Shortage forecast generation: < 30s for 90-day horizon

### 9.5 Accessibility

- High-contrast scan UI (operators in industrial lighting)

- Audio confirmation tone on successful scan (optional, configurable)

- Larger-than-default touch targets on Floor Console (60×60 px minimum)

## 10. Integration with Other Modules

### 10.1 M5a → M1 (Demand) — Event-Driven

Publishes readiness state changes (allocated, shortage_detected, shortage_resolved). M1 updates its WO records and recalculates priority scores.

### 10.2 M5a → M3 (Capacity) — Event-Driven (Phase 2)

In Phase 2, M3 will optionally factor material readiness into capacity (a WO that’s material-short shouldn’t count against capacity in the bucket where it can’t run). v1: M3 ignores material; M5a’s signals are consumed by M1 and M4 only.

### 10.3 M5a → M4 (Scheduler) — Hard Gate

M4 reads wo_readiness for every WO it considers scheduling. WOs with status != 'ready' are excluded from active scheduling unless the planner explicitly overrides via pin. Subscribes to material.coil.allocated to add WOs to the next planning queue.

### 10.4 M5a → M6 (Dispatch) — Read

M6’s dispatch list generation reads M5a to confirm material is at the line for each dispatched job. Floor Console scan flow depends on M5a APIs for validation.

### 10.5 M5a → M7 (Performance) — Event-Driven

M7 consumes consumption events for material yield analysis (planned qty vs. consumed qty). Yield variance is a quality and procurement KPI.

### 10.6 M5a → M5b (Quality, Phase 2) — Bidirectional

Phase 2: M5b raises NCRs against coils, M5a consumes hold/release events. M5a exposes coil location for the quality engineer’s NCR workflow.

### 10.7 M5a ← M2 (Master Data) — Read

M5a reads materials, customers, alternate-grade definitions from M2.

### 10.8 M5a ↔ SAP MM — See §11

## 11. SAP Bidirectional Mapping

### 11.1 Inbound from SAP

| SAP Service | SAP Module | Frequency | Purpose |
| --- | --- | --- | --- |
| StockOverview_SRV (MB52) | MM | Every 30 min | Reconcile total stock; bootstrap pull |
| MaterialDocument_SRV (MB51) | MM | Every 30 min | Material movement events; populates inbound expected, drives stage transitions for stores arrival |

**Field mappings.** Documented in docs/m5a/sap-mm-mappings.yaml. Key fields:

| SAP field | Zedral field |
| --- | --- |
| MBLNR (movement document number) | coil_id (suffix) |
| MATNR | material_code |
| WERKS | plant validation |
| LGORT | storage location → derives initial stage |
| MENGE | weight_mt |
| MEINS | weight unit (must be KG → MT conversion) |
| BWART (movement type) | drives event handler |
| CHARG (batch number) | heat_number |
| LIFNR (vendor) | supplier |

### 11.2 Outbound to SAP — Goods Issues

When production confirms (M7 publishes production.wo.confirmed), M5a writes a goods issue back to SAP MM:

- SAP movement type: 261 (GI to production order)

- Payload: WO number, material code, qty consumed

- Response: SAP material document number → stored in coil_consumption_log

Failure handling: standard sap_sync_log PENDING → RETRYING → SUCCESS/FAILED lifecycle.

### 11.3 SAP Extension Requirements

- MaterialDocument_SRV — standard

- StockOverview_SRV — standard

- Goods Issue write-back via OData — needs Basis confirmation (most ECC installations have it; verify at Hero Steels)

### 11.4 Reconciliation

Daily reconciliation job (§6.5) ensures M5a’s coil sums match SAP MB52 within tolerance. Mismatches flagged in Integration Health Grafana dashboard.

## 12. Failure Modes & Recovery

### 12.1 SAP Sync Failures

| Mode | Detection | Recovery |
| --- | --- | --- |
| MB51 sync fails | Standard SAP error handling | Retry with backoff; alert; floor scans continue independently |
| Drift between M5a and SAP MB52 | Daily reconciliation | Surface in dashboard; planner investigates; targeted re-sync |
| Goods Issue write-back rejected by SAP | sap_sync_log status FAILED | Alert; planner reviews and resubmits or corrects |

### 12.2 Scan Failures

| Mode | Detection | Recovery |
| --- | --- | --- |
| Coil ID not found | Validation API | Surface error; offer “Create new coil manually” workflow |
| Coil at wrong stage for transition | Validation API | Block transition; offer override (audit-trail required) |
| Coil grade mismatch with active WO | Validation API | Block mount; supervisor escalation required |
| Andon terminal offline | Heartbeat monitor | Local queue on terminal device; sync when back online |
| Duplicate scan (same coil scanned twice) | Idempotency check (event_id) | Second scan logged but no duplicate state change |

### 12.3 Readiness Calculation Failures

| Mode | Detection | Recovery |
| --- | --- | --- |
| Recalculation worker stuck | Job timeout (60s) | Kill, log, retry; if persistent, alert |
| Stale wo_readiness (calculated_at > 1 hour) | Health check | Alert; force recompute |
| Conflicting reservations (same coil to two WOs) | Constraint violation | Surface conflict; planner resolves; system enforces single-active reservation |

### 12.4 Data Integrity Failures

| Mode | Detection | Recovery |
| --- | --- | --- |
| Coil with negative weight_remaining_mt | DB constraint | Reject the consumption; log; investigate |
| Coil at terminal stage (dispatched/scrapped) attempting to transition | Validation | Reject; require explicit “un-dispatch” override (audited) |
| Parent coil has more child weight than initial weight | Reconciliation | Alert; investigate measurement / process loss |

## 13. Acceptance Criteria

### 13.1 Functional

- ☐ SAP MB52 / MB51 sync runs every 30 min, bootstraps Hero Steels coil inventory at go-live

- ☐ Operator scan workflow validates and transitions stages correctly across all 6 stages

- ☐ WO readiness computed and published correctly on every relevant event

- ☐ Auto-reservation respects priority and FIFO rules

- ☐ Manual reservation/release works end-to-end

- ☐ Quality hold/release functional via API

- ☐ Aging worker runs nightly and flags aged coils

- ☐ Reconciliation worker runs daily and surfaces drift

- ☐ Goods Issue write-back to SAP works on production confirmation

- ☐ Shortage forecast runs weekly and on-demand

- ☐ All events publish per schema and are consumed by M1, M4, M7

### 13.2 Non-Functional

- ☐ API p95 latency meets §9.4

- ☐ Scan endpoint p95 < 200ms (floor critical)

- ☐ Readiness recalculation completes < 5s for 50 affected WOs

- ☐ All standard + module-specific Prometheus metrics emitted

- ☐ All RBAC enforced

- ☐ Audit log entries for all writes

### 13.3 Pilot Validation

- ☐ Material Planner can complete morning material review (JTBD-1) in < 60 sec

- ☐ Per-WO status query (JTBD-2) answered correctly in < 5 sec

- ☐ Weekly shortage forecast (JTBD-3) produces actionable list

- ☐ Inbound expediting view (JTBD-4) accurately shows overdue coils

- ☐ Cross-WO reallocation (JTBD-5) works end-to-end with audit

- ☐ Floor operators can scan and confirm a stage transition in < 5 sec

- ☐ 30-day pilot: M5a vs. SAP MB52 reconciliation tolerance violated < 5% of days

### 13.4 Documentation

- ☐ OpenAPI spec

- ☐ Event schemas in Apicurio

- ☐ Runbooks: SAP sync failure, scan validation failure, drift investigation

- ☐ Operator guide for floor scan workflows (one page per stage, large print)

- ☐ Material Planner user guide

### 13.5 Rollback

If M5a fails post-go-live: - Material Planner falls back to SAP MB52 + Excel + walking the floor (status quo) - M4 degrades to “no material gate” mode (warns planner) - Operator scans queue locally on Andon terminals; replay on recovery

## 14. Build Plan

### 14.1 Phases

| Sub-phase | Duration | Deliverable |
| --- | --- | --- |
| **M5a.0** — Foundation | Week 1 | Service skeleton, schema, config |
| **M5a.1** — SAP MM ingestion | Weeks 2–3 | MB52 + MB51 pull, watermarking, coil bootstrap |
| **M5a.2** — Scan workflow | Weeks 3–4 | Scan API + validation; Floor Console screens for each stage |
| **M5a.3** — Readiness recalculator | Week 4 | All triggers, eligibility rules, status persistence |
| **M5a.4** — Reservation + auto-allocation | Week 5 | Pre-allocations, conflict resolution |
| **M5a.5** — APIs | Week 5 | Read + write endpoints, OpenAPI |
| **M5a.6** — Material Planner UI | Weeks 6–7 | Dashboard, coil browser, detail, inbound expediting |
| **M5a.7** — Shortage forecaster | Week 7 | Weekly + on-demand; remediation suggestions |
| **M5a.8** — Goods Issue write-back | Week 8 | SAP MM 261 movement on production confirm |
| **M5a.9** — Aging + reconciliation workers | Week 8 | Nightly jobs |
| **M5a.10** — Integration test | Week 9 | M1, M4, M6, M7 integration |
| **M5a.11** — Soak + pilot prep | Week 10 | Bootstrap data, training, runbooks |

**Total:** 10 weeks.

### 14.2 Team

1 M5a engineer primary + fractional frontend (shared pool) + part-time SAP integration support during weeks 2–3 and week 8.

**Hiring JD starter:**

- **Must have:** Python backend, Postgres, REST APIs, event-driven systems

- **Strong plus:** SAP MM domain (MB51 / MB52 / movement types), material/inventory domain, manufacturing exposure

- **Nice to have:** Steel industry, RFID/barcode integration experience

### 14.3 Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- | --- |
| R1 | Hero Steels coil ID conventions don’t map to clean Zedral IDs | High | Medium | Mapping config; manual override workflow; pilot-week-1 IE walkthrough |
| R2 | Bootstrap coil inventory has stage-state ambiguity (no one knows where each coil currently is) | High | Medium | One-time stores walkthrough during go-live week; default to stores, planner adjusts |
| R3 | Operators skip scan workflow (“too slow”) | Medium | High | Scan UI optimised for < 5 sec; supervisor enforcement; explicit scan-failure penalty in OEE |
| R4 | SAP MB51 movement types include unexpected codes Hero Steels uses | Medium | Medium | Discovery in Phase 0; mapping config; default-to-log unknown types |
| R5 | Reservations get stale (planner sets and forgets) | Medium | Low | 14-day auto-expiry warning; weekly cleanup report |
| R6 | Reconciliation drift > tolerance becomes routine (“just ignore it”) | Medium | High | Drift threshold config; daily report visibility; dashboard surfacing |

### 14.4 Dependencies

| Dependency | What | Needed by |
| --- | --- | --- |
| Phase 0 Foundation | Platform, event backbone, Andon terminal infra | Week 1 |
| SAP MM OData services | MB52 + MB51 enabled | Week 2 |
| M2 Master Data | Materials populated | Week 2 |
| M1 Demand events | Subscribed to | Week 4 |
| Andon terminal hardware | Installed at each stage | Week 3 (for testing scan workflow) |
| M6 (for write integration) | Subscribes to M5a events | Week 9 |
| M7 (for consumption events) | Production confirmation flow | Week 9 |

### 14.5 Exit Criteria to Phase 2

- 30 days production stability

- Reconciliation drift < tolerance ≥ 95% of days

- Scan compliance > 90% (operators actually scanning vs. bypassing)

- Material Planner JTBDs validated ≥ 4/5 satisfaction

## Revision History

| Version | Date | Author | Changes |
| --- | --- | --- | --- |
| v0.1 | 2026-04-17 | Product & Systems Engineering | Initial draft |

*End of M5a — Material **&** Inventory Control Production Document* *Total: ~7,500 words · Est. reading time: 40 minutes* *Next module in sequence:** ****M6 — Dispatch ******&****** Execution Control***