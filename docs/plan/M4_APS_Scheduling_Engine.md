Zedral Platform ��� M4 Production Document

APS Finite Scheduling Engine �� Phase 1

Product \& Systems Engineering

April 2026

Table of Contents

# Zedral Platform — Module M4 Production Document

## M4 — APS Finite Scheduling Engine

**Document status:** Draft v0.1 · For engineering handover **Audience:** M4 module engineering team, adjacent module teams (M1 demand, M2 master data, M3 capacity, M5a material, M5c maintenance, M6 dispatch), pilot planner at Hero Steels **Owner:** Platform Engineering · M4 technical lead TBD **Depends on:** Phase 0 Foundation · M1 Demand & Order Management · M2 Master Data Engine · M3 Capacity Planning & RCCP **Phase:** 1 (Pilot Core Loop · Months 2–6) **Inherits:** All 10 Architectural Principles, especially **Principle 4 (Deterministic by Default)** and **Principle 10 (Steel First)**

## Table of Contents

- Scope & Non-Goals

- Personas & Jobs To Be Done

- Data Model

- Event Schemas

- Ingestion Flow

- Processing Logic — The Scheduler

- Storage Strategy

- API Surface

- UI/UX Specification

- Integration with Other Modules

- SAP Bidirectional Mapping

- Failure Modes & Recovery

- Acceptance Criteria

- Build Plan

## 1. Scope & Non-Goals

### 1.1 What M4 Is

M4 is the **algorithmic centrepiece** of the Zedral platform. It takes the priority-ranked demand queue from M1, the capacity-feasibility gate from M3, the master data and changeover matrix from M2, the material readiness signal from M5a, and the maintenance windows from M5c — and produces the answer to the central operational question of any process plant:

*“**For each work order, on which line does it run, in what sequence, starting at what minute — to minimise changeover loss, respect every constraint, and meet customer commitments?**”*

The output is a **Gantt-renderable, machine-executable, planner-approvable schedule** for every CRS line, covering a 48-hour to 7-day horizon, refreshed on demand and on disruption.

**M4 owns five responsibilities:**

- **Schedule generation** — run a constraint-programming optimisation that produces a feasible, near-optimal schedule from current inputs

- **Schedule maintenance** — re-optimise on disruption signals (breakdown, rush order, material delay, planner override)

- **What-if simulation** — let planners ask “what happens if I outage CRS-2 for 4 hours?” without affecting the live schedule

- **Override absorption** — accept planner manual overrides (drag-drop a job, pin a sequence) and re-optimise around them

- **Schedule publication** — deliver the approved schedule to M6 (dispatch) and to all interested consumers via events

### 1.2 The Critical Distinction — Heuristic-Plus-CP-SAT, Not “AI”

**v1 uses Google OR-Tools’ CP-SAT solver wrapped with a steel-vertical heuristic layer.** This is a deliberate, defensible choice rooted in industry experience:

*“**Most systems being offered today are based on algorithmic sequencing (optimisation) techniques. Although Siemens Opcenter APS can use algorithmic sequencing, it is primarily based on heuristics (rules) — it does not claim to** **‘**optimise**’** **your master production schedule. Optimising sounds wonderful, but in most cases it is totally unrealistic and leads to disaster.**”* — Lean-Scheduling International on Siemens Opcenter APS / Preactor

What this means concretely for M4:

- **Heuristic seed.** Before invoking CP-SAT, a deterministic rule-based pass produces a starting schedule (priority-ranked + greedy changeover-minimisation). This gives us a feasible answer in milliseconds.

- **CP-SAT polish.** CP-SAT then has up to N seconds (configurable, default 60s) to improve on the heuristic seed. If CP-SAT can find improvements, great. If it times out, we use the heuristic answer.

- **No black box.** Every constraint in the model is named, documented, and inspectable. When a planner asks “why didn’t you put job A before job B?” we can show them: because constraint #7 (gauge-step transition penalty) made the alternative score worse by 23 minutes.

**No reinforcement learning. No genetic algorithms. No black-box ML.** Per Principle 4, ML is deferred until 6+ months of clean plant data exists and a deterministic approach has been demonstrably tried.

### 1.3 What M4 Is Not

- **Not a long-range planner.** Horizon caps at 7 days. Beyond that, M3’s RCCP view is the right tool.

- **Not a capacity calculator.** M4 trusts M3’s capacity gate. If M3 says day-X is overloaded, M4 won’t try to compress it via overtime invention.

- **Not a material allocator.** M5a tells M4 which WOs have material ready. M4 schedules only material-ready WOs (or honours planner overrides for material-pending WOs at the planner’s risk).

- **Not a maintenance scheduler.** M5c proposes PM windows; M4 respects them. M4 does not propose when to do maintenance.

- **Not a control system.** M4’s output is a plan. M6 dispatches the plan. PLCs execute. M4 does not write to PLCs (Principle 5).

- **Not a multi-line resource allocator across plants.** Single plant in v1.

- **Not a demand-side optimiser.** M4 takes demand as input from M1 and does not modify it. Defer / reroute decisions are planner actions surfaced via M1 / M3.

- **Not a financial optimiser.** M4 minimises operational loss (changeover, lateness), not profit. Profit-aware scheduling requires margin data and ATP — both Phase 3+.

### 1.4 Edge Cases In Scope (v1)

- **Sequence-dependent setup times** — the entire reason changeover matrix exists; the largest savings opportunity at Hero Steels

- **Roll-change events** — when scheduled grade transition triggers a roll change, that’s a longer setup; modelled explicitly

- **PM windows mid-horizon** — must be honoured as fixed unavailable time

- **Operator skill constraints** — only certified operators run certain grades; v1 honours this as a soft constraint (warning if violated, not hard reject; v2 hardens)

- **Material readiness gates** — WOs without coil cannot be scheduled until material lands

- **Drop-in rush orders** — planner adds a rush WO mid-day; scheduler must absorb without abandoning the rest of the plan

- **Manual pins** — planner says “Job X must run on CRS-1 starting at 14:00”; scheduler optimises around the pin

- **Frozen window** — the next 2 hours of the schedule are frozen (already committed to floor); re-optimisation can only touch beyond the frozen window

- **Capacity rebound** — when a breakdown resolves earlier than expected, recover the schedule

### 1.5 Edge Cases Deferred to Phase 2+

- **Multi-stage routing across pickling → cold rolling → annealing** — v1 schedules cold-rolling lines independently; deferred coupling to Phase 2

- **Operator scheduling as a first-class constraint** — v1 surfaces violations; v2 optimises operator assignment

- **Energy-aware scheduling** (run heavy jobs in off-peak DISCOM tariff windows) — Phase 2 with M8-full

- **Stochastic optimisation** (account for breakdown probabilities) — Phase 3+

- **Multi-objective Pareto fronts** (planner picks from solutions trading off lateness vs. changeover) — Phase 3+

- **Reinforcement learning policies** — not before 12 months of plant data

## 2. Personas & Jobs To Be Done

### 2.1 Primary Persona — The Production Planner

Same planner as M1 / M3. M4 is the most-used Zedral surface for the planner. In a typical day they will look at the M4 Gantt 8–15 times.

### 2.2 JTBDs for the Planner

**JTBD-1: Generate today’s schedule (morning planning).**

*“**At 06:00 AM I need a Gantt for the next 48 hours across CRS-1/2/3 that respects every constraint, minimises changeover, and tells me where the risks are — in less than 5 minutes from clicking** **‘**Run**’**.**”*

**JTBD-2: Absorb a rush order without rebuilding the whole plan.**

*“**At 11:30 AM a rush order lands. I need to inject it into the queue, see where the scheduler placed it, see what existing jobs got pushed and by how much, and approve or reject in under 2 minutes.**”*

**JTBD-3: React to a breakdown.**

*“**CRS-2 just broke down. Estimated 3-hour repair. I need M4 to immediately propose a recovered schedule — what moves to CRS-1 or CRS-3, what slips to tomorrow — without me starting from scratch.**”*

**JTBD-4: Override the scheduler when business says so.**

