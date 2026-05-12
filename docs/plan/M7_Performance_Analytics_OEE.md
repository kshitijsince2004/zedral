Zedral Platform ��� M7 Production Document

Performance Analytics \& OEE �� Phase 1

Product \& Systems Engineering

April 2026

Table of Contents

# Zedral Platform — Module M7 Production Document

## M7 — Performance Analytics & OEE

**Document status:** Draft v0.1 · For engineering handover **Audience:** M7 module engineering team, adjacent module teams (M1 demand, M4 scheduler, M5a material, M6 dispatch, M8 energy), Hero Steels planner, shift supervisors, plant head, CFO **Owner:** Platform Engineering · M7 technical lead TBD **Depends on:** Phase 0 Foundation · M1 · M2 · M4 · M5a · M6 · SAP PP connector **Phase:** 1 (Pilot Core Loop · Months 2–6) **Inherits:** All 10 Architectural Principles, especially **Principle 2 (Append-Only Truth, Materialised Reads)**

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

### 1.1 What M7 Is

M7 is the **analytics and measurement layer** that converts raw operational events into the KPIs every level of the plant — operator to CFO — trusts and acts on. It is also the module that **closes the loop back to SAP**, posting production confirmations so the financial and planning system reflects what actually happened.

If M4 is the algorithmic centrepiece and M6 is the floor write surface, M7 is the **truth surface** — where operational reality is aggregated, trended, compared to plan, and handed back to the enterprise systems.

**M7 owns six responsibilities:**

- **OEE calculation** — compute Availability × Performance × Quality per line per shift per day, continuously

- **Plan-vs-actual variance tracking** — for every scheduled operation, compare planned to actual and surface variance causes

- **Downtime Pareto aggregation** — roll up M6’s stoppage events into the Pareto charts that drive continuous improvement

- **Setup time trend tracking** — measure whether setup minutes are declining (the fundamental pilot success metric)

- **SAP production confirmation write-back** — post every completed WO to SAP PP with quantities, timing, and operator data

- **Executive reporting** — produce the daily, shift, weekly, and monthly rollups that plant leadership reviews

### 1.2 Why M7 Is a Separate Module

M7 is conceptually downstream of every other module — it aggregates, trends, and reports. That could make it feel like “the dashboard module” — but it’s much more than that:

- **Numeric integrity is a core product promise.** If the OEE number M7 shows is wrong, the platform’s credibility collapses. M7 is where arithmetic becomes a first-class concern (see Principle 9: Observability is a Product Feature).

- **The SAP write-back is the single most critical external integration.** Production confirmation is what makes SAP’s financial view match reality. Failure here breaks CFO trust. M7 owns this path because M7 has the complete production picture.

- **OEE calculation is non-trivial.** “Availability × Performance × Quality” sounds simple until you have to handle partial shifts, planned breaks vs. unplanned stoppages, running at derated speed, scrap vs. on-spec, and edge cases that each move a digit in the final number.

- **Analytics queries are different workload from transactional updates.** Separating M7 means OEE recalcs and dashboard queries don’t compete for DB locks with M6’s high-write event ingestion.

### 1.3 What M7 Is Not

- **Not a data warehouse.** v1 doesn’t ship with columnar storage, OLAP cubes, or dedicated BI infrastructure. Postgres + TimescaleDB hypertables for time-series KPIs is enough at Hero Steels scale.

- **Not a visualisation library.** M7 produces structured JSON for the Ops Console and exports to PDF/Excel. Embedding Power BI / Tableau / Metabase is a Phase 4+ consideration if a customer specifically demands it.

- **Not a predictive analytics module.** v1 is deterministic — historical rollups, trend charts, variance analysis. Statistical forecasting (e.g., “predicted setup minutes next week”) is Phase 3+.

- **Not a compliance report generator for ESG.** That’s M8’s domain — though M7 provides SEC (kWh/tonne) data to M8 via the production tonnage it publishes.

- **Not a self-service BI tool.** No ad-hoc query builder, no drag-drop dashboard designer in v1. The dashboards are opinionated, pre-built, and iteratively improved — not user-configurable.

- **Not a statistical process control engine.** SPC charts for in-process quality (Xbar-R, CUSUM) are M5b’s domain in Phase 2. M7 may surface SPC violations in its reject tracking, but doesn’t compute control limits.

- **Not an AI/ML anomaly detector.** Threshold-based alerting only in v1. Per Principle 4.

- **Not a customer-facing delivery tracking portal.** Customer-facing views (delivery ETA, order status) are Phase 3+.

### 1.4 The OEE Triad — Reality Check

OEE = Availability × Performance × Quality is the gold standard, but every component is a minefield of definitional choices. M7 makes these choices explicit and documented (see §6.1):

**Availability** = Run Time / Planned Production Time - What counts as “planned”? Do shift changes count as planned? Yes (scheduled break). - What counts as “run time”? Setup is not run time. Breakdowns are not run time. Planned tool changes — are those planned downtime (excluded from numerator, excluded from denominator) or unplanned (excluded from numerator, included in denominator)? v1 treats them as planned.

**Performance** = (Actual Count × Ideal Cycle Time) / Run Time - In a continuous process like rolling, “Count” is tonnage. “Ideal Cycle Time” is the rated run rate from M2’s routing master. - What if the line runs at derated speed because of a coil quality issue? That’s a performance loss — correctly captured.

**Quality** = Good Count / Total Count - Good = passes quality gate (M5b in Phase 2; operator-reported in v1) - Total = Good + Scrap (not including reworked items — those are neither good nor scrap, they’re in rework)

**Reality at Hero Steels.** Pre-Zedral OEE is “approximately 55%” — an estimate derived from monthly tonnage and rough downtime logs. Post-M7, OEE is continuous, per-shift, per-line, and auditable. The honest expectation: measured OEE may initially look *lower* than the 55% estimate because real data reveals losses that previously rolled up. This must be communicated to stakeholders as “now we have truth” rather than “we got worse.”

### 1.5 Edge Cases In Scope

- **Partial shifts** — shift cut short by emergency; OEE computed on actual elapsed minutes

- **Cross-shift jobs** — WO spans two shifts; production attributed to each shift proportionally

- **Derated operation** — line running at reduced speed; captured as performance loss

- **Scrap reworked later** — scrap reported in shift A, reworked in shift B; quality impact attributed to shift A

- **Multi-coil consumption** — 1 WO → N coils consumed; consumption summed in production confirmation

- **Late event arrival** — event from Andon buffered for 3 hours arrives late; KPIs for that shift recomputed

- **Retrospective correction** — supervisor edits a reported tonnage (with audit) up to 24 hours after; KPI recalculated

- **Event timestamp outliers** — event with occurred_at before the shift it’s supposed to be in; validation rejects with quarantine

### 1.6 Edge Cases Deferred

- **OEE normalisation across grade families** (harder grades should have lower performance expectation) — Phase 2

- **Weighted OEE** (by strategic importance of the line / job) — Phase 3

- **Benchmarking OEE across plants** — multi-plant concern, out of scope

- **Operator-level OEE** (individual operator performance scorecards) — sensitive; cultural alignment required before building

- **Causal root-cause inference** (“why did OEE drop Tuesday?”) — Phase 3 with more data

## 2. Personas & Jobs To Be Done

M7 is unusual in that it serves five distinct personas with five distinct JTBD sets — from the floor to the C-suite.

### 2.1 Persona — Shift Supervisor

**JTBD-1: Live shift KPI view.**

*“**At any moment during my shift, I need OEE and its breakdown (Availability/Performance/Quality) for each of my lines — one number I can point to when my manager asks how we’re doing.**”*

**JTBD-2: End-of-shift review.**

*“**At 13:55, before my shift ends, I review the 10-second rollup: production MT, setup minutes, downtime minutes by reason, rejects — and compare to the shift target. I write handover notes based on what I see here.**”*

### 2.2 Persona — Production Planner

**JTBD-3: Plan-vs-actual variance.**

*“**For yesterday’s shift, I need to see every scheduled operation side-by-side with what actually happened — setup time planned vs. actual, production qty planned vs. actual, end time planned vs. actual. Patterns of variance tell me where to tune the scheduler.**”*

**JTBD-4: Setup time trend.**

*“**I need a 30/60/90-day chart of average setup time per line per changeover category. This is the fundamental metric telling me whether the scheduler’s changeover optimisation and the SMED program are working.**”*

