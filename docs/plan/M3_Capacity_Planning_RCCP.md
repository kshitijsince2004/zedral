Zedral Platform ��� M3 Production Document

Capacity Planning \& RCCP �� Phase 1

Product \& Systems Engineering

April 2026

Table of Contents

# Zedral Platform — Module M3 Production Document

## M3 — Capacity Planning & RCCP

**Document status:** Draft v0.1 · For engineering handover **Audience:** M3 module engineering team, adjacent module teams (M1 demand, M4 scheduler, M5c maintenance), pilot planner at Hero Steels **Owner:** Platform Engineering · M3 technical lead TBD **Depends on:** Phase 0 Foundation · M1 Demand & Order Management · M2 Master Data Engine **Phase:** 1 (Pilot Core Loop · Months 2–6) **Inherits:** All 10 Architectural Principles, event envelope standard, RBAC model, observability standards

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

### 1.1 What M3 Is

M3 is the **capacity reality check** between demand and scheduling. It takes two inputs — the open demand queue from M1 and the available hours from M2’s calendars — and answers one question for every CRS line for every time bucket in the planning horizon:

*“**Can we build what’s been ordered in the time we have available?**”*

The answer is a traffic-light visualisation: green when load is well below capacity, amber when utilisation is tight, red when load exceeds available hours. It is intentionally coarse — a **rough-cut** capacity plan, not a detailed schedule.

**M3 owns four responsibilities:**

- **Load aggregation** — for each work centre and time bucket, sum the production hours required by demand in that bucket

- **Capacity aggregation** — for each work centre and time bucket, sum the available hours from calendars, net of planned downtime

- **Utilisation computation** — calculate load/capacity ratio and classify into traffic-light status

- **Overload surfacing** — publish events and serve APIs that make overloads actionable for the planner and the scheduler

### 1.2 Why M3 Is a Separate Module From M4

This is a design question that will come up. The answer matters.

**M4 (the scheduler) produces a detailed time-sequenced plan** — job A starts at 07:00 on CRS-2, followed by a 140-min setup, followed by job B, etc. Running M4 is computationally expensive (seconds to minutes) and requires clean input.

**M3 produces a coarse aggregate view** — in week 17, CRS-2 has 168 available hours and 191 hours of demand loaded, so it’s overloaded by 14%. Running M3 is cheap (milliseconds).

The separation matters because:

- The planner’s morning question is “do we need to have a capacity conversation with sales?” — answered by M3 in 1 second, not by M4 in 5 minutes

- M3 runs every 15 minutes; M4 runs on demand

- M3 doesn’t require routing changeover math — just aggregate operation hours

- M3 answers cross-week questions (next month looks tight); M4 answers next-48-hours questions

- If M3 says the plan is infeasible, there’s no point running M4 — escalate to demand or capacity first

This is standard ERP practice — RCCP (Rough-Cut Capacity Planning) and CRP (Capacity Requirements Planning) are distinct functions. M3 is RCCP.

### 1.3 What M3 Is Not

- **Not a detailed schedule.** Zero decisions about job start times, job sequences, or operator assignments. That’s M4.

- **Not a machine availability checker.** M3 reports what the calendar says. Live machine-state (is CRS-2 currently in breakdown?) is M5c’s domain.

- **Not a material availability checker.** M3 assumes material is available in the bucket. Material-level feasibility is M5a’s domain.

- **Not a commitment engine.** M3 shows whether capacity *exists* for existing demand — it does not answer “can I promise a new customer 20 MT by Friday?” (that’s ATP, deferred to Phase 3).

- **Not a capital planning tool.** M3 does not model hypothetical new lines, overtime authorisation, or weekend-opening decisions at a strategic level. It shows what-is, not what-could-be (the what-if engine is M4’s domain).

- **Not a long-range forecaster.** Horizon is firm demand within 90 days. Beyond that, demand is statistical and out of scope.

### 1.4 Edge Cases In Scope

- **Partial-day buckets** — shift boundaries that straddle midnight; half-day holidays

- **Line-specific capability constraints** — an order that only CRS-1 can run (gauge out of CRS-2’s range) increases CRS-1’s apparent load disproportionately

- **PM windows** — planned PM time is subtracted from available hours in the relevant bucket

- **Breakdowns during the current bucket** — today’s breakdown shrinks remaining available hours; M3 consumes asset.breakdown.reported events

- **Overtime potential** — a configurable “theoretical max” per line, shown as a dotted ceiling in the UI, but not used for automatic load leveling

- **Weekends / holidays** — per customer calendar; buckets can have zero available hours

### 1.5 Edge Cases Deferred

- **Cross-line pooled resources** (a single overhead crane serving multiple lines) — Phase 2+

- **Operator-constrained capacity** (we have the machine hours but not the certified operators) — Phase 2+ with M2’s operator skill matrix deeper integration

- **Raw material as a capacity constraint** (HR coil availability limits the load) — Phase 2 M5a upgrade

- **Seasonality patterns** — v1 is firm demand only

- **Inter-plant load balancing** — single plant in v1

## 2. Personas & Jobs To Be Done

### 2.1 Primary Persona — The Production Planner (continued from M1)

Same planner as M1. Their M3 interaction is complementary to their M1 interaction — after reviewing demand in M1, they step back and check “can we even do this?” before committing to M4.

### 2.2 JTBDs for the Planner

**JTBD-1: Morning capacity reality check (30-second check).**

*“**Within 30 seconds of opening the dashboard, I need a green/amber/red view across all three CRS lines for the next 4 weeks — so I know whether to panic or breathe.**”*

**JTBD-2: Overload root cause.**

*“**When a bucket is red, I need to drill in and see which orders caused the overload, so I can decide whether to defer them, move them to another line, or negotiate the delivery date with sales.**”*

**JTBD-3: Capacity planning conversation with the Head of Manufacturing.**

*“**Every Monday morning at 09:30 we review next month’s capacity. I need a printable or exportable view by line, by week, showing load, capacity, utilisation, and known overloads, to drive that 15-minute meeting.**”*