*“**The customer escalated. I need to drag job X to the top of CRS-1’s queue at 14:00, lock that pin, and have the scheduler optimise everything around my pin without unlocking it.**”*

**JTBD-5: Run a what-if before committing.**

*“**Maintenance wants 16 hours on CRS-2 next Thursday. Before I commit, I want to see a simulated schedule with that outage and quantify the lateness and changeover impact compared to the current plan.**”*

**JTBD-6: Explain the schedule to the supervisor at shift change.**

*“**At shift handover I need to walk the supervisor through** **‘**why this sequence**’** **— show them the changeover savings, the priority drivers, the material-availability gates — in language they understand.**”*

**JTBD-7: Trust the scheduler’s output.**

*“**Over time I need to verify that the scheduler is actually saving us changeover minutes, not just shuffling jobs. I need data — month-on-month avg setup time, schedule adherence, planner-override frequency — to know whether to trust it more or less.**”*

### 2.3 Secondary Personas

**Shift Supervisor** — read-only Gantt for their shift; cannot modify, can flag issues. Surface in M6.

**Floor Operator** — does not see M4 directly. Sees M6’s dispatch list, which is M4’s published output filtered to their line and shift.

**Plant Head / Head of Manufacturing** — read-only weekly view; uses what-if for capital and maintenance discussions.

**Maintenance Engineer** — uses what-if to evaluate PM window proposals before submitting them for planner approval.

## 3. Data Model

M4’s data lives in m4_schedule schema. Core tables track schedules (versioned), scheduled operations (the timeline), what-if scenarios (sandboxed), and pins/overrides (planner intent).

### 3.1 Core Tables

-- =======================================================
-- Schedules — one row per scheduling RUN (versioned)
-- =======================================================
CREATE TABLE m4_schedule.schedules (
  schedule_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version            INTEGER NOT NULL,                 -- monotonic per run within the day
  trigger_type       TEXT NOT NULL,                    -- 'manual' | 'scheduled' | 'event_driven' | 'what_if'
  trigger_event_id   UUID,                             -- FK hint to triggering Kafka event
  trigger_user_id    TEXT,                             -- if manual
  horizon_start      TIMESTAMPTZ NOT NULL,
  horizon_end        TIMESTAMPTZ NOT NULL,
  frozen_until       TIMESTAMPTZ,                      -- jobs starting before this are immutable
  created_at         TIMESTAMPTZ DEFAULT now(),
  status             TEXT NOT NULL,                    -- 'running' | 'feasible' | 'optimised'
                                                       --   | 'infeasible' | 'failed' | 'draft'
                                                       --   | 'approved' | 'published' | 'superseded'
  approved_by        TEXT,
  approved_at        TIMESTAMPTZ,
  published_at       TIMESTAMPTZ,
  superseded_by      UUID REFERENCES m4_schedule.schedules,
  -- Solver outputs
  solver_status      TEXT,                             -- 'OPTIMAL' | 'FEASIBLE' | 'INFEASIBLE' | 'TIMEOUT'
  solver_runtime_ms  INTEGER,
  heuristic_seed_ms  INTEGER,
  -- Schedule KPIs
  total_jobs         INTEGER,
  total_setup_min    INTEGER,
  total_late_jobs    INTEGER,
  total_late_minutes INTEGER,
  objective_score    NUMERIC(12,2),
  -- Inputs snapshot (so we can re-derive WHY this schedule exists)
  input_snapshot     JSONB                             -- WO IDs, capacity bucket refs, M2 versions
);

CREATE INDEX idx_sch_status ON m4_schedule.schedules (status, created_at DESC);
CREATE INDEX idx_sch_published
  ON m4_schedule.schedules (published_at DESC)
  WHERE status = 'published';