**JTBD-5: Schedule adherence.**

*“**What % of scheduled operations yesterday started within 30 minutes of their planned time? What were the biggest delays and why?**”*

### 2.3 Persona — Head of Manufacturing / Plant Head

**JTBD-6: Daily plant dashboard.**

*“**Every morning at 08:15 after my walk-through, I want a single page showing: yesterday’s production MT vs. target, OEE by line, top 3 downtime categories, top 3 quality issues, today’s schedule risk. 60 seconds of reading.**”*

**JTBD-7: Weekly management review.**

*“**Every Monday 09:30 I run a 15-minute review with my planner and maintenance head. I need a printable/exportable weekly pack: OEE trend, production vs. target, major incidents, improvement actions status.**”*

### 2.4 Persona — CFO / Corporate Finance

**JTBD-8: Monthly production reconciliation.**

*“**On the first of every month, I need to know: tonnage produced last month, tonnage confirmed into SAP, tonnage variance, and the root cause of any variance **>** 1%. This drives revenue recognition.**”*

**JTBD-9: Specific Energy Consumption trend.**

*“**Quarterly, the cost of energy as ₹/tonne of output — is it going up or down? Where are the biggest energy-per-tonne leakages?**”*

### 2.5 Persona — SAP Basis / IT

**JTBD-10: Production confirmation health.**

*“**I need a dashboard showing: confirmations pending, confirmations failed (with error reason), sync latency to SAP. If the sync falls behind, I need to know before the CFO does.**”*

## 3. Data Model

M7’s data lives in m7_performance schema. The core entities are kpi_snapshots (the central time-series of computed KPIs), production_confirmations (the durable record of what M7 tells SAP), and aggregated materialised tables for fast dashboard queries.

**TimescaleDB extension used here.** M7 is the biggest beneficiary of time-series indexing. kpi_snapshots is declared as a hypertable with automatic partitioning by snapshot_at.

### 3.1 Core Tables

-- =======================================================
-- KPI SNAPSHOTS — the central time-series KPI store
-- Declared as Timescale hypertable
-- =======================================================
CREATE TABLE m7_performance.kpi_snapshots (
  snapshot_id        BIGSERIAL,
  snapshot_at        TIMESTAMPTZ NOT NULL,                    -- when this measurement represents
  wc_id              TEXT NOT NULL REFERENCES master.work_centres,
  bucket_granularity TEXT NOT NULL,                            -- 'shift' | 'day' | 'week' | 'month'
  bucket_start       TIMESTAMPTZ NOT NULL,
  bucket_end         TIMESTAMPTZ NOT NULL,
  -- OEE components
  planned_production_min INTEGER NOT NULL,                     -- the denominator time window
  run_time_min       INTEGER NOT NULL,
  downtime_min       INTEGER NOT NULL,
  setup_min          INTEGER NOT NULL,
  pm_min             INTEGER NOT NULL,
  breakdown_min      INTEGER NOT NULL,
  availability_pct   NUMERIC(5,2),
  -- Production
  qty_produced_mt    NUMERIC(10,3) NOT NULL,
  qty_good_mt        NUMERIC(10,3) NOT NULL,
  qty_scrap_mt       NUMERIC(10,3) NOT NULL,
  ideal_cycle_rate_mt_hr NUMERIC(8,2),                         -- weighted avg from routing master for what ran
  ideal_qty_mt       NUMERIC(10,3),                            -- what could have been produced at ideal rate
  performance_pct    NUMERIC(5,2),
  quality_pct        NUMERIC(5,2),
  oee_pct            NUMERIC(5,2),
  -- Supporting counts
  wo_completed_count INTEGER NOT NULL DEFAULT 0,
  setup_count        INTEGER NOT NULL DEFAULT 0,
  reject_count       INTEGER NOT NULL DEFAULT 0,
  stoppage_count     INTEGER NOT NULL DEFAULT 0,
  -- Energy (from M8)
  kwh_consumed       NUMERIC(12,2),
  sec_kwh_per_mt     NUMERIC(8,3),                             -- specific energy consumption
  -- Schedule adherence
  scheduled_ops_count INTEGER,
  on_time_ops_count  INTEGER,
  adherence_pct      NUMERIC(5,2),
  -- Provenance
  calculated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  calculation_version TEXT NOT NULL DEFAULT 'v1',              -- lets us recompute with new logic
  is_final           BOOLEAN DEFAULT FALSE,                     -- TRUE once past the recompute window
  PRIMARY KEY (snapshot_id, snapshot_at)
);

-- Make it a hypertable
SELECT create_hypertable('m7_performance.kpi_snapshots', 'snapshot_at',
                         chunk_time_interval => INTERVAL '1 week');

CREATE INDEX idx_kpi_wc_bucket_time
  ON m7_performance.kpi_snapshots (wc_id, bucket_granularity, bucket_start DESC);
CREATE INDEX idx_kpi_latest
  ON m7_performance.kpi_snapshots (wc_id, bucket_granularity, bucket_start DESC, calculated_at DESC);