**JTBD-4: Pre-M4 gate.**

*“**Before I ask M4 to generate a detailed schedule, I need confidence that the input is feasible. If M3 says a day is 120% loaded, M4 will just fail in a different way.**”*

**JTBD-5: PM scheduling conversation with maintenance.**

*“**Maintenance wants to take CRS-2 down for 16 hours next Thursday. Before I say yes, I need to see what impact that has on the load — does it push us into red?**”*

### 2.3 Secondary Personas

**Shift Supervisor.** Read-only M3 view as context — “is my line well-loaded this week?” Data surface via the shared dashboard, not a dedicated M3 screen.

**Head of Manufacturing.** Weekly/monthly rollup. Data surface via M7 executive dashboard (which reads M3’s capacity snapshots).

**Maintenance Engineer.** Consumes M3 output when proposing a PM window — sees the capacity impact before confirming. Read surface via M5c’s PM-scheduling UI (which embeds an M3 capacity strip).

## 3. Data Model

M3’s data lives in the m3_capacity schema. The data model is deliberately compact — M3 is a computation layer, not a system of record.

### 3.1 Core Tables

-- =======================================================
-- Capacity snapshots — the core M3 output
-- One row per (work centre × time bucket × snapshot time)
-- =======================================================
CREATE TABLE m3_capacity.capacity_snapshots (
  snapshot_id        BIGSERIAL PRIMARY KEY,
  wc_id              TEXT NOT NULL REFERENCES master.work_centres,
  bucket_granularity TEXT NOT NULL,              -- 'shift' | 'day' | 'week'
  bucket_start       TIMESTAMPTZ NOT NULL,
  bucket_end         TIMESTAMPTZ NOT NULL,
  available_hrs      NUMERIC(6,2) NOT NULL,
  loaded_hrs         NUMERIC(6,2) NOT NULL,
  pm_hrs             NUMERIC(6,2) DEFAULT 0,
  breakdown_hrs      NUMERIC(6,2) DEFAULT 0,
  holiday_hrs        NUMERIC(6,2) DEFAULT 0,
  overtime_available NUMERIC(6,2) DEFAULT 0,
  utilisation_pct    NUMERIC(6,2) NOT NULL,
  status             CHAR(1) NOT NULL,            -- 'G' | 'A' | 'R'
  -- Breakdown of what's loaded into this bucket
  wo_count           INTEGER NOT NULL DEFAULT 0,
  priority_a_hrs     NUMERIC(6,2) DEFAULT 0,
  priority_b_hrs     NUMERIC(6,2) DEFAULT 0,
  priority_c_hrs     NUMERIC(6,2) DEFAULT 0,
  calculated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Composite index for the main query pattern
  UNIQUE (wc_id, bucket_granularity, bucket_start, calculated_at)
);

CREATE INDEX idx_cs_wc_bucket
  ON m3_capacity.capacity_snapshots (wc_id, bucket_start, bucket_granularity);
CREATE INDEX idx_cs_status_bucket
  ON m3_capacity.capacity_snapshots (status, bucket_start)
  WHERE status IN ('A', 'R');
CREATE INDEX idx_cs_calculated_at
  ON m3_capacity.capacity_snapshots (calculated_at DESC);

-- =======================================================
-- WO → bucket loading map (for drill-down)
-- Which WOs are loaded into which buckets in the latest snapshot
-- =======================================================
CREATE TABLE m3_capacity.wo_bucket_load (
  wc_id              TEXT NOT NULL,
  bucket_start       TIMESTAMPTZ NOT NULL,
  bucket_granularity TEXT NOT NULL,
  wo_id              TEXT NOT NULL,
  loaded_hrs         NUMERIC(6,2) NOT NULL,
  bucket_share_pct   NUMERIC(5,2),                -- % of this WO's total hours in this bucket
  priority_class     CHAR(1),
  snapshot_batch_id  UUID NOT NULL,               -- all rows in one snapshot share this
  calculated_at      TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (wc_id, bucket_start, bucket_granularity, wo_id, snapshot_batch_id)
);

CREATE INDEX idx_wbl_wo ON m3_capacity.wo_bucket_load (wo_id);
CREATE INDEX idx_wbl_batch ON m3_capacity.wo_bucket_load (snapshot_batch_id);

