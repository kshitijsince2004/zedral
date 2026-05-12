Zedral Platform ��� M6 Production Document

Dispatch \& Execution Control �� Phase 1

Product \& Systems Engineering

April 2026

Table of Contents

# Zedral Platform — Module M6 Production Document

## M6 — Dispatch & Execution Control

**Document status:** Draft v0.1 · For engineering handover **Audience:** M6 module engineering team, adjacent module teams (M4 scheduler, M5a material, M5b quality, M5c maintenance, M7 OEE), Hero Steels shift supervisors and CRS line operators **Owner:** Platform Engineering · M6 technical lead TBD **Depends on:** Phase 0 Foundation · M2 Master Data · M4 APS Scheduling Engine · M5a Material & Inventory · Andon terminal hardware **Phase:** 1 (Pilot Core Loop · Months 2–6) **Inherits:** All 10 Architectural Principles, especially **Principle 1 (One Event, Many Views)** and **Principle 7 (Offline-Capable)**

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

### 1.1 What M6 Is

M6 is the **floor write surface** of the Zedral platform. It is the module operators and supervisors interact with continuously during every shift. It converts the approved schedule from M4 into actionable dispatch lists, captures every shop-floor event as it happens, and serves as the source of truth for what *actually* happened versus what was planned.

Every shop-floor fact that enters the system — job started, setup complete, coil mounted, downtime began, production tonnage — is written through M6. Every fact out of M6 is published as an event, propagating instantly to M7 for OEE, to M1 for WO status, to M5a for coil consumption, and eventually to SAP.

**M6 owns six responsibilities:**

- **Dispatch generation** — when M4 publishes a schedule, generate shift-level dispatch lists for each line with the operator’s executable work sequence

- **Floor event capture** — capture setup_start, setup_end, production_start, production_end, stoppage_start, stoppage_end, reject_raised, shift_handover events from the Floor Console

- **Setup timer instrumentation** — automatically time every changeover, compare to the planned setup minutes, feed the changeover matrix learner

- **Live execution view** — provide a real-time “what’s running now” view to supervisors and planners

- **Shift handover workflow** — capture the shift-to-shift handover with pending items, machine state notes, acknowledgment

- **Rush order injection** — accept supervisor/planner mid-shift plan changes and propagate them to operators without a full M4 replan

### 1.2 Why M6 Is a Separate Module (Not Part of M4)

M4 produces a plan. M6 makes it executable. The separation matters because:

- **Write volume differs by 10–100×.** M4 writes a schedule every ~4 hours. M6 writes 200–500 events per shift per line. Different scaling profile, different DB hot-path, different latency SLO.

- **Operator trust model differs.** M4 is a planning abstraction. M6 is the operator’s direct interface — it must never hang, never confuse, never lose a click.

- **Offline requirements differ (Principle 7).** M4 can wait. M6 cannot — an operator recording setup_end doesn’t stop if Core is unreachable. M6 has its own local buffer logic tied to Andon terminals.

- **Recovery model differs.** An unpublished M4 schedule can be regenerated. A lost floor event is unrecoverable truth — operators’ time stamps are not stored anywhere else.

### 1.3 What M6 Is Not

- **Not a scheduler.** M6 executes the schedule M4 produced. M6 does not reshuffle ops. The only exception is rush-order injection (§6.3), which is an explicit planner override with audit.

- **Not a quality adjudicator.** M6 captures “reject raised at this job” events; M5b handles the NCR workflow downstream. v1: a reject event from M6 creates a placeholder NCR that quality engineer dispositions in Phase 2 M5b; pre-Phase-2, the disposition is a free-text field.

- **Not a material tracking system.** M5a owns coil state. M6 scans coils *against* M5a’s state for validation; M6 does not maintain its own coil view.

- **Not a maintenance scheduler.** M5c proposes PM; M4 incorporates; M6 dispatches to operators respecting those windows.

- **Not an HMI for the machine itself.** Operators do not use M6’s Floor Console to control the rolling mill. That’s the existing SCADA/HMI at Level 2. M6 sits above that.

- **Not a time-and-attendance system.** Clock-in / clock-out, break times, leave — out of scope. v1 captures operator identity on every event via badge scan, but does not manage HR-adjacent workflows.

- **Not a training records system.** Operator certifications live in M2 (master.operator_skills). M6 reads, does not maintain.

### 1.4 The Frozen Window — Critical Design Constraint

As established in M4 §6.4, the first 2 hours of the active schedule are **frozen** — M4 does not move them even on replan. This matters intensely for M6:

- Dispatch lists for the next 2 hours are **stable** — an operator won’t see the job ahead of them change mid-setup

- The Floor Console caches the next 2 hours of dispatch locally — if Core goes down, the operator can still complete what they started

- Events captured during the frozen window post back to M6 and eventually propagate; nothing is lost

Beyond the 2-hour window, dispatch may update as M4 replans. The Floor Console indicates this visually (ops beyond the 2-hour line are marked “tentative”).

### 1.5 Edge Cases In Scope

- **Partial completion** — operator stops a job at 80% of planned qty (e.g., coil exhausted early); capture qty_actual_mt separately from qty_planned_mt

- **Job pause and resume** — operator pauses a job mid-run (shift change, coffee, minor fault); captured as a stoppage event with reason, then resume

- **Setup abandonment** — setup begun but abandoned (coil turned out to be wrong grade mid-threading); setup event captured with abandoned flag; the next setup starts a new event

- **Multi-operator job** — job spans shift change; outgoing operator records handover state, incoming operator acknowledges and continues

- **Rush-order injection mid-shift** — supervisor inserts a job into the sequence; M6 accepts with audit, propagates to operator, signals M4 to replan tail

- **Operator skill mismatch** — M6 receives dispatch for a job the on-duty operator isn’t certified for; warning displayed, supervisor override required

- **Coil swap mid-run** — one HR coil exhausted, next HR coil mounted without stopping the job’s logical ID; captured as a coil transition event on the same production op

- **Downtime categorisation** — 7 standard downtime reason categories with free-text detail; forced classification on every stoppage > 5 minutes

- **Shift handover with incomplete job** — outgoing operator hands over a job in progress; all job state transfers cleanly to incoming operator

### 1.6 Edge Cases Deferred

- **PLC-driven automatic event capture** (e.g., line speed below threshold → auto-pause) — Phase 2 with PLC integration

- **Barcode/RFID automated coil scanning** — v1 is operator-typed or barcode-reader-assisted; full RFID gateway is Phase 2

- **Video evidence capture** on reject events — Phase 3

- **Voice-to-text downtime reason entry** — nice-to-have, Phase 3

- **Multi-line synchronised dispatch** — a single WO spanning multiple lines coordinated in parallel; not relevant for CRS

- **Operator-to-operator chat / escalation routing** — out of scope; handled by existing plant communications (phone, radio)

## 2. Personas & Jobs To Be Done

### 2.1 Primary Persona — The CRS Line Operator

**Who they are.** Typically 2–20 years of experience on the rolling mill. Often the most skilled person on the line. Currently tracks their work on paper — a shift log where they write down job numbers, setup start/end, tonnage, stoppages, and reasons.

**What they need.** Fast. Unambiguous. Tolerant of gloved fingers, oil-stained screens, industrial lighting. If the Andon terminal adds more than 30 seconds of friction per event, they will route around it — and the entire data capture value proposition dies.

**Environmental realities.**

- Ambient temperature 35–42 °C in summer

- Vibration from the mill

- Background noise ~85 dB (must rely on visual confirmation, not audio)

- Gloves (thick leather or cut-resistant) almost always worn

- Hands may be oily, dirty

### 2.2 JTBDs for the CRS Line Operator

**JTBD-1: Know what to run next.**

*“**When I finish a job, in under 5 seconds I need to see: what’s my next job, what grade/gauge/width, which coil to mount, what the planned setup time is, any special notes.**”*

**JTBD-2: Record setup start / end.**

*“**When I start a setup, one tap records the timestamp. When the setup is done and the strip is threaded, one tap records setup-end. No typing, no form, no scroll.**”*

**JTBD-3: Record production completion.**

*“**At end of run, one screen captures: actual qty produced, actual scrap, coil(s) consumed, any notes. Submit and move on. Under 30 seconds total.**”*

**JTBD-4: Report a stoppage.**

*“**When the line stops, I tap** **‘**Stoppage**’** **and pick a reason from 7 visible categories. Under 3 seconds. Later I can add detail. Right now I’m dealing with the problem.**”*