-- =======================================================
-- PRODUCTION CONFIRMATIONS — truth handed back to SAP
-- =======================================================
CREATE TABLE m7_performance.production_confirmations (
  confirmation_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wo_id              TEXT NOT NULL,
  wc_id              TEXT NOT NULL,
  shift_date         DATE NOT NULL,
  shift              CHAR(1),
  -- What was produced
  qty_good_mt        NUMERIC(10,3) NOT NULL,
  qty_scrap_mt       NUMERIC(10,3) NOT NULL DEFAULT 0,
  qty_rework_mt      NUMERIC(10,3) NOT NULL DEFAULT 0,
  -- When
  production_start   TIMESTAMPTZ NOT NULL,
  production_end     TIMESTAMPTZ NOT NULL,
  actual_run_min     INTEGER NOT NULL,
  actual_setup_min   INTEGER NOT NULL,
  -- Who
  operator_id        TEXT NOT NULL,
  supervisor_id      TEXT,
  confirmed_by       TEXT NOT NULL,                             -- 'system_auto' | 'supervisor_override'
  confirmed_at       TIMESTAMPTZ DEFAULT now(),
  -- Coils
  coils_consumed     JSONB NOT NULL,                            -- [{"coil_id":"...","qty_mt":...}]
  -- SAP linkage
  sap_sync_status    TEXT NOT NULL DEFAULT 'PENDING',           -- PENDING | RETRYING | SUCCESS | FAILED
  sap_doc_ref        TEXT,                                      -- SAP confirmation number
  sap_last_attempt   TIMESTAMPTZ,
  sap_attempts       INTEGER DEFAULT 0,
  sap_error          TEXT,
  -- Corrections
  superseded_by      UUID REFERENCES m7_performance.production_confirmations,
  correction_reason  TEXT,
  is_active          BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_pc_wo             ON m7_performance.production_confirmations (wo_id);
CREATE INDEX idx_pc_sap_pending
  ON m7_performance.production_confirmations (sap_sync_status)
  WHERE sap_sync_status IN ('PENDING', 'RETRYING');
CREATE INDEX idx_pc_shift
  ON m7_performance.production_confirmations (wc_id, shift_date, shift)
  WHERE is_active = TRUE;

-- =======================================================
-- PLAN-VS-ACTUAL VARIANCE — per scheduled operation
-- =======================================================
CREATE TABLE m7_performance.plan_actual_variance (
  variance_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  op_id              UUID NOT NULL,                             -- FK hint to m4_schedule.scheduled_operations
  wo_id              TEXT NOT NULL,
  wc_id              TEXT NOT NULL,
  schedule_id        UUID NOT NULL,
  -- Planned (from M4)
  planned_setup_start TIMESTAMPTZ,
  planned_setup_end   TIMESTAMPTZ,
  planned_prod_start  TIMESTAMPTZ,
  planned_prod_end    TIMESTAMPTZ,
  planned_setup_min   INTEGER,
  planned_prod_min    INTEGER,
  planned_qty_mt      NUMERIC(10,3),
  -- Actual (from M6)
  actual_setup_start  TIMESTAMPTZ,
  actual_setup_end    TIMESTAMPTZ,
  actual_prod_start   TIMESTAMPTZ,
  actual_prod_end     TIMESTAMPTZ,
  actual_setup_min    INTEGER,
  actual_prod_min     INTEGER,
  actual_qty_mt       NUMERIC(10,3),
  -- Variance
  setup_variance_min  INTEGER GENERATED ALWAYS AS
    (actual_setup_min - planned_setup_min) STORED,
  prod_variance_min   INTEGER GENERATED ALWAYS AS
    (actual_prod_min - planned_prod_min) STORED,
  start_delay_min     INTEGER GENERATED ALWAYS AS
    (EXTRACT(EPOCH FROM (actual_prod_start - planned_prod_start))/60) STORED,
  qty_variance_mt     NUMERIC(10,3) GENERATED ALWAYS AS
    (actual_qty_mt - planned_qty_mt) STORED,
  -- Attribution
  primary_variance_reason TEXT,                                 -- 'setup_longer' | 'breakdown' | 'quality_hold' etc.
  computed_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_pav_wc_time ON m7_performance.plan_actual_variance (wc_id, actual_prod_end DESC);
CREATE INDEX idx_pav_schedule ON m7_performance.plan_actual_variance (schedule_id);

-- =======================================================
-- SHIFT SUMMARIES — the end-of-shift rollup
-- =======================================================
CREATE TABLE m7_performance.shift_summaries (
  summary_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wc_id              TEXT NOT NULL,
  shift_date         DATE NOT NULL,
  shift              CHAR(1) NOT NULL,
  shift_start        TIMESTAMPTZ NOT NULL,
  shift_end          TIMESTAMPTZ NOT NULL,
  -- Totals
  production_mt      NUMERIC(10,3) NOT NULL DEFAULT 0,
  scrap_mt           NUMERIC(10,3) NOT NULL DEFAULT 0,
  target_mt          NUMERIC(10,3),
  attainment_pct     NUMERIC(5,2),
  setup_total_min    INTEGER NOT NULL DEFAULT 0,
  downtime_total_min INTEGER NOT NULL DEFAULT 0,
  breakdown_min      INTEGER NOT NULL DEFAULT 0,
  -- OEE
  oee_pct            NUMERIC(5,2),
  availability_pct   NUMERIC(5,2),
  performance_pct    NUMERIC(5,2),
  quality_pct        NUMERIC(5,2),
  -- Counts
  wo_completed       INTEGER NOT NULL DEFAULT 0,
  reject_count       INTEGER NOT NULL DEFAULT 0,
  -- Top issues (JSONB for flexibility)
  top_downtime_categories JSONB,                                -- [{"category":"material_wait","minutes":42}, ...]
  top_reject_categories JSONB,
  -- Narrative
  supervisor_notes   TEXT,
  handover_id        UUID,                                      -- FK hint to m6_dispatch.shift_handovers
  -- Lifecycle
  status             TEXT NOT NULL DEFAULT 'provisional',       -- 'provisional' | 'final'
  finalised_at       TIMESTAMPTZ,
  UNIQUE (wc_id, shift_date, shift)
);

-- =======================================================
-- DOWNTIME PARETO CACHE — fast rollup for dashboards
-- Refreshed on every stoppage_ended event via trigger
-- =======================================================
CREATE TABLE m7_performance.downtime_pareto_cache (
  wc_id              TEXT NOT NULL,
  bucket_granularity TEXT NOT NULL,
  bucket_start       TIMESTAMPTZ NOT NULL,
  reason_category    TEXT NOT NULL,
  total_min          INTEGER NOT NULL,
  incident_count     INTEGER NOT NULL,
  PRIMARY KEY (wc_id, bucket_granularity, bucket_start, reason_category)
);

CREATE INDEX idx_dpc_latest
  ON m7_performance.downtime_pareto_cache (wc_id, bucket_granularity, bucket_start DESC);

-- =======================================================
-- SETUP TIME TREND — weekly roll-up of avg setup by category
-- =======================================================
CREATE TABLE m7_performance.setup_time_trend (
  wc_id              TEXT NOT NULL,
  week_start         DATE NOT NULL,
  grade_change       BOOLEAN NOT NULL,
  gauge_step         TEXT NOT NULL,
  width_step         TEXT NOT NULL,
  roll_change        BOOLEAN NOT NULL,
  sample_count       INTEGER NOT NULL,
  avg_setup_min      NUMERIC(6,2) NOT NULL,
  median_setup_min   NUMERIC(6,2) NOT NULL,
  p95_setup_min      NUMERIC(6,2) NOT NULL,
  PRIMARY KEY (wc_id, week_start, grade_change, gauge_step, width_step, roll_change)
);

-- =======================================================
-- SCHEDULE ADHERENCE — one row per schedule with rollup
-- =======================================================
CREATE TABLE m7_performance.schedule_adherence (
  schedule_id        UUID PRIMARY KEY,
  wc_id              TEXT NOT NULL,
  shift_date         DATE NOT NULL,
  shift              CHAR(1) NOT NULL,
  total_ops          INTEGER NOT NULL,
  on_time_ops        INTEGER NOT NULL,                           -- started within 30 min of planned
  delayed_ops        INTEGER NOT NULL,
  advanced_ops       INTEGER NOT NULL,                           -- started earlier than planned
  cancelled_ops      INTEGER NOT NULL,
  avg_delay_min      NUMERIC(6,2),
  adherence_pct      NUMERIC(5,2) NOT NULL,
  calculated_at      TIMESTAMPTZ DEFAULT now()
);

-- =======================================================
-- Configuration
-- =======================================================
CREATE TABLE m7_performance.config (
  config_key         TEXT PRIMARY KEY,
  config_value       JSONB NOT NULL,
  updated_by         TEXT,
  updated_at         TIMESTAMPTZ DEFAULT now()
);

-- Seeded:
-- ('oee_recompute_window_hours', '24')       -- until how long after a shift we recompute
-- ('shift_target_mt', '{"CRS-1":95,"CRS-2":78,"CRS-3":88}')
-- ('on_time_threshold_minutes', '30')
-- ('sap_confirm_auto_trigger', 'true')       -- auto on production_completed?
-- ('sap_confirm_requires_supervisor', 'false') -- or require supervisor sign-off?
-- ('downtime_recompute_cadence', 'event_driven')

### 3.2 Design Notes

**Why TimescaleDB hypertable for**** ****kpi_snapshots****.** Query patterns are overwhelmingly time-range-bound: “show me OEE for CRS-2 for the last 30 days by day.” Timescale’s chunk pruning makes these queries near-instant. Hero Steels at full scale: ~200 snapshots/day × 365 days × 3 years = ~220K rows — small, but the partitioning pays back in dashboard latency predictability.

**Why**** ****production_confirmations**** ****is immutable + supersession.** SAP confirmations are effectively contracts — once submitted, they have financial consequences. Corrections create a new confirmation with superseded_by link, leaving a full audit chain. SAP itself may reject a correction; the link lets us reconstruct who tried what, when, and why.

**Why materialised aggregates (shift_summaries, downtime_pareto_cache, setup_time_trend).** Dashboard queries must be fast (§9.13). Computing “yesterday’s shift summary” by aggregating a million execution events every render would be a nightmare. Materialising at event time — maintaining aggregates as events flow in — makes the dashboard feel instantaneous.

**Why**** ****is_final**** ****and**** ****calculation_version**** ****on snapshots.** OEE calculation logic may evolve. Some snapshots are computed in real-time with incomplete data, then recomputed when the shift closes. The fields let us:

- Distinguish in-progress snapshots from finalised ones

- Re-run historical data with a new calculation version without corrupting history

- Compare v1 to v2 outputs side-by-side during migration

**Why schedule_adherence is a separate table.** Adherence is per-schedule, not per-bucket. Different granularity. Separate analytical question. Keeps kpi_snapshots clean.

### 3.3 Retention

- **kpi_snapshots** — 2 years at shift granularity (~200K rows), 5 years at day, permanent at week/month — TimescaleDB’s continuous aggregates handle compaction

- **production_confirmations** — 7 years (SAP-aligned retention; regulatory)

- **plan_actual_variance** — 1 year hot, 5 years warm

- **shift_summaries** — 2 years hot, 7 years warm (managerial history)

- **downtime_pareto_cache** — 1 year hot (rebuildable from events if needed)

- **setup_time_trend** — 3 years hot (long trend needed for program review)

- **schedule_adherence** — aligned with schedules (30 days hot, 1 year warm)

## 4. Event Schemas

### 4.1 Events M7 Publishes

#### production.wo.confirmed (v1.0)

Published on every successful production confirmation creation. Downstream: M1 (WO status to complete), M5a (coil consumption), M8 (energy allocation).

{
  "event_type": "production.wo.confirmed",
  "aggregate_id": "wo_8893451",
  "payload": {
    "confirmation_id": "...",
    "wo_id": "wo_8893451",
    "wc_id": "CRS-2",
    "shift_date": "2026-04-18",
    "shift": "A",
    "qty_good_mt": 18.32,
    "qty_scrap_mt": 0.21,
    "production_start": "2026-04-18T09:45:00Z",
    "production_end": "2026-04-18T12:03:00Z",
    "actual_run_min": 138,
    "actual_setup_min": 142,
    "coils_consumed": [{"coil_id": "coil_HR_298451", "qty_mt": 18.53}]
  }
}

#### performance.kpi_snapshot.computed (v1.0)

Published every time a snapshot is written (every 15 min or on event trigger). Downstream: UI refresh, alerting.

{
  "event_type": "performance.kpi_snapshot.computed",
  "aggregate_id": "CRS-2_shift_A_2026-04-18",
  "payload": {
    "wc_id": "CRS-2",
    "bucket_granularity": "shift",
    "bucket_start": "2026-04-18T06:00:00Z",
    "oee_pct": 62.4,
    "availability_pct": 78.5,
    "performance_pct": 92.1,
    "quality_pct": 86.3,
    "qty_good_mt": 38.2,
    "target_mt": 78.0,
    "attainment_pct": 49.0,
    "is_final": false
  }
}

#### performance.oee.low_alert (v1.0)

Published when a shift’s OEE drops below threshold. Downstream: Ops notification.

{
  "event_type": "performance.oee.low_alert",
  "aggregate_id": "CRS-2_shift_A_2026-04-18",
  "payload": {
    "wc_id": "CRS-2",
    "shift_date": "2026-04-18",
    "shift": "A",
    "oee_pct": 38.2,
    "threshold_pct": 50.0,
    "breakdown_pct": 41.0,
    "primary_loss": "breakdown_extended"
  }
}

#### performance.sap.confirm_failed (v1.0)

Published when a SAP confirmation write fails after retries.

#### performance.shift.summary_computed (v1.0)

Published when a shift’s summary is finalised (5 min after shift end).

#### performance.variance.detected (v1.0)

Published when plan-vs-actual variance exceeds threshold (e.g., setup 30 min over plan).

### 4.2 Events M7 Consumes

| Event | From | M7 Behaviour |
| --- | --- | --- |
| floor.production.completed | M6 | Create production_confirmation; trigger SAP write; update plan_actual_variance; trigger KPI recompute |
| floor.setup.ended | M6 | Update plan_actual_variance; update setup_time_trend (weekly rollup) |
| floor.stoppage.started / .ended | M6 | Update downtime_pareto_cache; trigger KPI recompute |
| floor.reject.raised | M6 | Update reject counts in snapshots |
| floor.shift.handover_submitted | M6 | Trigger shift_summary generation (5 min later) |
| plan.schedule.published | M4 | Seed planned values in plan_actual_variance |
| plan.schedule.computed | M4 | Track schedule versions for adherence analysis |
| energy.meter.reading | M8 (Phase 2) / M8-lite | Attribute energy to shifts and compute SEC |
| material.coil.consumed | M5a | Add to consumption data for yield analysis |

### 4.3 Event Volume

At Hero Steels:

- KPI snapshot events: ~800/day (3 lines × 4 granularities × 96 recomputes + on-event triggers)

- Production confirmations: ~10–15/day (one per completed WO)

- Summary events: 9/day

- Variance events: ~20–30/day

- OEE alerts: ~0–3/day

Total M7 outbound: ~850 events/day. M7 is event-heavy on the output side, matching its analytics role.

## 5. Ingestion Flow

M7 doesn’t ingest in the M1 / M5a sense. It **observes the event backbone** and transforms events into KPIs. Three input streams matter:

### 5.1 Event Subscriptions

M7 runs a set of consumer workers, each subscribing to specific topics:

class M7OEEWorker:
    subscribes_to = [
        'floor.production.started',
        'floor.production.completed',
        'floor.setup.started',
        'floor.setup.ended',
        'floor.stoppage.started',
        'floor.stoppage.ended',
        'floor.reject.raised',
    ]
    
    def handle(self, event):
        # Determine affected (wc_id, bucket) tuples
        affected_buckets = determine_affected(event)
        for wc_id, bucket_grain, bucket_start in affected_buckets:
            recompute_kpi_snapshot(wc_id, bucket_grain, bucket_start)

class M7ConfirmationWorker:
    subscribes_to = ['floor.production.completed']
    
    def handle(self, event):
        if config.sap_confirm_auto_trigger:
            create_and_queue_confirmation(event)

class M7VarianceWorker:
    subscribes_to = [
        'floor.setup.ended',
        'floor.production.completed',
    ]
    
    def handle(self, event):
        update_plan_actual_variance(event)

class M7ShiftSummaryWorker:
    subscribes_to = ['floor.shift.handover_submitted']
    
    def handle(self, event):
        schedule_summary_computation(event, delay=timedelta(minutes=5))

**Idempotency.** Every handler uses event_id as idempotency key. Re-processing an event produces the same state — critical for replay.

### 5.2 Input Freshness Requirements

| Input event | Max staleness tolerated for real-time OEE |
| --- | --- |
| floor.production.completed | 30 sec |
| floor.stoppage.started/ended | 30 sec |
| floor.setup.started/ended | 60 sec |
| energy.meter.reading | 5 min (M8 polls at 15-min cadence anyway) |

Dashboards display the snapshot_at timestamp so users know how fresh the data is. A “stale data” banner appears if the latest snapshot is older than 5 minutes.

### 5.3 Late Event Handling

Events arriving late (e.g., Andon terminal reconnects after offline period) trigger:

- **If within recompute window (24 hours default):** recompute the affected snapshot and publish an update

- **If outside window:** log as “retrospective event”; historical snapshot is NOT changed; a retrospective_corrections table tracks the discrepancy for audit

This pattern preserves the immutability of finalised KPIs while acknowledging that the floor is not synchronous.

## 6. Processing Logic

M7’s core computation is OEE. Everything else is a variation or precursor.

### 6.1 OEE Calculation — The Opinionated Reference

The single most-scrutinised algorithm in the platform. Documented explicitly here.

def compute_oee_snapshot(wc_id: str, bucket_start: datetime, bucket_end: datetime):
    """
    Compute OEE for a (wc_id, time bucket).
    Returns: AvailabilityPct, PerformancePct, QualityPct, OEE
    """
    events = load_events(wc_id, bucket_start, bucket_end)

    # === AVAILABILITY ===
    planned_min = compute_planned_production_time(wc_id, bucket_start, bucket_end)
    # planned = shift duration - scheduled breaks - planned PM (from M2 calendar + M5c)

    run_time_min = 0
    for prod_event_pair in pair_production_events(events):
        start = max(prod_event_pair.started, bucket_start)
        end = min(prod_event_pair.ended or bucket_end, bucket_end)
        run_time_min += (end - start).total_seconds() / 60

    availability_pct = (run_time_min / planned_min) * 100 if planned_min > 0 else 0

    # === PERFORMANCE ===
    qty_produced = sum(e.payload.qty_good_mt + e.payload.qty_scrap_mt 
                        for e in events if e.type == 'floor.production.completed')

    # Ideal = qty that WOULD have been produced running at rated rate for run_time
    # Weighted by which WOs ran in this bucket
    ideal_qty = 0
    for prod_event_pair in pair_production_events(events):
        wo = m1_client.get_wo(prod_event_pair.wo_id)
        rate = m2_client.get_std_rate_mt_hr(wo.material_code, wc_id)
        duration_min = min((prod_event_pair.ended or bucket_end), bucket_end) \
                        - max(prod_event_pair.started, bucket_start)
        ideal_qty += rate * (duration_min.total_seconds() / 3600)

    performance_pct = (qty_produced / ideal_qty) * 100 if ideal_qty > 0 else 0
    # Cap at 100 (can't beat ideal)
    performance_pct = min(performance_pct, 100)

    # === QUALITY ===
    qty_good = sum(e.payload.qty_good_mt for e in events if e.type == 'floor.production.completed')
    qty_total = sum(e.payload.qty_good_mt + e.payload.qty_scrap_mt
                    for e in events if e.type == 'floor.production.completed')

    quality_pct = (qty_good / qty_total) * 100 if qty_total > 0 else 0

    # === OEE ===
    oee_pct = (availability_pct / 100) * (performance_pct / 100) * (quality_pct / 100) * 100

    return OEESnapshot(
        wc_id=wc_id,
        bucket_start=bucket_start,
        bucket_end=bucket_end,
        planned_production_min=planned_min,
        run_time_min=run_time_min,
        availability_pct=round(availability_pct, 2),
        qty_produced_mt=qty_produced,
        qty_good_mt=qty_good,
        qty_scrap_mt=qty_total - qty_good,
        ideal_qty_mt=ideal_qty,
        performance_pct=round(performance_pct, 2),
        quality_pct=round(quality_pct, 2),
        oee_pct=round(oee_pct, 2),
    )

**Documented quirks and their rationale:**

- **Performance capped at 100%.** A line CAN run faster than rated rate (e.g., operator tuned for throughput). Capping prevents masking of a quality or setup loss elsewhere by an artificially high performance number. Rate discrepancies > 10% surface as a separate alert (“rate tuning opportunity”).

- **Planned breaks included in denominator.** Shift changeovers are expected production time losses — counting them reduces Availability, which is correct. Mid-shift breaks are handled via the M2 calendar.

- **Planned PM excluded from denominator.** PM is scheduled unavailability — the line was never supposed to run during it.

- **Setup is unavailability.** Setup reduces Availability. This is the aggressive standard — some plants compute “OEE during run only” which mask setup impact. M7 uses the conservative definition aligned with Nakajima / lean manufacturing standard.

- **Scrap vs. rework.** Scrap counts as bad quality. Rework counts as neither good nor scrap — it’s in a separate rework bucket. Reworked material, once successfully reprocessed, enters a new production event for that rework batch.

### 6.2 Bucket Determination

When an event arrives, which KPI snapshots does it affect?

For a floor.production.completed event occurring at 11:58 on 2026-04-18:

- Affects shift A (06:00–14:00) on that day

- Affects day 2026-04-18

- Affects week ending 2026-04-20 (Sunday)

- Affects month 2026-04

All four snapshots recompute. With Timescale and good indexing, this is ~50ms.

### 6.3 The Recompute Strategy

M7 uses **event-driven recompute + scheduled full recompute**:

**Event-driven.** When an event arrives, affected buckets recompute immediately. Fast, incremental.

**Scheduled full recompute.** Every 15 minutes, every open bucket is recomputed from scratch. This catches:

- Events that arrived out of order

- Late events beyond the event-driven window

- Any inconsistency from partial event processing

**Why both.** Event-driven gives sub-minute latency for the dashboard. Scheduled gives correctness guarantees — the KPI is always eventually consistent with the event log, even if a single event-driven recompute has a bug.

### 6.4 Production Confirmation Logic

def handle_production_completed(event):
    # Extract all data needed for SAP confirmation
    wo = m1_client.get_wo(event.payload.wo_id)
    dispatch_item = m6_client.get_dispatch_item(event.payload.dispatch_item_id)
    
    # Compute actual durations
    actual_run_min = event.occurred_at - event.payload.production_start_at
    actual_setup_min = dispatch_item.actual_setup_end - dispatch_item.actual_setup_start

    # Build confirmation
    conf = ProductionConfirmation(
        wo_id=wo.wo_id,
        wc_id=event.payload.wc_id,
        shift_date=derive_shift_date(event.occurred_at),
        shift=derive_shift(event.occurred_at),
        qty_good_mt=event.payload.qty_good_mt,
        qty_scrap_mt=event.payload.qty_scrap_mt,
        production_start=event.payload.production_start_at,
        production_end=event.occurred_at,
        actual_run_min=actual_run_min.total_seconds() / 60,
        actual_setup_min=actual_setup_min,
        operator_id=event.payload.operator_id,
        confirmed_by='system_auto' if config.sap_confirm_auto_trigger else 'pending_supervisor',
        coils_consumed=event.payload.coils_consumed,
        sap_sync_status='PENDING'
    )
    persist(conf)

    # Queue for SAP sync
    if config.sap_confirm_auto_trigger:
        queue_sap_confirmation_write(conf.id)

    # Update M1
    m1_client.update_wo_qty(wo.wo_id, qty_confirmed=event.payload.qty_good_mt)
    
    # Publish
    publish('production.wo.confirmed', conf)

**Supervisor sign-off option.** If config sap_confirm_requires_supervisor is true, confirmations enter state pending_supervisor and require an explicit approval API call before SAP write. Useful during pilot for trust-building; usually disabled in steady state.

### 6.5 Variance Attribution

When variance is detected, assign a primary reason:

def attribute_variance_reason(variance):
    # Step order: most specific to least specific
    if variance.setup_variance_min > 30:
        # Look at matrix misses during this setup
        if matrix_miss_during(variance.op_id):
            return 'setup_matrix_miss_conservative_default'
        if had_breakdown_during(variance):
            return 'setup_breakdown_during'
        return 'setup_longer_than_planned'
    
    if variance.start_delay_min > 30:
        predecessor = m4_client.get_predecessor(variance.op_id)
        if predecessor and predecessor.actual_prod_end > predecessor.planned_prod_end:
            return 'predecessor_overrun'
        if had_material_delay(variance):
            return 'material_delay'
        return 'planner_rescheduled'
    
    if variance.qty_variance_mt < -variance.planned_qty_mt * 0.1:
        if had_rejects(variance):
            return 'quality_reject'
        if had_coil_exhaust(variance):
            return 'coil_exhausted_early'
        return 'underrun_other'
    
    if variance.prod_variance_min > 20:
        if had_stoppage_during(variance):
            return 'stoppage_during_run'
        return 'derated_operation'
    
    return 'within_tolerance'

Attribution is advisory, not authoritative — planner can override. Feeds improvement-focus decisions.

### 6.6 Shift Summary Generator

Runs 5 minutes after shift end (allows late events to arrive).

def generate_shift_summary(wc_id: str, shift_date: date, shift: str):
    snapshot = load_shift_kpi_snapshot(wc_id, shift_date, shift)
    events = load_shift_events(wc_id, shift_date, shift)
    
    # Compute top downtime categories
    downtime_by_cat = aggregate_downtime_by_category(events)
    top_downtime = sorted(downtime_by_cat, key=lambda x: -x.minutes)[:3]
    
    # Compute top reject categories (placeholder until M5b)
    rejects_by_cat = aggregate_rejects_by_category(events)
    top_rejects = sorted(rejects_by_cat, key=lambda x: -x.count)[:3]
    
    # Pull handover
    handover = m6_client.get_handover(wc_id, shift_date, shift)
    
    summary = ShiftSummary(
        wc_id=wc_id,
        shift_date=shift_date,
        shift=shift,
        shift_start=snapshot.bucket_start,
        shift_end=snapshot.bucket_end,
        production_mt=snapshot.qty_good_mt,
        scrap_mt=snapshot.qty_scrap_mt,
        target_mt=get_target(wc_id, shift),
        attainment_pct=compute_attainment(snapshot.qty_good_mt, target_mt),
        setup_total_min=snapshot.setup_min,
        downtime_total_min=snapshot.downtime_min,
        breakdown_min=snapshot.breakdown_min,
        oee_pct=snapshot.oee_pct,
        availability_pct=snapshot.availability_pct,
        performance_pct=snapshot.performance_pct,
        quality_pct=snapshot.quality_pct,
        wo_completed=snapshot.wo_completed_count,
        reject_count=snapshot.reject_count,
        top_downtime_categories=top_downtime,
        top_reject_categories=top_rejects,
        supervisor_notes=handover.machine_state_note if handover else None,
        handover_id=handover.id if handover else None,
        status='final'
    )
    persist(summary)
    publish('performance.shift.summary_computed', summary)

### 6.7 Low-OEE Alert

When a shift closes with OEE below a threshold (default 50%, configurable per line):

- Alert sent to supervisor + planner + plant head

- Primary loss identified (whichever component is lowest)

- Top 3 downtime causes included in alert

Used to drive the next-day continuous-improvement conversation.

## 7. Storage Strategy

### 7.1 TimescaleDB Hypertable Configuration

-- kpi_snapshots is a Timescale hypertable with weekly chunks
-- Continuous aggregates (Timescale feature) for common rollups:
CREATE MATERIALIZED VIEW m7_performance.oee_daily_agg
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 day', snapshot_at) AS day,
    wc_id,
    AVG(oee_pct) AS avg_oee,
    AVG(availability_pct) AS avg_availability,
    AVG(performance_pct) AS avg_performance,
    AVG(quality_pct) AS avg_quality,
    SUM(qty_good_mt) AS total_produced_mt
FROM m7_performance.kpi_snapshots
WHERE bucket_granularity = 'shift'
GROUP BY day, wc_id;

SELECT add_continuous_aggregate_policy('m7_performance.oee_daily_agg',
    start_offset => INTERVAL '30 days',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour');

Similar continuous aggregates for:

- Weekly OEE (rolls up daily)

- Monthly OEE (rolls up weekly)

- SEC trend

- Setup time trend by category

These aggregates auto-refresh on the Timescale schedule.

### 7.2 Compression

Timescale compression enabled on kpi_snapshots after 30 days:

ALTER TABLE m7_performance.kpi_snapshots SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'wc_id'
);

SELECT add_compression_policy('m7_performance.kpi_snapshots', INTERVAL '30 days');

At Hero Steels scale, compression saves ~80% disk for old data.

### 7.3 Indexing

Beyond the hypertable structure:

- idx_pc_sap_pending partial index on production_confirmations — supports the SAP sync worker’s poll

- idx_kpi_wc_bucket_time — dashboard primary query path

- idx_dpc_latest — Pareto latest snapshot query

### 7.4 Hot / Warm / Cold

| Data | Hot (Postgres) | Warm (MinIO) | Cold |
| --- | --- | --- | --- |
| kpi_snapshots — shift | 2 years (compressed after 30d) | Continuous aggregates live forever | — |
| kpi_snapshots — day/week/month | Permanent via aggregates | — | — |
| production_confirmations | 7 years | — | — (long retention critical for SAP reconciliation) |
| plan_actual_variance | 1 year | 5 years | — |
| shift_summaries | 2 years | 7 years | — |
| downtime_pareto_cache | 1 year | — | — (rebuildable from events) |
| setup_time_trend | 3 years | — | — |

## 8. API Surface

All endpoints at /api/m7/*.

### 8.1 Read APIs

#### GET /api/m7/kpi/live

Real-time KPI snapshot across all lines. Used by supervisor dashboard.

**Response:**

{
  "as_of": "2026-04-18T11:30:00Z",
  "lines": [
    {
      "wc_id": "CRS-2",
      "shift": "A",
      "oee_pct": 62.4,
      "availability_pct": 78.5,
      "performance_pct": 92.1,
      "quality_pct": 86.3,
      "production_mt": 38.2,
      "target_mt": 78.0,
      "attainment_pct": 49.0,
      "minutes_elapsed": 330,
      "minutes_remaining": 150
    },
    /* ... */
  ]
}