-- =======================================================
-- Overload events (persistent record of red / amber transitions)
-- =======================================================
CREATE TABLE m3_capacity.overload_events (
  overload_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wc_id              TEXT NOT NULL,
  bucket_start       TIMESTAMPTZ NOT NULL,
  bucket_granularity TEXT NOT NULL,
  utilisation_pct    NUMERIC(6,2) NOT NULL,
  overload_hrs       NUMERIC(6,2) NOT NULL,       -- loaded − available
  severity           CHAR(1) NOT NULL,             -- 'A' or 'R'
  first_detected_at  TIMESTAMPTZ NOT NULL,
  resolved_at        TIMESTAMPTZ,
  resolution         TEXT,                         -- 'deferred' | 'rerouted' | 'overtime' | 'auto_cleared' | NULL
  resolution_ref     TEXT,                         -- e.g., override_id from M1
  notification_sent  BOOLEAN DEFAULT FALSE,
  is_active          BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_overload_active
  ON m3_capacity.overload_events (wc_id, bucket_start)
  WHERE is_active = TRUE;

-- =======================================================
-- Planner-recorded capacity actions (manual interventions)
-- =======================================================
CREATE TABLE m3_capacity.capacity_actions (
  action_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  overload_id        UUID REFERENCES m3_capacity.overload_events,
  action_type        TEXT NOT NULL,                -- 'defer_wo' | 'reroute_wo' | 'approve_overtime' | 'accept_overload'
  wc_id              TEXT NOT NULL,
  wo_id              TEXT,                         -- for wo-specific actions
  reason             TEXT,
  action_details     JSONB,
  taken_by           TEXT NOT NULL,
  taken_at           TIMESTAMPTZ DEFAULT now()
);

-- =======================================================
-- Configuration — thresholds and horizons
-- =======================================================
CREATE TABLE m3_capacity.config (
  config_key         TEXT PRIMARY KEY,
  config_value       JSONB NOT NULL,
  updated_by         TEXT,
  updated_at         TIMESTAMPTZ DEFAULT now()
);

-- Seeded configuration:
-- ('green_amber_threshold_pct', '85.0')
-- ('amber_red_threshold_pct', '100.0')
-- ('horizon_shift_days', '3')      -- shift-level snapshots covering next 3 days
-- ('horizon_day_days', '14')       -- daily snapshots for next 2 weeks
-- ('horizon_week_weeks', '12')     -- weekly snapshots for next 12 weeks
-- ('overtime_pct_per_line', '{"CRS-1": 15, "CRS-2": 15, "CRS-3": 10}')
-- ('recalc_interval_minutes', '15')

### 3.2 Design Notes

**Why snapshots are time-stamped rather than updated in place.** Two reasons:

- **Explainability.** When the planner asks “how has CRS-2’s week 17 load evolved over the past 72 hours?” we can answer from history. Without snapshotting, every calculation overwrites the last.

- **Decoupling from producers.** M3 doesn’t block M1 or M4 during a recalc. A reader always sees the latest *committed* snapshot; a new snapshot under construction doesn’t contaminate reads.

**Why three bucket granularities.** Different use cases need different resolutions:

- **Shift-level (next 3 days)** — the planner’s “today and tomorrow” view; aligns with M6 dispatch windows

- **Day-level (next 14 days)** — the planner’s two-week horizon

- **Week-level (next 12 weeks)** — the planner-with-Head-of-Manufacturing Monday review

Storing all three is cheap (~5 KB per snapshot × 3 lines × 3 granularities × 96 runs/day = ~4 MB/day).

**Why**** ****wo_bucket_load**** ****is a separate table.** Drill-down performance. When the planner clicks a red cell, they need to see “which 8 WOs are causing the overload?” — a single indexed query against wo_bucket_load returns that in <50ms.

**Why**** ****overload_events**** ****persists beyond snapshot lifetime.** Trend analysis. We want to ask “how many overloads did we have this quarter and how were they resolved?” — that requires a durable table, not derived-from-snapshot.

### 3.3 Retention

- **Capacity snapshots** — 7 days of full history (every 15-min calc), then downsampled to hourly for 30 days, then daily for 1 year

- **WO-bucket load** — only the latest snapshot kept fully; older linked to snapshots via snapshot_batch_id; purged with snapshots

- **Overload events** — 2 years hot, 5 years warm (supports “capacity trend” retrospectives)

- **Capacity actions** — aligned with overload events

Downsampling runs nightly via the shared Platform Archival job.

## 4. Event Schemas

### 4.1 Events M3 Publishes

#### plan.capacity.calculated (v1.0)

Published after each snapshot completes. Downstream: M4 (consumes feasibility), UI (refresh trigger), M7 (analytics backfill).

{
  "event_type": "plan.capacity.calculated",
  "aggregate_id": "snapshot_batch_7f8c",
  "payload": {
    "snapshot_batch_id": "7f8c-...",
    "calculated_at": "2026-04-17T14:00:00Z",
    "granularity": "day",
    "buckets_computed": 14,
    "work_centres": ["CRS-1", "CRS-2", "CRS-3"],
    "summary": {
      "green_buckets": 36,
      "amber_buckets": 5,
      "red_buckets": 1,
      "overload_hrs_total": 8.5
    }
  }
}

#### plan.capacity.overload_detected (v1.0)

Published when a new overload (status → amber or red) is detected. Downstream: notification service, M4 (may trigger early re-plan).

{
  "event_type": "plan.capacity.overload_detected",
  "aggregate_id": "overload_abc123",
  "payload": {
    "overload_id": "abc123",
    "wc_id": "CRS-2",
    "bucket_start": "2026-04-28T00:00:00Z",
    "bucket_granularity": "day",
    "available_hrs": 20.5,
    "loaded_hrs": 24.8,
    "utilisation_pct": 121.0,
    "severity": "R",
    "contributing_wos_count": 8,
    "top_contributing_wos": [
      {"wo_id": "wo_8893451", "loaded_hrs": 4.2, "priority_class": "A"},
      {"wo_id": "wo_8893520", "loaded_hrs": 3.8, "priority_class": "A"}
    ]
  }
}

#### plan.capacity.overload_resolved (v1.0)

Published when an active overload is resolved (load reduced below threshold, either automatically via demand change or manually via planner action).

{
  "event_type": "plan.capacity.overload_resolved",
  "aggregate_id": "overload_abc123",
  "payload": {
    "overload_id": "abc123",
    "wc_id": "CRS-2",
    "bucket_start": "2026-04-28T00:00:00Z",
    "resolution": "deferred",
    "resolution_ref": "override_xyz789",
    "resolved_at": "2026-04-17T15:30:00Z",
    "utilisation_pct_now": 94.2
  }
}

### 4.2 Events M3 Consumes

| Event | From | Action |
| --- | --- | --- |
| erp.work_order.received | M1 | Trigger incremental recalc for affected buckets |
| erp.work_order.updated | M1 | If qty or required_date changed: trigger recalc |
| erp.work_order.cancelled | M1 | Remove from load; trigger recalc |
| demand.priority.recalculated | M1 | If priority class crossed A/B/C boundary: refresh WO-level drilldown data (not the headline load) |
| master.calendar.updated | M2 | Trigger recalc for affected bucket range |
| master.routings.updated | M2 | If std_run_rate_mt_hr changed: trigger recalc for affected WOs |
| asset.pm.scheduled | M5c | Block capacity in affected bucket; trigger recalc |
| asset.pm.cancelled | M5c | Restore capacity; trigger recalc |
| asset.breakdown.reported | M5c | Reduce today’s available hours; trigger recalc |
| asset.breakdown.resolved | M5c | Restore remaining available hours |

### 4.3 Event Ordering

Capacity snapshots are idempotent-by-content but order-sensitive in time. Snapshot_id is time-ordered (BIGSERIAL). Consumers use calculated_at to resolve any out-of-order arrivals.

## 5. Ingestion Flow

M3 doesn’t *ingest* in the sense M1 does — it *computes* from other modules’ data. But the inputs must be enumerated as if they were ingestions, because the computation is only as accurate as its inputs.

### 5.1 Input Sources

| Source | What | Via |
| --- | --- | --- |
| **M1 work orders** | Open WOs with grade, gauge, width, qty, required_date, routing_id | Event consumption + GET /api/m1/work-orders/queue |
| **M2 routings** | For each WO’s material, the operation sequence and std run rate on each wc_id | GET /api/m2/routings/{material_code} (cached) |
| **M2 work centres** | Capability constraints (which lines can run which gauges) | GET /api/m2/work-centres (cached) |
| **M2 resource calendars** | Shift-level available hours per wc_id per date | GET /api/m2/calendars/{wc_id}?from=&to= (cached, invalidated on event) |
| **M5c PM schedule** | Blocked windows per wc_id | Reflected in M2 calendar via master.calendar.updated events |
| **M5c breakdowns** | Current breakdown events affecting today’s bucket | Event consumption |

Nothing comes from SAP directly — M3 sits on top of M1 (which is SAP’s downstream) and M2 (master data).

### 5.2 Input Freshness Requirements

| Input | Max staleness tolerated |
| --- | --- |
| Work order list | 15 min (M1’s publish cadence) |
| Routings | 24 hr (master data) |
| Calendars | 1 hr (PM changes happen often) |
| Breakdowns | 30 s (live operational signal) |

A capacity snapshot calculated against stale input is worse than no snapshot. The worker checks input freshness before computing and defers the run if any input is beyond tolerance, logging the deferral.

## 6. Processing Logic

The heart of M3. The algorithm is deliberately simple — simplicity is a feature of RCCP.

### 6.1 The Core Capacity Equation

For each (work centre, time bucket):

available_hrs = calendar_hrs - pm_hrs - breakdown_hrs - holiday_hrs
loaded_hrs    = Σ (wo_hrs_in_bucket for all WOs assignable to this wc)
utilisation   = loaded_hrs / available_hrs × 100

status = 
  'G' if utilisation < 85%
  'A' if 85% ≤ utilisation ≤ 100%
  'R' if utilisation > 100%

Thresholds are configurable per deployment (Hero Steels may choose 90%/110% after pilot experience).

### 6.2 WO-to-Bucket Assignment

The trickier question: *which bucket does each WO’s load count against?*

**Step 1: Assignability.** For each WO, find eligible work centres:

def eligible_lines(wo, work_centres):
    return [
        wc for wc in work_centres
        if wc.gauge_min_mm <= wo.gauge_mm <= wc.gauge_max_mm
        and wc.width_min_mm <= wo.width_mm <= wc.width_max_mm
    ]

If exactly one line is eligible → entire load goes to that line.

If multiple lines eligible → **proportional allocation** based on historical line share for that grade family (derived from the past 90 days of production data, cached in M2 as master.line_share_by_family). This is a heuristic — the actual line choice is M4’s job. M3 just needs a reasonable *expected* allocation for RCCP.

**Step 2: Hours calculation.**

def wo_production_hrs(wo, routing, wc_id):
    # Sum the hours required on this specific wc for all operations in the routing
    # that target this wc type
    total_hrs = 0
    for op in routing.operations:
        if op.wc_type == wc_id.wc_type:
            total_hrs += wo.qty_planned_mt / op.std_rate_mt_hr
    return total_hrs

The std_rate_mt_hr comes from M2’s routing master. This is the bucket’s foundational assumption — garbage in, garbage out.

**Step 3: Bucket placement.**

Where does wo_production_hrs land in time? Three placement strategies, configurable:

- **required_date_floor** (default) — place the load in buckets ending on or before required_date, working backwards from there

- **planned_start_date** — if planned_start_date is set in SAP, use it as the earliest bucket

- **priority_weighted** — spread the load earlier for high-priority WOs, later for low-priority

For v1, default strategy is required_date_floor — the most conservative, showing the load at its latest possible occurrence. The logic:

def place_in_buckets(wo, hrs_on_wc, required_date, available_buckets):
    remaining = hrs_on_wc
    bucket_idx = find_bucket(available_buckets, required_date)  # bucket containing required_date
    while remaining > 0 and bucket_idx >= 0:
        bucket = available_buckets[bucket_idx]
        to_place = min(remaining, bucket.available_hrs_remaining)
        bucket.loaded_hrs += to_place
        bucket.wo_loads.append((wo.wo_id, to_place))
        remaining -= to_place
        bucket_idx -= 1  # walk backward in time
    if remaining > 0:
        # WO cannot fit in horizon — log overload condition
        log_horizon_overflow(wo, remaining)

This produces a conservative “latest possible” placement. If every bucket walking backward is full, the WO causes an overload.

### 6.3 The Recalculation Worker

Runs on two triggers:

- **Scheduled.** Every 15 minutes, full recalculation across all work centres and all granularities.

- **Event-triggered.** On any input event (see §4.2), an *incremental* recalc for affected buckets.

**Incremental vs. full.** Incremental recalculation is an optimisation for a single-WO change: only the buckets where that WO’s load sits need recomputation. Full recalculation rebuilds everything. Incremental is fast (<1s); full is still fast (<10s at Hero Steels scale of 500 open WOs × 3 lines × ~60 buckets).

v1 starts with full recalc only (simpler, correctness-first). Incremental optimisation enabled in v1.1 after load profiling shows it’s needed.

### 6.4 Overload Detection and Lifecycle

When a snapshot is written:

def detect_overloads(new_snapshot):
    for row in new_snapshot.rows:
        if row.status in ('A', 'R'):
            existing = query_active_overload(row.wc_id, row.bucket_start, row.granularity)
            if existing:
                # Update utilisation; don't create duplicate
                update_overload(existing, row.utilisation_pct)
            else:
                # New overload
                create_overload(row)
                publish_overload_detected(row)
        else:
            # status = 'G' — resolve any active overload for this bucket
            existing = query_active_overload(row.wc_id, row.bucket_start, row.granularity)
            if existing:
                resolve_overload(existing, resolution='auto_cleared')
                publish_overload_resolved(existing)

**Flap prevention.** If a bucket oscillates between 99.5% and 100.5% (amber ↔ red) every recalc, that’s noise, not signal. Hysteresis: once an overload is created, it stays at its highest-observed severity during its lifetime; it is only resolved when utilisation drops cleanly below the green threshold. Consecutive recalcs finding the same overload don’t re-publish overload_detected.

### 6.5 Notification Logic

Per Phase 0 §8.3:

- **First detection of R-level overload** — SMS + email + Teams to planner + Head of Manufacturing (if bucket is < 7 days out) or just in-app + email (if further out)

- **First detection of A-level overload** — in-app + email, quiet-hours-respected

- **Resolution** — in-app notification (no email) to acknowledge the planner’s action

Rate limits: max 1 notification per (wc_id, bucket) per 30 minutes, regardless of how many recalcs pass through.

### 6.6 Proportional WO Allocation — Realistic Assumptions

A WO that runs on CRS-1 or CRS-2 equally well — how is its load distributed for RCCP?

If historical share is 60/40 CRS-1/CRS-2 for this grade family:

wo_A on CRS-1: loaded_hrs × 0.60
wo_A on CRS-2: loaded_hrs × 0.40

Both CRS-1’s and CRS-2’s utilisation reflect the weighted load. **The total load across all eligible lines sums to the WO’s full hours.** If CRS-1’s 60% gets it to 105% utilisation while CRS-2’s 40% is only 80%, the system correctly flags CRS-1 as overloaded even though the WO could flex.

The planner has an override: when drilling into an overload, they can **pin a WO to a specific line** for RCCP purposes. This forces 100% allocation to that line and is reflected in subsequent snapshots.

## 7. Storage Strategy

### 7.1 Postgres, Same as Everything

No special storage. m3_capacity schema in the Core Postgres DB.

Capacity snapshots grow predictably. At Hero Steels:

- Shift-level: 3 lines × (3 days × 3 shifts) = 27 rows per run × 96 runs/day = 2,592 rows/day

- Day-level: 3 lines × 14 days = 42 rows per run × 96 runs/day = 4,032 rows/day

- Week-level: 3 lines × 12 weeks = 36 rows per run × 96 runs/day = 3,456 rows/day

Total: ~10,000 rows/day. 7-day hot retention: ~70,000 rows. Trivial for Postgres.

### 7.2 Indexing

Primary query pattern: “Give me the latest capacity for CRS-2 for the next 14 days by day.”

SELECT * FROM m3_capacity.capacity_snapshots
WHERE wc_id = 'CRS-2' AND bucket_granularity = 'day'
  AND bucket_start BETWEEN now() AND now() + INTERVAL '14 days'
  AND calculated_at = (
    SELECT MAX(calculated_at) FROM m3_capacity.capacity_snapshots
    WHERE wc_id = 'CRS-2' AND bucket_granularity = 'day'
  );

Supported by idx_cs_wc_bucket (composite) and idx_cs_calculated_at.

Secondary pattern: “Show me all red buckets across all lines in the next 30 days.”

SELECT * FROM m3_capacity.capacity_snapshots
WHERE status = 'R'
  AND bucket_start BETWEEN now() AND now() + INTERVAL '30 days'
  AND calculated_at = [latest];

Supported by idx_cs_status_bucket (partial index).

### 7.3 Materialised View for Dashboard

A materialised view m3_capacity.latest_snapshot holds only the most recent calculation per (wc_id, granularity, bucket). Refreshed after each recalc write. Dashboard reads this view instead of filtering by MAX(calculated_at) each time. Simple optimisation, meaningful UI latency improvement.

### 7.4 Snapshot Downsampling

Nightly job runs at 02:30 AM:

DELETE older than 30 days at full resolution.
KEEP 1 snapshot per hour for days 7-30.
KEEP 1 snapshot per day for days 30-365.
KEEP 1 snapshot per week for days 365-730.

Archived rows exported to MinIO as Parquet for long-term retention if needed.

## 8. API Surface

All endpoints at /api/m3/*. Auth via Keycloak OIDC.

### 8.1 Read APIs

#### GET /api/m3/capacity

The dashboard’s primary feed.

**Query parameters:**

| Param | Type | Description |
| --- | --- | --- |
| wc_id | string | Filter by work centre (repeatable) |
| granularity | enum | shift / day / week |
| from | datetime | Start of range (inclusive) |
| to | datetime | End of range (inclusive) |
| status | enum[] | Filter by G/A/R |
| latest_only | bool | Default true |

**Response:**

{
  "as_of": "2026-04-17T14:00:00Z",
  "granularity": "day",
  "snapshots": [
    {
      "wc_id": "CRS-2",
      "bucket_start": "2026-04-18T00:00:00Z",
      "bucket_end": "2026-04-19T00:00:00Z",
      "available_hrs": 22.0,
      "loaded_hrs": 19.4,
      "pm_hrs": 2.0,
      "breakdown_hrs": 0,
      "utilisation_pct": 88.2,
      "status": "A",
      "overtime_available": 3.3,
      "wo_count": 7,
      "priority_breakdown": {"A_hrs": 12.0, "B_hrs": 5.4, "C_hrs": 2.0}
    }
    /* ... */
  ]
}