-- =======================================================
-- Scheduled operations — the timeline rows
-- One row per (job × line × time window)
-- =======================================================
CREATE TABLE m4_schedule.scheduled_operations (
  op_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id        UUID NOT NULL REFERENCES m4_schedule.schedules ON DELETE CASCADE,
  wo_id              TEXT NOT NULL,                    -- FK to m1_demand.work_orders
  routing_op_seq     INTEGER NOT NULL,                 -- which step of the WO's routing
  wc_id              TEXT NOT NULL REFERENCES master.work_centres,
  op_type            TEXT NOT NULL,                    -- 'production' | 'setup' | 'pm' | 'roll_change' | 'idle_block'
  sequence_in_line   INTEGER NOT NULL,                 -- order within the line
  start_datetime     TIMESTAMPTZ NOT NULL,
  end_datetime       TIMESTAMPTZ NOT NULL,
  duration_min       INTEGER NOT NULL,
  -- Production-specific
  qty_planned_mt     NUMERIC(10,3),
  -- Setup-specific
  predecessor_op_id  UUID REFERENCES m4_schedule.scheduled_operations,  -- which op this setup transitions FROM
  setup_reason       TEXT,                             -- 'grade_change' | 'gauge_change' | 'roll_change' | 'startup'
  -- Constraints flagged
  constraint_warnings JSONB,                           -- e.g., [{"type": "operator_unavailable", "detail": "..."}]
  is_pin             BOOLEAN DEFAULT FALSE,            -- planner-pinned, scheduler did not move
  is_frozen          BOOLEAN DEFAULT FALSE,            -- within the frozen window, immutable
  created_at         TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sop_schedule_line_time
  ON m4_schedule.scheduled_operations (schedule_id, wc_id, start_datetime);
CREATE INDEX idx_sop_wo
  ON m4_schedule.scheduled_operations (wo_id);
CREATE INDEX idx_sop_published
  ON m4_schedule.scheduled_operations (schedule_id, start_datetime)
  WHERE op_type = 'production';

-- =======================================================
-- Planner pins — manual overrides that the scheduler must respect
-- =======================================================
CREATE TABLE m4_schedule.planner_pins (
  pin_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wo_id              TEXT NOT NULL,
  pin_type           TEXT NOT NULL,                    -- 'wc_only' | 'sequence_after' | 'start_at' | 'no_earlier_than'
  pin_target         JSONB NOT NULL,                   -- e.g., {"wc_id": "CRS-1", "start_datetime": "2026-04-18T14:00:00Z"}
  reason             TEXT NOT NULL,
  pinned_by          TEXT NOT NULL,
  pinned_at          TIMESTAMPTZ DEFAULT now(),
  expires_at         TIMESTAMPTZ,                      -- optional auto-release
  is_active          BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_pin_active_wo
  ON m4_schedule.planner_pins (wo_id)
  WHERE is_active = TRUE;

-- =======================================================
-- What-if scenarios — sandboxed schedules, not on live timeline
-- =======================================================
CREATE TABLE m4_schedule.what_if_scenarios (
  scenario_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_schedule_id   UUID NOT NULL REFERENCES m4_schedule.schedules,
  name               TEXT NOT NULL,                    -- planner-given name
  description        TEXT,
  assumptions        JSONB NOT NULL,                   -- the deltas being simulated
  -- e.g., {"outage": {"wc_id": "CRS-2", "start": "...", "duration_min": 240}}
  -- or    {"new_wo": {"qty_mt": 12, "grade": "...", "required_date": "..."}}
  resulting_schedule_id UUID,                          -- the simulated schedule (also lives in schedules table)
  kpi_delta          JSONB,                            -- comparison vs. base
  created_by         TEXT,
  created_at         TIMESTAMPTZ DEFAULT now(),
  is_archived        BOOLEAN DEFAULT FALSE
);

-- =======================================================
-- Schedule run audit — every solver run, win or lose
-- =======================================================
CREATE TABLE m4_schedule.solver_runs (
  run_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id        UUID REFERENCES m4_schedule.schedules,
  triggered_at       TIMESTAMPTZ NOT NULL,
  trigger_type       TEXT NOT NULL,
  input_jobs_count   INTEGER NOT NULL,
  input_pins_count   INTEGER NOT NULL,
  input_outages_count INTEGER NOT NULL,
  heuristic_score    NUMERIC(12,2),
  cp_sat_score       NUMERIC(12,2),
  cp_sat_status      TEXT,
  cp_sat_runtime_ms  INTEGER,
  matrix_misses      JSONB,                            -- changeover transitions not in matrix
  result             TEXT NOT NULL,                    -- 'success' | 'infeasible' | 'timeout' | 'error'
  error_detail       TEXT
);

CREATE INDEX idx_sr_triggered ON m4_schedule.solver_runs (triggered_at DESC);

-- =======================================================
-- Changeover matrix MISSES (for M2 to learn from)
-- =======================================================
CREATE TABLE m4_schedule.matrix_misses (
  miss_id            BIGSERIAL PRIMARY KEY,
  wc_id              TEXT NOT NULL,
  grade_from         TEXT NOT NULL,
  grade_to           TEXT NOT NULL,
  gauge_step         TEXT NOT NULL,
  width_step         TEXT NOT NULL,
  roll_change_req    BOOLEAN NOT NULL,
  fallback_used      INTEGER NOT NULL,                 -- the conservative default applied
  observed_at        TIMESTAMPTZ DEFAULT now(),
  schedule_id        UUID REFERENCES m4_schedule.schedules
);

-- =======================================================
-- Configuration
-- =======================================================
CREATE TABLE m4_schedule.config (
  config_key         TEXT PRIMARY KEY,
  config_value       JSONB NOT NULL,
  updated_by         TEXT,
  updated_at         TIMESTAMPTZ DEFAULT now()
);

-- Seeded:
-- ('horizon_hours', '48')
-- ('frozen_window_minutes', '120')
-- ('cp_sat_time_limit_seconds', '60')
-- ('cp_sat_workers', '4')
-- ('objective_weights', '{"setup_min": 1.0, "lateness_min": 5.0, "priority_violation": 10.0}')
-- ('matrix_miss_default_minutes', '180')
-- ('auto_replan_on_breakdown', 'true')
-- ('auto_replan_on_rush_order', 'true')

### 3.2 Design Notes

**Why schedules are versioned and immutable.** A schedule is a snapshot of a decision made at a point in time, with specific inputs. Editing it in place destroys the audit trail of “what did the planner approve at 06:30, and what changed by 14:00?” Versioning lets us answer questions like “show me how today’s plan evolved across 8 reschedules.”

**Why scheduled_operations carries**** ****predecessor_op_id**** ****for setup events.** Setups are sequence-dependent — the time depends on what just ran. Storing the predecessor lets us validate the setup time against the changeover matrix retroactively, and lets the UI render the chain of “production → setup → production” with correct labelling.

**Why**** ****op_type**** ****includes**** ****idle_block****.** Sometimes the optimal answer is “leave CRS-3 idle from 18:00 to 21:00 because no eligible WO is ready and starting a poor-fit job would cost more in changeover than the idle time costs in opportunity.” Modelling idle as an explicit op_type avoids the silent failure of “nothing scheduled = bug”.

**Why**** ****is_pin**** ****and**** ****is_frozen**** ****are columns on the operation, not on a separate table.** Read performance. The Gantt UI loads operations and immediately needs to know which are immutable. Joining to a pins table on every render adds latency.

### 3.3 Retention

- **Active schedule** (status = published or approved) — indefinite while active

- **Superseded schedules** — 30 days hot in Postgres, then archived to MinIO Parquet

- **Solver runs** — 30 days hot, 1 year archived (supports “why was the scheduler slow last week?”)

- **Matrix misses** — 90 days hot (used by M2’s matrix learner)

- **What-if scenarios** — 30 days hot unless saved by planner with is_archived = false; archived ones move to MinIO

## 4. Event Schemas

### 4.1 Events M4 Publishes

#### plan.schedule.run_started (v1.0)

Published when a scheduling run begins. Used for UI progress indication and observability.

{
  "event_type": "plan.schedule.run_started",
  "aggregate_id": "schedule_abc123",
  "payload": {
    "schedule_id": "abc123",
    "trigger_type": "manual",
    "trigger_user_id": "planner_042",
    "input_jobs_count": 47,
    "input_pins_count": 3,
    "horizon_start": "2026-04-18T06:00:00Z",
    "horizon_end": "2026-04-20T06:00:00Z",
    "frozen_until": "2026-04-18T08:00:00Z"
  }
}

#### plan.schedule.computed (v1.0)

Published when a run completes (success or infeasibility). Carries the schedule headline KPIs.

{
  "event_type": "plan.schedule.computed",
  "aggregate_id": "schedule_abc123",
  "payload": {
    "schedule_id": "abc123",
    "status": "feasible",
    "solver_status": "FEASIBLE",
    "solver_runtime_ms": 4231,
    "kpis": {
      "total_jobs": 47,
      "total_setup_min": 1842,
      "total_late_jobs": 2,
      "total_late_minutes": 240,
      "objective_score": 4612.0
    },
    "vs_previous": {
      "setup_min_delta": -156,
      "late_jobs_delta": 0
    }
  }
}

#### plan.schedule.published (v1.0)

Published when a planner approves a schedule. Downstream: M6 consumes this to generate dispatch lists.

{
  "event_type": "plan.schedule.published",
  "aggregate_id": "schedule_abc123",
  "payload": {
    "schedule_id": "abc123",
    "approved_by": "planner_042",
    "approved_at": "2026-04-18T05:55:00Z",
    "supersedes_schedule_id": "abc12_previous",
    "frozen_until": "2026-04-18T08:00:00Z"
  }
}

#### plan.schedule.infeasible (v1.0)

Published when the solver cannot find a feasible solution. Notification-worthy.

{
  "event_type": "plan.schedule.infeasible",
  "aggregate_id": "schedule_abc123",
  "payload": {
    "schedule_id": "abc123",
    "infeasibility_reasons": [
      {"type": "capacity_overload", "wc_id": "CRS-2", "bucket": "2026-04-19", "shortage_hrs": 4.2},
      {"type": "material_pending", "wo_id": "wo_8893451", "expected_at": "2026-04-19T14:00:00Z"}
    ],
    "recommended_actions": [
      "Defer wo_8893520 to 2026-04-20 (clears CRS-2 overload)",
      "Wait until 2026-04-19T14:00:00Z for wo_8893451 material readiness"
    ]
  }
}

#### plan.scheduled_operation.changed (v1.0)

Published when an individual op’s start/end shifts more than a threshold (default 15 min) between consecutive published schedules. M6 consumes this for floor notification.

{
  "event_type": "plan.scheduled_operation.changed",
  "aggregate_id": "op_def456",
  "payload": {
    "op_id": "def456",
    "wo_id": "wo_8893451",
    "wc_id": "CRS-2",
    "previous_start": "2026-04-18T11:30:00Z",
    "new_start": "2026-04-18T13:15:00Z",
    "delay_minutes": 105,
    "reason": "predecessor_breakdown"
  }
}

### 4.2 Events M4 Consumes

| Event | From | M4 Behaviour |
| --- | --- | --- |
| erp.work_order.received | M1 | If priority class A → trigger replan; else queue for next scheduled run |
| erp.work_order.cancelled | M1 | Remove from active schedule; trigger replan if op was unfrozen |
| demand.priority.recalculated | M1 | If significant (Δ > 20 or class change) → trigger replan |
| demand.priority.overridden | M1 | If type = ‘rush’ → trigger immediate replan |
| master.changeover_matrix.updated | M2 | Invalidate solver cache; trigger replan if any affected transition is in current schedule |
| master.calendar.updated | M2 | If horizon-overlapping → trigger replan |
| plan.capacity.calculated | M3 | Update capacity gate state; if any red bucket in next 7d → block manual replan with reason |
| plan.capacity.overload_detected | M3 | If in next 24h → notify planner; do not auto-replan |
| material.coil.allocated | M5a | If WO was material-blocked → unblock and queue for next replan |
| material.coil.shortage_detected | M5a | If WO is in active schedule → flag the op as at-risk |
| asset.pm.scheduled | M5c | Add to fixed unavailable windows; trigger replan if overlaps horizon |
| asset.pm.cancelled | M5c | Remove from unavailable windows; trigger replan |
| asset.breakdown.reported | M5c | If auto_replan_on_breakdown = true → immediate replan starting post-frozen-window |
| asset.breakdown.resolved | M5c | If sooner than expected → trigger replan to recover capacity |
| floor.production.completed | M6→M7 | Update WO actual qty; if WO complete, remove from active schedule |
| floor.setup.completed | M6 | Capture actual vs planned setup variance for changeover matrix learning |

### 4.3 Event Volume

At Hero Steels:

- Scheduled runs: ~10/day (every 4 hours + on-demand)

- Event-triggered runs: ~5–8/day (rush orders, breakdowns, master data changes)

- plan.scheduled_operation.changed events per replan: ~5–15 (only ops that materially shifted)

Manageable volume; no special partitioning beyond the standard partition key (schedule_id).

## 5. Ingestion Flow

M4 doesn’t ingest in the M1 sense. It *gathers inputs* at the start of each scheduling run.

### 5.1 The Input Gathering Sequence

When a scheduling run is triggered, the M4 Scheduler API does the following in order. Total latency target: < 500ms before solver invocation.

def gather_inputs(trigger):
    # 1. Capacity gate check
    capacity_summary = m3_client.get_summary()
    if capacity_summary.has_red_buckets_in_next_7d() and not trigger.force:
        return InfeasibilityReport("capacity_blocked", capacity_summary)

    # 2. Pull demand queue
    queue = m1_client.get_queue(limit=200, include_scheduled=True)

    # 3. Pull master data (cached, refreshed on master.*.updated events)
    wcs        = m2_client.get_work_centres()
    routings   = m2_client.get_routings_for(materials=queue.materials)
    matrix     = m2_client.get_changeover_matrix_full()
    calendars  = m2_client.get_calendars(wc_ids=wcs.ids,
                                          from_=horizon_start, to_=horizon_end)
    skills     = m2_client.get_operator_skills()

    # 4. Pull material readiness
    material   = m5a_client.get_readiness_for_wos(queue.wo_ids)

    # 5. Pull active pins
    pins       = m4_repo.get_active_pins()

    # 6. Pull current published schedule (for frozen window extraction)
    current    = m4_repo.get_current_published()
    frozen_ops = current.ops_in_frozen_window() if current else []

    # 7. Pull active maintenance windows
    pm_windows = m5c_client.get_pm_windows_in_horizon()
    active_breakdowns = m5c_client.get_active_breakdowns()

    return SchedulingInputs(queue, wcs, routings, matrix, calendars,
                             skills, material, pins, frozen_ops,
                             pm_windows, active_breakdowns)

**Caching.** Master data (wcs, routings, matrix, calendars, skills) is cached with event-driven invalidation per Phase 0 §5.5. The other reads are live every run.

**Failure handling.** If any input source is unreachable:

- M3 unreachable → run with last-known capacity state, log warning

- M5a unreachable → run treating all WOs as material-ready, log warning

- M2 unreachable → fail run (cannot schedule without master data); alert

- M1 unreachable → fail run (cannot schedule without demand); alert

### 5.2 Input Validation

Before the solver runs, validate inputs:

- Every WO has a routing → if not, exclude that WO + log

- Every routing operation has a non-zero std rate → if not, exclude WO + log

- Every WO with material requirement is either material-ready or planner-overridden → if not, exclude

- Every active pin references a real WO → if WO is gone, deactivate pin + log

- PM windows don’t overlap each other on same line → if conflict, use earlier + log

Excluded WOs are returned in the schedule response under unscheduled_jobs with reasons.

## 6. Processing Logic — The Scheduler

The heart of M4. Two-phase: **heuristic seed**, then **CP-SAT polish**.

### 6.1 Phase 1 — Heuristic Seed (Steel-Vertical Rules)

Goal: produce a feasible schedule fast (< 500ms) that beats “random”. The CP-SAT phase improves on this.

**Algorithm: Priority-Sequenced Greedy with Changeover Lookahead**

Initialise:
  for each wc in eligible_work_centres:
    timeline[wc] = list of fixed unavailable windows (PM, breakdowns, frozen ops)
    last_state[wc] = (last grade, last gauge, last width, last roll set) 
                       — derived from current frozen ops or "startup"

Sort WOs:
  primary key: priority_score DESC
  tie-break:   required_date ASC

For each wo in sorted_wos:
  candidate_lines = eligible_lines(wo)
  best_placement = None
  best_score = +infinity

  for wc in candidate_lines:
    # Find earliest available window of sufficient size
    setup_min = lookup_changeover(matrix, last_state[wc], wo.signature)
    op_duration = wo.qty_planned_mt / wc.std_rate_for(wo.material)
    needed_min = setup_min + op_duration

    earliest_slot = find_earliest_window(timeline[wc], needed_min, no_earlier_than=now+frozen_minutes)
    
    if earliest_slot is None:
      continue   # WO won't fit on this line in horizon

    # Score this placement
    lateness = max(0, earliest_slot.end - wo.required_date)
    score = setup_min + 5 * lateness   # heuristic weights match objective

    if score < best_score:
      best_score = score
      best_placement = (wc, earliest_slot, setup_min, op_duration)

  if best_placement is None:
    unscheduled.append((wo, "no_feasible_line"))
    continue

  # Commit placement
  wc, slot, setup_min, op_duration = best_placement
  insert_setup_op(wc, slot.start, setup_min, predecessor=last_op[wc])
  insert_production_op(wc, slot.start + setup_min, op_duration, wo)
  update timeline[wc] and last_state[wc]

**Why this works as a seed.**

- Priority is honoured — high-priority WOs claim slots first

- Changeover lookahead means same-grade WOs naturally cluster on the same line

- It’s deterministic — same inputs produce same output (essential for debugging)

- It’s explainable — the planner can see exactly why each WO landed where it did

- It’s fast — ~500ms for 50 WOs at Hero Steels scale

**Limitations.** The greedy doesn’t see global trade-offs. WO X might be best-placed on CRS-1 in isolation but, by displacing WO Y, may force Y onto CRS-2 with a costly grade transition. CP-SAT handles this.

### 6.2 Phase 2 — CP-SAT Optimisation

Wrap the heuristic seed in a CP-SAT model and let OR-Tools improve it. Time-boxed.

**Variables.**

- start[op] — integer minute offset from horizon_start, for each scheduled op

- assign[wo, wc] — boolean, 1 if WO is on this line

- predecessor[op] — which prior op on same line; modelled via interval no-overlap

- setup_time[op_pair] — integer, lookup from changeover matrix

**Constraints (the named, inspectable list).**

| # | Constraint | Type | Description |
| --- | --- | --- | --- |
| C1 | Single-line assignment | Hard | Each WO assigned to exactly one eligible wc |
| C2 | Operation precedence | Hard | Setup before production for the same WO |
| C3 | No-overlap per line | Hard | Operations on the same line don’t overlap |
| C4 | Capacity windows | Hard | No op straddles a PM/breakdown window |
| C5 | Changeover time | Hard | If op B follows op A on same line, gap ≥ matrix(A.signature, B.signature) |
| C6 | Frozen ops | Hard | Ops within frozen window have fixed start |
| C7 | Planner pins | Hard | Pinned WOs honour their pin (wc_only / start_at / sequence_after / no_earlier_than) |
| C8 | Material readiness | Hard | An op cannot start before its WO’s material is ready |
| C9 | Required date soft target | Soft | Penalty per minute late = 5 (configurable) |
| C10 | Operator certification | Soft | Penalty if no certified operator for grade × line × shift |
| C11 | Roll-life ceiling | Soft | Penalty for scheduling beyond a roll’s remaining MT capacity (forces roll change) |

**Objective function.** Minimise:

total_setup_minutes 
  + 5 * total_lateness_minutes
  + 10 * priority_violation_count
  + 2 * operator_violation_count
  + 1 * roll_change_count

Weights are configurable (m4_schedule.config.objective_weights). Defaults chosen so that:

- Setup minutes are the unit (1 setup minute = 1 unit of badness)

- Lateness is 5× more painful than setup (mostly to break ties)

- Priority violations (an A-class WO scheduled later than a C-class WO without justification) cost 10× — strongest signal

- Operator violations cost 2× (warning-level, not blocking)

- Roll changes cost 1× (small bias toward consolidating)

**Solver invocation.**

from ortools.sat.python import cp_model

model = cp_model.CpModel()
# ... define variables and constraints ...

solver = cp_model.CpSolver()
solver.parameters.max_time_in_seconds = config.cp_sat_time_limit_seconds  # default 60
solver.parameters.num_search_workers = config.cp_sat_workers              # default 4
solver.parameters.relative_gap_limit = 0.05                                # 5% optimality gap acceptable

# Hint with heuristic seed values
for op_id, start_value in heuristic_seed.items():
    model.AddHint(start_var[op_id], start_value)

status = solver.Solve(model)

if status == cp_model.OPTIMAL or status == cp_model.FEASIBLE:
    # Extract solution
    return extract_schedule(solver, model)
elif status == cp_model.INFEASIBLE:
    # Fall back to heuristic seed; flag infeasibility
    return heuristic_seed_with_flag()
elif status == cp_model.UNKNOWN:  # timeout
    # Use best-found-so-far
    return solver.Value(...)  # extract whatever was found

**Why hint with heuristic seed.** CP-SAT explores feasibility space more efficiently when given a good starting point. The seed turns “find a solution” into “find a better solution than this” — usually 10× faster convergence.

**Why 5% gap acceptable.** True optimality is exponentially expensive at scale. 5% off-optimal is operationally indistinguishable, and the solver returns much faster.

### 6.3 Changeover Matrix Lookup — The Critical Path

Every constraint C5 evaluation is a matrix lookup. Done naively, this is slow. Done well, it’s negligible.

**In-memory matrix snapshot.** At the start of each scheduling run, M4 loads the entire active changeover matrix into a Python dict structure:

matrix = {
    ("CRS-1", "IS513-D", "IS513-D", "same", "same", False): 25,
    ("CRS-1", "IS513-D", "IS513-D", "step_up", "same", False): 45,
    ("CRS-1", "IS513-D", "DD-grade", "same", "same", True): 195,
    # ... ~5,000 entries at full coverage
}

Lookup is O(1).

**Matrix misses.** If a transition isn’t in the matrix:

def lookup_changeover(matrix, from_state, to_state):
    key = compose_key(from_state, to_state)
    if key in matrix:
        return matrix[key]
    # Try fallback strategies:
    # 1. Same wc, same grade families, ignore width step
    fallback_key = relax(key, ignore=["width_step"])
    if fallback_key in matrix:
        return matrix[fallback_key]
    # 2. Conservative default
    record_miss(from_state, to_state)
    return config.matrix_miss_default_minutes  # default 180

Misses are recorded in matrix_misses table for M2’s nightly Changeover Learner to evaluate.

### 6.4 Schedule Stability — Why Reschedules Don’t Thrash

A bad scheduler reshuffles everything every time inputs change. That destroys floor confidence. M4 stabilises via:

**1. Frozen window.** First 2 hours (configurable) are immutable — already dispatched, operators are committed.

**2. Pin inheritance.** Active pins persist across reschedules.

**3. Stability bonus in objective.** When re-running a schedule, add a small bonus for ops that maintain their previous start time (within ±15 min):

objective += 0.5 * count_of_ops_within_15min_of_previous_start

This biases the solver to prefer “minor adjustment” over “complete redo” when both produce similar headline KPIs.

**4. Diff threshold for**** ****plan.scheduled_operation.changed****.** Only emit change events when shifts exceed 15 minutes. Floor doesn’t see micro-adjustments.

### 6.5 What-If Engine

What-if runs are isolated. They:

- Clone the current schedule’s input snapshot

- Apply the assumption deltas (e.g., add an outage window, inject a new WO, change a priority)

- Run the full solver against the modified inputs

- Store the result with trigger_type = 'what_if' and link it to a what_if_scenarios row

- Compute KPI delta vs. base

- Never publish — strictly read for planner inspection

What-if scenarios are killable mid-run if planner navigates away (saves solver compute).

### 6.6 Trigger Logic

| Trigger | Auto-replan? | Frozen window respected? |
| --- | --- | --- |
| Manual user click | Yes | Yes |
| Scheduled (every 4 hours by default) | Yes | Yes |
| Rush WO (priority override) | Yes (if config flag) | Yes |
| Priority class change A↔B | Yes | Yes |
| Master data update affecting horizon | Yes | Yes |
| PM scheduled within horizon | Yes | Yes |
| Breakdown reported | Yes (if config flag) | Yes |
| Material ready (was blocked) | Queued for next scheduled run | — |
| Capacity overload detected | No (notification only) | — |

Auto-replan triggers can be disabled per-trigger via config — gives ops the ability to disable e.g., breakdown auto-replan if it’s causing thrashing during a particularly chaotic week.

### 6.7 Solver Performance Envelope

At Hero Steels scale (50 jobs, 3 lines, 48-hour horizon, ~5,000-entry matrix):

| Phase | p50 | p95 | p99 |
| --- | --- | --- | --- |
| Input gathering | 320ms | 480ms | 800ms |
| Heuristic seed | 180ms | 350ms | 600ms |
| CP-SAT solve | 8 sec | 35 sec | 60 sec (timeout) |
| Total | ~9 sec | ~36 sec | ~62 sec |

Within JTBD-1’s “less than 5 minutes” target with comfortable margin.

For reference: at 200 jobs (4× scale), CP-SAT p95 climbs to ~90 sec — still within target. Beyond ~500 jobs, CP-SAT may need decomposition (per-line solving with coordination layer) — Phase 3 concern.

## 7. Storage Strategy

### 7.1 Schedule Versioning Storage Pattern

Schedules grow by ~1 KB header + ~200 bytes per scheduled operation.

At Hero Steels: 50 ops/run × ~20 runs/day = ~1,000 op rows/day plus ~20 schedule rows/day.

Annual: ~365K op rows, ~7K schedule rows. Trivial volume.

**Cleanup pattern.** Superseded schedules retained 30 days hot, then archived to MinIO Parquet. The archive is queryable for “show me all schedules from last quarter” via a separate read API that uses MinIO as the source.

### 7.2 Indexes for Hot-Path Queries

Three queries dominate:

**Q1:**** ****“****Render the current Gantt for the next 48 hours.****”**

SELECT * FROM m4_schedule.scheduled_operations
WHERE schedule_id = (SELECT id FROM published_schedule_view)
  AND start_datetime BETWEEN $now AND $now + INTERVAL '48 hours'
ORDER BY wc_id, start_datetime;

Index idx_sop_schedule_line_time covers this.

**Q2:**** ****“****Show me where this WO is in the schedule.****”**

SELECT * FROM m4_schedule.scheduled_operations
WHERE wo_id = $wo_id AND schedule_id = (current published);

Index idx_sop_wo covers this.

**Q3:**** ****“****List all currently published ops for dispatch generation.****”**

SELECT * FROM m4_schedule.scheduled_operations
WHERE schedule_id = $current AND op_type = 'production'
ORDER BY wc_id, sequence_in_line;

Partial index idx_sop_published covers this.

### 7.3 Materialised View — Current Published Schedule

A view m4_schedule.current_published returns the latest published schedule_id and its operations. Refreshed on plan.schedule.published event.

This avoids needing every consumer to do a SELECT MAX(published_at) lookup.

### 7.4 Solver State Persistence

Solver runs that fail or timeout are recorded in solver_runs. The model and inputs are NOT persisted (too large, ~10–50 MB serialised). Instead, the input snapshot in schedules.input_snapshot (just IDs + timestamps) is enough to re-construct inputs deterministically by re-querying source modules.

This means: “re-run schedule X with same inputs” is feasible — query M1/M2/M5a at the snapshot’s created_at time and re-build.

## 8. API Surface

All endpoints at /api/m4/*.

### 8.1 Read APIs

#### GET /api/m4/schedule/current

Returns the currently published schedule with all scheduled operations. Used by the Gantt UI and by M6.

**Response:**

{
  "schedule_id": "abc123",
  "version": 17,
  "status": "published",
  "approved_by": "planner_042",
  "approved_at": "2026-04-18T05:55:00Z",
  "horizon_start": "2026-04-18T06:00:00Z",
  "horizon_end": "2026-04-20T06:00:00Z",
  "frozen_until": "2026-04-18T08:00:00Z",
  "kpis": {
    "total_jobs": 47,
    "total_setup_min": 1842,
    "total_late_jobs": 2,
    "total_late_minutes": 240,
    "objective_score": 4612.0
  },
  "operations": [
    {
      "op_id": "def456",
      "wo_id": "wo_8893451",
      "wc_id": "CRS-2",
      "op_type": "production",
      "sequence_in_line": 3,
      "start_datetime": "2026-04-18T11:30:00Z",
      "end_datetime": "2026-04-18T13:42:00Z",
      "duration_min": 132,
      "qty_planned_mt": 18.45,
      "is_pin": false,
      "is_frozen": false,
      "constraint_warnings": []
    }
    /* ... */
  ]
}