**JTBD-5: Flag a reject.**

*“**When I see a defect requiring hold, one tap raises a reject event tied to the current coil and job. Quality team gets notified automatically.**”*

**JTBD-6: Handover to next shift.**

*“**At shift end, I see a handover checklist: jobs in progress, coils in transit, machine state, pending issues. I fill in what’s incomplete, the incoming operator reviews and signs in. Takes **<** 3 minutes.**”*

### 2.3 The Shift Supervisor

**Who they are.** Typically 8–25 years of experience, manages 2–4 lines for an 8-hour shift, owns the shift’s production targets.

### 2.4 JTBDs for the Shift Supervisor

**JTBD-7: See all three CRS lines in one view.**

*“**At any moment I need to see: each line’s current job, status (running / setup / stoppage), current shift’s progress vs. target, any red flags. One screen, real-time.**”*

**JTBD-8: Approve a dispatch override.**

*“**When the planner or I need to inject a rush order or pull a job forward, I authorise the change, the operator sees it immediately, the system logs my approval.**”*

**JTBD-9: Review shift performance at end of shift.**

*“**At 13:50 (shift ends 14:00) I need a ten-second glance: production MT, setup minutes, downtime minutes, rejects — vs. the shift’s plan. If we’re short, I know which handover notes matter.**”*

**JTBD-10: Escalate a stuck problem.**

*“**When a line is down longer than expected or an operator can’t resolve something, I can tag it for plant engineering / maintenance with one tap.**”*

### 2.5 Secondary Personas

**Production Planner** — reads M6’s live view during the day; does not directly write via M6 (writes through M1/M4).

**Maintenance Engineer** — consumes M6’s downtime + breakdown events for M5c work order creation.

**Quality Engineer** — receives M6’s reject events for M5b NCR handling.

**Plant Head** — reads the shift summary and daily rollup that M6/M7 jointly produce.

## 3. Data Model

M6’s data lives in m6_dispatch schema. The central entity is execution_events — the high-write, append-only record of every shop-floor fact.

### 3.1 Core Tables