#### GET /api/m3/capacity/bucket/{wc_id}/{bucket_start}

Drill-down for a specific bucket. Returns the snapshot row plus the full wo_bucket_load list — every WO contributing hours to that bucket, sorted by load descending.

#### GET /api/m3/overloads

Active and historical overloads.

**Query parameters:** wc_id, active_only (bool, default true), from, to, severity.

**Response:** list of overload_events rows with summary statistics.

#### GET /api/m3/summary

High-level rollup — used by the executive dashboard in M7.

{
  "as_of": "2026-04-17T14:00:00Z",
  "by_line": {
    "CRS-1": {"avg_utilisation_next_14d": 82.5, "red_buckets": 0, "amber_buckets": 3},
    "CRS-2": {"avg_utilisation_next_14d": 91.2, "red_buckets": 1, "amber_buckets": 5},
    "CRS-3": {"avg_utilisation_next_14d": 78.3, "red_buckets": 0, "amber_buckets": 1}
  },
  "total_overload_hrs_next_14d": 14.5,
  "total_overloaded_buckets": 9
}

### 8.2 Write APIs

#### POST /api/m3/capacity/recalculate

Manual trigger of a full recalc. Required role: planner or higher.

#### POST /api/m3/capacity-actions

Planner records a resolution action against an overload. Required role: planner.