#### GET /api/m4/schedule/{schedule_id}

Returns a specific schedule version (current or historical). Used for “show me yesterday’s schedule”.

#### GET /api/m4/schedule/gantt

Optimised Gantt data feed. Includes pre-rendered colour codes, labels, tooltips. Used by the Gantt UI for fast first paint.

**Query params:** wc_id (filter), from, to, include_setups (bool, default true), include_pm (bool, default true).

#### GET /api/m4/schedule/diff

Compare two schedules (default: current vs. previous published). Returns:

- Operations added (new in schedule B)

- Operations removed (in A, not B)

- Operations shifted (same op_id, different start_datetime)

- KPI deltas

Used by the planner to understand what changed across reschedules.

#### GET /api/m4/wo-status/{wo_id}

Returns the scheduling state of a WO: scheduled / unscheduled / frozen / in-progress. Used by M1’s WO detail pane.

#### GET /api/m4/solver-history

Audit view of solver runs. Required role: planner+. Lists last N runs with status, runtime, KPIs.

### 8.2 Write APIs

#### POST /api/m4/schedule/run

Triggers a scheduling run.

**Request body:**

{
  "trigger_type": "manual",
  "horizon_hours": 48,
  "frozen_window_minutes": 120,
  "force_capacity_override": false
}