#### GET /api/m7/kpi/trend

Time-series KPI data for charts.

**Query params:** wc_id, granularity (shift/day/week/month), metric (oee/availability/performance/quality/sec), from, to.

#### GET /api/m7/shift-summary/{wc_id}/{shift_date}/{shift}

Full shift summary.

#### GET /api/m7/downtime-pareto

Downtime Pareto for a period.

**Query params:** wc_id, from, to.

**Response:**

{
  "total_downtime_min": 212,
  "categories": [
    {"category": "breakdown", "minutes": 88, "incidents": 2, "pct": 41.5},
    {"category": "material_wait", "minutes": 62, "incidents": 3, "pct": 29.2},
    {"category": "tool_change", "minutes": 42, "incidents": 1, "pct": 19.8},
    /* ... */
  ]
}

#### GET /api/m7/setup-trend

Setup time trend chart data.

**Query params:** wc_id, grade_change (bool), gauge_step, from, to.

#### GET /api/m7/schedule-adherence/{schedule_id}

Adherence analysis for a specific schedule.

#### GET /api/m7/plan-actual-variance

Variance data for a period/line.

#### GET /api/m7/production-confirmations

List of confirmations with filters (SAP status, date range, WO).

#### GET /api/m7/sec-trend

Specific Energy Consumption over time.