**Request body:**

{
  "overload_id": "abc123",
  "action_type": "defer_wo",
  "wo_id": "wo_8893451",
  "reason": "Customer Maruti agreed to push delivery from 28-Apr to 5-May",
  "action_details": {"new_required_date": "2026-05-05"}
}

Effect: records in capacity_actions, orchestrates downstream calls:

- For defer_wo → calls PATCH /api/m1/work-orders/{wo_id} to update required_date

- For reroute_wo → pins WO to a specific wc_id in upcoming M3 calcs; also hints M4

- For approve_overtime → extends available_hrs via a calendar update

- For accept_overload → marks overload as acknowledged, no further notifications

After action, triggers a recalc to validate the resolution took effect.

#### POST /api/m3/capacity/pin-wo

Force a specific WO’s capacity allocation to a specific line (for RCCP purposes). Does not affect M4’s actual scheduling decisions. Required role: planner.

### 8.3 Admin APIs

#### PUT /api/m3/config

Update thresholds and horizons. Required role: master_data_admin.

#### GET /api/m3/diagnostics

Last recalc duration, input freshness, cache hit rates. Required role: platform_admin.

### 8.4 Rate Limits

- Read APIs: 600 req/min per user (dashboard polls frequently)

- Recalculate trigger: 1 per 2 minutes per user (prevents spam)