Response: schedule_id immediately; the run executes async. Subscribe to plan.schedule.computed event for completion.

For impatient UIs, also supports ?wait=true&timeout_seconds=10 to block for short runs.

#### POST /api/m4/schedule/{schedule_id}/approve

Planner approves a draft schedule for publication. Required role: planner+.

Effect:

- Sets schedule status to approved then published

- Sets previous schedule’s superseded_by and status to superseded

- Publishes plan.schedule.published event

- Triggers M6 dispatch list generation

Soft-validate: if any constraint warnings exist, modal asks planner to confirm.

#### POST /api/m4/schedule/{schedule_id}/reject

Reject a computed schedule with reason. Required role: planner+. Triggers analysis suggestions (“the rejected schedule had 200 lateness minutes; would you like to: (a) adjust priorities, (b) defer specific WOs, (c) request overtime authorisation?”).

#### PATCH /api/m4/schedule/operations/{op_id}

Drag-drop override. Planner moves an op to a new start time and/or new line.

**Request body:**

{
  "new_start_datetime": "2026-04-18T14:00:00Z",
  "new_wc_id": "CRS-1",
  "create_pin": true,
  "pin_reason": "Customer escalation: must run on CRS-1 (better surface finish)"
}

Effect:

- If create_pin = true: creates a planner_pin for this WO with the specified target