#### GET /api/m7/daily-rollup/{date}

Single-day rollup for plant head dashboard.

#### GET /api/m7/weekly-rollup/{week_start}

Weekly rollup pack — used by Monday management review PDF.

### 8.2 Write APIs

#### POST /api/m7/production-confirmations/{id}/approve

Supervisor approval (when config requires it). Required role: supervisor.

#### POST /api/m7/production-confirmations/{id}/correct

Create a correcting confirmation that supersedes the original. Required role: planner or supervisor. Audited.

#### POST /api/m7/production-confirmations/{id}/retry-sap

Manual retry of a failed SAP sync. Required role: sap_admin.

#### POST /api/m7/shift-summary/{id}/notes

Supervisor adds narrative notes to a shift summary.

### 8.3 Admin APIs

- POST /api/m7/kpi/recompute — force a KPI recompute for a bucket (debugging)

- PUT /api/m7/config — update thresholds, weights, etc.

- GET /api/m7/diagnostics — worker lag, calculation latency, SAP sync status

### 8.4 Export APIs

- GET /api/m7/export/weekly-pack.pdf — generate weekly management review PDF

- GET /api/m7/export/monthly-pack.pdf — generate monthly production pack

- GET /api/m7/export/shift-summary.pdf — printable shift summary

- GET /api/m7/export/kpi-data.xlsx — raw data export for ad-hoc analysis