- Action POSTs: 60 req/min per user

## 9. UI/UX Specification

M3 contributes one primary screen to the Ops Console and embeds a capacity strip into other modules’ screens.

### 9.1 Screen — Capacity Heatmap

The planner’s capacity view. The 30-second morning check.

**Layout (desktop):**

┌───────────────────────────────────────────────────────────────────────┐
│  Controls:  [ Shift | Day | Week ]  [ Date range selector ]  [ Refresh ]│
├───────────────────────────────────────────────────────────────────────┤
│                                                                       │
│   CRS-1    [G][G][G][G][G][G][A][A][G][G][G][G][G][G]                 │
│   CRS-2    [A][A][R][R][A][G][A][A][A][G][G][G][G][G]                 │
│   CRS-3    [G][G][G][G][G][G][G][G][G][G][A][G][G][G]                 │
│                                                                       │
│   Legend: Green < 85% · Amber 85–100% · Red > 100%                    │
│                                                                       │
├───────────────────────────────────────────────────────────────────────┤
│  Active overloads (4):                                                │
│   🔴 CRS-2 · Mon 21-Apr · 121% (4.3 hrs over) · 8 WOs · [ Resolve ]    │
│   🔴 CRS-2 · Tue 22-Apr · 108% (1.7 hrs over) · 5 WOs · [ Resolve ]    │
│   🟡 CRS-2 · Wed 23-Apr ·  96% · 7 WOs · [ Detail ]                    │
│   🟡 CRS-1 · Thu 24-Apr ·  92% · 6 WOs · [ Detail ]                    │
└───────────────────────────────────────────────────────────────────────┘

**Heatmap cells.** Each cell represents one (wc_id × bucket). Color by status. Hover for tooltip with utilisation %, loaded/available hrs, wo_count. Click for drill-down.

**Drill-down panel (right slide-in on cell click):**

- Header: wc_id, bucket_start, status, utilisation %

- Load breakdown: chart showing available hours (grey), PM (blue), breakdown (dark red), loaded by priority class (red=A, amber=B, green=C)

- Contributing WOs table: wo_id, customer, material, loaded_hrs, priority_class, required_date — clickable to M1 WO detail

- Suggested actions panel:

- For red/amber: “Defer 2 lowest-priority WOs to next week” (pre-computed option)

- For red: “Approve 4 hrs of overtime for Mon-Tue”

- For red: “Reroute wo_8893451 to CRS-1 (has 6 hrs free)”

**Actions take effect inline.** Clicking “Defer” opens a confirmation dialog with reason field. On confirm, the backend:

- Calls M1 to update WO required_date

- Logs capacity_action

- Triggers M3 recalc

- Cell animates to green/amber on next snapshot

### 9.2 Screen — Line Detail (Time-Series)

A per-line drill showing how utilisation has evolved.

**Layout.** Line chart with three bands (Green, Amber, Red zones) and a utilisation line plotted on top. X-axis: time (next 14 days at day granularity). Y-axis: utilisation %. Tooltips reveal per-bucket details.

Toggle: “Show snapshot history” overlays the past 48 hours of calculations as lighter lines — showing how the view has evolved (did this red bucket start red, or did it deteriorate overnight as new orders landed?).

### 9.3 Capacity Strip (Embedded Component)

A compact horizontal strip showing 14 days × 3 lines of cells, colour-coded. Designed to be embedded in:

- M1’s demand queue page (context: is the queue feasible?)

- M5c’s PM scheduling UI (context: is this PM slot going to push us into red?)