- Triggers an immediate replan (the rest of the schedule re-optimises around the pin)

- Returns the new schedule_id

#### POST /api/m4/pins

Direct pin creation API (without drag-drop). Required role: planner+.

#### DELETE /api/m4/pins/{pin_id}

Release a pin. Triggers replan.

#### POST /api/m4/what-if

Create a what-if scenario.

**Request body:**

{
  "name": "CRS-2 outage Thursday for 16 hrs",
  "description": "Maintenance proposal review",
  "base_schedule_id": "abc123",
  "assumptions": {
    "outages": [
      {"wc_id": "CRS-2", "start": "2026-04-25T06:00:00Z", "duration_min": 960}
    ]
  }
}

Returns scenario_id + resulting_schedule_id when computation completes.

#### GET /api/m4/what-if/{scenario_id}/compare

KPI comparison of scenario vs. base. Used by what-if review UI.

#### POST /api/m4/what-if/{scenario_id}/promote

Promote a what-if scenario to a real planning run. Effectively: copy assumptions into reality (e.g., schedule the PM window in M5c, then trigger a real M4 run).

### 8.3 Admin APIs

#### PUT /api/m4/config

Update solver parameters, time limits, weights, auto-replan flags. Required role: master_data_admin.

#### GET /api/m4/diagnostics

Recent solver runs, slowest queries, cache hit rates, matrix coverage stats.

#### POST /api/m4/cache/invalidate

Force master data cache refresh. Required role: platform_admin.

### 8.4 Rate Limits

- Reads: 600/min/user

- Schedule run trigger: 10/hour/user (manual runs are intentional)

- What-if creation: 30/hour/user (computationally expensive)

- Approval: 60/hour/user

- Pin operations: 60/min/user (drag-drop can be rapid)

## 9. UI/UX Specification

M4’s UI is the most operationally important surface. Three primary screens.

### 9.1 Screen — The Gantt

The single most-viewed screen in the entire Zedral product.

**Layout (desktop, 1920×1080 baseline):**

┌────────────────────────────────────────────────────────────────────────┐
│ Header: Current Schedule v17 · Published 06:00 by Planner Y · 47 jobs │
│ KPIs: Setup 1,842 min · Late 2 jobs (240 min) · Score 4,612          │
│ Actions: [Run Schedule] [Approve] [What-If] [Diff vs Previous]         │
├────────────────────────────────────────────────────────────────────────┤
│ Time → 06:00  08:00  10:00  12:00  14:00  16:00  18:00  20:00  22:00 │
│       ┌───────────────────────────────────────────────────────────────┐│
│ CRS-1│ ▓▓░░│■■■■■■│░░│■■■■■■■■■■│░░│■■■■■■■■│░░░░│■■■■■■■■■■■■■   ││
│       │  S  │  WO-A│ S│  WO-B    │ S│  WO-C  │ PM │  WO-D            ││
│       └───────────────────────────────────────────────────────────────┘│
│       ┌───────────────────────────────────────────────────────────────┐│
│ CRS-2│ ▓▓▓░░░│■■■■■■■■■■■■■■│░░│■■■■■■■■■■│░░│■■■■■■■■■■■■           ││
│       │  S    │  WO-E (LATE) │ S│   WO-F   │ S│   WO-G                ││
│       └───────────────────────────────────────────────────────────────┘│
│       ┌───────────────────────────────────────────────────────────────┐│
│ CRS-3│ ▓▓░░│■■■■■■■■■■■■■■■■■│░░│IDLE│■■■■■■■■■■■■■■■■■■            ││
│       │  S  │  WO-H 📌 PINNED │ S│    │   WO-I                        ││
│       └───────────────────────────────────────────────────────────────┘│
│                                                                        │
│ Legend: ▓ Frozen · ░ Setup · ■ Production · 📌 Pinned · LATE Risk     │
└────────────────────────────────────────────────────────────────────────┘

**Visual encoding.**

- Each line is a horizontal swimlane

- Production ops are solid coloured bars (color = priority class: red=A, amber=B, green=C)

- Setup ops are grey hashed bars

- PM ops are blue

- Idle is light grey

- Frozen ops have a dark border

- Pinned ops have a 📌 icon

- Late ops have a “LATE” overlay tag in red

**Interactions.**

- **Click an op** → side panel with full details (WO info, predecessor changeover detail, constraint warnings, planner notes)

- **Drag an op** within or across lanes → opens “Move and pin” confirmation modal

- **Right-click** → context menu (Pin, View WO in M1, Mark as urgent, Add note)

- **Zoom** keyboard shortcuts: +/- for time-axis zoom (1h, 4h, 12h, 24h, 48h, 7d)

- **Filter** sidebar: by line, by priority class, by customer, by grade family