### 8.5 Rate Limits

- Live / trend reads: 600/min/user

- Export: 60/hour/user (PDF generation is expensive)

- Correction writes: 60/min/user (intentionally low — corrections should be deliberate)

## 9. UI/UX Specification

M7 contributes multiple dashboards to the Ops Console serving multiple personas.

### 9.1 Screen — Live Line KPIs (Supervisor)

Target persona: Shift Supervisor (JTBD-1).

Layout: Three prominent cards (one per line) showing:

- Line name (CRS-1/2/3)

- Current shift

- Large OEE number (color-coded: >75% green, 50–75% amber, <50% red)

- A/P/Q decomposition (three small gauges)

- Production MT vs. target (progress bar)

- Elapsed time / remaining time

- Status (running / stopped / setup)

Updates every 15 seconds. Click card → drill into line detail.

### 9.2 Screen — Shift Review

Target persona: Supervisor + Planner (JTBD-2, JTBD-3).

Full end-of-shift rollup. Print/export-ready.

- Top: KPI banner (production, scrap, OEE, downtime)

- Downtime Pareto chart (horizontal bar chart, top 5 categories)

- Timeline view: Gantt-style actual vs. planned for each dispatch item, with delay annotations

- Reject list with photo thumbnails (if captured)

- Variance summary: avg setup variance, avg start delay

- Supervisor notes section (editable post-shift)

### 9.3 Screen — Daily Plant Dashboard

Target persona: Head of Manufacturing / Plant Head (JTBD-6).

Layout (single scroll):

- Top: Yesterday’s headline KPIs (production MT vs. target, plant OEE, downtime total)

- Three line cards (mini version of live): yesterday’s OEE + top issue

- Top 3 downtime causes across the plant

- Top 3 quality issues

- Today’s schedule risk: any WOs at-risk of late delivery

- Link to detailed weekly/monthly packs

Updates on load, ~08:00 trigger pulls overnight data. 60-second read.

### 9.4 Screen — OEE Trend

Time-series chart for a line.

- Line chart with OEE and its three components

- Configurable granularity (shift / day / week / month)

- Configurable range (7/30/90/180 days)

- Annotations for major events (breakdowns, PM windows)

- Hover reveals detailed breakdown for any point

### 9.5 Screen — Setup Time Trend

Target persona: Planner (JTBD-4).

Critical for proving scheduler and SMED program value.

- Line chart: avg setup minutes per week per changeover category

- Separate lines for grade-change, gauge-change, roll-change transitions

- Regression line showing trend

- Annotation of significant matrix updates (learning points)

- Side panel: most time-consuming transitions this week

### 9.6 Screen — Schedule Adherence

Target persona: Planner (JTBD-5).

- Per-schedule breakdown: on-time %, delay causes

- Worst delays highlighted with jump-to-variance-detail

- Trend of adherence % over time

### 9.7 Screen — Weekly Management Pack

Target persona: Head of Manufacturing (JTBD-7).

One-click PDF export. Contents:

- Executive summary (plant OEE, total production, setup savings)

- OEE trend chart

- Production vs. target by line

- Top 10 downtime incidents of the week

- Top 10 quality issues