- M4’s schedule review UI (context: does the generated schedule align with RCCP?)

- M7’s executive dashboard (compact status rollup)

Clickable — navigates to full M3 Capacity Heatmap screen, pre-filtered to the relevant line.

### 9.4 Print / Export

Monday morning Head-of-Manufacturing meeting deliverable:

- “Export Capacity Review” button → generates a PDF with:

- Heatmap snapshot

- Line-by-line summary

- Active overload list with planner-added notes

- Action register (last week’s resolutions)

The PDF is built by the shared report generation service, not by the browser.

### 9.5 Accessibility

- Colour-blind palette option: patterns on cells in addition to colours (dots for amber, hatching for red)

- Keyboard navigation through the heatmap grid

- Screen reader announces “CRS-2, Monday 21 April, red, 121 percent utilisation, 8 work orders”

### 9.6 Performance SLOs

- Capacity heatmap initial load: < 600ms p95

- Drill-down panel open: < 300ms p95

- Action resolve to cell refresh: < 5s p95 (includes M1 update + recalc)

## 10. Integration with Other Modules

### 10.1 M3 ← M1 (Demand) — Read + Event

M3 reads the WO queue from M1 for load inputs and subscribes to M1 events for incremental triggers. Described in §4.2 and §5.1.

### 10.2 M3 ← M2 (Master Data) — Read

M3 reads routings, work centres, and calendars from M2. Cached per Phase 0 §5.5.

### 10.3 M3 → M1 (Demand) — Write on Planner Action

When a planner resolves an overload via defer_wo, M3 calls M1’s override API to adjust the WO’s required_date. Clean delegation — M3 doesn’t modify WO data directly.

### 10.4 M3 → M4 (Scheduler) — Event + API

M4 subscribes to plan.capacity.calculated and plan.capacity.overload_detected. M4’s behaviour:

- If any red bucket in the next 7 days → M4 refuses to run the scheduler (would just produce infeasibility) and surfaces the reason to the planner

- If only amber buckets → M4 runs but flags tight buckets as risk zones in its output

- M4 polls GET /api/m3/summary at the start of each schedule run as a sanity gate

### 10.5 M3 ↔ M5c (Maintenance) — Event-Driven

M5c events drive M3 recalcs (PM scheduling, breakdowns). M3 exposes a query GET /api/m3/capacity?include_proposed_pm_id=... that simulates a *proposed* PM’s capacity impact without persisting it — used by M5c’s PM scheduling UI to show the planner the impact before confirmation.

### 10.6 M3 → M7 (OEE) — Event-Driven

M7 subscribes to plan.capacity.calculated to:

- Track utilisation as a historical KPI

- Compare planned capacity vs. actual consumption

- Build the capacity trend chart for executive dashboards

### 10.7 M3 ← M5a (Material) — Phase 2

Phase 2: M5a signals material shortage → M3 conditionally unblocks affected buckets (WO can’t run, so its load drops). v1 ignores material as a capacity constraint (conservative assumption — overstate load).

## 11. SAP Bidirectional Mapping

### 11.1 Inbound from SAP — Nothing Direct

M3 does not talk to SAP. All SAP-sourced data reaches M3 via M1 (WOs) and M2 (routings, calendars).

### 11.2 Outbound to SAP — Nothing

M3 does not write to SAP. Planner capacity-resolution actions (like deferring a WO) route through M1, which handles any eventual SAP synchronisation.

### 11.3 Implication

M3 is entirely internal to Zedral. Its correctness depends on M1 and M2 being correct. A SAP outage does not directly affect M3 — M3 keeps computing against whatever data M1 last had.

## 12. Failure Modes & Recovery

### 12.1 Input Staleness

| Mode | Detection | Recovery |
| --- | --- | --- |
| M1 event stream lagging > 15 min | Kafka consumer lag metric | Defer recalc; alert; continue serving previous snapshot |
| M2 calendar cache stale | TTL expiry without refresh | Force refresh from M2 API; if M2 unreachable, use stale with warning banner in UI |
| WO references non-existent routing | Database JOIN returns NULL | Log; skip that WO’s contribution; tag snapshot as “partial”; alert planner |

### 12.2 Calculation Failures

| Mode | Detection | Recovery |
| --- | --- | --- |
| Routing has operations with zero run rate | Division by zero guard | Log; skip WO; flag in snapshot metadata |
| WO’s required_date is before any bucket in horizon | Bucket placement function | Log as “overflow”; do not contribute to any bucket; surface in a separate “orphan WOs” list in UI |
| Calculation worker hangs | Job timeout (90s) | Kill, log, restart, skip this run; next scheduled run tries again |

### 12.3 Notification Storms

| Mode | Detection | Recovery |
| --- | --- | --- |
| Single bucket oscillating A↔R every recalc | Overload lifecycle (§6.4) with hysteresis | Status stays at highest observed until cleanly green |
| Systemic overload (every bucket red because master data is broken) | Sentinel check: if > 50% of buckets red in a snapshot, treat as master-data-error | Block notifications; alert platform_admin; do not publish snapshot |

### 12.4 Downstream Subscriber Failures

| Mode | Detection | Recovery |
| --- | --- | --- |
| M4 not consuming plan.capacity.calculated | Consumer lag > 5 min | Standard backbone DLQ handling; M4 continues to operate but without M3’s gate (degraded mode) |
| Notification service down | Integration metric | Queue notifications via the notification service’s own retry logic (§8.3 of Phase 0) |

## 13. Acceptance Criteria

### 13.1 Functional Acceptance

- ☐ Capacity snapshots computed every 15 min across all 3 work centres and 3 granularities

- ☐ Shift-level horizon 3 days, day-level 14 days, week-level 12 weeks — all displayed correctly

- ☐ WO-to-line assignment respects gauge/width capability

- ☐ Proportional allocation for multi-line-eligible WOs works per historical share

- ☐ PM windows correctly reduce available hours