**Performance.** Virtualised rendering using React Flow + custom node renderer. Initial load < 800ms for 200 ops. Smooth 60fps panning at any zoom level.

### 9.2 Screen — Schedule Run Workflow

When the planner clicks “Run Schedule”:

- **Pre-run gate.** Modal shows current capacity status from M3, current pin count, current material readiness summary. Planner sees: “47 WOs ready, 3 pins active, capacity OK, click Run to proceed.”

- **In-progress overlay.** Real-time progress: “Heuristic seed complete (380ms) · CP-SAT running… 12s elapsed, current best: 4,800”. Cancel button always available.

- **Result preview.** When complete, side-by-side comparison:

- Current published vs. proposed new

- KPI delta (setup -156 min, late -1 job)

- Operations changed list

- Constraint warnings (if any)

- **Decision.** Three buttons: **Approve ****&**** Publish** · **Adjust Pins ****&**** Re-run** · **Reject**.

### 9.3 Screen — What-If Workspace

A dedicated workspace, not a modal — what-ifs are exploratory and may take time.

**Left rail.** Saved scenarios with a starred/recent list.

**Main area.** Side-by-side: base schedule on left, scenario schedule on right. KPI comparison strip on top. Operations highlighted if they differ.

**Bottom panel.** Assumptions editor — add outages, inject WOs, adjust priorities, change PM windows. Each change can be “applied” individually or batched.

**Top-right action.** “Promote to Reality” — triggers the chain of changes in production modules.

### 9.4 Schedule Diff View

Modal showing the diff between two schedule versions:

- **Added** ops (new WOs, etc.)

- **Removed** ops (cancelled WOs, deferred WOs)

- **Shifted** ops (same op, new time) — with delta minutes shown

- **Reassigned** ops (same WO, new line)

Used after every reschedule. Especially useful after auto-replans on breakdowns.

### 9.5 Embedded Component — Schedule Strip

A compact timeline strip embeddable in:

- M1 WO detail (shows where this specific WO is in the schedule)

- M5c Maintenance scheduler (shows current schedule context for PM proposal)

- M7 dashboard (executive-level rollup)

### 9.6 Notifications and Indicators

- **Schedule needs approval** — orange banner persistent until approved

- **Replan triggered** — toast notification with reason (“Breakdown on CRS-2 detected · replanning…”)

- **Schedule infeasible** — red modal with reasons and recommended actions

### 9.7 Accessibility

- Color encoding paired with patterns and text labels (color-blind safe)

- Full keyboard navigation through Gantt cells

- Screen reader: “CRS-2, work order 8893451, production, starts 11:30, ends 13:42, priority A, late by 30 minutes”

- High-contrast mode toggleable

### 9.8 Performance SLOs

- Gantt initial load: < 800ms p95

- Op detail panel open: < 200ms p95

- Drag-drop confirm to replan-complete: < 60s p95

- What-if run: < 90s p95

## 10. Integration with Other Modules

### 10.1 M4 ← M1 (Demand)

Reads GET /api/m1/work-orders/queue at start of each run. Subscribes to demand events for triggers.

### 10.2 M4 ← M2 (Master Data)

Reads work centres, routings, changeover matrix, calendars, operator skills. Cache-with-event-invalidation.

### 10.3 M4 ← M3 (Capacity)

Subscribes to plan.capacity.calculated and .overload_detected. Uses M3 as the gate before run; refuses to schedule into overloaded buckets.

### 10.4 M4 ← M5a (Material)

Reads material readiness for each WO. Subscribes to material.coil.allocated and .shortage_detected.

### 10.5 M4 ← M5c (Maintenance)

Subscribes to PM and breakdown events. Modes available unavailable windows fed into the solver.

### 10.6 M4 → M6 (Dispatch)

Publishes plan.schedule.published. M6 consumes this to generate dispatch lists. M6 also reads via GET /api/m4/schedule/current for the data.

### 10.7 M4 → M7 (Performance)

Publishes plan.schedule.computed. M7 uses this for schedule adherence tracking, plan-vs-actual analysis.

### 10.8 M4 → M1 (Demand)

When a planner approves a schedule, M4 calls PATCH /api/m1/work-orders/{wo_id}/status to set status to scheduled for newly-scheduled WOs.

### 10.9 M4 → M2 (Master Data)

Records changeover matrix misses to m4_schedule.matrix_misses, which M2’s nightly Changeover Learner consumes.

## 11. SAP Bidirectional Mapping

### 11.1 Inbound from SAP — None Direct

M4 does not integrate with SAP. All SAP-sourced data reaches M4 via M1 (WOs) and M2 (master data).

### 11.2 Outbound to SAP — None Direct in v1

The schedule itself is not written to SAP. Production confirmations (which originate from M6 actuals via M7) are the only SAP write-back path, and they’re owned by M7.

**Phase 2+ optional:** writing planned start dates back to SAP PP for visibility (cosmetic; nice for the Sales team to see in SAP). Requires Basis extension. Deferred.

## 12. Failure Modes & Recovery

### 12.1 Solver Failures

| Mode | Detection | Recovery |
| --- | --- | --- |
| CP-SAT infeasible | Solver returns INFEASIBLE | Use heuristic seed; flag schedule status as infeasible; surface infeasibility reasons to planner |
| CP-SAT timeout (60s) | Solver returns UNKNOWN | Use best-found-so-far; mark status as feasible not optimised; log |
| OR-Tools crash (rare) | Exception caught | Retry once with smaller time budget; if fails again, fall back to heuristic seed only; alert |
| Heuristic seed crash | Exception caught | Critical alert; no schedule produced; planner sees error UI; previous schedule remains active |

### 12.2 Input Failures

| Mode | Detection | Recovery |
| --- | --- | --- |
| M2 cache stale + M2 unreachable | Cache TTL + connect error | Use stale cache for run; mark schedule as “computed with stale master data”; warning banner |
| M1 queue empty | Empty result | Schedule run produces empty schedule; this is a valid state (“nothing to do”) |
| WO missing routing | NULL JOIN | Exclude from this run; log; surface as unscheduled_jobs reason |
| Material data unavailable from M5a | Connect error | Treat all WOs as material-ready; warn; log |

### 12.3 Schedule Publication Failures

| Mode | Detection | Recovery |
| --- | --- | --- |
| plan.schedule.published event publish fails | Outbox pattern | Outbox relay retries; M6 eventually receives event when Redpanda recovers |
| M6 doesn’t generate dispatch list within 30s of publish | Monitoring timeout | Alert; supervisor falls back to viewing the M4 Gantt directly |

### 12.4 Stability Failures

| Mode | Detection | Recovery |
| --- | --- | --- |
| Replan thrashing (every 5 min, schedule changes drastically) | Schedule diff metric | Auto-disable certain auto-replan triggers temporarily; alert ops; suggest planner intervention |
| Pin proliferation (>20 active pins) | Pin count metric | Warning banner: “Many pins active — consider reviewing whether all are still needed” |
| Frequent infeasibility | Solver run audit metric | Indicates upstream data quality issue; alert with diagnostic summary |

### 12.5 Performance Degradation

| Mode | Detection | Recovery |
| --- | --- | --- |
| Solver runtime > p99 baseline | Prometheus metric | Alert; investigate matrix size, jobs count, constraint complexity |
| Cache miss rate > 30% | Cache metric | Investigate event invalidation; may need TTL adjustment |
| API latency degradation | Prometheus | Investigate DB; usually a missing index or large schedule version retrieved |

## 13. Acceptance Criteria

### 13.1 Functional Acceptance

- ☐ Manual schedule run produces a feasible schedule for the next 48 hours within 5 minutes

- ☐ Heuristic seed completes < 500ms

- ☐ CP-SAT runs and improves on heuristic in ≥ 70% of runs (pilot data)

- ☐ All 11 named constraints implemented and unit-tested

- ☐ Frozen window honoured — no op moves within first 2 hours

- ☐ Planner pins honoured (all 4 pin types: wc_only / start_at / sequence_after / no_earlier_than)

- ☐ Drag-drop override creates pin and triggers replan; result reflects the pin