- Schedule adherence summary

- SEC trend

- Improvement actions register (manually maintained in a note field)

### 9.8 Screen — Production Confirmation Monitor

Target persona: SAP admin / Plant IT (JTBD-10).

- Table: pending / retrying / failed confirmations

- Filter: date range, line, status, error category

- Each row: WO, qty, age, last error, retry button

- Summary chart: sync latency p50/p95

### 9.9 Screen — CFO Monthly Production Pack

Target persona: CFO (JTBD-8, JTBD-9).

- Month’s production MT (Zedral-measured vs. SAP-confirmed)

- Reconciliation table: variances by line

- SEC trend (Q-over-Q, with cost at current tariff)

- Cost-of-quality estimate (scrap + rework ₹)

- Capacity utilisation vs. headroom

### 9.10 Embedded Component — KPI Badge

Small component reused in other modules (M1 WO detail, M3 capacity, M4 schedule diff). Shows current/recent OEE for a line with color-coded status.

### 9.11 Performance SLOs

- Live dashboard load: < 600ms p95

- Shift review load: < 1s p95

- OEE trend (30-day range): < 1.5s p95

- PDF export (weekly pack): < 30s

- Excel export: < 20s

### 9.12 Accessibility

- Color-blind palette option for OEE gauges

- Full keyboard navigation

- Screen reader support for all charts (tabular alt-representations)

- Print-safe layouts for PDF exports

### 9.13 The Critical Freshness Principle

Every screen shows:

- The **bucket time** (e.g., “Shift A, 2026-04-18, 06:00–14:00”)

- The **snapshot timestamp** (“Data as of 12:15, 3 min ago”)

- A **provisional indicator** if the bucket is not yet final

Nothing is more damaging to trust than a supervisor seeing “OEE = 58%” without knowing whether that’s from 5 minutes ago or 5 hours ago. The freshness indicator is mandatory, not aesthetic.

## 10. Integration with Other Modules

### 10.1 M7 ← M6 (Dispatch) — Event-Driven

The largest consumer relationship in the platform. M7 subscribes to nearly every M6 event.

### 10.2 M7 ← M4 (Scheduler) — Event-Driven

Plan data for variance computation and adherence tracking.

### 10.3 M7 ← M1 (Demand) — Read

WO context enrichment. M7 queries M1 for customer, material, priority when building confirmations and summaries.

### 10.4 M7 ← M2 (Master Data) — Read

Std run rates from routings (for Performance calculation). Emission factors (for SEC-to-emissions enrichment consumed by M8).

### 10.5 M7 ← M5a (Material) — Read + Event

Coil consumption details for confirmation payload. material.coil.consumed events close the loop on qty consumed.

### 10.6 M7 ← M8 (Energy) — Event

Meter readings attributed to shifts for SEC. energy.meter.reading events aggregated per bucket.

### 10.7 M7 → M1 (Demand) — Event + Write

production.wo.confirmed triggers M1’s WO status transition to complete. M7 also writes qty_confirmed back directly via API.

### 10.8 M7 → M5a (Material) — Event-Driven

Confirmation event triggers M5a to mark coils as consumed.

### 10.9 M7 → M8 (Energy) — Read

M8 queries M7 for production tonnage per shift/day for SEC denominator.

### 10.10 M7 ↔ SAP — See §11

## 11. SAP Bidirectional Mapping

### 11.1 Outbound — Production Confirmation (The Critical Path)

This is **the single most important SAP write-back in the platform**. If this fails, SAP doesn’t know what the plant produced, and the finance module cannot recognise revenue.

**SAP Service:** ProductionOrder_SRV with confirmation extension.

**SAP Movement Types posted:**

- 101 — Goods Receipt for FG produced (the primary confirmation)

- 261 — Goods Issue of consumed coil (coordinated with M5a’s consumption event)

**Payload mapping:**

| Zedral field | SAP field | Notes |
| --- | --- | --- |
| wo_id | AUFNR | with ‘wo_’ prefix stripped |
| wc_id | ARBPL | work centre |
| qty_good_mt | LMNGA (yield qty) | converted MT → KG |
| qty_scrap_mt | XMNGA (scrap qty) |  |
| production_start | BUDAT (posting date) |  |
| actual_run_min | custom Z-field | activity-type-based |
| actual_setup_min | custom Z-field |  |
| operator_id | ERFNAM (created by) |  |

**Flow:**

- M7 creates production_confirmation with status PENDING

- SAP Sync Worker polls every 30s for PENDING confirmations

- Attempts SAP OData POST; retry with exponential backoff (3 attempts)

- On success: status SUCCESS, SAP doc ref stored

- On failure: status FAILED, alert raised

**Correction flow:**

If a confirmation is corrected in Zedral (e.g., supervisor finds an error in reported qty), the correction is:

- Create new production_confirmation superseding the original

- If original was already SAP-synced: post a reversal (SAP 102 / 262) followed by the new confirmation

- If original still PENDING: cancel and replace

**SAP Basis extension requirement.** The standard ProductionOrder_SRV doesn’t always support write confirmation with all the fields Zedral wants. A custom extension is required. This is on the critical path for pilot go-live, same as M1’s Basis requirement — **raise with Hero Steels’ Basis team in Phase 0** for 6-week lead time.

### 11.2 Reconciliation

Nightly job at 03:00:

SELECT SUM(qty_good_mt) FROM m7_performance.production_confirmations
WHERE shift_date = yesterday AND sap_sync_status = 'SUCCESS'

vs.

SAP MB51 movements type=101 for shift_date=yesterday

Drift > 0.1 MT triggers a reconciliation alert.

### 11.3 SAP Failure Modes

Covered in §12.

## 12. Failure Modes & Recovery

### 12.1 KPI Calculation Failures

| Mode | Detection | Recovery |
| --- | --- | --- |
| Division by zero (no run time in bucket) | Guard condition | Return 0% with flag; don’t crash |
| Late event arriving after bucket finalised | Retrospective_corrections table | Log; original stays; planner can manually trigger recompute if material |
| Event out of order | Idempotent handler | Handled transparently; bucket eventually recomputes correctly |
| Std rate missing for material | NULL JOIN | Log; compute performance without this event’s contribution; alert master data team |
| Events span shift boundary imprecisely | Time-window arithmetic | Proportional attribution (e.g., event 05:50 → 06:10 splits across shift C and A) |

### 12.2 SAP Sync Failures

| Mode | Detection | Recovery |
| --- | --- | --- |
| SAP unreachable | Standard SAP client error | Exponential backoff; confirmations queue in PENDING/RETRYING |
| SAP rejects payload (semantic) | HTTP 400 with error code | Mark FAILED; alert sap_admin; planner manually resolves (often requires master data fix) |
| Duplicate confirmation (same WO confirmed twice) | SAP returns “already confirmed” | Check if our prior confirmation was actually successful; if so, mark this one as superseded-pre-creation |
| Partial confirmation (SAP accepts 101 but rejects 261) | Atomicity issue | Compensating transaction — reverse the 101 if 261 fails; alert |
| SAP confirmation number changes retrospectively | Unusual; can happen with cancellations | Track via SAP doc ref in audit |
| Reconciliation drift | Nightly job | Surface in dashboard; investigate |

### 12.3 Data Integrity Failures

| Mode | Detection | Recovery |
| --- | --- | --- |
| Production confirmed with no prior setup event | Validation | Still process — setup may have been manually recorded; surface as anomaly |
| Confirmed qty > planned qty (major overrun) | Anomaly detection | Accept but flag; SAP may reject; planner review |
| Negative OEE (shouldn’t happen) | Sanity check | Log as critical bug; return 0; alert engineering |
| A/P/Q component > 100% or < 0% | Sanity check | Cap at bounds; log as anomaly |

### 12.4 Performance Failures

| Mode | Detection | Recovery |
| --- | --- | --- |
| Dashboard queries slow | Prometheus query latency | Materialised view refresh; continuous aggregate catch-up; index analysis |
| KPI recompute worker backlog | Kafka consumer lag | Scale workers; skip scheduled full-recompute if event-driven is keeping up |
| PDF export times out | Worker timeout | Split by section; cache common sections; async generation with email delivery on completion |

### 12.5 Audit / Compliance Failures