- ☐ Active breakdowns correctly reduce today’s remaining hours

- ☐ Traffic light thresholds configurable via API

- ☐ Overload events created, resolved, and audited correctly

- ☐ Drill-down from a bucket to contributing WOs works in < 300ms

- ☐ Planner resolution actions (defer / reroute / overtime / accept) all functional end-to-end

- ☐ Events plan.capacity.calculated, .overload_detected, .overload_resolved all publish correctly

- ☐ M4 confirmed gating schedule runs on capacity status

### 13.2 Non-Functional Acceptance

- ☐ Full recalc completes < 10s at 500 WOs × 3 lines × ~60 buckets

- ☐ Incremental recalc (single-WO change) completes < 2s (if implemented in v1)

- ☐ API p95 latency meets SLOs (§8.6 / §9.6)

- ☐ Snapshot storage growth within projected envelope (< 200 MB after 30 days hot retention)

- ☐ Prometheus metrics for recalc duration, overload count, input staleness all emitted

- ☐ All APIs auth-gated

### 13.3 Pilot Validation

- ☐ Planner can assess the next 14 days’ capacity in < 30 seconds (JTBD-1)

- ☐ Planner can identify the 3 biggest contributing WOs to an overload in < 60 seconds (JTBD-2)

- ☐ Monday meeting PDF export generates in < 30 seconds

- ☐ When maintenance proposes a PM window, planner sees capacity impact before approving (JTBD-5)

- ☐ 30-day pilot: M3’s overload predictions match reality (± 1 day, ± 10% utilisation) in ≥ 80% of cases

### 13.4 Documentation

- ☐ OpenAPI spec published

- ☐ Event schemas in Apicurio and versioned

- ☐ Runbook: “M3 reports systemic overload — troubleshooting guide”

- ☐ Runbook: “M3 calculation is slow — diagnostic steps”

- ☐ User guide: 4–6 pages with screenshots covering the two main screens + drill-down + resolution workflows

### 13.5 Rollback Plan

If M3 fails post-go-live:

- Planner falls back to M1 queue + mental math (status quo before Zedral)

- M4 automatically degrades to “no capacity gate” mode — still runs, produces schedules that may be infeasible

- Snapshots continue to accumulate; on M3 recovery, backfill is unnecessary (latest snapshot is what matters)

## 14. Build Plan

### 14.1 Phases

| Sub-phase | Duration | Deliverable |
| --- | --- | --- |
| **M3.0** — Foundation | Week 1 | Service skeleton, schema, config seeded |
| **M3.1** — Core calculation | Weeks 2–3 | Full recalc worker, capacity equation, WO-to-bucket assignment, status classification |
| **M3.2** — Proportional allocation | Week 3 | Multi-line-eligible WO allocation using historical share |
| **M3.3** — Overload lifecycle | Week 4 | Overload detection, resolution, notification integration |
| **M3.4** — APIs | Week 4 | All read + write endpoints, OpenAPI spec |
| **M3.5** — UI (Heatmap + Drill-down) | Week 5 | Capacity heatmap screen, drill-down panel, action workflows |
| **M3.6** — Capacity strip component | Week 6 | Embeddable component used by M1, M5c, M4, M7 |
| **M3.7** — Event triggers | Week 6 | Incremental recalc on input events (or deferred to v1.1) |
| **M3.8** — Integration test | Week 7 | With M1, M2, M4, M5c end-to-end |
| **M3.9** — Soak + pilot prep | Week 8 | Docs, runbooks, training, PDF export |

**Total:** 8 weeks. Parallelisable with M1 after Week 4.

### 14.2 Team

1 M3 engineer primary + fractional frontend engineer (shared pool).

**Hiring JD starter:**

- **Must have:** Python backend, Postgres, REST API design, clear understanding of time-bucketed aggregation

- **Strong plus:** Manufacturing / capacity-planning domain, ERP background, Pandas for calculation prototyping

- **Nice to have:** Steel vertical exposure, OR-Tools familiarity (for cross-pollination with M4)

### 14.3 Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- | --- |
| R1 | M2 routing run-rates don’t exist or are inaccurate | High | High | Bootstrap rates from historical DPR data during Phase 0; planner-editable in M2; low-confidence routings flag in M3 output |
| R2 | Historical line share data insufficient for proportional allocation | Medium | Medium | Default to equal split if < 30 days history; planner can override via pin-wo |
| R3 | Thresholds cause too many / too few alerts | Medium | Low | Tunable config; observe for 2 weeks post-launch and adjust |
| R4 | Multi-line-eligible WOs cause confusing UI (“why is this WO in two buckets?”) | Medium | Medium | UI clearly labels “Expected X hrs on CRS-1, Y hrs on CRS-2” in drill-down |
| R5 | M1 events lag during SAP sync surges → M3 stale | Low | Low | Input freshness check defers recalc gracefully |

### 14.4 Dependencies

| Dependency | What | Needed by |
| --- | --- | --- |
| Phase 0 Foundation | Platform + event backbone | Week 1 |
| M1 Demand APIs | GET /work-orders/queue, event publishing | Week 2 |
| M2 Master Data | Routings + calendars populated | Week 2 |
| M5c Breakdown events | Event schema defined | Week 6 |
| M4 queue-gate integration | Consumer of M3 events | Week 7 |
| Ops Console shell | For UI work | Week 5 |

### 14.5 Exit Criteria to Phase 2

- 30 days of production stability

- Overload predictions validated against reality

- Integration with M5c’s PM scheduling UI confirmed

- Planner reports ≥ 4/5 satisfaction on JTBDs

## Revision History

| Version | Date | Author | Changes |
| --- | --- | --- | --- |
| v0.1 | 2026-04-17 | Product & Systems Engineering | Initial draft |

*End of M3 — Capacity Planning **&** RCCP Production Document* *Total: ~7,000 words · Est. reading time: 35 minutes* *Next module in sequence:** ****M4 — APS Finite Scheduling Engine**** **(the largest — ~10,000 words)*