-- =======================================================
-- DISPATCH LISTS — shift-level, per-line, derived from M4
-- =======================================================
CREATE TABLE m6_dispatch.dispatch_lists (
  dispatch_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id        UUID NOT NULL,                           -- FK hint to m4_schedule.schedules
  wc_id              TEXT NOT NULL REFERENCES master.work_centres,
  shift_date         DATE NOT NULL,
  shift              CHAR(1) NOT NULL,                        -- 'A' | 'B' | 'C'
  shift_start        TIMESTAMPTZ NOT NULL,
  shift_end          TIMESTAMPTZ NOT NULL,
  generated_at       TIMESTAMPTZ DEFAULT now(),
  published_at       TIMESTAMPTZ,
  status             TEXT NOT NULL,                            -- 'draft' | 'published' | 'superseded' | 'complete'
  superseded_by      UUID REFERENCES m6_dispatch.dispatch_lists,
  generated_by       TEXT,                                     -- 'auto' (from schedule publish) | user_id (manual)
  UNIQUE (wc_id, shift_date, shift, status) DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX idx_dl_wc_shift
  ON m6_dispatch.dispatch_lists (wc_id, shift_date, shift);
CREATE INDEX idx_dl_published
  ON m6_dispatch.dispatch_lists (wc_id, shift_date, shift)
  WHERE status = 'published';

-- =======================================================
-- DISPATCH ITEMS — the ordered items within a dispatch list
-- =======================================================
CREATE TABLE m6_dispatch.dispatch_items (
  item_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_id        UUID NOT NULL REFERENCES m6_dispatch.dispatch_lists ON DELETE CASCADE,
  op_id              UUID NOT NULL,                            -- FK hint to m4_schedule.scheduled_operations
  wo_id              TEXT,                                     -- NULL for non-WO ops (setup-only, PM)
  sequence_in_shift  INTEGER NOT NULL,
  op_type            TEXT NOT NULL,                            -- 'production' | 'setup' | 'pm'
  -- Planning info (from M4, read-only)
  planned_setup_start TIMESTAMPTZ,
  planned_setup_end   TIMESTAMPTZ,
  planned_prod_start  TIMESTAMPTZ,
  planned_prod_end    TIMESTAMPTZ,
  planned_qty_mt      NUMERIC(10,3),
  -- Material info
  expected_coils      JSONB,                                   -- [{"coil_id": "...", "qty_mt": ...}]
  -- Operator-facing fields
  work_instruction_ref TEXT,                                   -- link to SOP doc in MinIO
  special_notes      TEXT,
  predecessor_item_id UUID REFERENCES m6_dispatch.dispatch_items,  -- prior item, for changeover context
  changeover_reason  TEXT,                                     -- 'grade_change' | 'gauge_change' | 'roll_change' | 'startup'
  -- Execution state (updated as events flow in)
  actual_status      TEXT NOT NULL DEFAULT 'pending',           -- 'pending' | 'setup_in_progress' | 'production_in_progress'
                                                                --   | 'stopped' | 'complete' | 'cancelled' | 'skipped'
  actual_setup_start  TIMESTAMPTZ,
  actual_setup_end    TIMESTAMPTZ,
  actual_prod_start   TIMESTAMPTZ,
  actual_prod_end     TIMESTAMPTZ,
  actual_qty_mt       NUMERIC(10,3),
  actual_scrap_mt     NUMERIC(10,3),
  actual_operator_id  TEXT,                                    -- last operator touching this item
  notes_runtime       TEXT
);

CREATE INDEX idx_di_dispatch_seq
  ON m6_dispatch.dispatch_items (dispatch_id, sequence_in_shift);
CREATE INDEX idx_di_wo
  ON m6_dispatch.dispatch_items (wo_id) WHERE wo_id IS NOT NULL;
CREATE INDEX idx_di_active
  ON m6_dispatch.dispatch_items (actual_status, dispatch_id)
  WHERE actual_status IN ('setup_in_progress', 'production_in_progress', 'stopped');

-- =======================================================
-- EXECUTION EVENTS — high-write, append-only
-- =======================================================
CREATE TABLE m6_dispatch.execution_events (
  event_id           UUID PRIMARY KEY,                         -- UUID-v7; matches event envelope
  dispatch_item_id   UUID REFERENCES m6_dispatch.dispatch_items,
  wc_id              TEXT NOT NULL,
  wo_id              TEXT,
  event_type         TEXT NOT NULL,
  -- Types: setup_started, setup_ended, setup_abandoned,
  --        production_started, production_ended,
  --        stoppage_started, stoppage_ended,
  --        coil_mounted, coil_swapped,
  --        reject_raised, shift_handover,
  --        rush_injected, note_added
  occurred_at        TIMESTAMPTZ NOT NULL,                     -- operator's moment of truth
  recorded_at        TIMESTAMPTZ NOT NULL DEFAULT now(),        -- when event reached Core
  operator_id        TEXT NOT NULL,
  device_id          TEXT NOT NULL,
  shift              CHAR(1),
  payload            JSONB NOT NULL,                            -- event-specific data
  signature          TEXT NOT NULL                              -- HMAC per device key
);

-- Partitioning: execution_events is the high-volume table
-- We start with a single table; partition by range (occurred_at) monthly
-- when row count exceeds 10M. Expected trigger: year 2-3 at Hero Steels.

CREATE INDEX idx_ee_wc_time      ON m6_dispatch.execution_events (wc_id, occurred_at DESC);
CREATE INDEX idx_ee_item         ON m6_dispatch.execution_events (dispatch_item_id);
CREATE INDEX idx_ee_type_time    ON m6_dispatch.execution_events (event_type, occurred_at DESC);
CREATE INDEX idx_ee_wo           ON m6_dispatch.execution_events (wo_id) WHERE wo_id IS NOT NULL;

-- =======================================================
-- STOPPAGES — materialised view of stoppage_started + _ended
-- For fast Pareto queries without replaying events
-- =======================================================
CREATE TABLE m6_dispatch.stoppages (
  stoppage_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wc_id              TEXT NOT NULL,
  wo_id              TEXT,
  dispatch_item_id   UUID REFERENCES m6_dispatch.dispatch_items,
  shift              CHAR(1),
  started_at         TIMESTAMPTZ NOT NULL,
  ended_at           TIMESTAMPTZ,
  duration_min       INTEGER GENERATED ALWAYS AS
    (CASE WHEN ended_at IS NOT NULL
     THEN EXTRACT(EPOCH FROM (ended_at - started_at))/60
     ELSE NULL END) STORED,
  reason_category    TEXT NOT NULL,                             -- 7 standard categories (see §6.5)
  reason_detail      TEXT,
  reported_by        TEXT NOT NULL,
  resolution_action  TEXT,
  -- Links to downstream
  m5c_breakdown_id   UUID,                                      -- if escalated to maintenance
  m5b_ncr_id         UUID,                                      -- if linked to a quality event
  is_active          BOOLEAN GENERATED ALWAYS AS
    (ended_at IS NULL) STORED
);

CREATE INDEX idx_stopp_wc_time
  ON m6_dispatch.stoppages (wc_id, started_at DESC);
CREATE INDEX idx_stopp_active
  ON m6_dispatch.stoppages (wc_id)
  WHERE is_active = TRUE;
CREATE INDEX idx_stopp_category
  ON m6_dispatch.stoppages (reason_category, started_at DESC);

-- =======================================================
-- REJECTS — materialised from reject_raised events
-- =======================================================
CREATE TABLE m6_dispatch.rejects (
  reject_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wc_id              TEXT NOT NULL,
  wo_id              TEXT,
  dispatch_item_id   UUID REFERENCES m6_dispatch.dispatch_items,
  coil_id            TEXT,
  reported_at        TIMESTAMPTZ NOT NULL,
  reported_by        TEXT NOT NULL,
  defect_category    TEXT NOT NULL,                             -- placeholder categories pre-M5b
  defect_detail      TEXT,
  affected_qty_mt    NUMERIC(10,3),
  photo_ref          TEXT,                                      -- MinIO object path if photo attached
  -- Downstream linkage (populated when M5b ships)
  m5b_ncr_id         UUID,
  disposition        TEXT,                                      -- 'rework' | 'downgrade' | 'scrap' | 'pending'
  disposition_by     TEXT,
  disposition_at     TIMESTAMPTZ
);

CREATE INDEX idx_rej_wo          ON m6_dispatch.rejects (wo_id);
CREATE INDEX idx_rej_time        ON m6_dispatch.rejects (reported_at DESC);

-- =======================================================
-- SHIFT HANDOVERS
-- =======================================================
CREATE TABLE m6_dispatch.shift_handovers (
  handover_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wc_id              TEXT NOT NULL,
  shift_date         DATE NOT NULL,
  outgoing_shift     CHAR(1) NOT NULL,
  incoming_shift     CHAR(1) NOT NULL,
  outgoing_operator  TEXT NOT NULL,
  incoming_operator  TEXT,
  outgoing_signed_at TIMESTAMPTZ,
  incoming_signed_at TIMESTAMPTZ,
  -- Content
  jobs_completed     JSONB,                                     -- WO IDs done during shift
  jobs_in_progress   JSONB,                                     -- WO + current state at handover
  pending_items      JSONB,                                     -- [{text, priority, assignee}]
  machine_state_note TEXT,
  safety_notes       TEXT,
  -- Acknowledgments
  handover_complete  BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_ho_wc_date
  ON m6_dispatch.shift_handovers (wc_id, shift_date DESC);

-- =======================================================
-- SETUP TIMINGS — extracted from setup_started + _ended pairs
-- Feeds the changeover matrix learner in M2
-- =======================================================
CREATE TABLE m6_dispatch.setup_timings (
  timing_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wc_id              TEXT NOT NULL,
  dispatch_item_id   UUID REFERENCES m6_dispatch.dispatch_items,
  -- Transition context
  grade_from         TEXT,
  grade_to           TEXT NOT NULL,
  gauge_from_mm      NUMERIC(6,3),
  gauge_to_mm        NUMERIC(6,3) NOT NULL,
  width_from_mm      INTEGER,
  width_to_mm        INTEGER NOT NULL,
  gauge_step         TEXT,                                      -- 'same' | 'step_up' | 'step_down' | 'major_step'
  width_step         TEXT,                                      -- 'same' | 'reduction' | 'widening'
  roll_change_reqd   BOOLEAN,
  setup_reason       TEXT,
  -- Actuals
  actual_start       TIMESTAMPTZ NOT NULL,
  actual_end         TIMESTAMPTZ NOT NULL,
  actual_duration_min INTEGER NOT NULL,
  planned_duration_min INTEGER,
  variance_min       INTEGER GENERATED ALWAYS AS
    (actual_duration_min - planned_duration_min) STORED,
  was_abandoned      BOOLEAN DEFAULT FALSE,
  notes              TEXT,
  observed_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_setup_context
  ON m6_dispatch.setup_timings (wc_id, grade_from, grade_to, gauge_step, width_step, roll_change_reqd);
CREATE INDEX idx_setup_time
  ON m6_dispatch.setup_timings (observed_at DESC);

-- =======================================================
-- Configuration
-- =======================================================
CREATE TABLE m6_dispatch.config (
  config_key         TEXT PRIMARY KEY,
  config_value       JSONB NOT NULL,
  updated_by         TEXT,
  updated_at         TIMESTAMPTZ DEFAULT now()
);

-- Seeded:
-- ('downtime_categories', '["breakdown","material_wait","quality_hold","tool_change","power","operator_break","other"]')
-- ('stoppage_reason_required_min', '5')  -- minutes above which a category is forced
-- ('shift_start_times', '{"A":"06:00","B":"14:00","C":"22:00"}')
-- ('dispatch_horizon_hours', '24')
-- ('frozen_window_minutes', '120')
-- ('rush_inject_requires_supervisor', 'true')
-- ('auto_handover_nudge_minutes_before', '15')

### 3.2 Design Notes

**Why**** ****dispatch_items**** ****is denormalised from M4’s**** ****scheduled_operations****.** The Floor Console must render immediately, even when Core is partially reachable. Holding the operator-facing view (planned times, notes, work instructions, expected coils) in M6’s own table means the Floor Console can always render from M6 alone without chained calls through M4.

**Why**** ****execution_events**** ****is append-only.** These are immutable historical facts. An event is a fact that happened at a moment in time — it doesn’t get “edited”. Corrections are new events (note_added, stoppage_ended_correction) referencing the original. This matches Principle 2 (append-only truth, materialised reads).

**Why**** ****stoppages**** ****and**** ****rejects**** ****exist as materialised tables despite being derivable from events.** Query patterns for Pareto charts, shift summaries, and OEE calculations need them. Aggregating from raw events every time = slow. Maintaining materialised views updated on event insert = fast, explicit, inspectable.

**Why**** ****setup_timings**** ****is extracted at event time rather than on-demand.** The changeover matrix learner in M2 runs nightly and processes *these* rows, not raw events. Extracting at event time means the matrix learner doesn’t have to reason about event ordering or event pairs — it processes a clean table of completed setup observations.

**Why**** ****shift_handovers**** ****stores JSONB for**** ****jobs_in_progress**** ****and**** ****pending_items****.** Shape varies — handover content is exploratory, iterated on over time. Forcing a rigid schema too early restricts the planner’s ability to refine what matters. JSONB keeps it flexible while still queryable.

### 3.3 Retention

- **Dispatch lists** — active indefinite; superseded 30 days hot, then archived to MinIO

- **Dispatch items** — same as dispatch lists

- **Execution events** — 1 year hot in Postgres (with monthly partitioning beyond year 2); 7 years warm in MinIO (regulatory + audit)

- **Stoppages / rejects / setup_timings** — 2 years hot (active KPI use), 7 years warm

- **Shift handovers** — 2 years hot, 7 years warm

- **Config** — permanent

Daily partition maintenance runs nightly via shared Platform Archival job.

## 4. Event Schemas

### 4.1 Events M6 Publishes

The entire family of floor events is M6-originated. Selected schemas:

#### floor.dispatch.issued (v1.0)

Published when a dispatch list is generated and published to operators.

{
  "event_type": "floor.dispatch.issued",
  "aggregate_id": "dispatch_xyz456",
  "payload": {
    "dispatch_id": "xyz456",
    "wc_id": "CRS-2",
    "shift_date": "2026-04-18",
    "shift": "A",
    "item_count": 5,
    "schedule_id": "abc123"
  }
}

#### floor.setup.started (v1.0)

Published when operator taps “Start Setup”.

{
  "event_type": "floor.setup.started",
  "aggregate_id": "wc_CRS-2",
  "payload": {
    "wc_id": "CRS-2",
    "dispatch_item_id": "item_789",
    "wo_id": "wo_8893451",
    "operator_id": "op_042",
    "device_id": "andon_crs2",
    "setup_reason": "grade_change",
    "grade_from": "IS513-D",
    "grade_to": "IS5986-Fe410",
    "gauge_from_mm": 0.45,
    "gauge_to_mm": 0.80,
    "roll_change_reqd": true
  }
}

#### floor.setup.ended (v1.0)

Published when setup complete.

#### floor.setup.abandoned (v1.0)

Setup begun but not completed; reason recorded.

#### floor.production.started (v1.0)

{
  "event_type": "floor.production.started",
  "aggregate_id": "wo_8893451",
  "payload": {
    "wo_id": "wo_8893451",
    "wc_id": "CRS-2",
    "dispatch_item_id": "item_789",
    "coil_id": "coil_HR_298451",
    "operator_id": "op_042",
    "planned_qty_mt": 18.45,
    "planned_duration_min": 132
  }
}

#### floor.production.completed (v1.0)

The most consequential M6 event. Triggers M7 OEE calc, M5a coil consumption, M1 WO status update, SAP goods issue + production confirmation.

{
  "event_type": "floor.production.completed",
  "aggregate_id": "wo_8893451",
  "payload": {
    "wo_id": "wo_8893451",
    "wc_id": "CRS-2",
    "dispatch_item_id": "item_789",
    "operator_id": "op_042",
    "qty_good_mt": 18.32,
    "qty_scrap_mt": 0.21,
    "coils_consumed": [
      {"coil_id": "coil_HR_298451", "consumed_mt": 18.53}
    ],
    "actual_duration_min": 138,
    "planned_duration_min": 132,
    "rejects_raised": 0,
    "notes": ""
  }
}

#### floor.stoppage.started / floor.stoppage.ended (v1.0)

{
  "event_type": "floor.stoppage.started",
  "aggregate_id": "wc_CRS-2",
  "payload": {
    "wc_id": "CRS-2",
    "dispatch_item_id": "item_789",
    "reason_category": "material_wait",
    "reason_detail": "Coil delayed at pickling",
    "operator_id": "op_042"
  }
}

#### floor.reject.raised (v1.0)

Feeds the placeholder NCR system in v1, real NCR workflow in Phase 2.

#### floor.shift.handover_submitted (v1.0)

Triggers M7 shift summary generation, notifies incoming operator.

#### floor.rush_order.injected (v1.0)

Supervisor/planner added a job mid-shift. Triggers M4 tail-replan.

### 4.2 Events M6 Consumes

| Event | From | M6 Behaviour |
| --- | --- | --- |
| plan.schedule.published | M4 | Auto-generate dispatch lists for each affected line + shift |
| plan.scheduled_operation.changed | M4 | Update dispatch items beyond frozen window; notify operator if significant |
| material.coil.allocated | M5a | Update expected_coils on dispatch items |
| material.coil.shortage_detected | M5a | Flag affected dispatch items; notify operator |
| asset.breakdown.reported | M5c (and own stoppage auto-escalation) | Link active stoppages to breakdown records |
| master.operator_skills.updated | M2 | Re-evaluate dispatch items for on-duty operators |

### 4.3 Event Volume

At Hero Steels, per shift per line:

- Setup events: ~3–6 pairs (start + end)

- Production events: ~3–6 pairs (start + completed)

- Stoppages: ~2–5 pairs

- Rejects: ~0–2

- Coil mounts: ~3–6

- Handover: 1

Total: ~30–60 events per shift per line. Across 3 lines × 3 shifts = **~270–540 floor events/day**. Highest-write module by volume.

Peak burst (shift change): ~20 events in a 10-minute window across all three lines as shifts hand over simultaneously.

## 5. Ingestion Flow

M6 has two event sources:

- **Floor Console operator actions** (primary)

- **Supervisor actions** from the Ops Console (planner/supervisor writes)

### 5.1 Floor Console Event Flow

Every tap on the Floor Console that represents a state change follows this flow:

[Andon Terminal]                  [Core]
    │                                │
    │ (1) User tap generates event   │
    │ with event_id = UUID-v7,       │
    │ occurred_at = now(), signature │
    │                                │
    │──POST /api/m6/events─────────>│
    │                                │ (2) Validate
    │                                │    - Schema
    │                                │    - HMAC signature
    │                                │    - Operator identity
    │                                │    - Business rules (e.g.,
    │                                │      setup_started only valid
    │                                │      if no setup currently
    │                                │      active on this line)
    │                                │
    │                                │ (3) Within a DB transaction:
    │                                │    - Insert execution_events
    │                                │    - Update dispatch_items.actual_*
    │                                │    - Insert/update stoppages
    │                                │      or rejects or setup_timings
    │                                │      as applicable
    │                                │    - Insert transactional outbox
    │                                │
    │<──200 OK with server timestamp │
    │   and event_id confirmed       │
    │                                │
    │ (4) Local SQLite buffer:       │
    │   mark event as `synced=true`  │
    │                                │
    │                                │ (5) Outbox relay publishes
    │                                │    to Redpanda async

**Offline handling.** If step 1 fails (Core unreachable), the Andon terminal’s local SQLite buffer retains the event with synced=false. A background syncer retries every 5 seconds. The Floor Console UI shows a small “offline” indicator but operators continue working — events queue and eventually drain.

**Idempotency.** The Andon terminal generates event_id locally. If a network glitch causes the terminal to retry, the Core rejects duplicates by event_id primary key and returns the original 200. No duplicate state changes.

**Signature verification.** Each Andon terminal has a device-specific HMAC key (provisioned at terminal setup). Events unsigned or with invalid signatures are rejected with 401. This prevents event spoofing from a compromised API layer.

### 5.2 Validation Rules

Before an event is accepted, the Core validates:

| Rule | Example violation | Response |
| --- | --- | --- |
| Event type is valid | setup_beggen (typo) | 400 + schema help |
| Required payload fields present | setup_started without wo_id | 400 + field list |
| Timestamp within sanity bounds | occurred_at > 2 min in future | 400; possible clock skew |
| Line state consistency | setup_started when already in production | 409 + current state |
| Operator identity verified | Badge scan mismatch | 401 |
| Dispatch item exists | Referenced dispatch_item_id doesn’t exist | 404 |
| Frozen-window respect for overrides | Supervisor tries to inject rush into frozen slot | 403 + explanation |

### 5.3 Supervisor Actions

Supervisors write via the Ops Console using the same /api/m6/events endpoint with elevated authorisation. Types of supervisor events:

- rush_order.injected — insert a new item into a dispatch list

- item.skipped — mark an item as skipped with reason

- note_added — supervisor note attached to an item or event

- handover.force_close — close a handover the outgoing operator failed to submit

All supervisor events are explicitly audited (operator_id = supervisor).

### 5.4 Coil Scan Integration (Cross-Module)

When an operator scans a coil at the line:

- Floor Console POSTs to M5a /api/m5a/coils/{coil_id}/scan (stage transition to rolling)

- M5a validates (§5.2 of M5a) — correct grade for the active dispatch item?

- On success: M5a publishes material.coil.staged

- M6 consumes and emits floor.coil.mounted linked to the current dispatch item

This cross-module coordination is critical — no coil mounting happens without both M5a’s and M6’s validation signing off.

## 6. Processing Logic

Four logical engines:

- **Dispatch list generator** — from published schedule to operator-ready list

- **Event processor** — validates incoming events and updates derived state

- **Setup timing extractor** — from paired setup events to matrix-feed rows

- **Shift summary builder** — end-of-shift rollup used by M7

### 6.1 Dispatch List Generator

**Trigger.** plan.schedule.published event from M4.

**Algorithm.**

def generate_dispatch_lists(schedule_id):
    schedule = m4_client.get_schedule(schedule_id)

    # Group scheduled operations by (wc_id, shift)
    by_line_shift = group_by_line_and_shift(schedule.operations)

    for (wc_id, shift_date, shift), ops in by_line_shift.items():
        # Supersede any existing dispatch for this (wc, shift_date, shift)
        existing = get_existing_published(wc_id, shift_date, shift)
        if existing:
            mark_superseded(existing, new_dispatch_id)
            publish('floor.dispatch.superseded', existing)

        # Create new dispatch list
        dispatch = create_dispatch_list(wc_id, shift_date, shift, schedule_id)

        for seq, op in enumerate(ops, start=1):
            # Build dispatch item from scheduled operation
            item = create_dispatch_item(
                dispatch_id=dispatch.id,
                op_id=op.op_id,
                wo_id=op.wo_id,
                sequence_in_shift=seq,
                op_type=op.op_type,
                planned_setup_start=op.planned_setup_start,
                planned_prod_start=op.start_datetime,
                planned_prod_end=op.end_datetime,
                planned_qty_mt=op.qty_planned_mt,
                expected_coils=m5a_client.get_expected_coils_for_wo(op.wo_id),
                work_instruction_ref=m2_client.get_sop_ref(op.material_code),
                special_notes=build_special_notes(op),
                predecessor_item_id=previous_item_id,
                changeover_reason=derive_changeover_reason(op, previous_op)
            )
            previous_item_id = item.id
            previous_op = op

        # Publish the new dispatch list
        dispatch.status = 'published'
        dispatch.published_at = now()
        persist(dispatch)
        publish('floor.dispatch.issued', dispatch)

**Supersession logic.** When M4 republishes a schedule mid-shift, existing dispatch items in the frozen window remain actual_status preserved — only non-frozen items change. For items already in_progress, the new dispatch *references* the old item rather than creating a new one (preserves the operator’s ongoing work context).

**Work instructions.** Each material has an SOP doc referenced in M2 (stored as a PDF in MinIO). The dispatch item carries a link; the Floor Console can display or link to the SOP on demand.

### 6.2 Event Processor

The central state-updating engine. Runs synchronously on POST /api/m6/events. Designed for low latency — target p95 < 150ms.

**Core processing for each event type:**

def process_event(event):
    # Validate (§5.2)
    validate_event(event)

    with db.transaction() as tx:
        # Insert raw event
        insert_execution_event(event, tx)

        # Update derived state based on event type
        if event.type == 'setup_started':
            update_dispatch_item(event.item_id,
                                  actual_status='setup_in_progress',
                                  actual_setup_start=event.occurred_at,
                                  actual_operator_id=event.operator_id, tx)

        elif event.type == 'setup_ended' or event.type == 'setup_abandoned':
            update_dispatch_item(event.item_id,
                                  actual_setup_end=event.occurred_at,
                                  actual_status='pending' if event.type=='setup_abandoned'
                                                else 'setup_in_progress_done', tx)
            # Extract setup timing row (§6.3)
            if event.type == 'setup_ended':
                extract_setup_timing(event, tx)

        elif event.type == 'production_started':
            update_dispatch_item(event.item_id,
                                  actual_status='production_in_progress',
                                  actual_prod_start=event.occurred_at, tx)

        elif event.type == 'production_completed':
            update_dispatch_item(event.item_id,
                                  actual_status='complete',
                                  actual_prod_end=event.occurred_at,
                                  actual_qty_mt=event.payload.qty_good_mt,
                                  actual_scrap_mt=event.payload.qty_scrap_mt, tx)

        elif event.type == 'stoppage_started':
            # Any in-progress item on this line goes to 'stopped'
            update_active_item_status_on_line(event.wc_id, 'stopped', tx)
            insert_stoppage(event, tx)

        elif event.type == 'stoppage_ended':
            update_stoppage_close(event.payload.stoppage_id, event.occurred_at, tx)
            # Resume previous status
            resume_previous_item_status(event.wc_id, tx)

        elif event.type == 'reject_raised':
            insert_reject(event, tx)

        elif event.type == 'shift_handover_submitted':
            upsert_handover(event, tx)

        # Insert transactional outbox for Redpanda publish
        insert_outbox(event, tx)
    
    return OK

**Transaction durability ****>**** event publishing latency.** The event is committed to the DB before returning 200 to the Floor Console. Redpanda publish happens asynchronously via the outbox relay (per Phase 0 pattern). This means the Floor Console’s acknowledgment doesn’t depend on Redpanda availability.

### 6.3 Setup Timing Extractor

**Trigger.** On setup_ended event.

**Algorithm.**

def extract_setup_timing(event, tx):
    # Find the matching setup_started
    started = find_matching_setup_started(event.dispatch_item_id, event.wc_id, tx)
    if not started:
        log_orphan_setup_end(event)
        return

    # Compute transition context
    prev_context = get_previous_production_context(event.dispatch_item_id, tx)
    curr_context = get_current_production_context(event.dispatch_item_id, tx)

    gauge_step = classify_gauge_step(prev_context.gauge, curr_context.gauge)
    width_step = classify_width_step(prev_context.width, curr_context.width)

    # Duration
    duration_min = (event.occurred_at - started.occurred_at).total_seconds() / 60

    # Planned from dispatch item
    planned = get_planned_setup_min(event.dispatch_item_id, tx)

    # Persist
    insert_setup_timing(
        wc_id=event.wc_id,
        dispatch_item_id=event.dispatch_item_id,
        grade_from=prev_context.grade,
        grade_to=curr_context.grade,
        gauge_from=prev_context.gauge,
        gauge_to=curr_context.gauge,
        gauge_step=gauge_step,
        width_step=width_step,
        roll_change_reqd=event.payload.roll_change_reqd,
        actual_start=started.occurred_at,
        actual_end=event.occurred_at,
        actual_duration_min=duration_min,
        planned_duration_min=planned,
        tx=tx
    )

The M2 Changeover Learner (§5.3 of Phase 0) runs nightly, consuming setup_timings rows to update the matrix with real observations.

### 6.4 Shift Summary Builder

**Trigger.** Shift end time + 5 minutes (wait for any late-arriving events).

**Output.** A shift summary row in M7’s tables (M6 publishes floor.shift.summary.computed; M7 persists). Contents:

- Production MT total, scrap MT total

- Setup minutes total

- Downtime minutes by category

- Rejects raised

- Handover status

- On-time completion % (items completed within planned window)

Used for:

- Supervisor’s “last 10 seconds” shift review (JTBD-9)

- M7 dashboards

- Next-shift briefing

### 6.5 The 7 Downtime Reason Categories

v1 standardises on 7 categories. Forcing > 5 minutes:

| Category | Examples |
| --- | --- |
| breakdown | Machine / electrical / hydraulic / instrumentation fault |
| material_wait | Coil delayed, wrong coil at line, no feedstock |
| quality_hold | Quality issue mid-run requiring inspection |
| tool_change | Planned roll change, guide change |
| power | Power failure, voltage fluctuation |
| operator_break | Shift change, scheduled break |
| other | Anything not captured above, with mandatory free-text detail |

Adding categories requires config change + planner/supervisor training; not to be done lightly. Phase 2 may refine with customer feedback.

### 6.6 Rush Order Injection Logic

def inject_rush_order(wo_id, wc_id, position, inserted_by, reason):
    # Validate supervisor authority
    validate_role(inserted_by, ['supervisor', 'planner', 'plant_admin'])

    # Fetch current published dispatch for the line
    dispatch = get_active_dispatch(wc_id, current_shift())

    # Validate position — can't insert into frozen window
    if position_is_in_frozen_window(position, dispatch):
        raise BusinessError("Cannot insert into frozen window")

    # Insert dispatch item at specified position; renumber subsequent
    with db.transaction():
        new_item = insert_dispatch_item(dispatch, wo_id, position)
        renumber_subsequent_items(dispatch, position)
        publish('floor.rush_order.injected', new_item)

    # Signal M4 for tail-replan (M4 will re-optimise beyond the frozen window
    # taking into account this injection)
    m4_client.trigger_replan(trigger_type='rush_injection',
                             frozen_ops=get_ops_in_frozen_window(dispatch))

    # Notify operator on the line
    notify_operator(wc_id, 'rush_inserted', new_item)

## 7. Storage Strategy

### 7.1 Volume Estimation

Hero Steels:

- Execution events: ~400/day

- Setup timings: ~10–15/day

- Stoppages: ~10/day

- Rejects: ~2–5/day

- Handovers: 9/day (3 lines × 3 shifts)

Annual:

- Events: ~150K rows

- Setup timings: ~4K rows

- Stoppages: ~4K rows

At 2 years hot: ~300K event rows. Tolerable without partitioning.

**Partitioning trigger.** When execution_events exceeds 10M rows (estimated: year 5 at Hero Steels, or earlier with multi-customer deployment) → partition by month on occurred_at.

### 7.2 Indexing

Focused on the hot-path queries:

- **“****Show me what’s running now on CRS-2****”** — idx_di_active, idx_ee_wc_time

- **“****Show me all events for this dispatch item****”** — idx_ee_item

- **“****Pareto downtime by reason for this shift****”** — idx_stopp_wc_time, idx_stopp_category

- **“****Lookup setup time for a specific transition****”** — idx_setup_context (used by M2 Changeover Learner)

### 7.3 Materialised Views

- m6_dispatch.current_active_item_per_line — single row per active WC showing the currently running/setup-in-progress item; refreshed via trigger on dispatch_items update

- m6_dispatch.shift_progress_live — per-shift progress aggregate (total produced, total planned, elapsed, remaining)

Both are used by the Supervisor Dashboard and the Ops Console Live View.

### 7.4 Hot / Warm / Cold

| Data | Hot (Postgres) | Warm (MinIO Parquet) | Cold |
| --- | --- | --- | --- |
| Execution events | 1 year | 5 years | 7 years (regulatory) |
| Dispatch lists / items | 30 days superseded → archived | 5 years | 7 years |
| Stoppages / rejects | 2 years | 5 years | 7 years |
| Setup timings | 2 years | 5 years | — (used only for matrix learning) |
| Shift handovers | 2 years | 5 years | — |

## 8. API Surface

All endpoints at /api/m6/*.

### 8.1 Floor Console Endpoints

Hot-path for operators. Low latency critical. Simplified auth (device cert + operator badge, not full OIDC flow per call).

#### POST /api/m6/events

The single endpoint for all floor event submissions. Event type determined by payload.

**Request body:**

{
  "event_id": "0190d7f4-a8c3-7890-abcd-ef0123456789",
  "event_type": "setup_started",
  "occurred_at": "2026-04-18T07:22:31Z",
  "operator_id": "op_042",
  "device_id": "andon_crs2",
  "dispatch_item_id": "item_789",
  "wc_id": "CRS-2",
  "signature": "hmac-sha256:...",
  "payload": { /* event-specific */ }
}

**Response:** 200 with server timestamp, or 4xx/5xx with diagnostic.

Latency SLO: p95 < 150ms.

#### GET /api/m6/dispatch/current

Returns the active dispatch list for the calling device’s work centre and current shift.

**Query params:** wc_id (derived from device if not specified), shift (derived from time if not specified).

**Response:** dispatch list with all items, planned vs. actual status, special notes.

Caches aggressively — Floor Console polls this every 30 sec; response cached server-side with 15-sec TTL.

#### GET /api/m6/dispatch/item/{item_id}

Full detail for a single dispatch item. Used when operator taps on an item.

#### POST /api/m6/coils/scan

Thin wrapper over M5a’s scan endpoint that also logs the M6 mount event when successful.

### 8.2 Supervisor / Planner Endpoints

#### GET /api/m6/live

Real-time view of all CRS lines.

**Response:**

{
  "as_of": "2026-04-18T11:30:00Z",
  "lines": [
    {
      "wc_id": "CRS-1",
      "current_item": {
        "wo_id": "wo_8893451",
        "status": "production_in_progress",
        "started_at": "2026-04-18T09:45:00Z",
        "planned_end": "2026-04-18T12:15:00Z",
        "operator": "op_042",
        "progress_pct": 67
      },
      "shift_progress": {
        "target_mt": 95,
        "actual_mt": 52.4,
        "percent": 55,
        "time_remaining_min": 145
      },
      "active_stoppage": null,
      "next_item_at": "12:15"
    },
    /* ... */
  ]
}

#### GET /api/m6/shift-summary/{wc_id}/{shift_date}/{shift}

End-of-shift rollup.

#### POST /api/m6/dispatch/rush-inject

Rush order injection per §6.6.

#### POST /api/m6/dispatch/items/{item_id}/skip

Skip an item with reason.

#### GET /api/m6/stoppages

List current and historical stoppages.

**Query params:** wc_id, active_only, from, to, category.

#### GET /api/m6/downtime-pareto

Aggregate downtime by reason category for a period. Used by M7 dashboards and Shift Review UI.

#### GET /api/m6/handovers/{wc_id}/latest

Most recent handover for the line.

#### POST /api/m6/handovers/sign

Incoming operator signs a handover.

### 8.3 Admin APIs

- PUT /api/m6/config — update downtime categories, shift times

- POST /api/m6/devices/provision — set up a new Andon terminal with device cert + HMAC key

- GET /api/m6/devices — list provisioned terminals + health

- GET /api/m6/diagnostics — event processing latency, outbox lag

### 8.4 Rate Limits

- Event submission: 120/min per device (accommodates peak burst without blocking legitimate activity)

- Dispatch read: 240/min per device

- Live view: 60/min per user

- Admin: 30/min

### 8.5 Bulk / Batch Endpoints

None in v1. All writes are single events. Batching adds complexity without operational benefit at this scale.

## 9. UI/UX Specification

M6 has the largest UI surface area of any Phase 1 module — and the most operationally important, because operators will use it for 8 hours per shift, every shift.

### 9.1 Floor Console — Design Principles

The Floor Console is optimised for **one-tap operations** from touch screens in industrial lighting, with gloves, in 40°C heat. Design principles:

- **Large targets.** Primary action buttons min 80×80 px. Secondary ≥ 60×60 px.

- **High contrast.** Dark background by default, with accent colours at full saturation. No pastels.

- **Redundant encoding.** Text + icon + colour on every state indicator.

- **No scrolling for critical actions.** The current job, next job, and primary actions fit on one screen without scrolling at 21” display (1920×1080).

- **No confirmation dialogs for routine actions.** A 3-second “Undo” strip appears after the action — reversible rather than gated.

- **Visible offline state.** Small banner at top when local buffer has unsynced events.

- **Audio optional.** Confirmation tones are configurable; default off (noisy environment).

- **No deep navigation.** Everything within 2 taps from the home screen.

### 9.2 Floor Console — Home Screen

Single most-viewed screen in the plant. Layout:

┌────────────────────────────────────────────────────────────────────┐
│ CRS-2 · Shift A · Op: Ramesh Kumar                 🔋 ● Online     │
├────────────────────────────────────────────────────────────────────┤
│  ▶ RUNNING: wo_8893451 · IS513-D · 0.45 × 1250 · 18.45 MT          │
│            Started 09:45 · Planned end 12:15 · Progress 67%         │
│            Coil: HR_298451  (mounted 09:42)                         │
│                                                                    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────────┐   │
│  │                 │  │                 │  │                  │   │
│  │  ⏸ STOPPAGE     │  │  ✓ COMPLETE     │  │  ⚠ REJECT        │   │
│  │                 │  │     JOB         │  │                  │   │
│  └─────────────────┘  └─────────────────┘  └──────────────────┘   │
├────────────────────────────────────────────────────────────────────┤
│  NEXT UP: wo_8893520 · IS5986-Fe410 · 0.80 × 1250 · 22.0 MT       │
│           Setup: 140 min planned (grade change + roll change)       │
│           Coil ready: HR_298452 (at stores, reserved)              │
│                                                                    │
│           ┌──────────────────────────────────────────────┐         │
│           │            🔨  START SETUP                     │         │
│           └──────────────────────────────────────────────┘         │
├────────────────────────────────────────────────────────────────────┤
│ 🛈 View full shift schedule · 📋 Handover · 🛠 Raise issue         │
└────────────────────────────────────────────────────────────────────┘

**Colour coding.**

- Running: green accent

- Stopped: amber accent with pulsing indicator

- Setup: blue accent

- Next job with material issue: red border with icon

### 9.3 Floor Console — Stoppage Workflow

Tap ⏸ STOPPAGE:

- Immediate state change: line marked stopped, stoppage_started event fires

- Full-screen category selector with 7 large tiles (Breakdown / Material / Quality / Tool / Power / Break / Other)

- Operator taps a category: 1 more tap for a common sub-reason, or skip straight to “Add detail” for free text

- Return to home screen with stoppage indicator active

- When resolved, operator taps “Resume” — stoppage_ended event fires; if duration > 5 min and reason was “Other”, forced secondary categorisation

### 9.4 Floor Console — Production Complete Workflow

Tap ✓ COMPLETE JOB:

- Screen with pre-filled values:

- Planned qty (from dispatch item)

- Actual qty field — pre-populated with planned, editable

- Scrap field — 0 by default

- Coils consumed — pre-populated from reservations

- Notes — optional

- Operator reviews, corrects if needed (usually quick)

- Big green “Confirm Complete” button

- 3-second undo strip appears after confirmation

- Home screen refreshes showing next job

Target: < 30 sec end-to-end.

### 9.5 Floor Console — Shift Handover

Triggered automatically 15 min before shift end (configurable):

- Banner appears: “Shift handover due in 15 min. Prepare handover.”

- Operator taps “Handover” (or from menu):

- Pre-populated summary: jobs completed, current job state, any stoppages

- Editable fields: machine state notes, safety notes, pending items list

- Submit

- On submit: handover published; incoming operator sees prompt on badge-in

- Incoming operator reads, optionally adds comments, signs (accepts) — completes handover cycle

If outgoing operator fails to submit before shift end: system auto-captures minimal state; supervisor notified to review/close.

### 9.6 Ops Console — Live Lines View (Supervisor Screen)

Real-time snapshot across all CRS lines. Updates every 10 seconds.

┌──────────────────────────────────────────────────────────────┐
│ Live Lines · Shift A · 14:00 remaining: 2h 30m               │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  CRS-1: ● Running · wo_8893451 · IS513-D · 67% complete      │
│         Target 95 MT · Actual 52 MT (55%) · On pace          │
│                                                              │
│  CRS-2: ⏸ Stopped · Material wait · 12 min elapsed            │
│         Target 78 MT · Actual 38 MT (49%) · At risk          │
│         [ Details ] [ Escalate ]                             │
│                                                              │
│  CRS-3: 🔨 Setup · Grade change to IS5986 · 8 min into 140   │
│         Target 88 MT · Actual 40 MT (45%) · On pace           │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ Shift KPIs: Production 130/261 MT · Rejects 1 · Downtime 45m │
└──────────────────────────────────────────────────────────────┘

Click any line → drill to line’s full dispatch list + event timeline.

### 9.7 Ops Console — Shift Review Screen

End-of-shift rollup for supervisor and planner review. Accessed at shift end or on demand.

- KPI banner: production, scrap, rejects, downtime total, setup total

- Downtime Pareto chart (by category, shift only)

- Timeline view: Gantt-style with actual vs. planned for each item

- Reject list with links to coils and NCRs (future M5b link)

- Handover summary

### 9.8 Ops Console — Rush Injection Flow

Supervisor selects a WO from a searchable picker, selects target line, selects target position (after item N). Confirmation modal shows:

- What was scheduled to run in that slot

- New sequence with the injected WO highlighted

- Impact: which items pushed, by how much

- Justification field (mandatory, 20-char minimum)

Confirm → propagates to Floor Console within ~5 seconds.

### 9.9 Device Management UI (Admin)

Platform admins provision Andon terminals via an admin screen:

- List of terminals with status (online / offline / never-seen)

- Device certificate status (valid / near-expiry / expired)

- Assigned work centre and stage

- Last event received timestamp

- Actions: rotate HMAC key, revoke device, rename

### 9.10 Performance SLOs

- Floor Console cold load: < 1 sec on the device

- Floor Console action tap → visual acknowledgment: < 100 ms

- Floor Console action → Core confirmed: < 500 ms p95

- Ops Console live view load: < 800 ms p95

- Shift summary generation: < 10 sec at shift end

- Handover submit: < 2 sec

- Offline mode tolerant up to 24 hours local buffer

### 9.11 Accessibility and Multilingual Support

- English-only UI in v1; operator labels (grade names, category labels) overridable via M2 config (Hindi / Punjabi for operator comfort)

- Large-font mode for operators with vision concerns

- Screen reader support — not primary use case on floor, but Ops Console fully compliant

- Touch optimisation as described in §9.1

## 10. Integration with Other Modules

### 10.1 M6 ← M4 (Scheduler) — Event + Read

plan.schedule.published triggers dispatch list generation (§6.1). M6 reads schedule detail via GET /api/m4/schedule/{id} to build dispatch items.

### 10.2 M6 ← M5a (Material) — Read + Events

Dispatch items show expected coils from M5a. Floor coil scans delegate validation to M5a. material.coil.shortage_detected events flag affected items.

### 10.3 M6 ← M5c (Maintenance) — Events

PM windows come from M4 which sourced from M5c; M6 displays them as dispatch items. Breakdown events can auto-link with active stoppages.

### 10.4 M6 → M1 (Demand) — Event-Driven

floor.production.completed events eventually flow into M1 (via M7) updating WO quantities and status.

### 10.5 M6 → M2 (Master Data) — Setup Timings

M2 Changeover Learner consumes setup_timings nightly. Extracted by M6 on setup_ended events.

### 10.6 M6 → M4 (Scheduler) — Rush Injection Signal

Rush injections trigger M4 tail-replan.

### 10.7 M6 → M5a (Material) — Consumption Events

floor.production.completed publishes coils_consumed payload; M5a consumes and decrements coil weight, publishes material.coil.consumed.

### 10.8 M6 → M5b (Quality, Phase 2) — Reject Events

In Phase 2, floor.reject.raised triggers M5b NCR creation. v1 stores a placeholder.

### 10.9 M6 → M5c (Maintenance) — Stoppage Escalation

Stoppages in category breakdown > threshold auto-escalate to M5c breakdown records. Supervisor can manually escalate any stoppage.

### 10.10 M6 → M7 (OEE / Analytics) — Primary Consumer

M7 consumes nearly every M6 event for OEE computation. M6 publishes floor.shift.summary.computed to hand off the rollup.

### 10.11 M6 → M8 (Energy) — Production Timestamps

M8 uses production start/end timestamps to attribute energy consumption to specific WOs.

## 11. SAP Bidirectional Mapping

### 11.1 Inbound from SAP — None Direct

M6 does not pull from SAP. Work orders arrive via M1.

### 11.2 Outbound to SAP — Production Confirmation

This is M7’s primary write path back to SAP (triggered by M6’s floor.production.completed), but documented here for completeness because M6 is the originator:

- SAP Service: ProductionOrder_SRV with custom extension for confirmation

- Movement types: 101 (Goods Receipt for FG produced) + 261 (Goods Issue for consumed coil, owned by M5a)

- Payload: WO number, qty_good_mt, qty_scrap_mt, actual setup min, actual production min, operator_id

- Response: SAP confirmation number → stored in sap_sync_log

The write-back is M7’s responsibility (it carries the complete production picture including energy, yield, etc.) — M6 just publishes the floor event.

### 11.3 SAP Extension Requirements

- ProductionOrder_SRV confirmation extension — see M1 §11 and M7 §11 (this is the single most important Basis work item for the pilot)

## 12. Failure Modes & Recovery

### 12.1 Andon Terminal Failures

| Mode | Detection | Recovery |
| --- | --- | --- |
| Terminal offline | Core heartbeat missing > 1 min | Banner on Ops Console; nearby terminals can serve as fallback for adjacent line; paper backup log |
| Terminal frozen / unresponsive | Operator reports | Touch-reset procedure; if persistent, replace and re-provision |
| Local buffer disk full | Prometheus disk alert | Alert ops; operator directed to paper backup until terminal swapped |
| Wrong device cert / signature rejected | Core rejects events | Alert; re-provision the terminal |

### 12.2 Event Submission Failures

| Mode | Detection | Recovery |
| --- | --- | --- |
| Core unreachable from terminal | HTTP timeout | Event queued in SQLite, synced=false; retried every 5 sec |
| Event rejected by Core (4xx) | HTTP error response | Terminal shows error with reason; operator may cancel/retry |
| Event accepted but response lost (5xx or network race) | Idempotency on event_id | Next retry succeeds with 200; no duplicate |
| Outbox relay stuck (DB commit succeeds but Redpanda publish fails) | Monitoring metric | Auto-retry with backoff; alert after N failures |

### 12.3 State Consistency Failures

| Mode | Detection | Recovery |
| --- | --- | --- |
| setup_ended received without matching setup_started | Event processor validation | Reject with 409; operator sees error; supervisor override possible |
| production_completed received but dispatch_item status wasn’t ‘production_in_progress’ | State machine validation | Reject; possible inputs: operator error or missing prior event; supervisor override |
| Stoppage_ended without active stoppage on line | Validation | Reject with 409 |
| Handover submit without outgoing operator badge-in | Validation | Supervisor auto-force-close workflow available |

### 12.4 Dispatch Generation Failures

| Mode | Detection | Recovery |
| --- | --- | --- |
| M4 schedule event missing some fields | Generation exception | Log; alert; dispatch list not created for that shift; supervisor manually creates via UI |
| Existing active dispatch would be superseded but has active work | Business logic check | Preserve in-progress items; new dispatch starts from next-not-yet-started item |

### 12.5 Supervisor / Planner Write Failures

| Mode | Detection | Recovery |
| --- | --- | --- |
| Rush injection during M4 mid-run | Collision detection | Queue injection until M4 completes; usually <60 sec |
| Skip on already-completed item | Validation | Reject; explain |

### 12.6 Data Loss Scenarios

| Mode | Detection | Recovery |
| --- | --- | --- |
| Event in terminal local buffer when terminal is physically damaged | Device inventory audit | Recovery from paper log; manual event creation by supervisor; audit trail records the manual entry |
| DB primary disk failure before backup | Backup miss | RPO within 1 hour (continuous WAL); worst-case 1-hour event loss; manual reconstruction from paper + memory |

## 13. Acceptance Criteria

### 13.1 Functional

- ☐ Dispatch lists auto-generate from every plan.schedule.published event within 10 sec

- ☐ Supersession logic correctly preserves in-progress items

- ☐ All floor event types processed correctly with state machine transitions

- ☐ Setup timings extracted on every setup_ended and available to M2 Changeover Learner

- ☐ Stoppages tracked with 7-category classification

- ☐ Reject events captured (placeholder NCR pre-Phase 2)

- ☐ Shift handover workflow end-to-end (outgoing submit + incoming sign)

- ☐ Rush order injection works with audit

- ☐ Supervisor dashboard live view updates within 10 sec of event

- ☐ Floor Console offline mode buffers and syncs events on recovery

- ☐ Event signature validation rejects unsigned/spoofed events

- ☐ Coil scan at line triggers M5a validation + M6 mount event atomically

### 13.2 Non-Functional

- ☐ Floor Console action → Core confirmation < 500ms p95

- ☐ Event ingestion endpoint p95 < 150ms

- ☐ Live view load < 800ms p95

- ☐ Event storage growth within envelope

- ☐ All signatures validated (0% unsigned accepted)

- ☐ Outbox relay lag < 5 sec p95

- ☐ Zero idempotency violations in 1,000-event soak test

- ☐ All RBAC enforced

### 13.3 Pilot Validation

- ☐ Operator can complete JTBDs 1–6 with < 5 sec per tap

- ☐ Supervisor can complete JTBDs 7–10

- ☐ 30-day pilot: zero lost events (Core-side reconciliation with paper backup)

- ☐ Setup timing data quality: ≥ 95% setups have both start + end captured

- ☐ Stoppage categorisation compliance ≥ 90% (operators actually selecting category vs. skipping)

- ☐ Handover completion rate ≥ 85% (outgoing operator submits before shift end)

### 13.4 Documentation

- ☐ OpenAPI spec

- ☐ Event schemas in Apicurio

- ☐ Floor Console operator quick-reference card (single laminated page, posted at each terminal)

- ☐ Supervisor user guide

- ☐ Runbooks: terminal offline, event rejected, handover stuck, Core restart during shift

### 13.5 Rollback Plan

If M6 fails post-go-live: - Operators fall back to paper log (pre-existing state) - Supervisor uses phone / radio for dispatch - M4 continues producing schedules (rendered as PDF for supervisor) - M7 OEE calc runs on best-effort data; supervisors can reconstruct via paper - Recovery: redeploy via standard Zedral Update rollback

## 14. Build Plan

### 14.1 Phases

| Sub-phase | Duration | Deliverable |
| --- | --- | --- |
| **M6.0** — Foundation | Week 1 | Service skeleton, schema, config |
| **M6.1** — Event ingestion endpoint | Weeks 2–3 | Validation, idempotency, signature check, outbox, full event processor |
| **M6.2** — Dispatch generation | Weeks 3–4 | plan.schedule.published subscription, list creation, supersession |
| **M6.3** — Floor Console (core) | Weeks 4–6 | Home screen, setup workflow, production complete workflow, stoppage workflow |
| **M6.4** — Floor Console offline mode | Week 6 | Local SQLite buffer, sync logic, UI indicators |
| **M6.5** — Reject + coil scan integration | Week 7 | Placeholder NCR, M5a scan integration |
| **M6.6** — Handover workflow | Week 7 | Outgoing submit, incoming sign, auto-nudge |
| **M6.7** — Setup timings extraction | Week 7 | Setup timing table, auto-extract on setup_ended |
| **M6.8** — Ops Console (Live + Shift Review) | Weeks 8–9 | Live view, shift summary, downtime Pareto |
| **M6.9** — Rush injection | Week 9 | Supervisor workflow, M4 replan trigger |
| **M6.10** — Device management | Week 9 | Provisioning UI, HMAC key rotation |
| **M6.11** — Integration test | Week 10 | M4/M5a/M7 end-to-end |
| **M6.12** — Soak + pilot prep | Weeks 11–12 | Hardware setup at Hero Steels, training, runbooks |

**Total:** 12 weeks — tied with M4 as the longest module build. M6 and M4 should run in parallel (different engineers); integration converges in Week 10.

### 14.2 Team

Recommended: 2 engineers minimum, 3 preferred.

- **M6 Backend Engineer (primary)** — event processing, state machine, dispatch logic

- **M6 Frontend Engineer** — Floor Console UX is non-trivial and high-stakes

- **Fractional DevOps** — Andon terminal provisioning, local buffer operations, device fleet management

**Hiring JDs:**

**M6 Backend Engineer:**

- **Must have:** Python backend, Postgres, REST APIs, event-driven systems, state machine design

- **Strong plus:** Shop-floor / industrial software background, high-write systems experience, transactional messaging patterns

- **Nice to have:** Steel / manufacturing exposure

**M6 Frontend Engineer:**

- **Must have:** React + TypeScript, touch UI design, accessibility, performance optimisation

- **Strong plus:** Industrial / HMI UI experience, kiosk mode deployment, offline-first web apps

- **Nice to have:** Audio/visual design for factory environments, multilingual UI

### 14.3 Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- | --- |
| R1 | Operators reject the Floor Console as slower than paper | High | Very High | Extensive UX testing with Hero Steels operators in weeks 8–9; iterate on feedback; optimisation for touch + glove + oil |
| R2 | Andon terminal hardware not robust enough for factory floor | Medium | High | Spec industrial-grade IP65 terminals from day 1 (not consumer tablets); redundancy planning |
| R3 | Offline buffer doesn’t drain correctly after extended outage | Medium | High | Soak test with simulated 24-hour Core outage; chaos test with ordering interleaving |
| R4 | Shift handover compliance < 50% (operators skip it) | High | Medium | Auto-nudge 15 min before shift end; supervisor KPI metric; make it fast (<3 min) |
| R5 | Event signing compromises latency | Low | Medium | HMAC is cheap (~1ms); no concern at this scale |
| R6 | Supervisor rush injection triggers thrash in M4 | Medium | Medium | Rate limit rush injections; require justification; surface impact preview |
| R7 | Core event endpoint overwhelmed at shift change peak | Low | Medium | Load test at 10× expected peak; auto-scale processors (k3s-ready architecture) |
| R8 | Multilingual UI feedback delayed beyond pilot | Medium | Low | English-only acceptable for pilot; Hindi/Punjabi labels in M2 as a follow-up |

### 14.4 Dependencies

| Dependency | What | Needed by |
| --- | --- | --- |
| Phase 0 Foundation | Platform, event backbone, auth | Week 1 |
| Andon terminal hardware | Industrial touch terminals installed at each CRS line | Week 4 (for dev iteration); Week 10 (final) |
| M4 Scheduler | plan.schedule.published event + schedule API | Week 3 |
| M5a Material | Coil scan endpoint | Week 7 |
| M2 Master Data | Operator skills for validation | Week 3 |
| M7 | Subscribes to M6 events | Week 10 |
| Ops Console shell | For supervisor UI | Week 8 |

### 14.5 Exit Criteria to Phase 2

- 30 days of production stability

- Setup timing data quality ≥ 95%

- Stoppage categorisation compliance ≥ 90%

- Handover completion rate ≥ 85%

- Zero lost events in pilot (reconciled against paper)

- Operator NPS ≥ +20 (i.e., operators prefer M6 to paper)

- Ready to ship: barcode/RFID integration (Phase 2), PLC-driven auto-events (Phase 2), M5b NCR full workflow integration

## Revision History

| Version | Date | Author | Changes |
| --- | --- | --- | --- |
| v0.1 | 2026-04-18 | Product & Systems Engineering | Initial draft |

*End of M6 — Dispatch **&** Execution Control Production Document* *Total: ~9,400 words · Est. reading time: 50 minutes* *Next module in sequence:** ****M7 — Performance Analytics ******&****** OEE***