| Mode | Detection | Recovery |
| --- | --- | --- |
| Correction chain broken (superseded_by loop or missing link) | Consistency check | DB-level constraint prevents; application-level check on write |
| Retention deletion of still-active data | Archival sanity check | Dry-run mode; human approval before destructive action |
| Audit trail tampering attempt | Tamper-detection via daily hashes (Phase 0 §8.2) | Forensic workflow, notification to compliance officer |

## 13. Acceptance Criteria

### 13.1 Functional

- ☐ OEE calculated correctly per shift per line per day per week per month

- ☐ All six edge cases from §1.5 (partial shifts, cross-shift jobs, derated operation, scrap reworked later, multi-coil consumption, late event arrival, retrospective correction) produce correct results

- ☐ Production confirmations created automatically on floor.production.completed

- ☐ SAP write-back succeeds for ≥ 99% of confirmations (excluding semantic failures)

- ☐ Plan-vs-actual variance computed for every scheduled operation

- ☐ Variance attribution logic produces sensible classifications

- ☐ Shift summaries generated within 5 min of shift end

- ☐ Downtime Pareto cache stays fresh

- ☐ Setup time trend weekly rollup correct

- ☐ OEE alerts fire when below threshold

- ☐ Weekly and monthly PDF packs generate correctly

- ☐ All events publish per schema

- ☐ Nightly SAP reconciliation detects drift

### 13.2 Non-Functional

- ☐ Dashboard queries p95 < 600ms

- ☐ KPI recompute completes < 1s per bucket

- ☐ PDF export < 30s

- ☐ Event processing lag < 30s p95

- ☐ Hypertable compression saves ≥ 70% disk after 30-day aging

- ☐ All standard + module-specific Prometheus metrics emitted

- ☐ All RBAC enforced

### 13.3 Pilot Validation

- ☐ Supervisor JTBDs 1–2 validated by pilot supervisors

- ☐ Planner JTBDs 3–5 validated by pilot planner

- ☐ Head of Manufacturing JTBDs 6–7 validated with Monday management reviews

- ☐ CFO JTBDs 8–9 validated with pilot CFO / controller review

- ☐ 30-day pilot: production confirmation SAP sync success rate ≥ 99%

- ☐ 30-day pilot: Zedral-computed production MT agrees with SAP-confirmed within 1%

- ☐ 30-day pilot: OEE trend visibly usable for supervisor’s improvement conversations

- ☐ Setup time trend by month 6 shows ≥ 15% reduction (the fundamental pilot KPI)

### 13.4 Documentation

- ☐ OpenAPI spec

- ☐ Event schemas in Apicurio

- ☐ Detailed OEE calculation reference document (for auditors and stakeholders — the “how we compute OEE” explainer)

- ☐ Runbooks: SAP confirmation failure, KPI recompute stuck, dashboard slow

- ☐ Supervisor / planner / plant head user guides

- ☐ CFO monthly pack explainer

### 13.5 Rollback Plan

If M7 fails post-go-live:

- Supervisors fall back to paper log for shift KPI visibility

- Production confirmations queue in Zedral; replay on M7 recovery with SAP catch-up

- Worst case: daily manual SAP confirmation by SAP admin using M6 raw event data

- Recovery: standard Zedral Update rollback

## 14. Build Plan

### 14.1 Phases

| Sub-phase | Duration | Deliverable |
| --- | --- | --- |
| **M7.0** — Foundation | Week 1 | Service skeleton, schema, Timescale hypertable setup |
| **M7.1** — OEE calculator | Weeks 2–4 | Core algorithm, all bucket granularities, event-driven + scheduled recompute |
| **M7.2** — KPI snapshot APIs | Week 4 | Read endpoints, trend queries, continuous aggregates configured |
| **M7.3** — Plan-vs-actual variance | Week 5 | Variance table populated on events, attribution logic |
| **M7.4** — Shift summary generator | Week 5 | Shift-end trigger, rollup logic, supervisor notes integration |
| **M7.5** — Downtime Pareto cache | Week 6 | Real-time cache maintained on events |
| **M7.6** — Setup time trend | Week 6 | Weekly rollup from M6 setup_timings |
| **M7.7** — Production confirmation | Weeks 6–7 | Create on event; SAP write-back; supersession for corrections |
| **M7.8** — SAP extension coordination | Weeks 2–8 (parallel) | Hero Steels Basis team implements and tests confirmation extension |
| **M7.9** — Dashboard UIs | Weeks 7–10 | Live, Shift Review, Daily Plant, OEE Trend, Setup Trend, Adherence, Confirmation Monitor, CFO Pack |
| **M7.10** — PDF / Excel exports | Week 10 | Weekly/monthly packs, shift summaries, raw data export |
| **M7.11** — Reconciliation + alerting | Week 11 | Nightly reconciliation, OEE alerts, SAP sync alerts |
| **M7.12** — Integration test | Week 11 | End-to-end with M1/M4/M5a/M6/M8 |
| **M7.13** — Soak + pilot prep | Week 12 | Training, runbooks, pack examples for CFO |

**Total:** 12 weeks.

### 14.2 Team

Recommended: 2 engineers.

- **M7 Analytics Engineer** — TimescaleDB, KPI algorithm, aggregation pipelines

- **M7 Integration Engineer** — SAP confirmation, reconciliation, all adjacent-module events

- Fractional frontend for dashboard UIs (shared pool)

**Hiring JD — M7 Analytics Engineer:**

- **Must have:** Python, Postgres, time-series databases (TimescaleDB / InfluxDB), BI / analytics engineering experience

- **Strong plus:** Manufacturing / OEE domain, lean / Six Sigma background, SQL performance tuning

- **Nice to have:** Steel / process industry, data visualization design

**Hiring JD — M7 Integration Engineer:**

- **Must have:** Python, REST APIs, SAP OData experience, event-driven systems

- **Strong plus:** SAP PP module, manufacturing integration, financial reconciliation

- **Nice to have:** Direct experience with SAP production confirmation extensions

### 14.3 Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- | --- |
| R1 | SAP confirmation extension not ready at Hero Steels for pilot | High | Critical | Raise in Phase 0; escalate via customer exec sponsor; contingency: manual CSV-based confirmation for first 2 weeks |
| R2 | OEE calculation produces unexpected result that damages trust | Medium | High | Shadow-mode running for 2 weeks comparing to paper-based Hero Steels OEE; extensive test coverage; stakeholder review of reference doc |
| R3 | Late events cause KPI flip-flop on dashboard | Medium | Medium | Recompute window + final flag; clear UI indication of provisional vs. final |
| R4 | Dashboard slow at month-end with 30-day trend queries | Medium | Medium | Continuous aggregates from day 1; compression after 30 days |
| R5 | CFO rejects the monthly pack format | Medium | Low | Iterate on format with CFO in pilot month 2 before finalising |
| R6 | Reconciliation drift > tolerance becomes normalised | Medium | High | Alert threshold tuned; drift > 2% escalates beyond routine |
| R7 | Setup time trend doesn’t show meaningful improvement in first 3 months | Medium | High | Not an M7 bug — an SMED program / M4 / M2 matrix issue; surface transparently and drive the program |
| R8 | Correction confirmations create SAP-side confusion | Low | High | Clear UI + audit trail; supervisor training on when/how to correct |

### 14.4 Dependencies

| Dependency | What | Needed by |
| --- | --- | --- |
| Phase 0 Foundation | Platform, TimescaleDB extension configured | Week 1 |
| M6 events | Event schemas stable | Week 2 |
| M4 scheduled_operations | For plan-vs-actual | Week 5 |
| M5a coil consumption events | For confirmation payload | Week 6 |
| SAP PP confirmation extension | Custom extension published | Week 8 |
| M2 routings with accurate std rates | For performance calc | Week 3 |
| M8-lite meter data | For SEC calc (optional in Phase 1) | Week 8 |

### 14.5 Exit Criteria to Phase 2

- 30 days production stability

- SAP confirmation sync rate ≥ 99%

- Zedral vs. SAP reconciliation agreement ≥ 99%

- All five personas’ JTBDs validated ≥ 4/5 satisfaction

- Setup time trend chart used in at least 3 Monday management reviews

- CFO monthly pack used for at least one financial close

## Revision History

| Version | Date | Author | Changes |
| --- | --- | --- | --- |
| v0.1 | 2026-04-18 | Product & Systems Engineering | Initial draft |

*End of M7 — Performance Analytics **&** OEE Production Document* *Total: ~8,500 words · Est. reading time: 45 minutes* *Next module in sequence:** ****M8-lite — Energy Aggregation***