- ☐ What-if scenarios run isolated; do not affect live schedule

- ☐ Auto-replan on breakdown produces a new schedule within 60s of the breakdown event

- ☐ Auto-replan on rush order WO produces a new schedule within 60s

- ☐ Schedule diff view correctly shows added/removed/shifted/reassigned ops

- ☐ All events publish per schema

- ☐ M6 confirmed receiving plan.schedule.published and generating dispatch lists

- ☐ M7 confirmed consuming plan.schedule.computed for adherence analytics

### 13.2 Non-Functional Acceptance

- ☐ Solver runtime: p50 < 10s, p95 < 60s at 50-job scale

- ☐ API p95 latencies meet §9.8

- ☐ Memory footprint of solver process < 2 GB per run

- ☐ No solver crash in 1,000-run soak test

- ☐ Schedule storage growth within projected envelope

- ☐ All 10 Architectural Principles verified

### 13.3 Pilot Validation

- ☐ Hero Steels planner can complete morning planning (JTBD-1) in < 5 min from clicking Run

- ☐ Rush order absorption (JTBD-2) demonstrably works on a real rush event

- ☐ Breakdown auto-replan (JTBD-3) demonstrably recovers on a real breakdown

- ☐ Drag-drop pin (JTBD-4) feels responsive (< 5s end-to-end)

- ☐ What-if (JTBD-5) used by maintenance team to evaluate ≥ 3 PM proposals during pilot

- ☐ Planner explanation (JTBD-6) — supervisor reports they understand the schedule

- ☐ Trust metric (JTBD-7) — month-on-month avg setup minutes drop ≥ 15% by month 6

### 13.4 Documentation

- ☐ OpenAPI spec

- ☐ Event schemas in Apicurio

- ☐ Solver model documentation (every constraint named, every variable described)

- ☐ Runbook: “Solver returning infeasible — diagnostic guide”

- ☐ Runbook: “Solver timing out — performance tuning guide”

- ☐ Runbook: “Replan thrashing — stability tuning guide”

- ☐ Planner user guide (15–20 pages, screenshots, scenarios)

### 13.5 Rollback Plan

If M4 fails post-go-live:

- Planner falls back to manual scheduling (whiteboard + Excel) — status quo before Zedral

- M6 continues to dispatch the last-published schedule (which remains valid until the planner explicitly invalidates it)

- M3 capacity view continues independently

- Recovery: redeploy previous M4 version via standard Zedral Update rollback

## 14. Build Plan

### 14.1 Phases

| Sub-phase | Duration | Deliverable |
| --- | --- | --- |
| **M4.0** — Foundation | Week 1 | Service skeleton, schema, config seeded, OR-Tools spike on synthetic data |
| **M4.1** — Heuristic seed | Weeks 2–3 | Priority-sequenced greedy with changeover lookahead; deterministic and tested |
| **M4.2** — CP-SAT model | Weeks 3–5 | All 11 constraints implemented; objective function tuned; OR-Tools wrapper |
| **M4.3** — Input gathering | Week 4 | M1/M2/M3/M5a/M5c integration; caching; failure handling |
| **M4.4** — Schedule lifecycle | Week 5 | Versioning, approval, publication, supersession |
| **M4.5** — Pins | Week 6 | All 4 pin types; pin persistence across replans |
| **M4.6** — Auto-replan triggers | Week 6 | Event subscriptions; trigger logic per §6.6 |
| **M4.7** — Solver perf tuning | Week 7 | Hot-path profiling; matrix snapshot optimisation; warm-start with hints |
| **M4.8** — APIs | Week 7 | All read/write endpoints; OpenAPI spec |
| **M4.9** — Gantt UI | Weeks 7–9 | React Flow-based Gantt with drag-drop, filtering, op detail |
| **M4.10** — What-if engine | Week 9 | Scenario isolation, KPI comparison UI, promote-to-reality |
| **M4.11** — Diff view | Week 9 | Schedule comparison UI |
| **M4.12** — Integration test | Week 10 | End-to-end with M1/M2/M3/M5a/M5c/M6/M7 |
| **M4.13** — Soak + tuning | Weeks 11–12 | 1,000-run soak; perf optimisation; planner training |

**Total:** 12 weeks. **The longest of any module — and rightly so.** This is the algorithmic centrepiece.

### 14.2 Team

Recommended: 2 engineers minimum.

- **M4 Algorithm Engineer (primary)** — owns the CP-SAT model, heuristic, solver tuning. Critical hire.

- **M4 Frontend Engineer** — owns the Gantt and what-if UI (a non-trivial piece of frontend in itself)

- Fractional support from a backend engineer for APIs and integrations

**Hiring JD starter (M4 Algorithm Engineer):**

- **Must have:** Strong Python; OR-Tools (CP-SAT) production experience or equivalent (CPLEX, Gurobi, IBM CPO); discrete optimisation foundations (constraint programming, scheduling theory); strong systems thinking

- **Strong plus:** Manufacturing scheduling or APS background; SMED / TPS; published work or open-source contributions in scheduling

- **Nice to have:** Steel / process industry exposure; distributed systems for solver scaling

**Hiring JD starter (M4 Frontend Engineer):**

- **Must have:** React + TypeScript; complex visualisation (D3 / Konva / React Flow); drag-drop UX; performant virtualisation

- **Strong plus:** Gantt or scheduling UI experience; OT / industrial UX background

- **Nice to have:** WebGL or canvas-based rendering for very large datasets

### 14.3 Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- | --- |
| R1 | Changeover matrix is too sparse at go-live, scheduler defaults dominate | High | High | SMED bootstrap workstream from Phase 0 (§5.6 of Foundation); fallback strategy + matrix learner; planner override mechanism |
| R2 | CP-SAT can’t converge within time limit at production scale | Medium | High | Heuristic seed always returns a valid answer; solver timeout is graceful; load test at 4× expected scale before pilot |
| R3 | Planner doesn’t trust the schedule and overrides constantly | High | Medium | Explainability features (constraint annotations, why-this-sequence drill-down); track override frequency as a KPI; iterate on objective weights with planner feedback |
| R4 | Gantt UI is slow with many ops | Medium | High | Virtualised rendering from day 1; perf testing at 200+ ops |
| R5 | Solver memory leaks during long-running services | Medium | Medium | Solver runs in subprocess; killed and respawned per run; tested in soak |
| R6 | What-if scenarios consume too much compute | Low | Low | Rate limit; max 1 concurrent what-if per user; killable mid-run |
| R7 | Auto-replan thrashes during chaotic shifts | Medium | Medium | Stability bonus in objective; configurable trigger disabling; alert + planner pause control |

### 14.4 Dependencies

| Dependency | What | Needed by |
| --- | --- | --- |
| Phase 0 Foundation | Platform + event backbone | Week 1 |
| M2 Master Data + Changeover Matrix bootstrap | Routings populated, matrix at ≥ 60% coverage | Week 4 |
| M1 Demand APIs | Queue API + events | Week 4 |
| M3 Capacity APIs | Capacity gate + summary | Week 4 |
| M5a Material readiness API | Per-WO material status | Week 5 |
| M5c PM/breakdown events | Event schemas defined | Week 6 |
| M6 dispatch list generator | Subscribes to publication event | Week 10 |
| M7 schedule analytics | Subscribes to compute event | Week 10 |
| Ops Console shell | For Gantt UI | Week 7 |

### 14.5 Exit Criteria to Phase 2

- 30 days of production stability

- Avg setup time reduced ≥ 15% vs. pre-Zedral baseline

- Schedule adherence ≥ 70% (planned op start within 30 min of actual)

- Planner override frequency stable or declining over 30 days

- ≥ 5 successful what-if scenarios used to inform real PM decisions

- Solver matrix coverage ≥ 90% high-confidence

## Revision History

| Version | Date | Author | Changes |
| --- | --- | --- | --- |
| v0.1 | 2026-04-17 | Product & Systems Engineering | Initial draft |

*End of M4 — APS Finite Scheduling Engine Production Document* *Total: ~10,500 words · Est. reading time: 55 minutes* *Next module in sequence:** ****M5a — Material ******&****** Inventory Control***