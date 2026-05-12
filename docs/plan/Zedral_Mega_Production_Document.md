Zedral Platform ��� Mega Production Document

Unified Phase 1 Engineering Handover �� v0.2 with Hero Steels grounding

Product \& Systems Engineering

April 2026

Table of Contents

# Zedral Platform — Mega Production Document

**The Unified Handover Artefact for Phase 1 Development**

## Document Identity

| Attribute | Value |
| --- | --- |
| **Document type** | Complete Phase 1 Engineering Handover |
| **Version** | **v0.2 — Compiled with Hero Steels grounding changes** |
| **Date compiled** | April 2026 (v0.1) · Revised April 2026 (v0.2) |
| **Total word count** | ~95,000 words across 8 source documents + 10 consolidated artefacts + v0.2 amendments |
| **v0.2 amendments** | See “Change Log from v0.1 to v0.2” below. Driven by Hero Steels manual sheet analysis (Hero_Sheets_Gap_Analysis.md) and instantiated in the Hero_Steels_Configuration_Annex.md companion document. |
| **Est. full read time** | 8–10 hours |
| **Anchor pilot** | Hero Steels Limited (Ludhiana) — Cold Rolling Strip operation |
| **Target vertical (v1)** | Cold rolling / flat steel products |
| **Deployment model** | On-premise, single-tenant, air-gapped OT with DMZ egress |
| **Source documents** | Phase 0 Foundation + M1 + M3 + M4 + M5a + M6 + M7 + M8-lite |
| **Maintained by** | Product & Systems Engineering |

## Change Log from v0.1 → v0.2

**Driver:** Hero Steels shared their current manual shift report forms (PQR/PRD/0908/02 and PQR/PRD/0908/02/A). A field-by-field audit against v0.1 — documented in the companion Hero_Sheets_Gap_Analysis.md — surfaced 5 actionable gaps and 3 plan extensions. All are incorporated into this v0.2. The customer-specific reality (seed codes, open questions, workflows) is captured in the companion Hero_Steels_Configuration_Annex.md; this document incorporates the **structural and architectural** changes only.

### Structural Model Changes (Primary)

- **NEW M2 entity** master.stoppage_codes — catalogue-driven stoppage classification (replaces hard-coded 7-category list in v0.1 M6 §3.1 config). Rollup buckets retained; leaves granularity configurable per customer. Hero Steels seeds with 16 codes.

- **NEW M2 entity** master.defect_codes — defect classification for reject events (v0.1 had no defect taxonomy). Hero Steels seeds with 45 codes.

- **EXTENDED M2 entity** master.rolls — six new columns for roll change tracking: current_wc_id, current_position, cumulative_tonnage_mt, tonnage_since_grind_mt, last_grind_date, grind_cycle_count, roll_finish, expected_life_mt.

- **NEW M6 table** m6_dispatch.production_passes — **structurally significant.** Child rows under a dispatch item, one per rolling pass. Cold rolling at 6 HI-MILL is inherently multi-pass (3–6 passes per coil); v1 treated production as one monolithic operation, losing per-pass thickness, tension, and coolant. v0.2 models each pass as a first-class object.

- **NEW M6 tables** m6_dispatch.roll_assignments and m6_dispatch.roll_changes — roll-to-dispatch-item audit trail and roll-change event records.

- **NEW M6 table** m6_dispatch.shift_crew_assignments — shift-level crew roster (Line Incharge, crew members, crane operator, shift manager). v0.1 captured only per-event operator_id; v0.2 adds shift-level accountability.

- **EXTENDED M6 table** m6_dispatch.dispatch_items — new column is_rerolling (boolean) + rerolling_reason.

- **EXTENDED M7 table** m7_performance.shift_summaries — new aggregate columns: skinpass_mt, rewind_mt, rolling_mt, rerolling_mt, hold_mt, oil_consumption_litres.

### New Event Types

- floor.pass.completed — operator marks end of one rolling pass; carries thickness, tension, coolant values.

- floor.pass.started — operator marks start of a rolling pass.

- floor.roll.changed — roll change event with out/in roll IDs, reason, duration.

- floor.shift.crew_confirmed — crew roster confirmed at shift start.

- floor.shift_report.signed — Line Incharge signs end-of-shift report.

- floor.shift_report.approved — Shift Manager approves shift report; report becomes immutable.

### UX Revisions

- **M6 Floor Console §9.4 (Production Complete)** — rewritten for multi-pass capture. Original single-screen flow preserved for single-pass operations (e.g., CRS-3 temper rolling); new multi-pass flow activates based on material routing’s is_multi_pass flag. Operator taps “Pass Complete” after each pass, records measured thickness + process variables; final pass triggers production completion.

- **M6 Floor Console §9.3 (Stoppage)** — stoppage category tile grid expands from 7 hard-coded categories to N-from-master-data, grouped visually by rollup bucket. Hero Steels will see 16 tiles in 7 bucket groupings.

- **M6 Floor Console §9 (new workflow)** — Roll Change workflow: current rolls displayed, operator scans new top + bottom rolls, reason dropdown, duration timer.

- **M6 Floor Console §9 (new workflow)** — Crew Confirmation at shift start: first Andon interaction each shift prompts Line Incharge to confirm roster (pre-populated from prior shift).

- **M7 §9 (new screen)** — Paper-Compatible Shift Report — PDF export that reproduces the paper sheet layout field-for-field. **This is the critical artefact that retires Hero’s paper sheets.** Two variants: SHIFT_REPORT_6HI_PRIMARY (matches PQR/PRD/0908/02 for CRS-1/2), SHIFT_REPORT_6HI_TEMPER (matches PQR/PRD/0908/02/A for CRS-3).

- **M7 §9 (new workflow)** — End-of-shift digital signature flow: Line Incharge signs → Shift Manager approves → report immutable. Replaces two paper signature blocks.

### Program Context Additions

- **Pending Decisions:** PD-28 through PD-37 added (the 10 Open Questions from Hero Steels walkthrough) — see Part IV.B.

- **Risk Register:** New risk PR-26 (multi-pass UX adoption friction) added — see Part IV.D.

- **Build Plan:** M6 sub-phases extended by 1 week to accommodate multi-pass capture (new M6.3.2 and M6.3.3 sub-phases). Net effect: pilot go-live remains Week 12 **if** M6 Frontend Engineer onboards by Week 3 (revised from Week 4 in v0.1). If not, go-live slips to Week 13.

- **Critical Path:** Multi-pass material routing validation added as a Week 1 Hero-confirmation item.

### Companion Documents (New in v0.2 Release)

- **Hero_Sheets_Gap_Analysis.md** — the field-by-field audit that drove these changes. Internal artefact; not for customer delivery.

- **Hero_Steels_Configuration_Annex.md** — customer-specific reality layer: site profile, full seed data (16 stoppage codes, 45 defect codes, shift pattern, crew structure, meter provisioning), 10 Open Questions for Hero walkthrough, paper-compatible report field-sourcing map, transition plan from paper to digital. **The configuration contract between Zedral and Hero Steels.**

### What Did Not Change

- All 10 Architectural Principles — unchanged. The grounding exercise validated them.

- Phase 0 architecture, event backbone, topology, technology stack — unchanged.

- M1, M3, M4, M5a, M8-lite module docs — unchanged. All changes concentrated in M2 seed entities, M6 Dispatch, M7 Performance.

- Pilot go-live target (end Week 12) — unchanged, contingent on M6 Frontend Engineer earlier onboarding.

- 5 Load-Bearing Event Chains — unchanged in structure. Chain 1 (Plan→Dispatch) now implicitly carries multi-pass awareness.

## How to Read This Document

This is the complete Phase 1 engineering handover. It inherits everything from the Phase 0 Foundation Document and integrates all seven Phase 1 module production docs. It is written to serve four distinct reading modes.

### Reading Modes

**Full sequential read (8–10 hours) — New hires, architects, senior customer technical stakeholders.** Read Parts I through IV in order. Part I establishes the platform. Parts II–III build the modules on top. Part IV gives operational and program context (RACI, risks, critical path). Part V is the reference appendices (glossary, data dictionary, event taxonomy, API reference).

**Principles + architecture only (90 minutes) — Product and engineering leads reviewing decisions.** Read Part I Sections 1, 2, and 14 (Product Definition, 10 Architectural Principles, Open Questions). Then Part IV (Program Context).

**Module-focused read (45–60 min per module) — Engineers taking ownership of a specific module.** Read Part I sections 4 (Event Backbone) and 5 (M2 Master Data). Then the specific module chapter in Part II. Then the Dependencies & RACI entries for that module in Part IV.

**Reference lookup (on demand) — Anyone answering a specific question.** Use Part V appendices: glossary, consolidated data dictionary, event taxonomy, API reference.

### Document Map

- **Part I — Platform Foundation** (Phase 0): The platform that all modules inherit. Architecture, principles, event backbone, master data, topology, integration, cross-cutting services, stack, security, observability, deployment, dev standards.

- **Part II — Demand-Side Modules:** M1 (Demand & Order Management), M3 (Capacity & RCCP), M4 (APS Scheduling Engine).

- **Part III — Execution-Side Modules:** M5a (Material & Inventory), M6 (Dispatch & Execution), M7 (Performance & OEE), M8-lite (Energy Aggregation).

- **Part IV — Program Context:** Master RACI, consolidated pending decisions, hiring JD compendium, risk register, critical-path timeline.

- **Part V — Reference Appendices:** Glossary, data dictionary, event taxonomy, API reference.

## The Platform at a Glance

Before diving in, a single-picture view of what Zedral is:

flowchart TB
    subgraph ExternalSystems["External Systems"]
        SAP["SAP ECC<br/>(Business)"]
        SCADA["SCADA / PLCs<br/>(Machines)"]
        DISCOM["DISCOM Bills /<br/>Regulators (ESG)"]
    end

    subgraph ZedralPlatform["Zedral Platform — On-Prem, Air-Gapped"]
        direction TB
        
        subgraph Foundation["Foundation (Phase 0)"]
            direction LR
            EventBus["Unified Event Backbone<br/>Redpanda"]
            M2[("M2 Master Data<br/>incl. Changeover Matrix")]
            Store[("PostgreSQL + TimescaleDB<br/>MinIO Object Store")]
        end
        
        subgraph DemandSide["Part II — Demand-Side"]
            direction LR
            M1["M1 Demand &<br/>Orders"]
            M3["M3 Capacity<br/>RCCP"]
            M4["M4 APS<br/>Scheduler<br/>(CP-SAT)"]
        end
        
        subgraph ExecutionSide["Part III — Execution-Side"]
            direction LR
            M5a["M5a Material<br/>Inventory"]
            M6["M6 Dispatch<br/>Floor Console"]
            M7["M7 OEE<br/>Analytics"]
            M8["M8-lite<br/>Energy"]
        end
        
        subgraph UI["User Surfaces"]
            direction LR
            Ops["Ops Console<br/>(Planner/Super/<br/>Energy Mgr)"]
            Floor["Floor Console<br/>(Andon)"]
        end
        
        Foundation --> DemandSide
        Foundation --> ExecutionSide
        DemandSide --> ExecutionSide
        DemandSide --> UI
        ExecutionSide --> UI
    end

    SAP <--> ZedralPlatform
    SCADA -.->|read-only OPC-UA/Modbus| ZedralPlatform
    ZedralPlatform -.->|DMZ egress<br/>scheduled, signed| DISCOM

    classDef foundation fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef demand fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef execution fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef ui fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px
    classDef external fill:#fafafa,stroke:#757575,stroke-width:1px
    
    class Foundation,EventBus,M2,Store foundation
    class DemandSide,M1,M3,M4 demand
    class ExecutionSide,M5a,M6,M7,M8 execution
    class UI,Ops,Floor ui
    class SAP,SCADA,DISCOM external

**Reading this diagram:** Foundation (blue) sits underneath everything — the event backbone and master data are what make “one event, many views” work. Demand-side modules (orange) decide what to run. Execution-side modules (purple) run it and measure it. User surfaces (green) are how humans interact. SAP is bidirectional; SCADA is read-only; regulator egress is outbound-only through the DMZ.

## Master Table of Contents

### Part I — Platform Foundation (Phase 0)

- Section I.1 — Product Definition

- Section I.2 — Architectural Principles — The 10 Commandments

- Section I.3 — System Architecture (C4 Levels 1 & 2)

- Section I.4 — The Unified Event Backbone

- Section I.5 — Master Data Engine — M2

- Section I.6 — Edge–Core–DMZ Topology

- Section I.7 — Integration Layer

- Section I.8 — Cross-Cutting Services

- Section I.9 — Technology Stack

- Section I.10 — Security & Compliance Baseline

- Section I.11 — Observability Stack

- Section I.12 — Deployment & Update Strategy

- Section I.13 — Development Standards

- Section I.14 — Open Questions & Deferred Decisions

- Section I.15 — Glossary *(superseded by consolidated glossary in Part V)*

### Part II — Demand-Side Modules

- Chapter II.M1 — Demand & Order Management

- Chapter II.M3 — Capacity Planning & RCCP

- Chapter II.M4 — APS Finite Scheduling Engine

### Part III — Execution-Side Modules

- Chapter III.M5a — Material & Inventory Control

- Chapter III.M6 — Dispatch & Execution Control

- Chapter III.M7 — Performance Analytics & OEE

- Chapter III.M8-lite — Energy Aggregation

### Part IV — Program Context

- Section IV.A — Master RACI Matrix

- Section IV.B — Consolidated Pending Decisions Log

- Section IV.C — Hiring JD Compendium

- Section IV.D — Consolidated Risk Register

- Section IV.E — Critical-Path Dependency Diagram

### Pilot Build Timeline — Mermaid Gantt

gantt
    title Zedral Phase 1 Build — 12-Week Pilot Plan
    dateFormat  YYYY-MM-DD
    axisFormat  W%U
    
    section Foundation
    Phase 0 Platform Build            :done, p0, 2026-04-20, 2w
    M2 Master Data + Matrix Bootstrap :active, m2, 2026-04-20, 6w
    
    section Customer Prep (Critical Path)
    SAP Basis Extensions (6-wk lead)  :crit, sap, 2026-04-20, 6w
    Andon Hardware Procure + Install  :crit, hw, 2026-05-11, 3w
    Smart Meter Install + Commission  :crit, meters, 2026-05-11, 3w
    
    section Demand-Side (Workstream A+B)
    M1 Demand & Orders        :m1, after p0, 6w
    M3 Capacity Planning      :m3, after p0, 6w
    M4 Scheduler (CP-SAT)     :m4, after p0, 10w
    M4 Gantt Frontend         :m4ui, after m2, 6w
    
    section Execution-Side (Workstream C+D)
    M5a Material & Inventory  :m5a, 2026-04-27, 8w
    M6 Dispatch + Floor Cons. :m6, 2026-04-27, 10w
    M7 OEE + SAP Confirm      :m7, 2026-05-18, 8w
    M8-lite Energy Data Plane :m8, 2026-05-04, 8w
    
    section Integration + Go-Live
    Cross-module Integration Test  :intg, 2026-06-22, 2w
    Soak Testing                   :soak, 2026-06-29, 2w
    Pilot Go-Live                  :milestone, go, 2026-07-06, 0d

**How to read this Gantt:** - **Red tasks (Critical Path):** SAP Basis work, hardware installation — delays here delay go-live directly - **Foundation (blue):** Must complete Week 2 end for all downstream work to start - **Workstream A/B (Demand-Side):** M1/M3 parallel, M4 longest at 10 weeks - **Workstream C/D (Execution):** M5a starts Week 2, M6 starts Week 2, M7 starts Week 5 (needs M6 events) - **Integration window:** 2 weeks of cross-module testing before soak - **Go-live target:** Week 12 / early July 2026

# Part V — Reference Appendices

- Appendix A — Consolidated Glossary

- Appendix B — Consolidated Data Dictionary (Schema Inventory)

- Appendix C — Consolidated Event Taxonomy

- Appendix D — Consolidated API Reference

- Appendix E — Revision History

# Part I — Platform Foundation

*The following is the complete Phase 0 Foundation Document. Every decision in Parts II and III inherits from these principles and architectural patterns. Sections are renumbered for the Mega Document — original Phase 0 numbers (§1–§15) map to I.1–I.15 here.*

## I.A — Product & Conceptual Foundation

## 1. Product Definition

### 1.1 The Problem

Steel processing plants — and by extension most mid-market Indian discrete and process manufacturers — operate with a broken operational spine. The ERP (typically SAP ECC) knows what *should* happen at a monthly/weekly plan level. The shop floor knows what *actually* happened, tracked on paper, Excel, and whiteboards. And the four critical operational domains — production scheduling, execution tracking, energy management, and compliance reporting — live as four disconnected systems that don’t share data.

The result: plans are made without real capacity, schedules ignore real changeover times, production data reaches ERP 24 hours late if at all, energy consumption is reported monthly from DISCOM bills, and ESG reports are compiled manually once a year from scattered spreadsheets.

At Hero Steels specifically, the CRS (Cold Rolling Strip) operation runs three priority lines (CRS-1 / CRS-2 / CRS-3) at a rated 180,000 MTPA combined. Changeovers consume 120–200 minutes per event, accounting for roughly 9.2 days of setup per line per month. The changeover matrix — the single most important piece of master data for scheduling — does not exist in any structured form. OEE cannot be reliably computed. Energy is metered only at site level. BRSR filing is a hundred-hour manual exercise every quarter.

### 1.2 The Customer

**Primary ICP.** Mid-market process and discrete manufacturers in India with 50,000–500,000 MTPA production scale, SAP or Tally on the business side, a mix of legacy PLCs and SCADA on the OT side, and regulatory exposure to BRSR / PAT / CCTS.

**Anchor pilot.** Hero Steels Limited — Ludhiana plant, cold rolling operations. Live plant access confirmed.

**Buyer personas:**

- **CFO** — sees the ESG compliance burden and the cost of energy as two line items that are growing and unmanaged

- **Head of Manufacturing** — sees scheduling chaos, changeover tax, OEE gap

- **Plant Engineering / IT** — sees the integration nightmare across SAP, legacy SCADA, and spreadsheets

- *Typical pilot champion:* Head of Manufacturing with CFO sign-off

**User personas:**

| Persona | Primary modules | Typical daily usage |
| --- | --- | --- |
| Production Planner | M1, M3, M4 | 2–4 hours / day |
| Shift Supervisor | M4, M6, M7 | Continuous during shift |
| Floor Operator | M6 | Continuous on Andon terminal |
| Maintenance Engineer | M5c | 1–2 hours / day + reactive |
| Quality Engineer | M5b | 2–3 hours / day |
| Energy / Sustainability Manager | M8 | Weekly + reporting peaks |
| Plant Head | M7 (dashboard) | 15–30 min / day |

### 1.3 Jobs to Be Done

**Primary JTBD.** “When a sales order lands, I need to know within minutes whether we can deliver it on time, and once we accept it, have it executed on the floor with minimum changeover loss and full traceability — so I don’t miss customer commitments or burn capacity on avoidable setups.”

**Supporting JTBDs.**

- “Show me the real OEE of CRS-1 right now, broken down by shift, so I know where today’s losses are coming from.”

- “Tell me which coil is at which process stage, for every open work order, without me having to walk the floor.”

- “Produce a BRSR-compliant Scope 1 and Scope 2 emissions report for the last quarter, with drill-down to line level, without anyone touching a spreadsheet.”

- “When CRS-2 has a breakdown, automatically tell me the impact on today’s schedule and where the affected jobs can move.”

- “At the end of every shift, show me exactly how much setup time we lost and why — and whether it’s trending down.”

### 1.4 Non-Goals (v1)

Explicit non-goals for the first 18 months. If a decision or feature drifts toward any of these, the decision is wrong:

- **Not a full SAP replacement.** We connect, we don’t displace. No GL, no AP, no HR.

- **Not a closed-loop control system.** We do not write to PLCs. Read-only from OT in v1.

- **Not a multi-site orchestration platform.** One plant per deployment. Multi-plant roll-up is a Phase 4+ concern.

- **Not an ML-heavy product.** Deterministic algorithms (CP-SAT, rules, thresholds) first. ML add-ons only after 6+ months of clean plant data and a specific problem deterministic approaches cannot solve.

- **Not a SaaS.** Every deployment is on-premise, single-tenant. No multi-tenant isolation is designed into v1.

- **Not a generic factory platform.** Steel processing first. Adjacent verticals (aluminium, copper, rolling-adjacent industries) are entertained only after two reference customers in steel.

- **Not a configurable everything-platform.** Resist the low-code/workflow-engine temptation. Steel-first opinionated data model > generic configurability.

### 1.5 Success Metrics — North Star and Supporting KPIs

**North Star metric.** **Time-to-first-audit-ready BRSR report from operational data** — compressed from the industry baseline of ~90 days (manual) to under 30 minutes (automated).

This single metric is the visible, demonstrable proof of the unified-data-layer thesis: the same event stream that runs the plant also generates the regulator’s report. If we cannot do this, the thesis fails.

**Product-level KPIs (pilot-measurable):**

| KPI | Baseline (Hero Steels current) | Month 6 target | Month 12 target |
| --- | --- | --- | --- |
| Setup time per changeover (avg, CRS-1) | 160 min | 120 min (−25%) | 95 min (−40%) |
| OEE (CRS-1) | ~55% (estimated) | +5 pp | +8 pp |
| Schedule adherence | Not measured | >70% | >85% |
| Production data latency (floor → ERP) | 12–24 hours | <1 hour | <5 minutes |
| SEC tracking variance (kWh/tonne) | ±20% (bill-based) | ±5% | ±2% |
| BRSR report prep time | ~100 hrs/quarter | <10 hrs | <30 minutes |

**Business-level KPIs:**

- First paid revenue: month 8 (pilot paid conversion)

- Second customer signed: month 14

- Gross margin on software line: >70% by second customer

- Time-to-deploy at second customer: <90 days (benchmark: Siemens Opcenter = 6–18 months)

### 1.6 The North Star — One Sentence

Zedral is the unified operations platform for mid-market Indian manufacturers — one event stream powers scheduling, execution, energy, and compliance, so plants stop running on four disconnected systems and three layers of Excel.

## 2. Architectural Principles — The 10 Commandments

These are non-negotiable. Every design decision, in every module, must obey these. Any proposed exception must be escalated, documented in the ADR log, and explicitly approved.

### Principle 1 — One Event, Many Views

Every operational fact is published exactly once to the event backbone. Every module that cares about that fact reads it as a projection. There is no scenario in which two modules store the same fact in parallel tables maintained by separate writers.

This is the concrete, technical meaning of “unified data layer.” It is not a slogan — it is an architectural contract enforced by code reviews and schema governance.

**Anti-pattern to avoid:** M4 writes to scheduled_operations and M6 separately maintains a dispatch_events table where both store “setup_start_time” — now you have two sources of truth that will diverge.

**Correct pattern:** M6 publishes floor.setup.started to the backbone. M4’s projection consumes that event and updates its read model. M7 also consumes it for OEE calculation. One write, many reads.

### Principle 2 — Append-Only Truth, Materialised Reads

The event log is the system of record. Module tables (work_orders, schedules, kpi_snapshots) are **materialised views** — they can be rebuilt from the event log at any time.

This gives us:

- **Bulletproof audit trail** — BRSR assurance-grade, CCTS-compliant, forensic-ready

- **Deterministic replay** — reproduce any production bug by replaying from a known event offset

- **Late-binding module addition** — when M5c WMS ships in Phase 3, it backfills its state by replaying material.* event history

- **Schema evolution** — changing a projection’s schema means draining its state and rebuilding from the log; no data loss

### Principle 3 — Air-Gap Native, DMZ for Egress

The operational network has **zero outbound internet access**. ESG reports, fleet health telemetry, and software updates cross the air gap only through a DMZ — a hardened jump zone with one-way sync windows, signed-and-encrypted bundles, and no interactive sessions by default.

Break-glass remote support is time-boxed, audited, customer-initiated, and technically walled from the OT VLAN.

This is not paranoid over-engineering. It is what Indian steel plants’ IT-security gatekeepers demand, and honouring it unblocks the sales cycle.

### Principle 4 — Deterministic by Default, ML by Exception

v1 ships with:

- Heuristic + constraint-programming scheduling (CP-SAT via Google OR-Tools)

- Rule-based anomaly detection

- Threshold-based alerting

- Statistical (non-ML) baselining

ML is **deferred, not forbidden**. It becomes permissible when:

- There is at least 6 months of clean, labelled plant data available

- The specific problem has been tried with deterministic methods and they demonstrably fall short

- The resulting model is explainable to a plant engineer — black-box models are unsellable in an OT context

**Rationale.** ML on an air-gapped plant with no training data baseline is a year-long research project, not a v1 feature. Customers can debug a rule. They cannot debug a neural network at 2 AM.

### Principle 5 — ISA-95 Compliant Boundaries

The platform lives at **Level 3** (Manufacturing Operations Management) in the Purdue Model. It integrates:

- **Downward** to Level 2 (SCADA/PLC) — read-only, via OPC-UA and Modbus

- **Upward** to Level 4 (ERP) — bidirectional, via SAP OData and file connectors

It does **not** pretend to be Level 4 (no financial posting, no AP/AR, no HR master). It does **not** act as Level 2 (no PLC writes, no direct control).

This boundary is what makes Zedral installable alongside existing SAP and Rockwell/Siemens SCADA without triggering a turf war with the customer’s existing vendor ecosystem.

### Principle 6 — Open-Source First

Every component in the stack must be open-source by default. Commercial dependencies are permitted only where open-source alternatives materially compromise the product — and each one is documented in the ADR log with the reason.

**Rationale.**

- Honours the 1/10th cost thesis — licensing is our largest avoidable cost

- Avoids vendor lock-in in air-gapped environments where license renewal is operationally painful (offline license keys, expiry surprises)

- Gives customers a defensible exit story — “even if Zedral disappears tomorrow, your data is in Postgres and Kafka and you can read it”

**Current permitted commercial exceptions (v1):** None.

### Principle 7 — Offline-Capable, Online-Enhanced

Every module must function with its local database, local workers, and local UI — **no external dependencies required to run a shift**. Features that require DMZ egress (ESG filing, fleet health upload, OTA updates) degrade gracefully when the DMZ is down.

The floor never stops because the corporate WAN is down. Production dispatch, quality capture, and OEE calculation must survive complete isolation.

### Principle 8 — Schema-First, API-Second

Every event, every table, every API payload is defined in a **schema registry** (Apicurio or Confluent-compatible) before any code is written. Breaking changes require a new schema version and a documented migration plan.

Module teams cannot negotiate private contracts. If Module A’s output is Module B’s input, it’s in the registry and goes through versioned review.

**Enforcement:** CI blocks merges if a code change touches a published schema without a version bump.

### Principle 9 — Observability Is a Product Feature

Every worker emits structured logs (JSON, correlation-IDs). Every HTTP endpoint emits Prometheus metrics. Every critical path (schedule run, SAP sync, ESG report generation) emits OpenTelemetry traces.

The three-tier fleet monitoring model (in-plant Grafana, weekly DMZ health bundles, break-glass support) is **core infrastructure, not ops housekeeping**. When a customer calls at 2 AM, we must be able to answer “what’s happening?” without asking them to send us logs.

### Principle 10 — Steel First, Generic Second

The data model (grade, gauge, coil, roll), the scheduler’s changeover matrix, the quality checkpoints (thickness/hardness/yield-strength), the energy disaggregation logic (kWh/tonne per CRS stage) — all are designed for cold rolling steel first.

Generalising to adjacent verticals is a Phase 4+ concern. Resist the temptation to build a configurable meta-platform before we have shipped for one vertical. **Every hour spent on configurability is an hour not spent deepening the steel fit.**

## 3. System Architecture (C4 Levels 1 & 2)

### 3.1 System Context (C4 Level 1)

Zedral sits between four categories of external systems. The boundary is the Zedral Platform. Everything outside the box is *their* responsibility; everything inside is *ours*.

                                 ┌─────────────────────────┐
                                 │  DMZ / External Egress  │
                                 │                         │
                                 │  • Regulator portals    │
                                 │    (NSE BRSR, BEE PAT)  │
                                 │  • Zedral HQ telemetry  │
                                 │  • Update bundle repo   │
                                 └────────────▲────────────┘
                                              │ signed bundles only
                                              │ scheduled windows
   ┌──────────────────┐                       │
   │  ERP / Business  │                       │
   │                  │◀──── SAP OData ──────▶┌───────────────────┐
   │  • SAP ECC       │                       │                   │
   │  • Tally         │                       │                   │
   │  • Oracle        │                       │  ZEDRAL PLATFORM  │
   └──────────────────┘                       │                   │
                                              │  Unified Event    │
   ┌──────────────────┐                       │  Backbone + M1–M8 │
   │  OT / Automation │                       │                   │
   │                  │──── OPC-UA/Modbus ───▶│                   │
   │  • SCADA         │     (read-only)       │                   │
   │  • PLCs          │                       │                   │
   │  • Smart meters  │                       │                   │
   └──────────────────┘                       └─────────▲─────────┘
                                                        │
                                              ┌─────────┴─────────┐
                                              │   Human Users     │
                                              │                   │
                                              │  • Web browsers   │
                                              │  • Andon terminals│
                                              │  • Mobile (P3)    │
                                              └───────────────────┘

**External system contracts:**

| System | Direction | Protocol | Cadence | Volume (Hero Steels baseline) |
| --- | --- | --- | --- | --- |
| SAP ECC | Bidirectional | OData v2 over HTTPS | Pull every 15 min, write on event | ~500 WO/month, ~3 GB data |
| SCADA | Inbound only | OPC-UA over TLS | Streaming (100–500 ms tick) | ~50 tags × 3 lines |
| Smart meters | Inbound only | Modbus-TCP | 15-min interval reads | 3 meters × 96 reads/day |
| Andon terminals | Bidirectional | HTTPS (REST) | Event-driven | ~200 events/shift/line |
| Regulator portals | Outbound only | File upload (manual) | Quarterly / annual | 3–5 reports/year |

### 3.2 Container Architecture (C4 Level 2)

Zedral decomposes into containers grouped into three zones matching the Purdue Model. Each container is a deployable unit (a Docker image in v1, a k3s pod in v2+).

#### 3.2.1 Edge Zone (Level 2 adjacency)

Lives in the OT VLAN. Physically close to the machines.

- **Edge Gateway** — Linux node running:

- OPC-UA client (subscribes to SCADA tags)

- Modbus-TCP scanner (polls smart meters)

- Local MQTT broker (for IoT-native devices, if any)

- Local buffer (SQLite) — persists events when Core is unreachable; drains on reconnect

- Kafka producer — the only outbound path from OT to Core

This is the **only** ingress point from OT to Core. Firewall rules allow exactly one TCP port (Kafka/Redpanda SASL+TLS) outbound from this box to Core. Everything else is denied.

#### 3.2.2 Core Zone (Level 3)

Lives in the Core VLAN. This is where the platform runs.

**Data Plane:**

- **Event Backbone** — Redpanda (Kafka-API-compatible). The spine of the system.

- **Core Database** — PostgreSQL 16 with TimescaleDB extension (for energy_readings and kpi_snapshots time-series partitioning). One logical database, one schema per module (master, m1_demand, m4_schedule, m8_energy, etc.).

- **Object Store** — MinIO (S3-API-compatible). Stores: generated ESG reports, test certificate PDFs, SOPs, event archives (via Kafka Connect S3 sink), nightly DB backups.

- **Schema Registry** — Apicurio. Versioned schemas for all events and API payloads.

**Application Plane:**

- **API Gateway** — Traefik. TLS termination, OIDC auth integration, rate limiting, path-based routing to services.

- **M1 Demand Service** — FastAPI worker. SAP WO/SO ingestion, priority scoring, demand APIs.

- **M2 Master-Data Service** — FastAPI worker. Serves all master data reads, handles writes with audit and maker-checker.

- **M3 Capacity Service** — FastAPI worker. RCCP calculations, traffic-light views.

- **M4 Scheduler Service** — FastAPI wrapper around a CP-SAT worker pool. Runs scheduling jobs (heavy compute — isolated from API workers).

- **M5a Material Service** — FastAPI worker. Coil inventory, WIP location, shortage prediction.

- **M5b Quality Service** — FastAPI worker. Quality event ingestion, NCR workflow.

- **M5c Maintenance Service** — FastAPI worker. PM calendar, breakdown flow, MTBF/MTTR.

- **M6 Dispatch Service** — FastAPI worker. Dispatch list generation, floor event capture (highest write volume).

- **M7 OEE Service** — KPI calculator. Computes OEE, variance, Pareto; writes kpi_snapshots.

- **M8 Energy Service** — FastAPI worker. Meter ingestion adapter, SEC calculator, emission calculator, ESG report generator.

- **SAP Sync Worker** — dedicated process handling bidirectional SAP sync with retry/backoff.

- **Auth ****&**** Identity** — Keycloak (OIDC).

**Presentation Plane:**

- **Operations Console** — React SPA. Planners, supervisors, managers. Served via API Gateway at /ops/*.

- **Floor Console** — React SPA, touch-optimised. Operators on Andon terminals. Served at /floor/*. Runs fullscreen, auto-kiosk mode.

- **Mobile App (Phase 3)** — React Native. Supervisor and maintenance field use.

**Observability Plane:**

- **Prometheus** — metrics collection

- **Loki** — log aggregation

- **Tempo** — distributed traces

- **Grafana** — visualisation, alerting

#### 3.2.3 DMZ Zone (Level 3.5)

Lives in the DMZ VLAN. Hardened, minimal.

- **Egress Packager** — scheduled worker. Builds signed, encrypted bundles for: ESG exports to regulator portals (manual upload by sustainability manager); weekly fleet health to Zedral HQ; on-demand support log bundles.

- **Update Receiver** — scheduled worker. Pulls signed update bundles from Zedral HQ, verifies signatures (Ed25519 + customer-specific allow-list), stages them for admin-approved deployment.

- **Jump Host** — hardened SSH bastion. Used only for break-glass remote support with MFA, session recording, time-boxed access tokens.

### 3.3 Network Segmentation

Three VLANs, strict firewall rules between them. The firewall is the customer’s responsibility to configure; we provide the exact port/protocol manifest.

| From → To | Allowed | Protocol | Direction |
| --- | --- | --- | --- |
| OT → Core | Kafka producer only | TCP/9092 (SASL+TLS) | Outbound from OT |
| Core → OT | **Denied** | — | (no writes in v1) |
| Core → DMZ | Egress queue drain | TCP/443 (mTLS) | Outbound, scheduled windows |
| DMZ → Core | **Denied** (pull model) | — | Core pulls from DMZ drop zone |
| DMZ → Internet | Allow-listed destinations | TCP/443 | Only scheduled egress + update fetch |
| Internet → DMZ | **Denied** by default | — | (Break-glass opens temp tunnel) |
| Users → Core | Web UI + APIs | TCP/443 (TLS) | Via internal DNS |

**Encryption:**

- All inter-zone traffic: mTLS with customer-specific CA

- Data at rest: LUKS (disk-level) + PostgreSQL TDE for sensitive columns (operator PII, credentials)

- Event signatures: HMAC-SHA256 per device key (detects tampering on shop-floor-originated events)

### 3.4 Deployment Topology — Hero Steels Specifically

Reference hardware BOM for the pilot:

| Component | Spec | Location | Approx cost (₹) |
| --- | --- | --- | --- |
| 1× Edge Gateway | 4 vCPU / 16 GB RAM / 256 GB SSD, industrial fanless | CRS electrical room | 80,000 |
| 1× Core Server | 16 vCPU / 64 GB RAM / 2 TB NVMe (RAID 1) | Plant IT room | 4,50,000 |
| 1× DMZ Host | 4 vCPU / 16 GB RAM / 256 GB SSD | DMZ cabinet | 80,000 |
| 3× Andon Terminals | 21″ industrial touchscreen PC, IP65 | Each CRS line | 3,00,000 |
| 3× Smart Meters (installed Phase 1) | Schneider PM5350 or equivalent, Modbus-TCP | CRS incomers | 1,50,000 |
| Network switches, cabling, UPS | — | — | 1,00,000 |
| **Total** | — | — | **~₹11,60,000** |

Runtime stack on Core Server in v1: **Docker Compose** (simpler ops, sufficient for single-node). Phase 2 migrates to **k3s** (single-node Kubernetes) when HA becomes relevant.

## 4. The Unified Event Backbone

The architectural heart of Zedral. If this is wrong, the unified-data-layer thesis collapses. Every other component is built on top.

### 4.1 Technology Choice — Redpanda

**Selected:** Redpanda (Kafka-API-compatible, C++ implementation, single-binary deployment, no ZooKeeper, deterministically lower resource footprint than Apache Kafka).

**Considered and rejected:**

| Option | Verdict | Reason |
| --- | --- | --- |
| Apache Kafka | Rejected | Too resource-heavy for a 64 GB Core Server that also runs Postgres + services; ZooKeeper/KRaft operational complexity unwarranted at single-node scale |
| RabbitMQ | Rejected | Not a log. No replay. Not append-only. Fails Principle 2 |
| NATS JetStream | Viable but not chosen | Lighter than Kafka but Kafka API compatibility in Redpanda unlocks entire Kafka ecosystem (Debezium CDC, Kafka Connect sinks, Apicurio schema registry) at identical operational cost |
| Postgres LISTEN/NOTIFY | Rejected | Not durable, not replayable, not scalable. Fine for intra-service hints only |
| Pulsar | Rejected | Over-engineered for single-node; operational complexity too high |

Redpanda runs as a single-node cluster in v1 (3-node from Phase 2 when HA becomes a requirement — deferred).

### 4.2 Topic Taxonomy

Topics are named <domain>.<aggregate>.<event> and partitioned by the primary aggregate ID to preserve ordering per aggregate. This is critical: events for the same work order must arrive in order; events for different work orders can parallelise freely.

**Core topics (v1):**

| Topic | Partition key | Volume estimate (Hero Steels) | Retention (hot) |
| --- | --- | --- | --- |
| erp.work_order.received | wo_id | ~500/month | 7 days |
| erp.sales_order.received | so_id | ~400/month | 7 days |
| erp.material_master.updated | material_code | ~50/month | 7 days |
| master.changeover_matrix.updated | wc_id | ~100 total, then trickle | 30 days |
| master.calendar.updated | wc_id+date | ~100/day | 7 days |
| plan.capacity.calculated | wc_id+period | ~30/day | 7 days |
| plan.schedule.published | schedule_id | ~5/day | 30 days |
| floor.dispatch.issued | wc_id+shift | ~9/day (3 lines × 3 shifts) | 7 days |
| floor.setup.started | wc_id | ~15/day | 30 days |
| floor.setup.completed | wc_id | ~15/day | 30 days |
| floor.production.started | wc_id+wo_id | ~50/day | 30 days |
| floor.production.completed | wc_id+wo_id | ~50/day | 30 days |
| floor.downtime.started | wc_id | ~20/day | 30 days |
| floor.downtime.ended | wc_id | ~20/day | 30 days |
| floor.quality.measured | coil_id | ~300/day | 90 days |
| floor.ncr.raised | ncr_id | ~5/day | 90 days |
| asset.breakdown.reported | wc_id | ~2/day | 90 days |
| asset.pm.scheduled | wc_id | ~10/month | 30 days |
| material.coil.staged | coil_id | ~100/day | 30 days |
| material.coil.consumed | coil_id | ~50/day | 30 days |
| energy.meter.reading | meter_id | **~300/day × 3 meters** | 7 days (Timescale-downstream) |
| energy.event.peak_demand | site_id | ~5/month | 365 days |
| erp.sync.requested | sync_id | ~200/day | 7 days |
| erp.sync.completed | sync_id | ~200/day | 7 days |

**Dead-letter topics:** every topic has a <topic>.dlq counterpart for messages that fail processing after N retries.

**Topic lifecycle governance:**

- New topic creation requires an ADR entry

- Topic deletion is prohibited in v1 — deprecate + drain instead

- Topic-level ACLs enforced via Redpanda’s SASL integration

### 4.3 Event Schema Standard

Every event conforms to a common envelope. This is non-negotiable and enforced via Apicurio schema validation.

{
  "event_id": "0190d7f4-a8c3-7890-abcd-ef0123456789",
  "event_type": "floor.production.completed",
  "schema_version": "1.2",
  "occurred_at": "2026-04-17T14:22:31.445Z",
  "recorded_at": "2026-04-17T14:22:31.891Z",
  "source": {
    "system": "floor_console",
    "user_id": "op_042",
    "device_id": "andon_crs2"
  },
  "plant_id": "hsl_ludhiana",
  "aggregate_id": "wo_8893451",
  "causation_id": "0190d7f4-97fa-7823-abc1-ef0123456710",
  "correlation_id": "0190d7f3-1234-7890-abcd-ef0123456789",
  "payload": {
    "wo_id": "wo_8893451",
    "wc_id": "CRS-2",
    "qty_good_mt": 18.45,
    "qty_scrap_mt": 0.32,
    "actual_run_min": 142
  },
  "signature": "hmac-sha256:a8f3...d921"
}

**Field rationale:**

- **event_id** — UUID-v7 (time-ordered, database-friendly, sortable by insertion). Primary idempotency key.

- **schema_version** — enables backward-compatible evolution. Consumers check version before parsing.

- **occurred_at**** ****vs. ****recorded_at** — occurred_at is real-world event time (possibly days old if the edge buffered during disconnect); recorded_at is ingestion time at the backbone. Distinguishing these is critical for out-of-order handling and for OEE/energy calculations that must use business time.

- **source** — provenance. Lets M7 distinguish between operator-entered events (may have human error) and SCADA-derived events (may have sensor drift).

- **aggregate_id** — the entity the event is about. Also used as the partition key.

- **causation_id** — direct parent event. Enables causal chain tracing: sales_order → work_order → schedule → dispatch → production_completed → sap_sync.

- **correlation_id** — overarching business transaction. Groups all events of one customer order’s lifecycle.

- **payload** — event-specific body. Schema-registry-validated.

- **signature** — HMAC with per-device key. Detects tampering. Critical for quality dispute resolution and ESG assurance.

**Schema evolution rules:**

- **Additive changes** (new optional fields) — minor version bump, no consumer impact

- **Breaking changes** (renaming, removing, retyping fields) — new major version, dual-publish window, consumer migration plan required before old version is decommissioned

- **Never reuse a field name** with a different meaning — this has broken more pipelines than any other single pattern

### 4.4 Retention and Tiering

Three-tier storage model:

| Tier | Medium | Retention | Purpose |
| --- | --- | --- | --- |
| **Hot** | Redpanda local disk (NVMe) | 7–90 days depending on topic | Active consumers, replay for debugging |
| **Warm** | MinIO (on Core Server or dedicated disk) | 1 year | Backfill new projections, forensic investigation, schema migration |
| **Cold** | Customer tape / S3-compatible backup | 7 years | Regulatory (BRSR assurance, CCTS audit), legal dispute resolution |

**Archival path:** Kafka Connect S3 sink runs nightly, writes Avro-encoded Parquet to MinIO, partitioned by topic/year=YYYY/month=MM/day=DD/. Compressed (zstd), checksummed, manifest-indexed.

**Replay capability:** any module can request a replay from hot or warm tier to rebuild its projection table. Used for:

- Adding a new module later (e.g., WMS in Phase 3 backfills from material.* history)

- Recovering from a projection corruption

- Re-running a schedule with corrected master data

- Regulator audit requests (“show me every production event in Q2 FY26”)

### 4.5 Ordering and Delivery Guarantees

- **Per-partition ordering:** guaranteed. Partition keys are chosen to align with consistency boundaries (e.g., events for the same work order always land in the same partition).

- **Cross-partition ordering:** not guaranteed. Consumers that need it must use occurred_at + causation_id to reconstruct.

- **Delivery:** at-least-once. Consumers must be idempotent; event_id is the idempotency key. Every consumer maintains a processed-event-ID set (bloom filter in hot path, Postgres table for authoritative check).

- **Dead-letter handling:** after 3 retries with exponential backoff, the consumer publishes to <topic>.dlq with the original event + failure metadata. A daily DLQ reconciliation report is generated for ops review.

### 4.6 Security

- **Authentication:** producers and consumers authenticate via SASL/SCRAM-SHA-512. Each service has its own service-account credentials, rotated quarterly.

- **Authorisation:** topic-level ACLs. Only M6-dispatch-service can publish to floor.dispatch.issued; any module can subscribe. Write ACLs are tightly scoped; read ACLs are liberal by default (enables the unified-data-layer).

- **Transport security:** TLS 1.3 required for all client connections.

- **Event-level integrity:** HMAC signatures for shop-floor-originated events (see 4.3). Signatures are verified by an event-validation middleware at ingestion and re-verified by any consumer that stores the event for audit purposes.

- **Audit logging:** every ACL change, every schema registry update, every consumer-group offset reset is logged to a separate audit topic with admin identity.

### 4.7 Producer and Consumer Patterns

**Producer library.** A thin wrapper around aiokafka (or confluent-kafka-python) that:

- Auto-populates envelope fields (event_id, recorded_at, source, plant_id)

- Computes and attaches HMAC signature

- Validates payload against registered schema

- Retries transient failures with exponential backoff

- Publishes to local buffer (SQLite) if backbone unreachable — drains on reconnect

Every module’s code interacts with this wrapper, not with Kafka directly. This keeps envelope discipline consistent across the codebase.

**Consumer pattern.** Every consumer is implemented as:

- Poll batch from topic

- For each event: check idempotency (has event_id been seen?), validate signature (if applicable), validate schema version, process, commit offset

- On transient failure: retry with backoff

- On permanent failure: publish to DLQ, commit offset

- Emit processing latency metric (kafka_consumer_lag_seconds) to Prometheus

**Projection workers (the materialised-view pattern).** Each module that maintains a read table has a projection worker that consumes relevant topics and upserts into its module tables. The projection worker is the **only** writer to its own tables — no other code path writes to m4_schedule.scheduled_operations, for example.

## 5. Master Data Engine — M2

M2 is not a user-facing module — it is the platform’s **reference data service**. Every other module reads from it. It ships in Phase 0 because nothing else can function without it.

### 5.1 Scope

M2 owns and serves the following reference entities:

- **Work Centres** — the CRS lines and their physical capabilities

- **Routings** — the sequence of operations required to produce a given material

- **Changeover Matrix** — setup time by (from-grade, to-grade, gauge-step, width-step, roll-change-flag) — **the most critical object in the entire system**

- **Resource Calendars** — shift patterns, planned PM windows, holidays, blocked time

- **Roll Register** — roll inventory, diameter, accumulated tonnage, assigned line, life limit

- **Operator Skill Matrix** — who is certified for which line, grade family, shift

- **Quality Specifications** — acceptance ranges per grade (yield strength, hardness, thickness tolerance, surface class)

- **Emission Factors** — grid CEA factor, fuel GCV and emission factors, GWP values — reference data required by M8

- **Material Master** — grade, gauge, width, customer mapping, standard cost (sourced from SAP)

- **Customer Master** — priority class, delivery tolerance, customer-specific specs (sourced from SAP)

### 5.2 Data Model

Full DDL. Every table lives in the master schema of the Core Postgres database.

-- =======================================================
-- Work Centre — the physical production unit
-- =======================================================
CREATE TABLE master.work_centres (
  wc_id              TEXT PRIMARY KEY,                 -- 'CRS-1', 'CRS-2', 'CRS-3'
  name               TEXT NOT NULL,
  plant_id           TEXT NOT NULL,
  line_type          TEXT NOT NULL,                    -- 'cold_rolling_mill'
  gauge_min_mm       NUMERIC(6,3),
  gauge_max_mm       NUMERIC(6,3),
  width_min_mm       INTEGER,
  width_max_mm       INTEGER,
  speed_max_mpm      NUMERIC(6,2),                     -- m/min
  capacity_mt_shift  NUMERIC(8,2),
  contracted_kw      NUMERIC(8,2),                     -- M8 peak-demand reference
  sap_wc_code        TEXT,                             -- link to SAP work centre
  meta               JSONB,
  created_at         TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now()
);

-- =======================================================
-- Routing — sequence of operations per material
-- =======================================================
CREATE TABLE master.routings (
  routing_id         TEXT PRIMARY KEY,
  material_code      TEXT NOT NULL,
  version            INTEGER NOT NULL,
  is_active          BOOLEAN DEFAULT TRUE,
  operations         JSONB NOT NULL,
  -- operations payload schema:
  -- [
  --   { "seq": 10, "wc_id": "PICK-1", "op_type": "pickling",
  --     "std_rate_mt_hr": 25, "std_time_min": 60 },
  --   { "seq": 20, "wc_id": "CRS-2", "op_type": "rolling",
  --     "std_rate_mt_hr": 45, "std_time_min": 120 },
  --   ...
  -- ]
  sap_routing_ref    TEXT,
  effective_from     DATE,
  effective_to       DATE,
  created_by         TEXT,
  updated_at         TIMESTAMPTZ DEFAULT now(),
  UNIQUE (material_code, version)
);

-- =======================================================
-- CHANGEOVER MATRIX — the most critical table
-- =======================================================
CREATE TABLE master.changeover_matrix (
  wc_id              TEXT REFERENCES master.work_centres,
  grade_from         TEXT NOT NULL,
  grade_to           TEXT NOT NULL,
  gauge_step         TEXT NOT NULL,    -- 'same' | 'step_up' | 'step_down' | 'major_step'
  width_step         TEXT NOT NULL,    -- 'same' | 'reduction' | 'widening'
  roll_change_req    BOOLEAN NOT NULL,
  setup_time_min     INTEGER NOT NULL,
  source             TEXT NOT NULL,    -- 'smed_study' | 'historical_actual' | 'engineering_est'
  confidence         NUMERIC(3,2),     -- 0.00 to 1.00
  sample_count       INTEGER DEFAULT 0,
  last_observed      TIMESTAMPTZ,
  updated_by         TEXT,
  updated_at         TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (wc_id, grade_from, grade_to, gauge_step, width_step, roll_change_req)
);

CREATE INDEX idx_changeover_lookup
  ON master.changeover_matrix (wc_id, grade_from, grade_to);

-- =======================================================
-- Resource calendars — shift + PM + blocked windows
-- =======================================================
CREATE TABLE master.resource_calendars (
  wc_id              TEXT REFERENCES master.work_centres,
  date               DATE NOT NULL,
  shift              CHAR(1) NOT NULL,                  -- 'A' | 'B' | 'C'
  shift_start        TIMESTAMPTZ NOT NULL,
  shift_end          TIMESTAMPTZ NOT NULL,
  available_hrs      NUMERIC(4,2) NOT NULL,
  blocked_reason     TEXT,                              -- NULL if fully available
  block_ref          TEXT,                              -- FK hint to pm_schedule.pm_id, etc.
  updated_at         TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (wc_id, date, shift)
);

-- =======================================================
-- Roll register
-- [v0.2 EXTENDED: additional columns for roll change tracking — see Hero Steels sheets grounding]
-- =======================================================
CREATE TABLE master.rolls (
  roll_id            TEXT PRIMARY KEY,
  wc_id              TEXT REFERENCES master.work_centres,
  position           TEXT,                              -- 'top_work', 'bottom_work', 'backup_top', etc.
  diameter_mm        NUMERIC(6,2),
  mt_since_change    NUMERIC(10,2) DEFAULT 0,
  life_limit_mt      NUMERIC(10,2),
  status             TEXT NOT NULL,                     -- 'active' | 'in_grinding' | 'retired'
  installed_at       TIMESTAMPTZ,
  last_changed_at    TIMESTAMPTZ,
  supplier           TEXT,
  material_grade     TEXT,
  -- v0.2 additions
  current_wc_id      TEXT REFERENCES master.work_centres,  -- where currently installed (for active rolls)
  current_position   TEXT,                                  -- 'top' | 'bottom' | 'storage' | 'grinding'
  cumulative_tonnage_mt NUMERIC(12,2) DEFAULT 0,            -- lifetime tonnage rolled by this specific roll
  tonnage_since_grind_mt NUMERIC(12,2) DEFAULT 0,           -- tonnage since last regrind (resets on grind)
  last_grind_date    DATE,
  grind_cycle_count  INTEGER DEFAULT 0,                     -- how many grinds this roll has had
  roll_finish        TEXT,                                  -- 'M' (Mill) | 'B' (Burnish) — valid values per Hero OQ-4
  expected_life_mt   NUMERIC(8,2)                           -- expected tonnage between grinds (for scheduler hints)
);

-- =======================================================
-- Stoppage codes (v0.2 NEW)
-- Catalogue-driven stoppage classification. Replaces the hard-coded
-- 7-category list from v0.1 M6 config. Customer-specific seed data.
-- Hero Steels loads 16 codes mapped into 7 buckets.
-- =======================================================
CREATE TABLE master.stoppage_codes (
  code          TEXT PRIMARY KEY,                     -- '01', '02'... (zero-padded for stable sort)
  display_name  TEXT NOT NULL,                        -- operator-facing label
  bucket        TEXT NOT NULL,                        -- rollup for Pareto: 'Equipment Failure' | 'Tool Change'
                                                       --   | 'Material / Supply' | 'Utility / Support' | 'Human'
                                                       --   | 'Planning' | 'Planned'
  is_planned    BOOLEAN NOT NULL DEFAULT FALSE,       -- excludes from "unplanned downtime" KPI
  is_external   BOOLEAN NOT NULL DEFAULT FALSE,       -- DISCOM, utility — not controllable
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order    INTEGER NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_stoppage_codes_bucket ON master.stoppage_codes (bucket);
CREATE INDEX idx_stoppage_codes_active ON master.stoppage_codes (is_active, sort_order);

-- =======================================================
-- Defect codes (v0.2 NEW)
-- Defect classification for reject events. Drives auto-disposition
-- in M5b Phase 2; seed-data-driven. Hero Steels loads 45 codes.
-- =======================================================
CREATE TABLE master.defect_codes (
  code                TEXT PRIMARY KEY,
  display_name        TEXT NOT NULL,
  family              TEXT NOT NULL,                  -- 'Dimensional' | 'Surface' | 'Mechanical' | 'Edge'
                                                       --   | 'Process' | 'Handling'
  severity_default    TEXT NOT NULL DEFAULT 'minor',  -- 'critical' | 'major' | 'minor' | 'cosmetic' | 'variable'
  default_disposition TEXT,                            -- 'hold' | 'downgrade' | 'rework' | 'scrap'
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order          INTEGER NOT NULL,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_defect_codes_family ON master.defect_codes (family);
CREATE INDEX idx_defect_codes_active ON master.defect_codes (is_active, sort_order);

-- =======================================================
-- Operator skills matrix
-- =======================================================
CREATE TABLE master.operator_skills (
  operator_id        TEXT NOT NULL,
  operator_name      TEXT NOT NULL,
  wc_id              TEXT REFERENCES master.work_centres,
  grade_family       TEXT NOT NULL,                     -- 'low_carbon', 'medium_carbon', 'high_strength'
  certified          BOOLEAN DEFAULT FALSE,
  certified_at       DATE,
  expires_at         DATE,
  certifying_officer TEXT,
  PRIMARY KEY (operator_id, wc_id, grade_family)
);

-- =======================================================
-- Quality specifications per grade
-- =======================================================
CREATE TABLE master.quality_specs (
  material_code      TEXT NOT NULL,
  grade              TEXT NOT NULL,
  customer_id        TEXT,                              -- NULL = standard spec; non-null = customer-specific
  yield_min_mpa      NUMERIC(6,1),
  yield_max_mpa      NUMERIC(6,1),
  tensile_min_mpa    NUMERIC(6,1),
  hardness_max_hrb   NUMERIC(4,1),
  thickness_tol_mm   NUMERIC(5,3),
  width_tol_mm       NUMERIC(5,2),
  surface_class      TEXT,
  extra_params       JSONB,
  spec_ref_doc       TEXT,                              -- link to MinIO-stored PDF if exists
  PRIMARY KEY (material_code, grade, COALESCE(customer_id, ''))
);

-- =======================================================
-- Emission factors (reference data for M8)
-- =======================================================
CREATE TABLE master.emission_factors (
  factor_id          TEXT PRIMARY KEY,                  -- 'cea_grid_FY26', 'lpg_scope1_2026'
  scope              CHAR(1) NOT NULL,                  -- '1' | '2' | '3'
  source             TEXT NOT NULL,                     -- 'CEA' | 'IPCC_AR6' | 'DEFRA' | 'GHG_Protocol'
  region             TEXT,                              -- 'IN-North', 'IN-All'
  fuel_or_input      TEXT,                              -- 'electricity', 'lpg', 'hsd'
  unit               TEXT NOT NULL,                     -- 'kgCO2e/kWh' | 'kgCO2e/kg'
  value              NUMERIC(10,5) NOT NULL,
  valid_from         DATE NOT NULL,
  valid_to           DATE,
  citation           TEXT                               -- URL or document reference
);

-- =======================================================
-- Material master (synced from SAP)
-- =======================================================
CREATE TABLE master.materials (
  material_code      TEXT PRIMARY KEY,
  description        TEXT,
  grade              TEXT NOT NULL,
  gauge_mm           NUMERIC(6,3),
  width_mm           INTEGER,
  material_type      TEXT,                              -- 'hr_coil' | 'cr_coil' | 'finished'
  std_cost_per_mt    NUMERIC(10,2),
  sap_material_ref   TEXT,
  updated_at         TIMESTAMPTZ DEFAULT now()
);

-- =======================================================
-- Customer master (synced from SAP)
-- =======================================================
CREATE TABLE master.customers (
  customer_id        TEXT PRIMARY KEY,
  name               TEXT NOT NULL,
  industry_sector    TEXT,                              -- 'auto_oem' | 'trader' | 'ancillary'
  priority_class     CHAR(1),                           -- 'A' | 'B' | 'C' (derived + override)
  delivery_tol_days  INTEGER,                           -- tolerance for late delivery
  sap_customer_ref   TEXT,
  updated_at         TIMESTAMPTZ DEFAULT now()
);

-- =======================================================
-- Audit log for all master data changes
-- =======================================================
CREATE TABLE master.audit_log (
  audit_id           BIGSERIAL PRIMARY KEY,
  table_name         TEXT NOT NULL,
  row_pk             TEXT NOT NULL,                     -- serialised composite PK
  operation          CHAR(1) NOT NULL,                  -- 'I' | 'U' | 'D'
  changed_by         TEXT NOT NULL,
  changed_at         TIMESTAMPTZ DEFAULT now(),
  previous_value     JSONB,
  new_value          JSONB,
  reason             TEXT                               -- human-entered change reason
);

### 5.3 Ingestion Paths

Three distinct channels, each with its own contract:

#### 5.3.1 SAP Pull (daily scheduled)

The SAP Sync Worker pulls these entities on a 24-hour cadence (configurable):

- Routings → from SAP CA (Routing master)

- Work centres → from SAP CR (Work Centre master)

- Materials → from SAP MM (Material master)

- Customers → from SAP SD (Customer master)

Implementation:

- OData v2 queries with $filter=modified_after={last_sync}

- Idempotent upsert by natural key

- Diff detection — if no fields changed, no event published

- On change: publishes master.<entity>.updated events

- Tracks per-entity last-sync watermark in erp_sync.watermarks table

#### 5.3.2 Manual Entry via Operations Console

For data with no SAP source. UI surfaces in the Operations Console:

- **Changeover matrix editor** — planner UI with: single-cell edit, bulk CSV import, SMED observation import, filtering and visualisation

- **Roll register** — maintenance UI for roll install / change / retire events

- **Operator skills** — HR/shift manager UI with certification workflow

- **Emission factors** — sustainability manager UI with mandatory citation field

All writes go through the M2 API (§5.4) which enforces auth, audit logging, and event publishing.

#### 5.3.3 SMED Observation Feed (automated)

Setup events captured in M6 (floor.setup.started → floor.setup.completed) are consumed by a nightly **Changeover Matrix Updater** worker that:

- Groups completed setups by (wc_id, grade_from, grade_to, gauge_step, width_step, roll_change_req)

- For each group with ≥3 observations: computes median setup time

- Upserts into changeover_matrix with source = 'historical_actual', updates sample_count, last_observed, and a confidence score (increases with sample count, decays with variance)

- Publishes master.changeover_matrix.updated event

The matrix is **versioned via the audit log** — old values remain queryable; new values supersede. The updater never overwrites a manually-entered value with a source = 'smed_study' or 'engineering_est' flag unless the operator explicitly enables auto-learn for that cell.

### 5.4 API Surface

All endpoints served by the M2 Master-Data Service at /api/master/*. Auth via Keycloak OIDC; role-based.

**Read APIs (high-traffic, cached aggressively):**

GET  /api/master/work-centres
GET  /api/master/work-centres/{wc_id}
GET  /api/master/routings/{material_code}?version=latest
GET  /api/master/changeover-matrix/{wc_id}
GET  /api/master/changeover-matrix/{wc_id}/entry
       ?grade_from=&grade_to=&gauge_step=&width_step=&roll_change_req=
GET  /api/master/calendars/{wc_id}?from=&to=
GET  /api/master/rolls?wc_id=&status=
GET  /api/master/operator-skills?operator_id=|wc_id=
GET  /api/master/quality-specs/{material_code}/{grade}?customer_id=
GET  /api/master/emission-factors?scope=&valid_on=
GET  /api/master/materials/{material_code}
GET  /api/master/customers/{customer_id}

**Write APIs (restricted to**** ****master_data_editor**** ****role):**

PUT    /api/master/changeover-matrix              -- upsert single entry
POST   /api/master/changeover-matrix/bulk-import  -- CSV import with maker-checker
PUT    /api/master/rolls/{roll_id}
POST   /api/master/rolls/{roll_id}/change         -- roll change event
PUT    /api/master/calendars/{wc_id}/{date}/{shift}
POST   /api/master/calendars/block                -- add blocked window (called by M5c)
PUT    /api/master/operator-skills                -- upsert cert
PUT    /api/master/quality-specs
PUT    /api/master/emission-factors

**Admin APIs (restricted to**** ****master_data_admin**** ****role):**

POST   /api/master/sync/trigger                   -- force SAP sync
GET    /api/master/sync/status
GET    /api/master/audit-log?table=&from=&to=
POST   /api/master/changeover-matrix/approve      -- maker-checker approve
POST   /api/master/changeover-matrix/reject

**Every write API:**

- Validates payload against schema

- Checks role authorisation

- Writes to the master table

- Inserts audit_log row

- Publishes corresponding master.*.updated event to backbone

- Returns 200 with updated entity + audit_id

### 5.5 Caching Strategy

Master data is read hot and written rarely — textbook cache candidate.

- **In-process LRU cache** in every module service that consumes M2 data. Keyed by entity natural key.

- **Cache invalidation** via subscription to master.*.updated events — invalidate on relevant events.

- **TTL fallback:** 5 minutes (in case an event is missed).

- **Cache warming:** on service startup, pre-fetch work centres, active routings, and emission factors (hot reference data).

The M4 scheduler specifically hits the changeover matrix on every scheduling run (thousands of lookups per run). It maintains an in-memory matrix snapshot at run start, invalidated by master.changeover_matrix.updated events between runs.

### 5.6 The Changeover Matrix — Bootstrap Plan

Because this is the single most important artifact and it does not exist today, Phase 0 includes a dedicated **SMED Observation Bootstrap** workstream running in parallel with platform development.

**Timeline:**

| Week | Activity | Owner |
| --- | --- | --- |
| 1–2 | Install paper-log forms at each CRS line; operators record setup start/end + from-grade + to-grade per changeover | Plant IE + Zedral SA |
| 3–6 | Industrial engineer conducts 30+ observed SMED events per line. Classifies internal vs. external setup, records grade transitions, roll changes, width changes. | Plant IE |
| 6 | Compile first-cut matrix. Import via Operations Console bulk-import. Maker-checker approval. | Plant IE + Planner |
| 7+ | M6 goes live in Phase 1. Live setup events feed the Changeover Matrix Updater nightly. Matrix improves with real observations. | Platform |
| 9 | Matrix coverage ≥95% of observed grade transitions with high confidence | — |

**At Phase 1 go-live (end of month 6):** matrix has ~60% coverage (most common grade transitions) with medium confidence; by month 9, coverage is ~95% with high confidence.

**Risk mitigation for missing matrix entries.** At scheduling time, if M4 queries the matrix for a transition not present, the fallback rule is:

- Look for a neighbouring transition (same grade family, closest gauge)

- If none: use a conservative default (180 min for unknown steel grade transitions)

- Log the miss to m4_schedule.matrix_misses for engineer review

### 5.7 Governance and Change Control

Master data changes are high-blast-radius. Controls:

- **Role segregation:** master_data_viewer (read-only), master_data_editor (write single entities), master_data_admin (bulk imports, maker-checker approvals, sync triggers)

- **Maker-checker workflow** for changeover matrix bulk imports: one user uploads, a different user approves. Enforced via API — the same user cannot POST /bulk-import and POST /approve.

- **Audit trail:** every write records changed_by, changed_at, previous_value, new_value, and optional reason in master.audit_log. Retained 7 years.

- **Quarterly master data review:** a scheduled report listing entries not reviewed in 90 days. Sent to the Head of Manufacturing via the DMZ egress.

- **Emergency override:** an emergency_override audit flag exists for cases where a planner must change master data mid-shift (e.g., a grade transition has a newly observed much-longer setup). Overrides auto-trigger a notification to the master data admin for next-day review.

### 5.8 Failure Modes and Recovery

| Failure | Detection | Recovery |
| --- | --- | --- |
| SAP sync fails | Watermark stale >2 × expected interval | Alert; manual trigger; if persistent, failover to last-known cache |
| Changeover matrix corruption | Consistency check on startup | Restore from audit log (replay INSERTs/UPDATEs in order) |
| Cache stampede on M2 restart | Elevated latency in consumer services | Cache warmup on startup; rate-limit origin reads |
| Event published but DB write rolled back | Inconsistency between log and state | Transactional outbox pattern: events are inserted into master.outbox in same transaction as state change; a separate relay publishes from outbox to backbone with idempotency |

## I.B — Structural & Integration Foundation

## 6. Edge–Core–DMZ Topology

This section specifies the physical deployment topology: where every process runs, what talks to what over which wire, and how we fail safely.

### 6.1 Zone Model — Recap and Deepening

Three zones, three VLANs, three trust levels. Trust decreases as you move outward from Core.

┌────────────────────────────────────────────────────────────────────┐
│  PLANT LAN (corporate, user-facing)         VLAN 10  (192.168.10/24)│
│  - User laptops                                                    │
│  - Andon terminals                                                 │
│  - Printers                                                        │
└──────────────────────────────┬─────────────────────────────────────┘
                               │  firewall
                               │  (TCP 443 only, mTLS to Core)
┌──────────────────────────────┴─────────────────────────────────────┐
│  CORE VLAN                                   VLAN 20 (10.20.0/24)  │
│  - Core Server (Docker Compose host)                               │
│  - Redpanda, Postgres, MinIO, Keycloak                             │
│  - All M1–M8 service workers                                       │
│  - Prometheus / Loki / Tempo / Grafana                             │
└──────────────────────────────┬─────────────────────────────────────┘
                               │  firewall
                               │  (TCP 9092 inbound from Edge only)
                               │  (TCP 443 outbound to DMZ only)
┌──────────────────────────────┴─────────────────────────────────────┐
│  OT VLAN                                     VLAN 30 (10.30.0/24)  │
│  - Edge Gateway                                                    │
│  - SCADA server (customer-owned)                                   │
│  - PLCs, smart meters, IoT devices                                 │
│  - NO outbound internet. NO Core inbound.                          │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│  DMZ VLAN                                    VLAN 40 (172.16.40/24) │
│  - DMZ Host (Egress Packager, Update Receiver, Jump Host)          │
│  - One-way drop zones for egress bundles                           │
│  - Scheduled internet access to allow-listed endpoints only        │
└────────────────────────────────────────────────────────────────────┘

**The inviolable firewall rules:**

| Source zone | Destination zone | Allowed | Notes |
| --- | --- | --- | --- |
| OT | Core | TCP/9092 to Redpanda | Only the Edge Gateway IP; SASL+TLS |
| OT | Internet | **Denied** | Hard block — no exceptions |
| Core | OT | **Denied** | Phase 0/1. Phase 2 may open control paths; separate ADR |
| Core | DMZ | TCP/443 to DMZ drop zone | mTLS; scheduled windows |
| DMZ | Internet | TCP/443 to allow-list | Allow-list is customer-owned |
| Internet | DMZ | **Denied by default** | Break-glass: temp SSH tunnel, 2-hour max |
| User LAN | Core | TCP/443 to API Gateway | TLS; OIDC-authenticated |
| User LAN | OT | **Denied** | Users never reach OT directly |

The firewall is customer-managed. We deliver a **Network Manifest document** (derived from this section) that the customer’s IT team implements and signs off on. Without a signed manifest, go-live is blocked.

### 6.2 Edge Gateway — Deep Specification

**Hardware.**

| Spec | Minimum | Recommended |
| --- | --- | --- |
| CPU | 4 cores x86-64 | 8 cores Intel Xeon-E / AMD EPYC Embedded |
| RAM | 16 GB DDR4 ECC | 32 GB DDR4 ECC |
| Storage | 256 GB SATA SSD | 1 TB NVMe SSD, industrial grade (3 DWPD) |
| Network | 2× 1 GbE | 2× 1 GbE + 1× serial (RS-485) |
| Form factor | Industrial fanless | DIN-rail mountable preferred |
| Operating temp | 0–40 °C | −10 to +60 °C (electrical room variance) |
| Power | 230 V AC | 24 V DC with UPS backup |

**Software.**

- Base OS: Debian 12 (minimal install)

- Container runtime: Docker CE

- Orchestration: Docker Compose v2 (single-node)

- Fleet agent: Zedral Edge Agent (custom Go binary)

- OPC-UA client: asyncua (Python) or open62541 (C)

- Modbus library: pymodbus

- MQTT broker: Mosquitto (for IoT devices that natively publish MQTT)

- Local buffer: SQLite WAL mode

- Kafka producer: aiokafka

**Processes running on Edge Gateway:**

- edge-opcua-bridge — subscribes to OPC-UA tags, publishes to local MQTT

- edge-modbus-scanner — polls Modbus registers at interval, publishes to local MQTT

- edge-mqtt-broker — Mosquitto, receives from bridges and native MQTT devices

- edge-event-publisher — consumes local MQTT, wraps in Zedral event envelope, publishes to Redpanda on Core

- edge-buffer — persists outbound events to SQLite when Core unreachable; drains on reconnect

- edge-health-reporter — emits Prometheus metrics; sends heartbeat to Core every 30 s

- edge-tag-registry — local copy of tag→event-type mapping, synced from Core on startup

**Local buffer behaviour.** When Core connectivity is lost:

- New events are persisted to SQLite with synced = FALSE

- A background drain worker polls Core reachability every 5 s

- On reconnect: drain events in FIFO order, mark synced = TRUE

- Buffer capacity: 24 hours at expected peak rate (~10,000 events/hour = 240,000 rows)

- At 80% capacity, raise a Prometheus alert to ops

- At 100% capacity, drop oldest events and log a DATA_LOSS critical incident

**Tag registry.** Mapping between SCADA/PLC tags and Zedral event types is stored at Core in m2_master.tag_mappings and pulled to Edge on startup. Example:

{
  "tag": "CRS2.Line.Speed_mpm",
  "protocol": "opcua",
  "poll_interval_ms": 1000,
  "event_type": "floor.machine.speed",
  "payload_template": {
    "wc_id": "CRS-2",
    "speed_mpm": "$value"
  },
  "thresholds": {
    "min": 0,
    "max": 1500
  }
}

The Edge Gateway is **stateless beyond the local buffer** — all configuration comes from Core on startup. This means a failed Edge Gateway can be physically swapped and will self-configure within 2 minutes of network connection.

### 6.3 Core Server — Deep Specification

**Hardware.**

| Spec | Minimum (Hero Steels pilot) | Recommended (second customer onward) |
| --- | --- | --- |
| CPU | 16 cores (Intel Xeon Silver / AMD EPYC 7313) | 24 cores |
| RAM | 64 GB DDR4 ECC | 128 GB DDR4 ECC |
| Primary storage | 2 TB NVMe RAID 1 | 4 TB NVMe RAID 10 |
| Archive storage | 4 TB SATA RAID 1 (MinIO) | 8 TB SATA RAID 5 |
| Network | 2× 1 GbE bonded | 2× 10 GbE bonded |
| Power | Dual PSU + UPS | Dual PSU + UPS + redundant feed |

**Software.**

- Base OS: Debian 12 or RHEL 9 (customer preference)

- Container runtime: Docker CE (v1 pilot)

- Orchestration: Docker Compose (v1); migrate to k3s in Phase 2

- Reverse proxy: Traefik 3.x

- TLS certs: internal CA via step-ca; 1-year rotation

- Process supervisor: systemd for Docker daemon; Docker itself for containers

- Backup agent: Restic with MinIO backend; also nightly pg_dump to local archive

**Process layout (Docker Compose services):**

# Abbreviated for illustration — full compose file is a separate artifact
services:
  redpanda:           # Event backbone
  postgres:           # Core DB with TimescaleDB
  minio:              # Object store
  keycloak:           # Identity
  apicurio:           # Schema registry
  traefik:            # API gateway / reverse proxy

  m1-demand:          # FastAPI service
  m2-master-data:     # FastAPI service
  m3-capacity:        # FastAPI service
  m4-scheduler-api:   # FastAPI service
  m4-scheduler-worker: # CP-SAT worker (separate container, heavy compute)
  m5a-material:       # FastAPI service
  m5b-quality:        # FastAPI service (Phase 2)
  m5c-maintenance:    # FastAPI service (Phase 2)
  m6-dispatch:        # FastAPI service
  m7-oee-calculator:  # Background worker
  m8-energy:          # FastAPI service + ingestion worker

  sap-sync-worker:    # Dedicated SAP connector
  changeover-learner: # Nightly SMED matrix updater
  esg-report-gen:     # On-demand ESG report generator

  prometheus:
  loki:
  tempo:
  grafana:

  ops-console:        # React SPA (served by Traefik static)
  floor-console:      # React SPA (served by Traefik static)

Total services at Phase 1 end: ~20 containers. Resource envelope at Hero Steels scale: ~18 GB RAM committed, ~30% average CPU, ~500 GB active storage. Well within the recommended 64 GB / 16-core Core Server.

### 6.4 DMZ Host — Deep Specification

**Hardware.** Same as Edge Gateway — 4 vCPU / 16 GB / 256 GB SSD.

**Software stack.**

- Base OS: Debian 12 hardened (CIS-Level-1 baseline applied)

- Docker CE

- Three processes:

- egress-packager — scheduled worker (systemd timer)

- update-receiver — scheduled worker (systemd timer)

- jump-host — sshd with ForceCommand, MFA, session recording via auditd + tlog

**Egress Packager — operational detail.**

Runs 4 times daily (configurable). On each run:

- Queries Core for pending egress bundles (three categories):

- ESG reports (on-demand, user-triggered)

- Fleet health telemetry (weekly rollup)

- Support log bundles (on-demand, support-ticket-linked)

- For each bundle:

- Validates content against egress schema (no PII, no raw event data, no customer order details unless explicitly ESG-scope)

- Compresses (zstd)

- Encrypts (age — simple, modern, vetted; X25519 recipient keys)

- Signs (Ed25519 with plant-specific key)

- Writes to DMZ outbound drop zone

- At the scheduled egress window:

- Opens allow-listed TCP/443 connection

- Uploads to destination (regulator SFTP, Zedral HQ S3, etc.)

- On success: records in dmz.egress_log (replicated back to Core on next sync window)

- On failure: retry with exponential backoff, escalate to ops after 3 failures

**Update Receiver — operational detail.**

Runs daily.

- Polls Zedral HQ update manifest endpoint (over allow-listed HTTPS)

- If new update version available for this plant:

- Downloads signed bundle (zstd + age-encrypted + Ed25519-signed)

- Verifies signature against customer-specific allow-list of Zedral release keys

- Stages bundle in /var/zedral/pending-updates/

- Notifies ops via email/Slack (customer’s configured channel)

- **Deployment requires explicit human approval** — no auto-apply in v1. An ops admin runs zedral-update apply <bundle-id> from a jump host session.

**Jump Host — operational detail.**

The only legitimate path for interactive remote support. Disabled by default. Activation requires:

- Customer’s designated IT contact runs zedral-support enable --duration 2h --ticket ZDL-1234

- A time-boxed SSH access token is generated (valid 2 h)

- Zedral HQ support engineer uses token to SSH in

- Session is recorded (tlog or auditd-plugin-session); recording uploaded to Core for customer review post-session

- At token expiry, sshd is disabled automatically by a systemd timer

No shared credentials. No standing access. Every session has a ticket reference, a named engineer, and a recording.

### 6.5 Failover and High Availability

**v1 posture:** HA is deferred. Single-node Core, single Edge, single DMZ. The pilot is single-shift-critical, not life-safety-critical — a 2-hour outage is an inconvenience, not a catastrophe.

**Mitigations in v1:**

- Core Server on dual PSU + UPS (battery holds 30 min)

- Postgres replication to an on-disk standby (warm, not hot) on the same Core Server — survives data file corruption, not hardware failure

- Nightly full backup via Restic to Core Server’s archive disk and to customer’s backup infrastructure (if present)

- Edge Gateway’s local buffer absorbs Core downtime up to 24 h

- Documented cold-swap procedure for Core Server (target: 4-hour RTO from bare-metal)

**v2 HA plan (Phase 4+):**

- 3-node Redpanda cluster (RF=3)

- Patroni-managed Postgres cluster (1 primary + 2 replicas)

- MinIO distributed mode (4 nodes)

- k3s for service orchestration with node failover

- Dual Edge Gateway (active-passive) on critical lines

This is priced and scoped but not built in v1. The single-node architecture is honest about where we are; the HA architecture is designed so migration is a configuration change, not a re-architecture.

### 6.6 Boundary Enforcement — How Violations Are Caught

Principles 3 and 5 — air-gap and ISA-95 boundaries — are only as strong as our ability to detect violations.

**Detective controls:**

- zedral-network-audit — daily job on Core that enumerates all outbound connections, compares against allow-list, alerts on unexpected destinations

- Firewall flow logs exported to Loki; Grafana dashboard shows denied connections by source

- Redpanda topic ACL audit — nightly dump of who-can-publish-where, diffed against baseline

- SAP OData direction audit — the SAP Sync Worker records every request direction; weekly report flags any write that wasn’t triggered by a floor.production.completed or floor.quality.measured event

**Preventive controls:**

- zedral-opsec-lint — a CI check that refuses to merge code that:

- Imports a cloud SDK (AWS, Azure, GCP) outside the DMZ path

- Hardcodes an internet URL outside the allow-list

- Writes to a topic it doesn’t own per the ACL matrix

- Uses a master-data table directly instead of the M2 API

## 7. Integration Layer

External systems are where platforms die. Bad integration turns a 3-month project into an 18-month one. This layer is designed defensively.

### 7.1 SAP Connector — The Biggest Integration

**SAP version in scope:** SAP ECC 6.0 with EHP 8 (Hero Steels’ current version). S/4HANA compatibility: designed-for, tested in Phase 2.

**Interface selection.**

Three ways to talk to SAP. We picked one:

| Option | Verdict | Reason |
| --- | --- | --- |
| OData Services | **Chosen** | Modern, REST-like, good read/write support via SAP Gateway, minimally invasive |
| IDoc / ALE | Rejected | Heavy, async-only, requires Basis team involvement for every change |
| RFC / BAPI | Rejected | Requires SAP JCo / NWRFCSDK, tightly coupled, painful to evolve |
| Direct DB access | **Forbidden** | Principle violation, voids SAP support, catastrophic risk |

**OData services required from Hero Steels’ SAP.**

Some already exist; some need Basis team to publish. Documented explicitly in the project prerequisites:

| Service | Module | Purpose | Direction | Status |
| --- | --- | --- | --- | --- |
| MaterialMaster_SRV | MM | Material master sync | Read | Standard SAP service |
| CustomerMaster_SRV | SD | Customer master sync | Read | Standard |
| ProductionOrder_SRV | PP | Work order pull + confirmation write-back | Read + Write | Needs extension for confirmation write-back |
| SalesOrder_SRV | SD | Sales order pull | Read | Standard |
| StockOverview_SRV | MM | Coil inventory | Read | Standard (MB52/MB51 data) |
| MaintenanceOrder_SRV | PM | PM sync | Read + Write | Needs Basis extension |
| InspectionLot_SRV | QM | Quality results write-back | Write | Needs Basis extension |
| WorkCentreMaster_SRV | CR | Work centre master | Read | Needs Basis publication |
| RoutingMaster_SRV | CA | Routing master | Read | Needs Basis publication |

**Basis work required (pilot prerequisite).** The Hero Steels SAP Basis team must publish or extend four OData services before Phase 1 go-live. This is **documented as an external dependency** with a named owner on the customer side and a 6-week lead time.

**Connector architecture.**

┌──────────────────┐
│   SAP ECC        │
│   (Gateway)      │
└────────┬─────────┘
         │  HTTPS + OAuth2 (client_credentials)
         │  or HTTP Basic (pilot fallback)
         ▼
┌──────────────────────────────────────────────────────────┐
│  SAP Sync Worker (sap-sync-worker container on Core)     │
│                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐ │
│  │  Pull       │  │  Write-Back │  │  Watermark       │ │
│  │  Scheduler  │  │  Processor  │  │  Tracker         │ │
│  └──────┬──────┘  └──────┬──────┘  └────────┬─────────┘ │
│         │                │                   │           │
│         ▼                ▼                   ▼           │
│  ┌──────────────────────────────────────────────────┐    │
│  │       Transformation & Validation Layer          │    │
│  │       (SAP → Zedral canonical model mapping)     │    │
│  └──────────────────────────┬───────────────────────┘    │
└─────────────────────────────┼────────────────────────────┘
                              │
         ┌────────────────────┼───────────────────┐
         ▼                    ▼                   ▼
   ┌──────────┐        ┌──────────────┐    ┌─────────────┐
   │ Kafka    │        │  Postgres    │    │ sap_sync_   │
   │ events   │        │  upserts     │    │ log (audit) │
   └──────────┘        └──────────────┘    └─────────────┘

**Pull operations — mechanics.**

- Run on a configurable schedule per entity (material: daily 2 AM; work orders: every 15 min; stock: every 30 min)

- Each entity has a watermark (max(modified_at) from last run)

- Query: GET /sap/opu/odata/sap/ProductionOrder_SRV/ProductionOrderSet?$filter=ModifiedAt gt '2026-04-17T02:00:00Z'

- Parse response, transform to Zedral canonical schema (mapping stored in sap_field_mappings config table)

- Upsert to target table (e.g., m1_demand.work_orders)

- Publish erp.<entity>.received event with diff details

- Update watermark to max ModifiedAt from response

- Log to sap_sync_log (timestamp, entity, rows_processed, duration_ms, status)

**Write-back operations — mechanics.**

Write-back is event-driven via the sap_sync_log table (already in the base four tables from the client’s architecture diagram). The lifecycle:

- A Zedral event occurs that requires SAP update (e.g., floor.production.completed)

- The relevant module (e.g., M7) inserts a row into sap_sync_log with status PENDING, operation, target, payload

- The SAP Sync Worker polls sap_sync_log WHERE status = ‘PENDING’ every 30 s

- For each pending row:

- Status → RETRYING

- Construct SAP OData POST / PATCH

- Call SAP with retry (3 attempts, exponential backoff: 5 s, 30 s, 2 min)

- On 2xx: status → SUCCESS, capture SAP response ID

- On 4xx (bad request): status → FAILED, do not retry — alert ops

- On 5xx / timeout: after 3 attempts, status → FAILED — alert ops

- Failed rows appear on an ops dashboard with retry button and payload inspector

**Schema of**** ****sap_sync_log****:**

CREATE TABLE core.sap_sync_log (
  sync_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID,                          -- triggering Zedral event
  operation       TEXT NOT NULL,                 -- 'pull_work_orders' | 'confirm_production' | etc.
  sap_service     TEXT NOT NULL,
  payload         JSONB NOT NULL,                -- what we're sending / receiving
  status          TEXT NOT NULL,                 -- PENDING | RETRYING | SUCCESS | FAILED
  attempts        INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  last_error      TEXT,
  sap_response_id TEXT,                          -- SAP-side document number on success
  created_at      TIMESTAMPTZ DEFAULT now(),
  completed_at    TIMESTAMPTZ
);
CREATE INDEX idx_sap_sync_pending
  ON core.sap_sync_log (status, created_at)
  WHERE status IN ('PENDING', 'RETRYING');

**Failure handling — business rules.**

Not every SAP failure is equal. We classify:

- **Recoverable** (network timeout, 503, 429) — retry automatically

- **Semantic** (SAP rejects payload: e.g., “material not found”, “WO already closed”) — fail, alert, requires business resolution (planner must fix master data or WO state)

- **Blocked** (SAP gateway down) — pause all writes, accumulate in PENDING, drain on recovery

Pause threshold: if >10 consecutive failures across 5 minutes, the worker enters **blocked mode** and stops attempting new writes for 30 minutes. This prevents thundering-herd on SAP and lets the Basis team investigate.

**SAP load budget.** Hero Steels’ SAP is shared infrastructure. We commit to:

- Maximum 10 concurrent OData connections

- Maximum 100 requests per minute sustained

- Maximum 500 KB response payloads (use $top and pagination)

- No queries against active-transaction tables during SAP batch window (00:00–03:00 IST)

This budget is documented in the customer’s MOU.

### 7.2 SCADA / PLC Connector

**Connectivity protocols in scope.**

| Protocol | Use case | Driver library |
| --- | --- | --- |
| OPC-UA | Modern SCADA (Siemens WinCC, Rockwell FactoryTalk, Wonderware) | asyncua |
| Modbus-TCP | Smart meters, standalone PLCs | pymodbus |
| Modbus-RTU (serial) | Legacy meters (rare in CRS) | pymodbus + USB-to-RS485 |
| MQTT | Native IoT devices | paho-mqtt |
| S7 / Profinet | Siemens PLCs (fallback) | python-snap7 |
| Ethernet/IP | Allen-Bradley PLCs | pycomm3 |

**Hero Steels CRS initial scope.** Hero Steels’ existing SCADA is **the specific OPC-UA endpoint** exposed by their Siemens WinCC / Rockwell / other SCADA system. TBD during Phase 0 technical survey — listed as a **pilot-week-1 deliverable**: the OPC-UA tag catalogue and authentication method.

Three smart meters (new installation) — Schneider PM5350 or equivalent — on CRS-1, CRS-2, CRS-3 incomers. These speak Modbus-TCP.

**Tag onboarding workflow.** Every tag has a lifecycle:

- **Discovery** — the SCADA tag catalogue is dumped (automated for OPC-UA via browse; manual import for Modbus register maps)

- **Mapping** — an engineer maps each tag to a Zedral event type in the m2_master.tag_mappings table

- **Validation** — a test subscription confirms values land in Redpanda correctly

- **Promotion** — the mapping is marked active = TRUE; Edge Gateway picks it up on next config reload

- **Monitoring** — Prometheus tracks per-tag values ingested, value drift, staleness

**OPC-UA specifics.**

- Security mode: SignAndEncrypt

- Security policy: Basic256Sha256 (minimum acceptable)

- Authentication: X.509 certificates (not username/password) — certs provisioned per deployment

- Subscription mode: monitored items with change-triggered publishing, 1 s publishing interval, deadband 1% on analog values

- Reconnection: automatic with 5-second backoff, 24 h max retry window

**Modbus specifics.**

- Polling cadence: 15 minutes for energy meters (matches meter update rate)

- Register map stored in tag registry

- Data types: explicit (uint16, int32_big_endian, float32_word_swapped)

- Checksum validation on every read

- Failed reads: 3 retries within 5 s, then log STALE and proceed (do not block the scan cycle)

### 7.3 File-Based Integration — The Reality Bridge

Not every integration fits through an API. Steel plants have:

- Lab test results exported to CSV from a legacy spectrometer

- Roll shop grinding records in Excel

- Third-party logistics despatch notes as PDFs

- Certificates of analysis (CoA) as PDF + Excel

**File watcher service.**

A sandboxed service that monitors designated directories (typically on a customer-owned SMB share) for new files. Each watched directory has:

- **Source** label (e.g., lab_spectrometer)

- **File pattern** (e.g., *.csv)

- **Parser plugin** (Python module registered at startup)

- **Target event type** (e.g., floor.quality.measured)

- **Archive path** (after successful ingestion, file is moved here; on parse failure, moved to a quarantine path with error log)

**Security:** file watcher runs as an unprivileged user, in a container with read/archive/quarantine path access only. Parsers are sandboxed (no network, no exec). Malformed files are quarantined, not processed.

**Anti-pattern to avoid:** using file-based integration as a permanent architecture. These are **migration paths**, not destinations. Every file watcher should have a roadmap to replace it with an API integration.

### 7.4 Human-as-Integration — Manual Entry Paths

When there is no SAP, no SCADA, no file, there are humans on Andon terminals and mobile apps. Critical master data (changeover matrix, operator skills, breakdown root causes) starts here and stays here.

**Worker Input API.** Defined in the base architecture (POST /inputs/). All manually-entered events flow through a single ingestion endpoint that:

- Authenticates the user (OIDC session cookie or mobile token)

- Validates payload against the event schema for event_type

- Adds envelope fields (auto-populating source.user_id, source.device_id, recorded_at)

- Writes to worker_inputs table (the original base table — retained for audit) AND publishes to Redpanda with the same event_id

- Triggers downstream projection workers

Dual-write (table + backbone) at the ingestion boundary is deliberate: the table is the durability guarantee (survives backbone outage), the event is the propagation mechanism. A reconciler background job ensures the table and backbone stay in sync and alerts on drift.

### 7.5 Integration Observability

Every integration path emits structured metrics tagged by source_system:

- integration_events_ingested_total — counter, labelled by source, event_type

- integration_lag_seconds — histogram, the delay between event occurred_at and recorded_at

- integration_failures_total — counter, labelled by source, error_category

- integration_backlog_size — gauge, for buffered integrations (Edge buffer, SAP sync queue)

Grafana dashboard Integration Health shows all of these at a glance, one row per integration. Any red cell → incident.

## 8. Cross-Cutting Services

Services that don’t belong to any module but are used by all.

### 8.1 Identity & Access Management — Keycloak

**Why Keycloak.** Open-source, self-hosted, OIDC-standard, supports LDAP/AD federation (nearly every industrial customer has AD), SAML 2.0 for ESG portal SSO, and a decent admin UI.

**Realm design.** One realm per deployment (per plant). No multi-realm complexity.

**User sources.**

- **Local users** — service accounts, admin users — managed directly in Keycloak

- **AD-federated users** — operators, planners, engineers — authenticated against customer’s AD via LDAP federation, profile synced on first login

**Roles — the RBAC matrix.**

| Role | Scope | Granted to |
| --- | --- | --- |
| viewer | Read-only across all modules’ dashboards | Senior leadership, auditors |
| planner | M1, M3, M4 read + write | Production planners |
| supervisor | M6, M7 read + M6 write (dispatch approval) | Shift supervisors |
| operator | M6 write (dispatch events only), M5b write (quality events), M5c write (breakdown report) | Floor operators |
| quality_engineer | M5b full, M2 quality_specs write | Quality team |
| maintenance_engineer | M5c full, M2 calendar write (PM blocks) | Maintenance team |
| material_planner | M5a full, M1 read | Material planners |
| energy_manager | M8 full, M7 read | Energy / sustainability team |
| master_data_editor | M2 single-entity writes | Named users, few in number |
| master_data_admin | M2 bulk operations, maker-checker approval | Head of Manufacturing + IT lead |
| sap_admin | SAP sync configuration, manual sync triggers | Plant IT |
| platform_admin | Full system admin, including user management | Zedral support engineers + customer platform owner |

**Principle of least privilege.** No role has cross-module write except platform_admin. Admin actions are audited and alerted.

**Session management.**

- Web UI sessions: 8-hour SSO, 1-hour idle timeout

- Andon terminal sessions: **per-shift auto-login** via device certificate + operator badge scan. At shift change, the outgoing operator confirms end-of-shift, the incoming operator scans in. The device is authenticated via cert; the user is identified via badge.

- API tokens: JWTs, 15-minute expiry, refresh tokens 8-hour

- Mobile sessions: device-bound tokens, 30-day expiry with biometric re-auth

**MFA.** Required for master_data_admin, sap_admin, platform_admin roles and for any user accessing from outside the Plant LAN (e.g., via VPN).

### 8.2 Audit Service

An audit log that is **never edited, never deleted, and retained 7 years**.

**Audit scope.** Every write operation across the platform emits an audit entry. Categories:

- **Master data changes** (Section 5 — master.audit_log)

- **Schedule approvals** (m4_schedule.approvals)

- **SAP write-backs** (core.sap_sync_log)

- **Quality decisions** (NCR dispositions)

- **User management** (role grants/revocations)

- **Configuration changes** (feature flags, SAP mappings, egress allow-lists)

- **Security events** (auth failures, privilege escalations, DMZ access)

**Storage.** A dedicated audit schema in Postgres with partitioning by month. Write-once semantics enforced via:

- No UPDATE or DELETE grants to application roles

- Database-level trigger blocks UPDATE/DELETE on audit tables

- Nightly cryptographic checksum of the day’s audit rows, stored in audit.daily_hashes — detects any tampering

**Retention.** 2 years hot in Postgres, 5 years warm in MinIO (exported monthly as signed parquet files), for a total 7-year retention — aligned with CCTS, BRSR assurance, and Indian Companies Act requirements.

### 8.3 Notification Service

One service, multiple channels.

**Supported channels (v1):**

- Email (SMTP relay, customer-configured)

- SMS (for critical alerts only, via customer’s gateway — typically MSG91 or Twilio local)

- In-app browser notifications

- Microsoft Teams webhook (many Indian enterprises are on M365)

**Not supported in v1:** Slack (rare in Indian steel), WhatsApp (regulatory uncertainty for business use at the time of writing — revisit).

**Notification policy.**

Every notification has:

- **Severity** (info / warning / critical)

- **Recipient rule** (user, role, user + on-call-rotation)

- **Channels** (one or more)

- **Rate limit** (per user, per severity)

- **Quiet hours** (except for critical — which override quiet hours)

Defined in a declarative YAML config, reloaded without restart. Example:

notifications:
  - event: m4.schedule.published
    severity: info
    recipients:
      - role: supervisor
    channels: [in_app]
    quiet_hours_enforced: true

  - event: m8.peak_demand.exceeded
    severity: critical
    recipients:
      - role: energy_manager
      - role: plant_admin
    channels: [email, sms]
    rate_limit: 1_per_15_min
    quiet_hours_enforced: false

### 8.4 Configuration Service

**Principle:** no config in code, no config in environment variables beyond bootstrapping.

**Layers:**

- **Boot config** — minimal, in env vars or a startup secrets file: database URL, Redpanda broker address, Keycloak URL, instance plant ID

- **Runtime config** — stored in Postgres core.config table, hot-reloadable via an admin API and UI; used for tuning (schedule cadence, alert thresholds, DMZ window timing)

- **Feature flags** — stored in core.feature_flags table, evaluated per request; used for enabling Phase 2 modules, A/B rollouts, customer-specific variants

**Config change lifecycle.**

- Change made via Ops Console → written to core.config with audit entry

- Publish event config.changed on backbone

- Subscribing services reload affected keys

- Grace period of 30 s before enforcement (lets services distribute the update)

- Rollback: previous value always kept; one-click revert in the UI

### 8.5 Feature Flag System

A deliberately simple feature-flag system — **no LaunchDarkly, no cloud dependencies**.

**Scope of flags.**

- **Module enable/disable** (e.g., m8_energy.enabled = true when Phase 2 module ships)

- **Experimental features** (e.g., m4.what_if_scenarios.enabled)

- **Customer-specific variants** (e.g., priority_scoring.use_customer_class = true at Hero Steels, false at customer #2 which doesn’t have priority classes)

**Evaluation model.** Binary flags, no percentage rollouts in v1 (single-tenant makes rollout meaningless — you’re either running it or not). Phase 3+ may add percentage rollouts for mobile app A/B tests.

### 8.6 Job Scheduler

Background jobs — SMED learning, SAP sync, capacity calculation, ESG report generation — need reliable scheduling.

**Approach.** Celery Beat + Redis broker for v1.

- Beats schedule (cron-style) stored in Postgres via a custom scheduler backend (Redis is only the broker, not the source of truth — important for restart durability)

- Job definitions in code, registered at service startup

- Task results written to core.job_runs for visibility

**Why not k8s CronJobs:** v1 runs on Docker Compose, not k8s. Celery Beat works across both.

**Why not Airflow:** massive overkill for ~30 scheduled jobs; Airflow’s DAG model is a mismatch for independent jobs.

### 8.7 Secrets Management

**Approach:** sops (Mozilla) + age encryption, secrets committed to the Zedral deploy repo but encrypted. Per-deployment keys.

No HashiCorp Vault in v1 — operational overhead too high for single-tenant. Vault added in Phase 4 when multi-tenant deploy automation needs centralised secret management.

**Secret categories:**

- SAP client credentials (OAuth2)

- Redpanda SASL passwords (per-service)

- Postgres passwords (per-service)

- Keycloak admin credentials

- DMZ egress destination credentials (SFTP keys for regulator upload)

- Internal CA signing keys

- HMAC keys for event signatures (per-device)

**Rotation schedule.**

| Secret type | Rotation |
| --- | --- |
| Postgres, Redpanda service passwords | Quarterly |
| SAP OAuth secret | Semi-annual |
| HMAC device keys | Annually |
| Internal CA | 3 years |
| Keycloak admin | On role change; minimum annually |

Rotation is an operational runbook, not a code path — v1 does it manually. Phase 3 adds automated rotation for service passwords.

## 9. Technology Stack

Every component listed with rationale. Anything not listed is **not in the stack** — don’t introduce it without an ADR.

### 9.1 Full Stack BOM

**Data ****&**** Messaging**

| Component | Version | Purpose | Alternatives considered |
| --- | --- | --- | --- |
| Redpanda | 24.x | Event backbone | Apache Kafka (rejected, too heavy); NATS (viable alt) |
| PostgreSQL | 16.x | Core database | MySQL (inferior JSONB); CockroachDB (over-engineered single-node) |
| TimescaleDB | 2.x | Time-series extension for Postgres | InfluxDB (rejected, separate infra); Victoria Metrics (rejected, metrics-only) |
| MinIO | Latest | Object storage | Ceph (too heavy); filesystem-only (no S3 API, harder migration) |
| Apicurio Registry | 2.x | Schema registry | Confluent Schema Registry (paid tier for features we need); Karapace (viable alt) |

**Application Runtime**

| Component | Version | Purpose | Alternatives considered |
| --- | --- | --- | --- |
| Python | 3.12 | Primary service language | Go (considered for hot-path services — deferred to Phase 2 for specific services); Node.js (rejected — typing story weaker, ecosystem weaker for scientific computing) |
| FastAPI | 0.110+ | HTTP API framework | Flask (rejected, less native async); Django (rejected, too heavy for microservices) |
| Pydantic | 2.x | Schema validation / serialisation | marshmallow (rejected, Pydantic is standard in FastAPI) |
| Google OR-Tools | 9.x | CP-SAT solver for M4 | Gurobi (commercial, out per Principle 6); Python-MIP + CBC (less capable CP-SAT) |
| Celery + Redis | 5.x / 7.x | Async task queue | RQ (less feature-rich); Dramatiq (smaller ecosystem); Kafka-based job queue (premature) |
| aiokafka | Latest | Kafka client | confluent-kafka-python (C library, harder to deploy air-gapped) |

**Frontend**

| Component | Version | Purpose | Alternatives considered |
| --- | --- | --- | --- |
| React | 18.x | SPA framework | Vue (team preference — Python stack); Svelte (smaller ecosystem, talent pool) |
| TypeScript | 5.x | Type safety | JavaScript (rejected, no contract between API and UI) |
| Vite | 5.x | Build tool | Next.js (SSR unneeded for intranet SPA); Webpack (slower) |
| TanStack Query | 5.x | Server state management | Redux (over-engineered); SWR (less feature-rich) |
| shadcn/ui + Tailwind | Latest | Component library | Ant Design (looks dated); MUI (bundle size) |
| Recharts | 2.x | Charts | Chart.js (less React-native); D3 directly (too low-level) |
| React Flow | 11.x | Gantt / graph visualisations | Specialised Gantt libs evaluated in M4 doc |
| React Native | 0.74+ | Mobile (Phase 3) | Native iOS/Android (3× team); Flutter (non-TS, stack mismatch) |

**Identity ****&**** Security**

| Component | Version | Purpose | Alternatives considered |
| --- | --- | --- | --- |
| Keycloak | 24.x | Identity / SSO | Authelia (lighter but less feature-complete); Authentik (viable alt, smaller community) |
| Traefik | 3.x | Reverse proxy / API gateway | Nginx (simpler but weaker OIDC); Kong (plugin-heavy) |
| step-ca | Latest | Internal CA | HashiCorp Vault PKI (heavier); manual OpenSSL (ops nightmare) |

**Observability**

| Component | Version | Purpose | Alternatives considered |
| --- | --- | --- | --- |
| Prometheus | Latest | Metrics | InfluxDB (losing mindshare); Datadog (cloud — out) |
| Loki | Latest | Logs | ELK (Elasticsearch cost + JVM); Graylog (smaller community now) |
| Tempo | Latest | Traces | Jaeger (viable alt); Zipkin (older) |
| Grafana | Latest | Dashboards + alerting | Custom dashboards (ecosystem loss); Kibana (ties to ES) |

**Infrastructure ****&**** Ops**

| Component | Version | Purpose | Alternatives considered |
| --- | --- | --- | --- |
| Docker + Docker Compose | Latest | v1 runtime | Podman (rootless — evaluate for v2) |
| k3s | 1.30+ | Phase 2 orchestration | k0s (less adopted); full k8s (overkill) |
| Ansible | 2.16+ | Deployment automation | SaltStack (heavier); Terraform (wrong tool — infra, not config) |
| Restic | Latest | Backups | BorgBackup (viable alt); custom scripts (rejected) |
| sops + age | Latest | Secret encryption | Vault (operational overhead) |

### 9.2 Architectural Decision Records (ADRs)

Every non-trivial technology choice gets an ADR file in the repo. Format:

ADR-NNNN: <Title>
Status: Proposed | Accepted | Deprecated | Superseded by ADR-XXXX
Date: YYYY-MM-DD
Deciders: <names>

Context:
Decision:
Consequences:
Alternatives considered:

Phase 0 ADRs to be written:

- ADR-0001: Redpanda over Kafka

- ADR-0002: PostgreSQL + TimescaleDB as single database (vs. split OLTP/OLAP)

- ADR-0003: FastAPI + Python as primary service stack

- ADR-0004: CP-SAT (OR-Tools) as scheduling engine

- ADR-0005: Docker Compose for v1 (not k3s)

- ADR-0006: Event envelope with HMAC signatures for floor-originated events

- ADR-0007: No multi-tenancy in v1

- ADR-0008: OData over IDoc for SAP

- ADR-0009: Keycloak as IdP

- ADR-0010: On-premise-only (no cloud fallback)

Each ADR is 1–2 pages. Collectively they are the technical rationale inheritance for every future engineer.

### 9.3 Language Policy

- **Python 3.12** — default for all services

- **TypeScript** — default for all frontend

- **SQL** (Postgres dialect) — for stored procedures (minimal use); for migrations (via Alembic)

- **Shell (bash)** — for operational scripts only; always with set -euo pipefail

- **Go** — permitted for specific hot-path services where Python is a performance bottleneck (Phase 2+, requires ADR)

- **Rust** — not permitted in v1 without strong ADR (tooling complexity, talent scarcity in India steel context)

- **Java/Kotlin** — not used; Keycloak is the only JVM component and it’s a vendor blob

### 9.4 Dependency Hygiene

- **Lock files committed** — poetry.lock, package-lock.json, never ignored

- **Weekly dependency scan** — Dependabot or Renovate running against the Zedral GitHub org; patches reviewed and merged by a rotating engineer

- **Private package mirror** — customer deployments pull Python and npm packages from an internal mirror (Nexus or Verdaccio), which in turn pulls from PyPI and npmjs.org during update windows only

- **SBOM generation** — every release ships with a Software Bill of Materials (SPDX format) — required for CCTS-adjacent and government-sector customers

## 10. Security & Compliance Baseline

Security is not a feature; it is a baseline. This section documents what’s true from Day 1 of every deployment.

### 10.1 Threat Model (Abbreviated)

**Assets we protect.**

- Operational data integrity (a tampered floor.production.completed event causes wrong SAP confirmation)

- Availability of shop-floor execution (a 4-hour outage costs ~₹10L in idle labour + deferred production)

- Master data integrity (a tampered changeover matrix degrades scheduling for weeks)

- ESG data integrity (a tampered emission factor creates BRSR misstatement → Companies Act consequences)

- Customer business data (order book, pricing implied from WOs — competitive-sensitive)

**Adversaries we design against (prioritised).**

- **Opportunistic internal actor** — disgruntled employee with Plant LAN access trying to falsify production or quality data. High likelihood, moderate impact.

- **Compromised user account** — supervisor credentials phished, used to manipulate schedules. Moderate likelihood, high impact.

- **Ransomware via Plant LAN** — ransomware spread from an IT machine into the Core Server. Moderate likelihood, high impact.

- **Supply-chain compromise** — malicious npm/PyPI package in a deploy bundle. Low likelihood, catastrophic impact.

- **State-level adversary** — not in the v1 threat model. Hardening for this is Phase 4+ for customers requiring it.

**Adversaries explicitly out of scope.** Physical intrusion into the plant’s electrical room (the customer’s physical security controls handle this). BGP hijacking of the DMZ upstream (telco / customer network team).

### 10.2 Controls Framework — CIS Baseline

Every Zedral deployment is audited against **CIS Controls v8**. We target **Implementation Group 2 (IG2)** compliance at go-live.

Key controls and how we meet them:

| CIS Control | Zedral implementation |
| --- | --- |
| 1 — Inventory of Enterprise Assets | Automated inventory via ansible facts; weekly report to customer IT |
| 2 — Inventory of Software Assets | SBOM per release; running-process inventory exported daily |
| 3 — Data Protection | Data classification (§10.4), LUKS + TDE, TLS everywhere |
| 4 — Secure Configuration | CIS-Level-1 OS baseline applied via Ansible; drift detection nightly |
| 5 — Account Management | Keycloak; no shared accounts; quarterly access review |
| 6 — Access Control | RBAC matrix (§8.1); MFA on privileged roles |
| 7 — Continuous Vulnerability Management | Weekly CVE scan against SBOM; 30-day patch SLA for high, 7-day for critical |
| 8 — Audit Log Management | §8.2; 7-year retention; tamper-detection via daily hashes |
| 9 — Email/Web Browser Protections | Out of scope — customer IT concern |
| 10 — Malware Defenses | ClamAV on DMZ host (scans incoming update bundles); Core/Edge use image scanning in CI |
| 11 — Data Recovery | Nightly backups; quarterly restore drills |
| 12 — Network Infrastructure Management | Firewall manifest; Grafana Network Health dashboard |
| 13 — Network Monitoring | Flow logs to Loki; alerts on baseline deviation |
| 14 — Security Awareness | Customer responsibility — we provide an operator training module |
| 15 — Service Provider Management | Vendor list documented; DMZ egress allow-list reviewed quarterly |
| 16 — Application Software Security | SAST (Semgrep), dependency scanning, secrets scanning in CI |
| 17 — Incident Response | Runbook; named on-call; break-glass procedure |
| 18 — Penetration Testing | Annual third-party pen test from Phase 2 onward |

IG3 (advanced) controls — DLP, advanced threat hunting, dedicated SOC integration — are Phase 4+ when a customer specifically requires them.

### 10.3 Encryption

**At rest.**

- **Disk-level:** LUKS with customer-held master key on Core Server and Edge Gateway; key stored in a customer-owned HSM or sealed envelope (not accessible to Zedral staff)

- **Database-level:** Postgres TDE (via pgcrypto for sensitive columns, not full-database TDE in v1) for operator PII (names, contact info), SAP credentials in config tables

- **Object storage:** MinIO SSE-S3 with per-bucket keys

- **Backups:** Restic’s built-in encryption (AES-256) with separate customer-held key

**In transit.**

- **All internal traffic:** mTLS with internal CA (step-ca)

- **User traffic:** TLS 1.3 via Traefik

- **DMZ egress:** TLS 1.3 + application-level encryption (age + Ed25519 signatures on every bundle)

- **OPC-UA:** Basic256Sha256 security policy minimum, SignAndEncrypt mode

- **Modbus:** Modbus itself is unencrypted (protocol limitation). We mitigate by placing meters on an isolated VLAN with no routing to anything except the Edge Gateway.

**Key management.**

- Customer holds the master keys. Zedral cannot decrypt customer data without customer cooperation.

- Internal service keys are managed via sops + age per deployment.

- HMAC keys for event signatures are per-device, rotated annually, provisioned via an enrollment flow documented in the ops runbook.

### 10.4 Data Classification

Four levels:

| Level | Examples | Handling |
| --- | --- | --- |
| **Public** | Grade names, generic SOPs | No special protection |
| **Internal** | Schedule data, OEE metrics, downtime reasons | Auth required, TLS required |
| **Confidential** | Customer order details, pricing-adjacent data, energy consumption | Role-based access, audited, never leaves Plant without explicit justification |
| **Restricted** | Operator PII (ID, contact), credentials, signing keys | TDE at column level, access logged, MFA required |

**ESG export specifically.** The ESG bundle (BRSR data) is **Confidential** level — but it must leave the plant. Egress rules:

- ESG payload contains only aggregate data (monthly kWh, monthly Scope 1/2, no per-WO data, no customer-identifying data)

- Payload schema reviewed by customer’s Compliance officer before first use

- Per-export sign-off required (Ops Console shows a preview before the Egress Packager builds the bundle)

- Export ledger retained for 7 years (what was exported, when, by whom, approved by whom)

### 10.5 Compliance Alignment

Zedral is not a compliance product; it is a compliance *enabler*. We support customers subject to:

**BRSR (SEBI Business Responsibility and Sustainability Reporting)** — mandated for top 1,000 listed companies. Hero Steels is not SEBI-listed but its large customers are, cascading disclosure requirements. We produce:

- Scope 1 and Scope 2 emissions per the BRSR Essential Indicators

- Water withdrawal and consumption (when metered in Phase 2)

- Energy intensity per tonne of output

- Audit trail sufficient for BRSR Core reasonable assurance (Phase 2+)

**PAT (Perform, Achieve, Trade — BEE)** — sectoral efficiency scheme. Steel is a PAT-listed sector. We produce:

- Specific Energy Consumption (SEC) per tonne at plant boundary

- Sub-metered SEC at line level (where metering permits)

- PAT cycle reporting formats (annual)

**CCTS (Carbon Credit Trading Scheme)** — operationalised June 2025. Steel is expected to be in scope. We produce:

- CO₂-equivalent emissions with traceability to operational data

- Verified emission statements in the CCTS format (when specifications finalise)

**ISO 50001 (Energy Management System)** — voluntary but increasingly required by export customers. We support:

- Baseline establishment (statistical, with production as the relevant variable)

- Continuous monitoring of EnPIs (Energy Performance Indicators)

- Corrective action tracking

**Indian IT Act 2000 + DPDP Act 2023** — for operator PII handling:

- Consent capture at operator onboarding

- Data minimisation (only name, employee ID, shift; no Aadhaar, no biometric stored beyond badge-ID hash)

- Right-to-deletion workflow (operator exits → PII purged from active tables within 30 days, retained only in legal audit store)

- Data Protection Officer contact field in deployment config

### 10.6 Penetration Testing and Red Teaming

- **Pre-go-live (Phase 1):** internal security review, dependency scan, secrets scan, CIS baseline verification

- **6 months post-go-live (Phase 2):** third-party pen test — network, application, and AD-federation scope

- **Annual thereafter:** rolling pen test programme; scope rotates across network, app, physical, social

- **Responsible disclosure programme:** once v1 is shipping to >2 customers, open a private bug bounty via HackerOne or Bugcrowd

### 10.7 Incident Response

Four severity levels:

| Severity | Definition | Response |
| --- | --- | --- |
| SEV-1 | Production down (floor cannot dispatch), or data breach confirmed | 15-min acknowledgment, 4-hour resolution target, war-room, post-mortem within 5 days |
| SEV-2 | Major function degraded (schedule stale, SAP sync blocked), no data loss | 1-hour ack, 24-hour target, post-mortem |
| SEV-3 | Minor function degraded, workaround exists | Next business day |
| SEV-4 | Cosmetic issue, single-user impact | Next release |

**On-call rotation:** Zedral engineering rotation (initially the founding team) + customer’s designated platform owner. PagerDuty or Zenduty for alerting.

**Runbooks:** A runbook per SEV-1 / SEV-2 scenario, stored in the deploy repo, printed and kept in the Core Server cabinet as paper fallback. Top 10 runbooks to author in Phase 0:

- Core Server down (hardware failure)

- Redpanda cluster unhealthy

- Postgres replication lag or failure

- SAP sync blocked (all writes piling up)

- Edge Gateway offline

- Scheduler stuck / no output

- Andon terminals not receiving dispatch

- Energy meter not reporting

- Disk full on Core Server

- Certificate expiry

## I.C — Operational & Evolutionary Foundation

## 11. Observability Stack

Observability is not ops plumbing — it is **Principle 9, a product feature**. A customer at 2 AM reporting “the schedule didn’t refresh” must be debuggable without asking them to tar up logs.

### 11.1 The Three Signals

Industry-standard: metrics, logs, traces. Each has a specific job.

**Metrics —**** ****“****is something broken?****”** - Low cardinality, numeric, time-aggregated - Used for dashboards, alerting, SLO tracking - Prometheus + Grafana

**Logs —**** ****“****what happened?****”** - Full context, structured (JSON), correlation-ID-tagged - Used for forensics, debugging specific incidents - Loki + Grafana

**Traces —**** ****“****where did time go?****”** - Request-level, spanning services - Used for latency investigation, causality debugging - OpenTelemetry → Tempo + Grafana

All three share Grafana as the single pane of glass. No separate Kibana, no separate Jaeger UI.

### 11.2 Metrics Standard

**Instrumentation library.** prometheus-client (Python) exposed on /metrics by every service. FastAPI services use prometheus-fastapi-instrumentator for HTTP metrics with minimal boilerplate.

**Naming convention.** Follows Prometheus best practice:

- <namespace>_<subsystem>_<name>_<unit> — e.g., zedral_m4_schedule_runs_total, zedral_m7_oee_calc_duration_seconds

- Counters end in _total

- Histograms include unit (_seconds, _bytes)

- Gauges describe current state (_queue_size, _active_connections)

**Required labels.** Every metric must include plant_id, service, and where relevant module and event_type.

**Standard metrics every service emits:**

| Metric | Type | Purpose |
| --- | --- | --- |
| zedral_service_up | Gauge | Heartbeat — is the service alive |
| zedral_http_requests_total | Counter | Requests by method, path, status |
| zedral_http_request_duration_seconds | Histogram | Latency distribution |
| zedral_kafka_messages_consumed_total | Counter | Events consumed by topic |
| zedral_kafka_messages_published_total | Counter | Events published by topic |
| zedral_kafka_consumer_lag_seconds | Gauge | Current lag — key SLO input |
| zedral_db_query_duration_seconds | Histogram | DB query latency |
| zedral_job_runs_total | Counter | Background job executions, labelled by outcome |
| zedral_errors_total | Counter | Unhandled exceptions, labelled by error_class |

**Module-specific metrics.** Each module doc specifies its own (e.g., zedral_m4_schedule_run_duration_seconds, zedral_m8_meter_reading_stale_total). Listed in the module docs, not duplicated here.

**Scrape interval.** 15 seconds. Services with low-cardinality metrics: 30 seconds. Edge Gateway: 60 seconds (buffered during disconnect).

**Retention.** Prometheus local: 15 days at 15-s resolution. Longer-term retention via prometheus-downsample to 1-hour buckets, kept 1 year in MinIO.

### 11.3 Logging Standard

**Format.** JSON structured logs, one JSON object per line, stdout only. Services do not write to files — container logs are captured by Docker and forwarded by Promtail to Loki.

**Standard fields.**

{
  "ts": "2026-04-17T14:22:31.445Z",
  "level": "INFO",
  "service": "m4-scheduler-api",
  "plant_id": "hsl_ludhiana",
  "correlation_id": "0190d7f3-1234-7890-abcd-ef0123456789",
  "trace_id": "c1f8a2...",
  "span_id": "d2b9e3...",
  "user_id": "planner_042",
  "event": "schedule_run_completed",
  "msg": "Schedule run completed successfully",
  "duration_ms": 3421,
  "schedule_id": "sch_20260417_002",
  "jobs_scheduled": 14,
  "changeover_minutes_total": 1680
}

**Log levels.**

- DEBUG — development only, not enabled in production by default

- INFO — significant business events (job dispatched, schedule published, report generated)

- WARN — recoverable issues (SAP retry, cache miss, stale data)

- ERROR — failed operations that need attention (SAP write-back failed after retries, job failed)

- CRITICAL — system-level incidents (data loss risk, integrity violation, security event)

**Cardinality discipline.** High-cardinality fields (user_id, correlation_id, schedule_id, wo_id) go in log fields, **never in metric labels**. Violating this kills Prometheus.

**Sampling.** INFO and higher: 100% retention. DEBUG: disabled in production. No sampling of ERROR / CRITICAL under any circumstances.

**Retention.** 30 days hot in Loki; 1 year warm in MinIO via nightly export.

### 11.4 Tracing Standard

**Instrumentation.** OpenTelemetry auto-instrumentation for FastAPI, aiokafka, sqlalchemy, httpx. Manual spans for business logic (scheduling algorithm phases, SAP calls, report generation).

**Propagation.** W3C Trace Context headers (traceparent, tracestate) propagated across HTTP, and via trace_id / span_id fields in Kafka event envelopes (non-standard but pragmatic — the unified event backbone needs trace correlation).

**Sampling.**

- 100% of errors

- 100% of business-critical operations (schedule runs, SAP write-backs, report generation)

- 10% of routine API calls (tunable via config)

- 1% of high-frequency worker-input events (otherwise Tempo drowns in operator clicks)

**Retention.** 7 days in Tempo. Not archived — if it matters a week later, the log has it.

### 11.5 SLOs and Alerting

**Service-Level Objectives — what we commit to.**

| SLO | Target | Error budget | Applies to |
| --- | --- | --- | --- |
| API availability | 99.5% monthly | 3.6 h/month | User-facing HTTP endpoints |
| Floor console responsiveness | p95 < 500 ms | — | Operator-facing APIs |
| Event ingestion lag | p95 < 5 s | — | Time from occurred_at to backbone arrival |
| Schedule run latency | p95 < 5 min | — | M4 scheduling from trigger to publish |
| SAP write-back | 99% success rate | 1% monthly | Excludes semantic failures (bad data) |
| OEE snapshot freshness | < 60 s behind realtime | — | KPI dashboard staleness |
| Energy meter reading completeness | > 99% of expected reads | 1% monthly | Per meter, per day |

**SLO vs. SLA.** These are internal SLOs — our commitment to ourselves. Customer-facing SLAs are negotiated per contract and are a subset of these, with slack. (E.g., contract SLA = 99% API availability; internal SLO = 99.5%.)

**Alert philosophy.**

- Alert on **symptoms**, not causes (alert when the schedule is stale, not when a CPU is hot — unless hot CPU is known to cause symptoms)

- Every alert has a runbook link

- Alert fatigue kills reliability — we pre-emptively delete alerts that fire more than twice in a month without action

**Alert severity → channel routing (reprise from §8.3):**

- SEV-1 (critical): SMS + email + Teams + on-call PagerDuty → ack within 15 min

- SEV-2 (high): email + Teams → ack within 1 hr

- SEV-3 (low): in-app dashboard notification → next business day

### 11.6 Grafana Dashboards — The Starter Set

Five dashboards ship with every deployment. These are the customer-visible ops surface.

| Dashboard | Audience | Shows |
| --- | --- | --- |
| Platform Health | Zedral ops, Customer IT | All service up/down, error rates, Kafka lag, DB health |
| Integration Health | Customer IT | Per integration: SAP sync status, SCADA tag freshness, meter connectivity |
| Business KPIs | Plant Head, Manufacturing Head | OEE by line, schedule adherence, setup time trend, SEC, energy cost |
| Security & Audit | Customer IT, Compliance | Auth failures, privileged actions, DMZ egress log, data classification access |
| Resource Utilisation | Zedral ops | CPU/RAM/disk/network per host, Postgres slow queries, MinIO object count |

Module-specific dashboards (M4 Scheduler Deep Dive, M8 Energy Deep Dive, etc.) are specified in the respective module docs.

**Dashboard versioning.** All Grafana dashboards checked into the deploy repo as JSON. Changes reviewed like code. No “somebody changed the dashboard in the UI and it’s been like that for 6 months” — drift detection runs nightly and alerts on unsynced changes.

### 11.7 Fleet Monitoring — The Three-Tier Model (Recap with Detail)

From Principle 3 and the prior conversations. Detailed now.

**Tier 1 — In-plant (always-on, customer-accessible).**

The full Prometheus/Loki/Tempo/Grafana stack running on the Core Server. Customer’s ops team has read access; named customer platform owner has admin. Retained locally. No data leaves the plant.

**Tier 2 — Weekly health bundle (scheduled egress).**

Every Sunday at 02:00 local time:

- A health-bundle-builder job runs on Core Server

- Collects:

- **Metrics rollup** — hourly-bucketed Prometheus data for the past 7 days, stripped of high-cardinality labels

- **Error log summary** — unique ERROR / CRITICAL log entries (not full stack traces), counted

- **SLO compliance** — each SLO, target vs. actual, error-budget consumption

- **Version inventory** — what’s running, versions, config checksums

- **Incident summary** — any SEV-1/SEV-2 in the period

- Anonymises (strips customer names from logs, replaces with plant_id hash)

- Packages per §6.4 (age-encrypted, Ed25519-signed)

- Drops into DMZ outbound zone

- Egress Packager uploads to Zedral HQ on the next scheduled window

Customer sees exactly what’s in the bundle via the Ops Console before it goes out. A **preview mode** shows last week’s bundle. Nothing surprises anyone.

Zedral HQ consumes these bundles into a fleet-monitoring dashboard: “of our 5 deployed customers, 2 are under SLO for API availability this week, deep-dive needed on customer 3’s SAP sync lag.”

**Tier 3 — Break-glass (customer-initiated, time-boxed).**

Exactly as specified in §6.4. Used only when Tier 2 bundles indicate a problem that needs interactive debugging and remote assistance is contractually permitted.

**Contractual posture.** Tier 2 is opt-out (default-on, disclosed in the MOU). Tier 3 requires per-incident customer initiation. Never any silent telemetry.

### 11.8 Error Budgets and Release Gating

For each SLO, a monthly error budget. If the budget is exhausted:

- **Feature releases paused** for that module until the error rate recovers

- **Reliability work prioritised** — the engineering team switches to fixing whatever caused the burn

- **Post-mortem written** if budget burn was caused by a single incident >25% of total

Error budget status is visible in the Platform Health dashboard with a running month-to-date count.

## 12. Deployment & Update Strategy

Air-gapped deployment is the biggest operational differentiator from every SaaS competitor. It has to be polished, or customers will resent the platform every time they update it.

### 12.1 The Deployment Unit — Zedral Release Bundle

A **Zedral Release Bundle** is a self-contained, signed, offline-installable artifact that includes:

- All Docker images (exported as docker save tarballs)

- All configuration templates

- Database migration scripts (Alembic)

- Grafana dashboards, Prometheus alert rules

- ADR archive for this release (historical record)

- Release notes (human-readable)

- Bundle manifest with SHA-256 of every file

- Ed25519 signature over the manifest, signed by a Zedral release key

Bundle size target: <2 GB for a full release. Incremental (patch) releases: <200 MB.

**Naming:** zedral-<version>-<date>.tar.zst.age — version is semver, date is ISO-8601 compact.

**Channel model.** Three release channels:

| Channel | Cadence | Risk | Audience |
| --- | --- | --- | --- |
| stable | ~monthly | Low | All production deployments |
| beta | ~weekly | Medium | Opt-in customers, Zedral internal plants |
| nightly | Daily | High | Zedral internal only |

Every customer deployment subscribes to exactly one channel. Channel change is an explicit customer decision with a 30-day rollback commitment.

### 12.2 Install — The First-Deploy Procedure

**Pre-deployment checklist (reviewed and signed by customer IT + Zedral SA):**

- Hardware provisioned per §3.4 and §6

- Network segmented per §6.1, firewall manifest implemented and tested

- TLS certificates issued by customer’s internal CA (or step-ca initialised)

- SAP OData services published and reachable from Core VLAN (test query returns 200)

- SCADA OPC-UA endpoint accessible from Edge Gateway (test subscription succeeds)

- Modbus smart meters installed, addressable, and registered in tag map

- DMZ allow-list agreed with customer IT security

- Local Zedral release bundle repository populated on DMZ

- Backup target (disk or customer tape) accessible from Core Server

**Install steps (~4 hours for experienced installer):**

- Bootstrap Core Server with Debian + Ansible runner (pre-prepared USB)

- Ansible playbook installs: Docker, base configuration, CIS-L1 hardening, internal CA, secrets from sops

- Unpack release bundle, load Docker images (docker load)

- Initialise Postgres with schemas, run Alembic to head

- Initialise Redpanda, create topics per taxonomy, apply ACLs

- Initialise Keycloak, create realm, seed roles, create initial admin user

- Start all services via Docker Compose

- Run smoke-test suite — a curated list of ~30 assertions (“can the Ops Console load? Does auth work? Does a test WO land in M1? Can a scheduler run produce output?”)

- Run integration-test suite — validates SAP pull, OPC-UA tag subscription, meter reading

- Hand over credentials (sealed envelope, physical delivery)

- Customer platform owner signs acceptance

Parallel activities during install:

- Edge Gateway provisioning (1 hour)

- DMZ Host provisioning (30 min)

- Andon terminals kiosk-mode setup (30 min each, parallelisable)

### 12.3 Update — The Ongoing Procedure

**Update cadence target.** One customer-facing update per month on stable; critical security patches out-of-band within 72 hours of CVE disclosure.

**Update workflow.**

- Zedral releases bundle to HQ release repository, signs with release key

- Customer’s DMZ Update Receiver pulls the new bundle during its scheduled window, verifies signature

- Customer ops team is notified (email + in-app banner) — bundle is **staged, not applied**

- Customer reviews release notes, schedules an update window (typically Sunday maintenance slot)

- At window time, platform_admin runs zedral-update apply <bundle-id> from a jump host session (or via the Ops Console update UI)

- Update script:

- Creates a **pre-update snapshot** (Postgres pg_dump, Redpanda offset record, config snapshot)

- Stops services in dependency order (frontend → APIs → workers → infra)

- Loads new Docker images

- Runs Alembic migrations (reviewed in advance — no surprise migrations)

- Starts services in reverse dependency order

- Runs post-update smoke tests

- If smoke tests pass: logs success, emits update.completed

- If smoke tests fail: **automatic rollback** (restore snapshot, revert to previous images)

- First 1 hour post-update: a **heightened alerting mode** runs with tighter thresholds — any SLO deviation triggers review

**Rollback.** Two mechanisms:

- **Automatic** (smoke test failure) — rolls back to previous version, no human intervention

- **Manual** (zedral-update rollback) — within 24 hours of an update, one command restores previous state. Beyond 24 hours, rollback is discouraged (data has evolved) and requires explicit risk acknowledgment.

**Schema migration discipline.** Database migrations follow the **expand-contract pattern**:

- Expand — new schema + backfill (backward-compatible)

- Dual-read / dual-write — new code uses new schema; old code still works

- Contract — old columns/tables removed only after 2 release cycles

This makes rollback safe within a release cycle. Never ship a breaking schema change in a single release.

### 12.4 Configuration Migration

Runtime config (§8.4) evolves too. A config migration framework handles:

- New config keys added with sensible defaults → no action required, service picks up default

- Renamed keys → migration script moves the old key’s value to the new key

- Removed keys → migration script logs the removal; the old value is preserved in audit for reference

Config migrations run as part of the update pipeline between image load and service start.

### 12.5 Fleet-Wide Rollout Control

For multi-customer fleets (Phase 4+):

- Releases are deployed to customers in **rings**: ring 0 = Zedral internal; ring 1 = 2 early customers; ring 2 = all stable customers

- 7 days between rings

- Automatic halt if ring 0 reports >0 SEV-2 or ring 1 reports >1 SEV-2 during the observation window

- Requires a release manager on-call during each ring transition

At v1 with 1 pilot customer, rings are degenerate. Documented now so we don’t build bad habits.

### 12.6 Disaster Recovery

**Backups.**

- **Postgres** — nightly logical backup (pg_dump) + continuous WAL archiving to MinIO; 30-day retention

- **MinIO** — daily sync to customer’s backup infrastructure (rsync to tape or backup server)

- **Config** — every change committed to a local config repo; daily mirror to MinIO

- **Redpanda** — topics with retention=90d are effectively backups; events archived to MinIO via Kafka Connect S3 sink nightly

**Restore drills.** Quarterly. A planned exercise:

- Spin up a DR VM on customer’s backup hardware

- Restore from latest backup

- Validate: does Postgres restore clean? Do events replay? Can UI authenticate?

- Measure RTO (target <4 hours) and RPO (target <1 hour)

- Document deviations, fix, retry

**Documented in the deploy repo as**** ****drills/quarterly-restore.md****.**

### 12.7 Data Migration and Retention

**When a deployment is decommissioned (customer exits, migrates elsewhere):**

- Full data export: Postgres logical backup, event log archive, MinIO contents

- Formats: SQL dump, Avro/Parquet for events, raw S3 for objects — all open, portable

- Delivered on encrypted external media

- Deletion from Zedral side: per customer contract terms (typically 30 days after confirmed export receipt)

**In-deployment retention.** Per §10 and §11.2:

- Operational data: 90 days hot, 2 years warm, 7 years cold (audit)

- Energy data (Timescale): 1 year hot at 15-min resolution, 7 years downsampled-daily

- Events in Redpanda: per-topic (see §4.4)

- Logs: 30 days hot, 1 year warm

- Metrics: 15 days raw, 1 year downsampled

## 13. Development Standards

How the engineering team operates. Short section because the patterns are industry-standard, but a few steel-vertical-specific additions.

### 13.1 Repository Layout

**Monorepo.** One git repo for the platform: zedral/zedral-platform.

**Rationale.** 3-person team at the pilot stage. Monorepo eliminates cross-repo version coordination, enables atomic refactors across services, and keeps ADRs + docs + code in one history. Split out service repos only when the team is >15 engineers and coordination cost exceeds monorepo friction.

**Top-level structure:**

zedral-platform/
├── services/
│   ├── m1-demand/
│   ├── m2-master-data/
│   ├── m3-capacity/
│   ├── m4-scheduler-api/
│   ├── m4-scheduler-worker/
│   ├── m5a-material/
│   ├── m5b-quality/
│   ├── m5c-maintenance/
│   ├── m6-dispatch/
│   ├── m7-oee/
│   ├── m8-energy/
│   ├── sap-sync-worker/
│   ├── changeover-learner/
│   └── esg-report-gen/
├── edge/
│   ├── edge-opcua-bridge/
│   ├── edge-modbus-scanner/
│   └── edge-event-publisher/
├── dmz/
│   ├── egress-packager/
│   └── update-receiver/
├── shared/
│   ├── py-zedral-core/           # event envelope lib, Kafka client wrapper
│   ├── py-zedral-auth/           # Keycloak integration helpers
│   ├── py-zedral-db/             # Postgres connection helpers
│   └── ts-zedral-ui/             # shared React components
├── frontend/
│   ├── ops-console/
│   ├── floor-console/
│   └── mobile-app/               # Phase 3
├── schemas/
│   ├── events/                   # Apicurio-registered event schemas
│   ├── api/                      # OpenAPI specs per service
│   └── master-data/              # JSON Schemas for master data
├── db/
│   ├── migrations/               # Alembic, organised by schema (master, m1_demand, ...)
│   └── seeds/                    # Seed data for dev + smoke tests
├── infra/
│   ├── ansible/                  # Deployment playbooks
│   ├── docker-compose/           # Compose files per environment
│   ├── grafana-dashboards/       # Dashboard JSON
│   ├── prometheus-rules/         # Alert rules
│   └── firewall-manifests/       # Customer-specific firewall docs
├── docs/
│   ├── adr/                      # Architectural Decision Records
│   ├── runbooks/                 # Incident response runbooks
│   ├── module-docs/              # M1–M8 production docs (the deliverable)
│   └── phase-0-foundation/       # This document
├── tests/
│   ├── smoke/                    # Post-deploy smoke tests
│   ├── integration/              # Cross-service integration tests
│   └── e2e/                      # Full user journey tests (Playwright)
└── tools/
    ├── zedral-update/            # Update / rollback tool
    ├── zedral-support/           # Break-glass enable/disable tool
    └── zedral-network-audit/     # Boundary enforcement tool

### 13.2 Branching and Commits

**Branching strategy.** Trunk-based development with short-lived feature branches.

- main is always deployable

- Feature branches: feat/<ticket-id>-<short-desc>, merged via PR within 2–3 days

- Release branches: release/<semver>, created at release candidate, hotfix-only after

- Hotfixes: hotfix/<ticket> branched from release tag, merged back to main

**No long-lived feature branches.** Large features use feature flags (§8.5), not branch longevity.

**Commits.** Conventional Commits format — <type>(<scope>): <subject>. Types: feat, fix, docs, refactor, test, chore, perf, security. Scope = module (m4, m8) or cross-cutting (infra, db, auth).

**Commit hygiene.** Squash-on-merge by default. Commit messages describe **why**, not **what** (the diff shows what). Link to the ticket in every commit.

### 13.3 Code Review

**PR rules.**

- Minimum 1 approving review for routine changes; 2 approvals for:

- Changes touching the event schema registry

- Changes touching security code (auth, audit, encryption)

- Changes touching SAP integration (high blast radius)

- Changes touching the scheduling algorithm

- CI must pass

- No [skip ci] on main

- Approved PRs older than 48 hours require re-approval (context staleness)

**Review focus areas (in order):**

- Correctness — does it do what the ticket says

- Principle adherence (§2) — any violations?

- Security — does it expose new attack surface?

- Observability — does it emit the metrics/logs needed?

- Tests — does it have appropriate coverage?

- Readability — will the next person understand it in 6 months?

Nitpicks on style go last, or not at all if the formatter already handles them.

### 13.4 CI/CD Pipeline

**CI runs on every PR.** GitHub Actions (or Gitea Actions for air-gapped self-hosted scenarios):

- **Lint** — ruff (Python), eslint (TS), yamllint, hadolint (Dockerfiles), shellcheck

- **Format check** — black, prettier

- **Type check** — mypy (Python, strict mode), tsc (TS)

- **Security scan** — Semgrep, Bandit, npm audit, pip-audit

- **Secrets scan** — detect-secrets / gitleaks

- **Dependency scan** — Trivy against SBOM

- **Unit tests** — pytest (Python), vitest (TS). Coverage floor: 75% for new code

- **Schema validation** — every schema change runs through Apicurio’s compatibility checker

- **Build** — Docker images for every service, signed and pushed to internal registry

- **Integration tests** — spin up docker-compose stack, run cross-service tests

- **E2E tests** — Playwright against the stack

Pipeline SLA: <10 min for lint + unit; <20 min full pipeline.

**CD pipeline.** Separate from CI. Triggered on tagged release:

- Build release bundle (§12.1)

- Sign with release key

- Publish to nightly channel immediately

- Promote to beta after internal validation

- Promote to stable after 7-day beta observation

### 13.5 Testing Floor

The minimum bar for every module:

- **Unit tests** — per-function, per-class, mocked dependencies. Target 80%+ coverage for business logic, 60%+ overall. Enforced in CI (coverage floor).

- **Contract tests** — every API endpoint has a request/response contract test that exercises the OpenAPI spec

- **Integration tests** — per-module, real Postgres + Redpanda + dependencies (via testcontainers). Run in CI.

- **E2E tests** — user journey tests for 10 critical flows (login, create WO, run schedule, dispatch job, record production, etc.). Run nightly on a dedicated E2E environment.

- **Load tests** — per-module, k6 scripts simulating peak loads (e.g., M6 dispatch at 3 events/second for 30 min). Run before major releases.

- **Chaos tests** — monthly on the staging environment: kill Redpanda, kill Postgres primary, partition the network between zones, fill the disk. Validate recovery.

**Test data.**

- db/seeds/hero-steels-minimal.sql — minimal seed for smoke tests (1 plant, 3 WCs, 5 WOs, 10 materials)

- db/seeds/hero-steels-realistic.sql — realistic seed for integration/load tests (~1000 WOs, full master data)

- Synthetic event generator for load testing — produces realistic event streams

### 13.6 Documentation Standards

Every module, every API, every runbook follows a **uniform template**. For modules, the 14-section template is already specified (§1.6 of the overall plan and enforced in the M1–M8 docs to follow).

**Living-vs-reference.**

- **Reference docs** (API specs, event schemas, data models) — generated from code/config; never manually updated

- **Living docs** (module docs, ADRs, runbooks) — written manually, reviewed quarterly, marked with “last reviewed” date

**Docs tested in CI.**

- Every internal link resolves

- Every code snippet runs (doctest-style for Python examples)

- Every API example matches the live schema

No “somebody changed the API but forgot to update the docs” — broken docs fail CI.

### 13.7 Hire-Readiness

The engineering-documentation bar is set so a new hire can:

- Day 1 — have a working local dev environment (via make dev-up)

- Day 3 — have run a full smoke test end-to-end

- Day 5 — have merged a small PR (typo, test fix, doc improvement)

- Week 2 — be reviewing PRs in their primary module

- Month 1 — be shipping features in their module

If any step slips, the onboarding documentation is wrong and gets fixed — no exceptions.

### 13.8 Production Access

**Environments.**

- **dev** — engineer laptops, docker-compose up, full stack local

- **staging** — Zedral-owned cloud-like instance (cloud VM, but architected identically to on-prem) for integration/load/chaos testing

- **prod** — customer deployments. Zedral has **no standing access**. Access is per §6.4 break-glass only.

**Production access log.** Every break-glass session is logged to a dedicated internal system (not the customer’s audit log — that’s customer’s). Quarterly internal review of access patterns.

### 13.9 Language & Communication Standards (Meta)

- **English** for all code, comments, commit messages, docs

- **Customer communication language** (Hindi/Punjabi/etc.) — handled by customer-facing operator labels (i18n) and documentation translations, not code artefacts

- **Naming:** prefer domain language over technical jargon. work_order not job_record. changeover_matrix not transition_table. The code should read like the plant floor talks.

## 14. Open Questions & Deferred Decisions

The honest list of what we’ve not decided, why we’ve not decided it, and when we’ll revisit.

**14.1 Multi-tenant mode.** Deferred to Phase 4+. Current v1 is strict single-tenant-per-deployment. When we have 5+ customers and operations pain becomes evident, we’ll consider a managed-hosting option where multiple small customers share a Zedral-managed deployment. Requires tenant isolation at DB, Kafka, and auth layers. **Revisit:** Q3 2027 (~18 months out).

**14.2 SaaS mode.** Deferred indefinitely. The air-gapped thesis is a market position, not a stopgap. A SaaS mode would fork the architecture and dilute focus. **Revisit:** only if a specific customer segment explicitly requests SaaS and is willing to pay a premium for it.

**14.3 Kubernetes migration.** Deferred to Phase 2. Docker Compose is sufficient for single-node v1. When HA, horizontal scaling, or multi-node resource balancing becomes necessary, migrate to k3s (single-cluster) or full k8s (multi-cluster, Phase 4). The service architecture is k8s-compatible from Day 1 — only the orchestration layer changes.

**14.4 Real-time closed-loop control.** Deferred indefinitely in v1. ISA-95 Level 2 (control) is customer’s existing PLC/SCADA scope. Zedral does not write to PLCs. If future customer demand pushes toward closed-loop (e.g., automatically adjusting rolling mill setpoints based on schedule), it is a major architectural undertaking (safety certification, real-time determinism, etc.) — would be a separate product line. **Revisit:** only on specific customer demand with commercial case.

**14.5 ML-driven scheduling.** Deferred to Phase 3. v1 uses CP-SAT deterministic scheduling. When >6 months of plant data exists, reinforcement-learning-assisted scheduling can be evaluated. Must remain explainable (see Principle 4).

**14.6 Edge compute redundancy.** Deferred to Phase 2. Single Edge Gateway is a single point of failure for OT ingestion. Dual active-passive Edge Gateway is scoped but not built. Mitigation in v1: local buffer + rapid hardware swap procedure.

**14.7 Predictive maintenance.** Deferred to Phase 3 (M5c enhancement). Requires condition monitoring data (vibration, temperature) that doesn’t exist today. First need to instrument, then to build baseline, then to predict. v1 M5c is reactive (breakdown + PM schedule), not predictive.

**14.8 Video / computer vision.** Deferred indefinitely. Surface defect detection via vision is a known industry use case but is a separate product category — and our compliance-heavy thesis is not a fit for a CV-heavy build.

**14.9 Multi-plant orchestration.** Deferred to Phase 4+. Plant-to-plant scheduling optimisation (moving work between plants) is valuable for multi-plant customers but requires a separate architectural layer above per-plant deployments.

**14.10 Customer-extensible workflows.** Deferred to Phase 5+. The temptation to build a low-code workflow engine (letting customers define their own quality workflows, dispatch rules, etc.) will surface. Resist until at least 3 reference customers ask for the **same** extensibility — that’s the signal the abstraction is real, not speculative.

**14.11 Mobile offline mode.** Scoped for Phase 3 mobile app. Supervisor mobile works online only in Phase 3. Offline mode (queue actions, sync later) is Phase 4 work.

**14.12 Water and waste metering (full ESG scope).** Phase 3. v1 M8 covers energy + emissions. BRSR also requires water, waste, biodiversity. Water metering and waste tracking added in Phase 3.

**14.13 Internationalisation.** Deferred to Phase 3. v1 ships English-only UI with local-language operator label overrides (key = English, display = customer-configured). Full i18n framework added for Phase 3 with multilingual mobile rollout.

**14.14 Mobile-first for operators.** Deferred indefinitely in primary design. Andon terminals are the primary operator interface; mobile is for supervisors and maintenance. Operator mobile (on personal devices) has security concerns (PII in photos, unmanaged endpoints) — not pursued.

## 15. Glossary

| Term | Definition |
| --- | --- |
| **ADR** | Architectural Decision Record — short document capturing a technical decision, its context, alternatives, and consequences |
| **Andon** | A shop-floor terminal for operator input and alerts; named for the Toyota Production System concept |
| **APS** | Advanced Planning and Scheduling — the family of software that produces finite-capacity production schedules |
| **BEE** | Bureau of Energy Efficiency — Indian government body administering PAT and CCTS |
| **BOM** | Bill of Materials — the list of components needed to produce an item |
| **BRSR** | Business Responsibility and Sustainability Reporting — SEBI-mandated ESG disclosure framework for Indian listed companies |
| **CA** | Certificate Authority — issues TLS certificates |
| **CCTS** | Carbon Credit Trading Scheme — India’s compliance carbon market, operationalised June 2025 |
| **CEA** | Central Electricity Authority — publishes India’s grid emission factor |
| **CIS** | Center for Internet Security — publishes the CIS Controls security baseline |
| **CoA** | Certificate of Analysis — steel industry quality document, issued per coil / heat |
| **Core VLAN** | The network zone where Zedral platform services run |
| **CP-SAT** | Constraint Programming over Boolean SAT — the scheduling solver in Google OR-Tools |
| **CRS** | Cold Rolling Strip / Shop — the cold-rolling mill operation at Hero Steels; also refers to individual lines CRS-1, CRS-2, CRS-3 |
| **DISCOM** | Distribution Company — regional electricity retailer in India |
| **DMZ** | Demilitarised Zone — network zone used for controlled egress between Core and Internet |
| **DPR** | Daily Production Report — plant-standard document summarising each day’s output |
| **EMS** | Energy Management System |
| **ERP** | Enterprise Resource Planning — usually refers to SAP at Hero Steels’ scale |
| **ESG** | Environmental, Social, and Governance — umbrella term for non-financial corporate disclosure |
| **Event** | A fact that happened — the atomic unit of the unified event backbone |
| **Event Envelope** | The standardised metadata wrapper around every event (see §4.3) |
| **FG** | Finished Goods |
| **FORGE** | Internal codename for Zedral’s framework / architecture (legacy) |
| **Gauge** | Thickness of steel strip, in mm |
| **Goods Receipt** | The SAP MM transaction recording receipt of material |
| **GRI** | Global Reporting Initiative — international ESG reporting framework |
| **GWP** | Global Warming Potential — conversion factor between different greenhouse gases and CO₂-equivalent |
| **HMAC** | Hash-based Message Authentication Code — cryptographic signature mechanism used on event envelopes |
| **HR Coil** | Hot-Rolled Coil — the input feedstock to a cold-rolling mill |
| **HSL** | Hero Steels Limited |
| **IDoc** | SAP’s native batch-integration document format (rejected; see §7.1) |
| **ISA-95** | The ANSI/ISA standard for enterprise-control system integration; defines the 5-level Purdue Model |
| **JTBD** | Jobs To Be Done — product management framework for user goals |
| **KPI** | Key Performance Indicator |
| **LDAP / AD** | Lightweight Directory Access Protocol / Microsoft Active Directory |
| **M1–M8** | The 8 workflow-ordered modules of Zedral: Demand, Master Data, Capacity, Scheduler, Material/Quality/Maintenance, Dispatch, OEE, Energy/ESG |
| **Maker-Checker** | A controls pattern where one user initiates a change and a different user approves it |
| **MES** | Manufacturing Execution System — the Level 3 software that links planning to floor execution |
| **MESA** | Manufacturing Enterprise Solutions Association — defined the 11 MESA functions of an MES |
| **MOU** | Memorandum of Understanding — precedes the commercial contract; captures operational commitments |
| **MTBF** | Mean Time Between Failures |
| **MTPA** | Metric Tonnes Per Annum |
| **MTTR** | Mean Time To Repair |
| **NCR** | Non-Conformance Report — quality event where something didn’t meet spec |
| **OData** | Open Data Protocol — SAP’s REST-like integration standard |
| **OEE** | Overall Equipment Effectiveness = Availability × Performance × Quality |
| **OIDC** | OpenID Connect — identity protocol built on OAuth 2.0 |
| **OPC-UA** | OPC Unified Architecture — modern, platform-independent, secure industrial communication protocol |
| **OT** | Operational Technology — the machine-control network (vs. IT) |
| **OTIF** | On-Time In-Full — customer delivery KPI |
| **PAT** | Perform, Achieve, Trade — BEE’s energy efficiency scheme |
| **PLC** | Programmable Logic Controller — machine-level real-time controller |
| **PM** | Preventive Maintenance |
| **PPM** | Parts Per Million — quality defect rate |
| **Projection** | A read-side table that is built by consuming events from the backbone (CQRS terminology) |
| **Purdue Model** | The 5-level hierarchy of industrial automation (0: physical; 1: sensors; 2: control; 3: MES; 4: ERP) |
| **RBAC** | Role-Based Access Control |
| **RCCP** | Rough-Cut Capacity Planning — mid-range capacity view (weeks to months) |
| **Redpanda** | Kafka-API-compatible event streaming platform |
| **RPO / RTO** | Recovery Point Objective / Recovery Time Objective |
| **SAP ECC** | SAP ERP Central Component — the on-premise SAP ERP product before S/4HANA |
| **SAP MM / SD / PP / QM / PM** | SAP modules: Materials Management / Sales & Distribution / Production Planning / Quality Management / Plant Maintenance |
| **SCADA** | Supervisory Control and Data Acquisition — the OT-layer software that monitors and controls process equipment |
| **Scope 1 / 2 / 3** | GHG Protocol emission categories — direct / purchased energy / value-chain |
| **SEC** | Specific Energy Consumption — energy per unit of production (kWh/tonne for steel) |
| **SEBI** | Securities and Exchange Board of India — capital markets regulator; mandates BRSR |
| **Semver** | Semantic Versioning (MAJOR.MINOR.PATCH) |
| **SLO / SLA / SLI** | Service Level Objective / Agreement / Indicator |
| **SMED** | Single-Minute Exchange of Die — the lean methodology for reducing changeover time |
| **SPC** | Statistical Process Control |
| **Tag** | A named data point on a SCADA/PLC system |
| **TDE** | Transparent Data Encryption — database-level encryption at rest |
| **Timescale / TimescaleDB** | Postgres extension for time-series data |
| **TLS** | Transport Layer Security — encryption for network traffic |
| **UUID-v7** | Time-ordered UUID variant; database-friendly sort order |
| **WC** | Work Centre — a schedulable production unit (e.g., CRS-1) |
| **WIP** | Work In Progress — inventory between process stages |
| **WO / SO** | Work Order / Sales Order |

# Part II — Demand-Side Modules

The three modules that govern what the plant *should* do: M1 ingests demand, M3 tests feasibility, M4 optimises the schedule. Output of Part II flows directly into Part III (execution).

# Chapter II.M1 — Demand & Order Management

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

# Chapter II.M3 — Capacity Planning & RCCP

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

# Chapter II.M4 — APS Finite Scheduling Engine

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

# Part III — Execution-Side Modules

The four modules that execute, measure, and close the loop. M5a gates material, M6 runs the floor, M7 computes truth and writes back to SAP, M8-lite instruments energy.

# Chapter III.M5a — Material & Inventory Control

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

# Chapter III.M6 — Dispatch & Execution Control

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
  notes_runtime       TEXT,
  -- v0.2 additions: re-rolling tracking (from Hero Steels sheet RE-ROLLING Y/N column)
  is_rerolling       BOOLEAN DEFAULT FALSE,                    -- TRUE if this item is re-processing a coil
  rerolling_reason   TEXT                                       -- free text reason for re-roll
);

CREATE INDEX idx_di_dispatch_seq
  ON m6_dispatch.dispatch_items (dispatch_id, sequence_in_shift);
CREATE INDEX idx_di_wo
  ON m6_dispatch.dispatch_items (wo_id) WHERE wo_id IS NOT NULL;
CREATE INDEX idx_di_active
  ON m6_dispatch.dispatch_items (actual_status, dispatch_id)
  WHERE actual_status IN ('setup_in_progress', 'production_in_progress', 'stopped');
CREATE INDEX idx_di_rerolling
  ON m6_dispatch.dispatch_items (is_rerolling) WHERE is_rerolling = TRUE;

-- =======================================================
-- PRODUCTION PASSES (v0.2 NEW) — multi-pass cold rolling reality
-- One row per rolling pass under a dispatch item. Cold rolling at
-- 6 HI-MILL is inherently multi-pass (3–6 passes per coil per Hero
-- Steels sheet `PQR/PRD/0908/02`). This table is the first-class
-- model of that reality. For single-pass operations (e.g., skin-pass
-- on CRS-3 temper mill), one row with pass_number=1 and is_final=TRUE.
-- =======================================================
CREATE TABLE m6_dispatch.production_passes (
  pass_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_item_id  UUID NOT NULL REFERENCES m6_dispatch.dispatch_items ON DELETE CASCADE,
  pass_number       INTEGER NOT NULL,                      -- 1, 2, 3... up to 6 typical
  is_final          BOOLEAN DEFAULT FALSE,                 -- TRUE for the last pass; triggers production completion
  -- Thickness (primary capture per pass)
  thickness_in_mm   NUMERIC(6,3),                          -- entering this pass (NULL allowed for pass 1 if using coil input)
  thickness_out_mm  NUMERIC(6,3) NOT NULL,                 -- exiting this pass — the key measurement
  reduction_pct     NUMERIC(5,2) GENERATED ALWAYS AS
    (CASE WHEN thickness_in_mm IS NOT NULL AND thickness_in_mm > 0
     THEN ((thickness_in_mm - thickness_out_mm) / thickness_in_mm * 100)
     ELSE NULL END) STORED,
  -- Process parameters used on this pass (from Hero sheet: tension, coolant)
  rw_tension        NUMERIC(8,2),                          -- kN typical
  coolant_temp_c    NUMERIC(5,2),
  coolant_press_kg_cm2 NUMERIC(5,2),
  -- Timing per pass
  started_at        TIMESTAMPTZ,
  ended_at          TIMESTAMPTZ,
  duration_sec      INTEGER GENERATED ALWAYS AS
    (CASE WHEN started_at IS NOT NULL AND ended_at IS NOT NULL
     THEN EXTRACT(EPOCH FROM (ended_at - started_at))::INTEGER
     ELSE NULL END) STORED,
  -- Operator who completed this pass
  operator_id       TEXT NOT NULL,
  notes             TEXT,
  UNIQUE (dispatch_item_id, pass_number)
);

CREATE INDEX idx_pass_dispatch ON m6_dispatch.production_passes (dispatch_item_id, pass_number);
CREATE INDEX idx_pass_final    ON m6_dispatch.production_passes (dispatch_item_id) WHERE is_final = TRUE;

-- =======================================================
-- ROLL ASSIGNMENTS (v0.2 NEW) — which rolls ran which dispatch item
-- Audit trail linking physical rolls to the coils they processed.
-- =======================================================
CREATE TABLE m6_dispatch.roll_assignments (
  assignment_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_item_id  UUID NOT NULL REFERENCES m6_dispatch.dispatch_items ON DELETE CASCADE,
  roll_top_id       TEXT NOT NULL REFERENCES master.rolls,
  roll_bottom_id    TEXT NOT NULL REFERENCES master.rolls,
  assigned_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  tonnage_rolled_mt NUMERIC(10,3),                          -- populated post-production from dispatch_items.actual_qty_mt
  UNIQUE (dispatch_item_id)
);

CREATE INDEX idx_ra_top    ON m6_dispatch.roll_assignments (roll_top_id);
CREATE INDEX idx_ra_bottom ON m6_dispatch.roll_assignments (roll_bottom_id);

-- =======================================================
-- ROLL CHANGES (v0.2 NEW) — roll change events on the floor
-- From Hero Steels sheet: ROLL IN / ROLL OUT / Rolls in (T,B) / Rolls out
-- =======================================================
CREATE TABLE m6_dispatch.roll_changes (
  change_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wc_id             TEXT NOT NULL REFERENCES master.work_centres,
  occurred_at       TIMESTAMPTZ NOT NULL,
  -- Rolls going OUT (retired to regrind/storage)
  out_roll_top_id   TEXT REFERENCES master.rolls,
  out_roll_bottom_id TEXT REFERENCES master.rolls,
  out_cumulative_since_last_change_mt NUMERIC(10,3),       -- tonnage rolled by outgoing rolls since last change
  out_roll_finish_rating TEXT,                              -- operator's subjective rating of outgoing roll condition
  -- Rolls coming IN (fresh or re-ground)
  in_roll_top_id    TEXT NOT NULL REFERENCES master.rolls,
  in_roll_bottom_id TEXT NOT NULL REFERENCES master.rolls,
  in_roll_finish    TEXT,                                   -- M/B grade from Hero sheet — see OQ-4
  -- Context
  reason            TEXT NOT NULL,                          -- 'scheduled_grind' | 'wear_threshold' | 'breakage'
                                                             --   | 'grade_change' | 'quality_issue'
  operator_id       TEXT NOT NULL,
  crane_operator_id TEXT,                                   -- crane operator involved
  dispatch_item_id  UUID REFERENCES m6_dispatch.dispatch_items,  -- if change was mid-shift for a specific WO
  duration_min      INTEGER,                                 -- actual duration of the roll change
  linked_stoppage_id UUID REFERENCES m6_dispatch.stoppages  -- if roll change was captured as a stoppage event
);

CREATE INDEX idx_rc_wc_time ON m6_dispatch.roll_changes (wc_id, occurred_at DESC);

-- =======================================================
-- SHIFT CREW ASSIGNMENTS (v0.2 NEW) — crew roster per shift per line
-- From Hero Steels sheet: Crew 1 / 2 / 3 / Operator / Crane Operator
-- v0.1 captured only per-event operator_id; v0.2 adds shift-level crew
-- for accountability and handover workflow.
-- =======================================================
CREATE TABLE m6_dispatch.shift_crew_assignments (
  assignment_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wc_id             TEXT NOT NULL REFERENCES master.work_centres,
  shift_date        DATE NOT NULL,
  shift             CHAR(1) NOT NULL,
  -- Roles (from paper sheet)
  line_incharge_id  TEXT NOT NULL,                         -- primary operator; signs shift report
  crew_members      JSONB NOT NULL,                        -- ["op_042", "op_058", "op_061"] — 2-3 typical
  crane_operator_id TEXT,                                   -- shared across lines; may be NULL
  shift_manager_id  TEXT,                                   -- plant-wide; approves shift report
  -- Lifecycle
  confirmed_at      TIMESTAMPTZ,
  confirmed_by      TEXT,                                   -- operator who did badge-in confirmation
  UNIQUE (wc_id, shift_date, shift)
);

CREATE INDEX idx_sca_shift ON m6_dispatch.shift_crew_assignments (wc_id, shift_date, shift);
CREATE INDEX idx_sca_incharge ON m6_dispatch.shift_crew_assignments (line_incharge_id);

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
  reason_category    TEXT NOT NULL REFERENCES master.stoppage_codes(code),  -- v0.2: FK to master catalogue (16 codes for Hero; generic for others)
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
  defect_category    TEXT NOT NULL REFERENCES master.defect_codes(code),  -- v0.2: FK to master catalogue (45 codes for Hero)
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
CREATE INDEX idx_rej_defect      ON m6_dispatch.rejects (defect_category);

-- =======================================================
-- SHIFT HANDOVERS
-- [v0.2 EXTENDED: digital signature + shift manager approval columns]
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
  handover_complete  BOOLEAN DEFAULT FALSE,
  -- v0.2 additions: digital signature workflow (replaces paper Shift Incharge / Shift Manager signatures)
  incharge_signed_at          TIMESTAMPTZ,
  incharge_signature_event_id UUID,                              -- event reference for audit
  manager_approved_at         TIMESTAMPTZ,
  manager_approval_event_id   UUID,
  manager_correction_requested BOOLEAN DEFAULT FALSE,
  correction_reason           TEXT,
  is_immutable                BOOLEAN DEFAULT FALSE              -- TRUE once both signed + approved
);

CREATE INDEX idx_ho_wc_date
  ON m6_dispatch.shift_handovers (wc_id, shift_date DESC);
CREATE INDEX idx_ho_pending_approval
  ON m6_dispatch.shift_handovers (shift_date DESC)
  WHERE incharge_signed_at IS NOT NULL AND manager_approved_at IS NULL;

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

#### floor.rush_order.injected (v1.0)

Supervisor/planner added a job mid-shift. Triggers M4 tail-replan.

#### floor.pass.started (v1.0 — NEW in v0.2)

Published when operator taps “Start Pass N” at the Andon terminal during multi-pass cold rolling.

{
  "event_type": "floor.pass.started",
  "aggregate_id": "item_789_pass_2",
  "payload": {
    "dispatch_item_id": "item_789",
    "wo_id": "wo_8893451",
    "wc_id": "CRS-2",
    "pass_number": 2,
    "operator_id": "op_042",
    "thickness_in_mm": 2.80
  }
}

#### floor.pass.completed (v1.0 — NEW in v0.2)

Published when operator taps “Pass Complete” after recording thickness-out and process variables. Includes is_final flag.

{
  "event_type": "floor.pass.completed",
  "aggregate_id": "item_789_pass_2",
  "payload": {
    "dispatch_item_id": "item_789",
    "wo_id": "wo_8893451",
    "wc_id": "CRS-2",
    "pass_number": 2,
    "is_final": false,
    "thickness_in_mm": 2.80,
    "thickness_out_mm": 2.15,
    "reduction_pct": 23.2,
    "rw_tension": 180.0,
    "coolant_temp_c": 42.0,
    "coolant_press_kg_cm2": 3.2,
    "operator_id": "op_042",
    "duration_sec": 185
  }
}

**Critical behaviour:** When is_final=true, the event processor cascades into the existing floor.production.completed logic.

#### floor.roll.changed (v1.0 — NEW in v0.2)

Published when operator completes a roll change workflow. Triggers updates to master.rolls (positions, tonnage-since-grind reset for outgoing rolls) and m6_dispatch.roll_assignments for subsequent items.

{
  "event_type": "floor.roll.changed",
  "aggregate_id": "wc_CRS-2",
  "payload": {
    "wc_id": "CRS-2",
    "out_roll_top_id": "R-CRS2-TR-047",
    "out_roll_bottom_id": "R-CRS2-BR-023",
    "out_cumulative_since_last_change_mt": 8420.3,
    "in_roll_top_id": "R-CRS2-TR-051",
    "in_roll_bottom_id": "R-CRS2-BR-029",
    "in_roll_finish": "M",
    "reason": "wear_threshold",
    "operator_id": "op_042",
    "crane_operator_id": "op_007",
    "duration_min": 52
  }
}

#### floor.shift.crew_confirmed (v1.0 — NEW in v0.2)

Published when the Line Incharge confirms crew roster at shift start.

{
  "event_type": "floor.shift.crew_confirmed",
  "aggregate_id": "CRS-2_A_2026-04-18",
  "payload": {
    "wc_id": "CRS-2",
    "shift_date": "2026-04-18",
    "shift": "A",
    "line_incharge_id": "op_042",
    "crew_members": ["op_058", "op_061"],
    "crane_operator_id": "op_007",
    "shift_manager_id": "op_101",
    "confirmed_by": "op_042"
  }
}

#### floor.shift_report.signed (v1.0 — NEW in v0.2)

Published when Line Incharge digitally signs the end-of-shift report. HMAC-signed; audit-trail.

{
  "event_type": "floor.shift_report.signed",
  "aggregate_id": "handover_xyz789",
  "payload": {
    "handover_id": "xyz789",
    "wc_id": "CRS-2",
    "shift_date": "2026-04-18",
    "shift": "A",
    "line_incharge_id": "op_042",
    "signed_at": "2026-04-18T13:57:00Z",
    "device_id": "andon_crs2"
  }
}

#### floor.shift_report.approved (v1.0 — NEW in v0.2)

Published when Shift Manager approves a signed shift report. Sets shift_handovers.is_immutable = TRUE. Alternative event floor.shift_report.correction_requested if manager returns for correction.

#### floor.shift.handover_submitted (v1.0)

Triggers M7 shift summary generation, notifies incoming operator.

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

**v0.2 note:** Categories now come from master.stoppage_codes table (not hard-coded). At Hero Steels, this yields 16 tiles grouped visually into 7 rollup buckets. Generic deployments can configure fewer or more.

Tap ⏸ STOPPAGE:

- Immediate state change: line marked stopped, floor.stoppage.started event fires (with placeholder reason_category to be confirmed)

- Full-screen category selector shows all active master.stoppage_codes, grouped visually by bucket field:

- **Equipment Failure** group: 01 Mechanical, 02 Electrical, 11 Power Failure, 14 Hydraulic

- **Tool Change** group: 04 Work Roll Change, 06 B.U. Roll Change

- **Material / Supply** group: 07 Raw Material, 15 Mtl. short due to crane B.D.

- **Utility / Support** group: 03 Crane, 05 H.V./L.V., 08 Services

- **Human** group: 10 Short of Man, 12 Operational

- **Planning** group: 13 No Planning

- **Planned** group: 09 Preventive Maint, 16 Setting Adjustment

- (Bucket groups colour-coded; codes within share a header strip)

- Operator taps a code — confirm + optional free-text detail in reason_detail

- Return to home screen with stoppage indicator active (showing elapsed time + selected code)

- When resolved, operator taps “Resume” — floor.stoppage.ended event fires; if duration > 5 min and free-text was left blank, forced prompt for a reason_detail before resume is accepted

**Why catalogue-driven matters.** v0.1 assumed 7 hard-coded categories. Hero Steels uses 16. Future customers may use different codes. By FK-ing stoppages to master.stoppage_codes, each customer loads their own taxonomy at deployment without code changes.

### 9.4 Floor Console — Production Complete Workflow

**v0.2 note:** This workflow now branches based on the active routing’s is_multi_pass flag (determined by the material’s M2 routing). Single-pass operations retain the v0.1 flow; multi-pass operations use the new pass-capture flow described in §9.4.A.

#### 9.4 (Single-pass variant) — e.g., CRS-3 Temper Rolling, Skin-Pass

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

### 9.4.A Floor Console — Multi-Pass Capture Workflow (v0.2 NEW)

**Applies to:** Primary cold rolling at 6 HI-MILL (CRS-1, CRS-2 at Hero Steels). Activated by the material’s routing is_multi_pass = TRUE flag in M2.

**Core reality:** Cold rolling is inherently multi-pass (3–6 passes per coil). Operators already measure and record thickness after each pass on the paper sheet PQR/PRD/0908/02. The Floor Console digitises what they already do — it does not ask for new data.

**Workflow:**

- Operator taps “Start Production” — records floor.production.started event with expected pass count from routing

- Home screen shifts to “Pass 1 of N” mode showing:

- Input thickness (from coil or previous pass)

- Target thickness (from routing)

- Progress bar: “Pass N of M”

- Operator performs pass (strip runs through mill)

- At end of pass, operator taps “Pass N Complete”:

- Screen prompts for measured thickness-out (pre-populated with previous value, editable)

- SCADA-integrated tension / coolant values auto-populate if available; else manual entry

- Reduction % auto-computed for operator verification

- “Confirm Pass” button

- On confirmation: floor.pass.completed event published; screen returns to “Pass N+1 of M” for next pass

- Repeat steps 3–5 until final pass

- On the intended final pass, operator taps “This is the final pass” checkbox before confirming:

- is_final=true on the pass event

- Event processor cascades into production-complete flow

- Subsequent screen captures total actual qty, scrap, rejects, notes (like single-pass v0.1 flow)

- Home screen refreshes showing next job

**Target time per pass:** < 15 seconds. Total end-to-end for 5-pass coil: ~90 seconds including rolling time between passes.

**Screen mock-up:**

┌─────────────────────────────────────────────────┐
│ CRS-2 · wo_8893451 · IS513-D · Target 0.45 mm   │
│ PASS 2 OF 5 (expected)                           │
├─────────────────────────────────────────────────┤
│                                                  │
│  IN  2.80 mm  →  OUT  [ 2.15 mm ]   ↓ 23.2%    │
│                       ↑ tap to edit              │
│                                                  │
│  Tension: 180 kN    (SCADA / tap to edit)       │
│  Coolant: 42 °C / 3.2 kg/cm²  (SCADA / tap)     │
│                                                  │
│  ☐ This is the final pass                        │
│                                                  │
│  [ CANCEL ]                 [ CONFIRM PASS 2 ]  │
└─────────────────────────────────────────────────┘

**Validation rules:** - thickness_out_mm must be strictly less than thickness_in_mm (else warn: “No reduction recorded — confirm?”) - reduction_pct over 40% warns (typical max is 30–35%; > 40% suggests measurement error) - Final pass thickness_out_mm must be within routing tolerance of target gauge; else warn and require reason

### 9.4.B Floor Console — Roll Change Workflow (v0.2 NEW)

Triggered from home screen “🛠 Roll Change” button. Required role: any crew member; confirmation by Line Incharge.

**Workflow:**

- Current active rolls displayed:

- Top: R-CRS2-TR-047 — cumulative tonnage since last change: 8,420 MT (82% of expected life)

- Bottom: R-CRS2-BR-023 — 8,380 MT (81%)

- Operator scans or searches new top roll ID, new bottom roll ID

- Validation: new roll must be status=active and current_position=storage or grinding

- Reason dropdown:

- Scheduled Grind

- Wear Threshold

- Breakage

- Grade Change

- Quality Issue

- Crane Operator field auto-populated from shift crew, editable

- Duration timer auto-starts from “Start Roll Change” tap

- On completion, operator taps “Roll Change Done”:

- Confirmation modal showing before/after and duration

- Submit → floor.roll.changed event

- Outgoing rolls auto-update: current_position=grinding, tonnage_since_grind_mt=0 reset on next regrind

- Incoming rolls auto-update: current_wc_id=CRS-2, current_position=top/bottom

- Home screen returns with new rolls shown

**Roll Change as a stoppage:** If a roll change is mid-shift (not between jobs), it’s also captured as a stoppage with reason_category='04' (Work Roll Change) or '06' (B.U. Roll Change) — linked via roll_changes.linked_stoppage_id.

### 9.4.C Floor Console — Crew Confirmation at Shift Start (v0.2 NEW)

**Workflow:**

- First Andon interaction each shift (any crew member badges in):

- If no shift_crew_assignments row exists for this (wc, shift_date, shift), Andon shows “Shift Start — Confirm Crew” screen

- Pre-populated from prior shift pattern:

- Line Incharge: previous shift’s incharge or per roster

- Crew members: previous shift’s members (editable)

- Crane Operator: previous shift’s operator (editable)

- Shift Manager: from roster

- Line Incharge confirms (edits if different) and badge-scans to submit

- floor.shift.crew_confirmed event published

- Home screen becomes available; all subsequent events for the shift reference this assignment for accountability rollup

**Design principle:** This is a one-time-per-shift interaction; shouldn’t take > 30 seconds. Skipping is allowed but generates a warning in the Ops Console (Shift Manager sees “CRS-2 Shift A has no crew confirmed”).

### 9.5 Floor Console — Shift Handover (v0.2 EXTENDED with Digital Signature)

Triggered automatically 15 min before shift end (configurable):

- Banner appears: “Shift handover due in 15 min. Prepare handover.”

- Operator taps “Handover” (or from menu):

- Pre-populated summary: jobs completed, current job state, any stoppages

- Editable fields: machine state notes, safety notes, pending items list

- Submit

- On submit: handover published; incoming operator sees prompt on badge-in

- Incoming operator reads, optionally adds comments, signs (accepts) — completes handover cycle

**v0.2 extension — Shift Report Digital Signature (replaces paper Shift Incharge signature):**

- At shift end (or immediately after handover submit), Line Incharge sees the **Paper-Compatible Shift Report** (see M7 §9.7) — a PDF-style rendering matching Hero Steels’ paper sheet layout field-for-field

- Incharge reviews — can add free-text notes but cannot edit events (data is immutable — from the event log)

- Incharge taps “Sign and Submit” — floor.shift_report.signed event published with HMAC signature

- Shift Manager (on their device / Ops Console) receives notification

- Manager reviews, taps “Approve” (→ floor.shift_report.approved) or “Return for Correction” (→ floor.shift_report.correction_requested with reason)

- Approved report becomes **immutable** (is_immutable=TRUE) — regulatory-grade replacement for paper

- PDF stored in MinIO: m7/shift-reports/{yyyy}/{mm}/{dd}/{wc_id}_{shift}.pdf

- Retention: 7 years

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

# Chapter III.M7 — Performance Analytics & OEE

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
  -- v0.2 additions: aggregates from Hero Steels paper sheets
  skinpass_mt        NUMERIC(10,3) DEFAULT 0,                   -- Total S/P (skin-pass) from paper sheet A
  rewind_mt          NUMERIC(10,3) DEFAULT 0,                   -- Total R/W (re-wind) from paper sheet A
  rolling_mt         NUMERIC(10,3) DEFAULT 0,                   -- Rolling (first-pass) from paper sheet B
  rerolling_mt       NUMERIC(10,3) DEFAULT 0,                   -- Re-Rolling from paper sheet B
  hold_mt            NUMERIC(10,3) DEFAULT 0,                   -- Tonnage on quality hold during shift
  oil_consumption_litres NUMERIC(10,2),                          -- From paper sheet "Oil Consumption"
  coolant_temp_avg_c NUMERIC(5,2),                              -- AVG from production_passes
  coolant_press_avg_kg_cm2 NUMERIC(5,2),                        -- AVG from production_passes
  -- Lifecycle
  status             TEXT NOT NULL DEFAULT 'provisional',       -- 'provisional' | 'final' | 'signed' | 'approved'
  finalised_at       TIMESTAMPTZ,
  -- v0.2 additions: signature lifecycle (paper-replacing workflow)
  incharge_signed_at          TIMESTAMPTZ,
  incharge_signature_event_id UUID,
  manager_approved_at         TIMESTAMPTZ,
  manager_approval_event_id   UUID,
  is_immutable                BOOLEAN DEFAULT FALSE,
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

### 9.8.A Screen — Paper-Compatible Shift Report (v0.2 NEW)

**The critical artefact that retires Hero Steels’ paper sheet**** ****PQR/PRD/0908/02****.**

Target persona: Line Incharge (for signing) and Shift Manager (for approval). Also viewed by Plant Head.

**Design principle — non-negotiable.** The digital report must be **field-for-field compatible** with Hero Steels’ paper sheet. Same column order, same groupings, same labels (including Indian engineering shorthand like “B.T. ECV” and “R/W Tension”). No “improved layout”, no reflow, no missing fields. The Line Incharge must be able to glance at the digital version and say “yes, this is what I would have filled out.” Without this equivalence, operators will keep writing paper “just to be safe” and the digital transition fails.

**Two variants generated based on line type:**

| Report ID | Source sheet | Generated for |
| --- | --- | --- |
| SHIFT_REPORT_6HI_PRIMARY | PQR/PRD/0908/02 (Sheet B — multi-pass primary cold rolling) | CRS-1, CRS-2 at Hero Steels |
| SHIFT_REPORT_6HI_TEMPER | PQR/PRD/0908/02/A (Sheet A — skin-pass / temper rolling) | CRS-3 at Hero Steels |

**Field sourcing map (for**** ****SHIFT_REPORT_6HI_PRIMARY****):**

| Section | Paper field | Zedral source |
| --- | --- | --- |
| Header | Date, Shift (A/B/C) | shift_summaries.shift_date, .shift |
| Header | Target (MT) | shift_summaries.target_mt |
| Main grid | S.No. | Sequential row number |
| Main grid | Customer | sales_orders.customer_name via WO→SO |
| Main grid | Coil No. | dispatch_items.coils_consumed[0].coil_id |
| Main grid | Grade | materials.grade_name |
| Main grid | Width, Thickness (input), Weight | coils.width_mm, .gauge_mm, .weight_initial_mt |
| Main grid | Actual Thickness Passes 1–6 + Final | production_passes.thickness_out_mm indexed by pass_number |
| Main grid | Total Passes | COUNT(production_passes) per dispatch item |
| Main grid | R/W Tension | production_passes.rw_tension (max or last value) |
| Main grid | Time Taken From/To/Total | dispatch_items.actual_prod_start/_end + computed |
| Main grid | Roll Finish M/B | roll_assignments → rolls.roll_finish |
| Main grid | Re-Rolling (Y/N) | dispatch_items.is_rerolling |
| Main grid | Remarks | dispatch_items.notes_runtime |
| Summary | Total Prod. (MT) | shift_summaries.production_mt |
| Summary | Rolling / Re-Rolling | shift_summaries.rolling_mt, .rerolling_mt |
| Summary | Scrap (KG), Rejection (KG) | shift_summaries.scrap_mt × 1000, SUM(rejects.affected_qty_mt) × 1000 |
| Summary | Hold (MT) | shift_summaries.hold_mt |
| Summary | Rolls in/out | Latest roll_changes.in_roll_*_id / out_roll_*_id |
| Summary | Coolant Temp / Press | shift_summaries.coolant_temp_avg_c, .coolant_press_avg_kg_cm2 |
| Stoppage | Per-row code/reason/duration | stoppages.reason_category → master.stoppage_codes.display_name, .reason_detail, .duration_min |
| Stoppage | Code legend (01–16) | Static — from master.stoppage_codes WHERE is_active |
| Crew | Crew 1, 2, 3, Operator, Crane Operator | shift_crew_assignments.line_incharge_id, .crew_members[*], .crane_operator_id (all → operator names) |
| Signatures | Line Incharge sign + name + timestamp | shift_summaries.incharge_signed_at + operator |
| Signatures | Shift Manager sign + name + timestamp | shift_summaries.manager_approved_at + operator |

**Generation and delivery:**

- **Trigger:** Shift end + 10 minutes (allow late events to settle)

- **Rendering:** ReportLab or LaTeX template matching the Hero sheet visual layout 1:1

- **Storage:** MinIO at m7/shift-reports/{yyyy}/{mm}/{dd}/{wc_id}_{shift}.pdf

- **Retention:** 7 years (regulatory)

- **Delivery:** Notification to Line Incharge for signing; Shift Manager gets approval notification after signing

**Signature workflow:**

- Line Incharge opens the report in Ops Console (or tablet view at shift end)

- Reviews — can add free-text narrative notes but cannot edit data (data is immutable, from event log)

- Taps “Sign and Submit” — floor.shift_report.signed event fires; HMAC-signed; shift_summaries.incharge_signed_at populated

- Shift Manager receives notification (SMTP + in-app)

- Manager opens report, reviews, decides:

- **Approve:** floor.shift_report.approved fires; manager_approved_at set; is_immutable = TRUE

- **Return for correction:** floor.shift_report.correction_requested fires with reason; report unlocks for Incharge edit; cycle repeats

- Once approved, the report is the **regulatory-grade replacement for paper**.

**Transition plan (Weeks 1–5 of pilot go-live):** - **Weeks 1–2:** Parallel run — operators fill paper AND use Andon; end-of-shift digital report compared to paper; discrepancies investigated - **Weeks 3–4:** Paper becomes exception-only (Andon down); digital is primary record; Shift Manager approves digital - **Week 5+:** Digital-only; paper retained as backup templates only

**Why this screen exists.** Without it, paper-to-digital transition fails — operators will keep writing paper as a safety net. The paper-compatible report is the bridge that makes paper optional. It is the highest-leverage M7 UI deliverable for Hero Steels pilot success.

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

# Chapter III.M8-lite — Energy Aggregation

## 1. Scope & Non-Goals — and Why M8 Is Split into Lite + Full

### 1.1 Why the Split

The unified-data-layer thesis (Principle #2 of the platform’s GTM) commits Zedral to making energy and ESG **first-class citizens, not afterthoughts**. Yet at Hero Steels in pilot, three realities make a full M8 implementation unrealistic in Phase 1:

- **Sub-metering hardware doesn’t exist.** Today, Hero Steels has one DISCOM (PSPCL) bill at the site level. To compute per-line SEC, we need three smart meters at the CRS-1/2/3 incomers — installation is a 4–6 week capital project that runs in parallel with the platform build.

- **BRSR/PAT/ISO 50001 reports require 3+ months of clean data baseline.** Even if we built the report generators on Day 1, they would produce numbers from a 2-week dataset that would be embarrassingly bad. Reports need history.

- **The DMZ egress workflow has its own engineering complexity** (signed bundles, regulator portal upload, sustainability manager preview UI) — building it in Phase 1 alongside everything else is overcommitment.

The pragmatic split:

**M8-lite (Phase 1, this document)** — establishes the energy data plane and produces visible value from Day 1:

- Smart meter ingestion via MQTT/Modbus (3 meters at Hero Steels, one per CRS line)

- Site-level energy aggregation (kWh/day, demand profile)

- Per-line kWh/tonne (SEC) computation when production attribution is available

- Live energy dashboard for the Energy Manager

- Scope 2 emissions calculation against CEA grid factor

- DISCOM bill ingestion (manual upload + structured storage) for billing reconciliation

- Foundation for M8-full

**M8-full (Phase 2) — built once 3 months of M8-lite data exists.**

- Full BRSR Essential Indicators report generator

- PAT cycle reporting format

- ISO 50001 EnPI tracking

- Peak demand management with DISCOM tariff intelligence

- Power factor monitoring and reactive power management

- Multi-fuel Scope 1 (LPG annealing, HSD generators)

- Water + waste tracking

- DMZ egress with sustainability manager preview UI

- Carbon Credit Trading Scheme (CCTS) data preparation

This M8-lite document explicitly scopes only Phase 1.

### 1.2 What M8-lite Is

M8-lite owns four responsibilities:

- **Meter ingestion** — pull / receive electricity readings from 3 smart meters via Modbus-TCP (and MQTT-native devices in the future), at 15-minute intervals, with edge-buffered offline tolerance

- **Time-series storage** — persist meter readings in TimescaleDB hypertables; serve them efficiently to dashboards

- **SEC computation** — given M7’s per-line production tonnage and M8-lite’s per-line kWh, compute and trend Specific Energy Consumption per CRS line per shift / day / week

- **Live dashboard** — the Energy Manager’s morning view: site total, per-line trend, SEC, basic emissions

### 1.3 What M8-lite Is Not (v1)

- **Not full ESG reporting.** No BRSR, GRI, PAT, or ISO 50001 report generator in v1. Building the data plane now; building reports in Phase 2 with real history.

- **Not Scope 1 fuel tracking.** LPG (annealing furnace), HSD (DG sets) — Phase 2.

- **Not water or waste.** Phase 3.

- **Not power factor / reactive power management.** Captured in raw readings if meters expose them; not actively managed in v1.

- **Not peak demand alerting.** Captured but no automated load shedding; planner-visible only.

- **Not multi-tariff cost modelling.** TOD (Time-of-Day) tariff awareness is Phase 2.

- **Not the DMZ egress workflow for ESG report submission.** Phase 2 with M8-full.

- **Not energy-aware scheduling.** M4 in v1 doesn’t optimise for off-peak windows. Phase 2 enhancement.

### 1.4 Edge Cases In Scope

- **Meter offline / readings missed** — interpolation rules and explicit gap markers; meter health dashboard

- **Meter rollover** (cumulative kWh counter wraps at meter hardware limit) — detection and adjustment

- **Negative readings or impossible values** (sensor fault) — quarantine and alert

- **Missing production attribution** (M7 hasn’t published yet for the latest hour) — site-level total still accurate; SEC marked provisional

- **DST and timezone changes** — readings recorded in UTC, displayed in plant local time (IST)

- **Tariff metering vs. M****&****E metering** — Hero Steels’ DISCOM bill measures at one boundary; CRS line meters at another. Reconciliation tracks the delta as transformer/distribution loss

- **Meter replacement** — new meter at same physical point; tracking continuity preserved via meter-to-asset mapping

### 1.5 Edge Cases Deferred to M8-full

- Sub-shift granularity readings (1-min, 5-min) — meters support but ingest cadence kept at 15-min in v1

- Demand-side management (load curtailment recommendations during MD breach risk)

- Multi-meter aggregation at the site level beyond simple sum

- Renewable energy attribution (solar PV connected to plant grid)

- Real-time imbalance / grid-side anomaly detection

## 2. Personas & Jobs To Be Done

### 2.1 Primary Persona — The Energy Manager / Sustainability Champion

**Who they are.** At Hero Steels (and most mid-market Indian manufacturers), the Energy Manager role is often combined with the Plant Engineering or Maintenance Manager role. Their core scope: minimise the electricity bill while not constraining production. ESG ownership is increasingly added to this role due to BRSR cascading from listed customers.

**Daily reality.** Today’s tooling: monthly DISCOM bill, Excel sheets summarising consumption, occasional spot reads from a portable analyser. The Energy Manager spends roughly 40% of their time on energy and 60% on plant engineering. The Energy Manager’s wishlist if you sit them down for 30 minutes: “I want to see today’s consumption versus yesterday at any moment, broken down per line, with a clear ₹ value attached.”

### 2.2 JTBDs for the Energy Manager

**JTBD-1: Live energy view.**

*“**At any moment I need to see: site total kWh today vs. same-time yesterday, per-line current load (kW), and current demand vs. our contracted MD.**”*

**JTBD-2: SEC trend.**

*“**For each CRS line, kWh/tonne over the last 30/90 days. Going up = something is wrong (operating issue, grade mix change, equipment degradation). Going down = SMED / scheduling improvements working.**”*

**JTBD-3: DISCOM bill reconciliation.**

*“**When the monthly PSPCL bill arrives, I need to compare the billed kWh to my Zedral total kWh. Discrepancy **>** 2% means either a meter problem or a billing error — both worth chasing.**”*

**JTBD-4: Scope 2 emissions number.**

*“**Quarterly, I need a single number — tCO₂e from grid electricity — to feed our internal sustainability tracker, with the calculation method visible enough to defend in audit.**”*

**JTBD-5: Energy review with CFO.**

*“**Quarterly, ₹/MT trend by line. The CFO knows the absolute energy cost; they want the per-tonne intensity number to know if we’re getting more or less efficient.**”*

### 2.3 Secondary Personas

**Production Planner.** Reads SEC alongside production KPIs in M7 dashboards.

**Plant Head.** Sees energy KPIs in the Daily Plant Dashboard rolled up by M7 (which sources from M8).

**CFO.** Quarterly review of energy cost + SEC trend. Surface in the M7 CFO Pack.

**Sustainability Officer at the customer / corporate parent.** Phase 2 — when BRSR reports auto-generate and need filing.

## 3. Data Model

M8-lite’s data lives in m8_energy schema. The dominant entity is meter_readings — a time-series table that needs Timescale partitioning from day one.

### 3.1 Core Tables

-- =======================================================
-- METERS — physical meter inventory and configuration
-- =======================================================
CREATE TABLE m8_energy.meters (
  meter_id           TEXT PRIMARY KEY,                          -- e.g., 'meter_crs1_incomer'
  display_name       TEXT NOT NULL,
  installed_at       DATE NOT NULL,
  -- Physical attachment
  attachment_type    TEXT NOT NULL,                             -- 'site_main' | 'line_incomer' | 'feeder' | 'machine'
  attached_to_wc_id  TEXT REFERENCES master.work_centres,        -- NULL for site-main meters
  attached_to_label  TEXT,                                       -- e.g., 'PSPCL HT incomer', 'CRS-2 LT panel'
  -- Hardware
  manufacturer       TEXT NOT NULL,                              -- 'Schneider', 'Secure', 'Elster'
  model              TEXT NOT NULL,
  serial_no          TEXT,
  ct_ratio           TEXT,                                       -- e.g., '300:5'
  pt_ratio           TEXT,
  -- Communication
  protocol           TEXT NOT NULL,                              -- 'modbus_tcp' | 'mqtt' | 'modbus_rtu'
  ip_address         TEXT,
  port               INTEGER,
  unit_id            INTEGER,                                    -- Modbus slave ID
  poll_interval_sec  INTEGER NOT NULL DEFAULT 900,               -- 15 min default
  -- Calibration / scaling
  energy_register    INTEGER,                                    -- Modbus register for cumulative kWh
  power_register     INTEGER,                                    -- For instantaneous kW
  multiplier         NUMERIC(10,6) DEFAULT 1.0,                  -- Scale factor for raw value
  -- Lifecycle
  is_active          BOOLEAN DEFAULT TRUE,
  decommissioned_at  TIMESTAMPTZ,
  replacement_for    TEXT REFERENCES m8_energy.meters,
  -- Audit
  created_at         TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_meters_active ON m8_energy.meters (is_active);
CREATE INDEX idx_meters_wc     ON m8_energy.meters (attached_to_wc_id) WHERE is_active;

-- =======================================================
-- METER READINGS — Timescale hypertable, the high-volume table
-- =======================================================
CREATE TABLE m8_energy.meter_readings (
  reading_id         BIGSERIAL,
  meter_id           TEXT NOT NULL REFERENCES m8_energy.meters,
  recorded_at        TIMESTAMPTZ NOT NULL,                      -- the moment the reading represents
  ingested_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Cumulative counters
  kwh_active_cum     NUMERIC(14,3),                             -- cumulative active energy (kWh)
  kvarh_cum          NUMERIC(14,3),                             -- cumulative reactive energy
  -- Instantaneous values
  kw_active          NUMERIC(10,3),                             -- current active power
  kva                NUMERIC(10,3),                             -- apparent power
  kvar               NUMERIC(10,3),                             -- reactive power
  power_factor       NUMERIC(4,3),
  voltage_avg_v      NUMERIC(8,2),
  current_avg_a      NUMERIC(8,2),
  frequency_hz       NUMERIC(5,2),
  -- Quality flags
  is_interpolated    BOOLEAN DEFAULT FALSE,
  is_quarantined     BOOLEAN DEFAULT FALSE,
  quarantine_reason  TEXT,
  -- Source
  edge_device_id     TEXT,
  raw_payload        JSONB,                                     -- full raw payload for debugging
  PRIMARY KEY (reading_id, recorded_at)
);

-- Make it a Timescale hypertable
SELECT create_hypertable('m8_energy.meter_readings', 'recorded_at',
                         chunk_time_interval => INTERVAL '7 days');

CREATE INDEX idx_mr_meter_time
  ON m8_energy.meter_readings (meter_id, recorded_at DESC);
CREATE INDEX idx_mr_quarantined
  ON m8_energy.meter_readings (recorded_at DESC)
  WHERE is_quarantined = TRUE;

-- =======================================================
-- INTERVAL ENERGY — derived from cumulative readings
-- For each (meter, 15-min interval), the energy consumed
-- =======================================================
CREATE TABLE m8_energy.interval_energy (
  meter_id           TEXT NOT NULL REFERENCES m8_energy.meters,
  interval_start     TIMESTAMPTZ NOT NULL,
  interval_end       TIMESTAMPTZ NOT NULL,
  kwh_consumed       NUMERIC(10,3) NOT NULL,                    -- delta in cumulative
  avg_kw             NUMERIC(10,3),
  max_kw             NUMERIC(10,3),
  avg_pf             NUMERIC(4,3),
  is_complete        BOOLEAN DEFAULT TRUE,                       -- false if data is interpolated
  computed_at        TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (meter_id, interval_start)
);

SELECT create_hypertable('m8_energy.interval_energy', 'interval_start',
                         chunk_time_interval => INTERVAL '7 days');

CREATE INDEX idx_ie_meter_time
  ON m8_energy.interval_energy (meter_id, interval_start DESC);

-- =======================================================
-- SEC SNAPSHOTS — Specific Energy Consumption per (wc × bucket)
-- =======================================================
CREATE TABLE m8_energy.sec_snapshots (
  snapshot_id        BIGSERIAL,
  wc_id              TEXT NOT NULL REFERENCES master.work_centres,
  bucket_granularity TEXT NOT NULL,                              -- 'shift' | 'day' | 'week' | 'month'
  bucket_start       TIMESTAMPTZ NOT NULL,
  bucket_end         TIMESTAMPTZ NOT NULL,
  kwh_consumed       NUMERIC(12,3) NOT NULL,
  qty_produced_mt    NUMERIC(10,3) NOT NULL,
  sec_kwh_per_mt     NUMERIC(8,3),                               -- NULL if qty = 0
  scope2_kgco2e      NUMERIC(10,3),                              -- using CEA factor
  emission_factor_id TEXT REFERENCES master.emission_factors,
  is_provisional     BOOLEAN DEFAULT FALSE,
  computed_at        TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (snapshot_id, bucket_start)
);

SELECT create_hypertable('m8_energy.sec_snapshots', 'bucket_start',
                         chunk_time_interval => INTERVAL '30 days');

CREATE INDEX idx_sec_wc_bucket
  ON m8_energy.sec_snapshots (wc_id, bucket_granularity, bucket_start DESC);

-- =======================================================
-- DISCOM BILLS — manual upload, structured storage
-- =======================================================
CREATE TABLE m8_energy.discom_bills (
  bill_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  utility            TEXT NOT NULL DEFAULT 'PSPCL',
  bill_period_start  DATE NOT NULL,
  bill_period_end    DATE NOT NULL,
  bill_date          DATE NOT NULL,
  -- Charges
  total_kwh          NUMERIC(12,3) NOT NULL,
  energy_charge_inr  NUMERIC(12,2),
  demand_kva_max     NUMERIC(8,2),
  demand_charge_inr  NUMERIC(12,2),
  fixed_charge_inr   NUMERIC(12,2),
  fuel_surcharge_inr NUMERIC(12,2),
  electricity_duty_inr NUMERIC(12,2),
  total_amount_inr   NUMERIC(14,2) NOT NULL,
  -- Tariff
  tariff_category    TEXT,                                       -- 'HT-2', 'LT-3' etc.
  contracted_demand_kva NUMERIC(8,2),
  -- Reconciliation
  zedral_total_kwh   NUMERIC(12,3),                              -- computed from meter_readings for the period
  variance_pct       NUMERIC(5,2) GENERATED ALWAYS AS
    (CASE WHEN zedral_total_kwh > 0
     THEN ABS(total_kwh - zedral_total_kwh) / zedral_total_kwh * 100
     ELSE NULL END) STORED,
  reconciliation_note TEXT,
  -- Document
  bill_document_ref  TEXT,                                       -- MinIO path to PDF
  uploaded_by        TEXT NOT NULL,
  uploaded_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_bills_period ON m8_energy.discom_bills (bill_period_end DESC);

-- =======================================================
-- METER HEALTH STATUS — derived; updated by health worker
-- =======================================================
CREATE TABLE m8_energy.meter_health (
  meter_id           TEXT PRIMARY KEY REFERENCES m8_energy.meters,
  last_reading_at    TIMESTAMPTZ,
  last_reading_age_min INTEGER,
  reading_count_24h  INTEGER,
  expected_count_24h INTEGER NOT NULL,                           -- e.g., 96 for 15-min poll
  completeness_pct_24h NUMERIC(5,2),
  status             TEXT NOT NULL,                              -- 'healthy' | 'degraded' | 'offline'
  last_status_change TIMESTAMPTZ,
  notes              TEXT
);

-- =======================================================
-- EMISSIONS SUMMARY — denormalised rollups
-- =======================================================
CREATE TABLE m8_energy.emissions_summary (
  period_granularity TEXT NOT NULL,                              -- 'day' | 'week' | 'month' | 'quarter' | 'year'
  period_start       DATE NOT NULL,
  period_end         DATE NOT NULL,
  scope              CHAR(1) NOT NULL,                           -- '2' (Scope 1 placeholder for Phase 2)
  total_kwh          NUMERIC(14,3) NOT NULL,
  emission_factor_kg_per_kwh NUMERIC(8,5) NOT NULL,
  total_kgco2e       NUMERIC(12,3) NOT NULL,
  factor_citation    TEXT,
  computed_at        TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (period_granularity, period_start, scope)
);

-- =======================================================
-- Configuration
-- =======================================================
CREATE TABLE m8_energy.config (
  config_key         TEXT PRIMARY KEY,
  config_value       JSONB NOT NULL,
  updated_by         TEXT,
  updated_at         TIMESTAMPTZ DEFAULT now()
);

-- Seeded:
-- ('site_id', '"hsl_ludhiana"')
-- ('plant_local_tz', '"Asia/Kolkata"')
-- ('default_emission_factor_id', '"cea_grid_FY26"')
-- ('contracted_md_kva', '1500')
-- ('md_breach_threshold_pct', '95')
-- ('reading_completeness_warn_pct', '90')
-- ('bill_reconciliation_tolerance_pct', '2')
-- ('discom_tariff_rate_inr_per_kwh', '8.5')   -- rough; actual from bill

### 3.2 Design Notes

**Why**** ****meter_readings**** ****is a Timescale hypertable from day one.** At Hero Steels: 3 meters × 96 readings/day × 365 days × 5 years = ~525K rows. Modest, but the access pattern is overwhelmingly time-range queries. Hypertable partitioning is “free correctness” — it doesn’t hurt at small scale and pays off compoundly as we add meters in Phase 2 (sub-metering brings 10–30 meters per plant).

**Why store both**** ****kwh_active_cum**** ****(cumulative) and**** ****interval_energy**** ****(delta).** Meters report cumulative — the running total since installation. To compute “how much energy was consumed in this 15-min window”, we subtract consecutive cumulative readings. Pre-computing this delta into interval_energy saves dashboard latency (otherwise every chart query does LAG(kwh_active_cum) OVER (PARTITION BY meter_id ORDER BY recorded_at) which Timescale handles but isn’t free).

**Why**** ****is_provisional**** ****on SEC snapshots.** Production attribution from M7 isn’t synchronous — there’s a lag between floor.production.completed and the M7 KPI snapshot being final. SEC for the latest hour may be marked provisional. The flag prevents customers from quoting a number that hasn’t fully settled.

**Why**** ****discom_bills**** ****includes**** ****variance_pct**** ****as a generated column.** Reconciliation is the Energy Manager’s most-important workflow (JTBD-3). Surfacing the variance directly in the bill row makes the discrepancy column-sortable and queryable — a 3% variance row jumps to the top of any descending sort.

**Why**** ****meters**** ****table separates**** ****attachment_type**** ****from**** ****attached_to_wc_id****.** Site-main meters (the PSPCL incomer) don’t attach to a work centre. Phase 2 sub-meters might attach to a feeder or even a specific machine. The discriminator + nullable FK accommodates all of these without separate tables.

### 3.3 Retention

- **meter_readings** — 1 year hot at 15-min raw, then Timescale compression saves ~85% disk; 5 years total retention; 15-min granularity preserved indefinitely via compression

- **interval_energy** — same as readings; downsampled to hourly for warm tier

- **sec_snapshots** — 2 years at shift/day, permanent at week/month via continuous aggregates

- **discom_bills** — 7 years (regulatory + finance reconciliation)

- **emissions_summary** — permanent (audit-grade record for ESG purposes)

- **meter_health** — current state only; history reconstructable from readings

## 4. Event Schemas

### 4.1 Events M8-lite Publishes

#### energy.meter.reading (v1.0)

Published for every meter reading received. High-volume topic.

{
  "event_type": "energy.meter.reading",
  "aggregate_id": "meter_crs2_incomer",
  "payload": {
    "meter_id": "meter_crs2_incomer",
    "recorded_at": "2026-04-18T14:00:00Z",
    "kwh_active_cum": 1283492.55,
    "kw_active": 412.3,
    "power_factor": 0.94,
    "voltage_avg_v": 415.2,
    "is_interpolated": false
  }
}

#### energy.interval.computed (v1.0)

Published per (meter, interval) when delta is computed.

{
  "event_type": "energy.interval.computed",
  "aggregate_id": "meter_crs2_incomer",
  "payload": {
    "meter_id": "meter_crs2_incomer",
    "interval_start": "2026-04-18T13:45:00Z",
    "interval_end": "2026-04-18T14:00:00Z",
    "kwh_consumed": 103.2,
    "avg_kw": 412.8
  }
}

#### energy.sec.computed (v1.0)

Published when a new SEC snapshot is finalised.

{
  "event_type": "energy.sec.computed",
  "aggregate_id": "CRS-2_shift_A_2026-04-18",
  "payload": {
    "wc_id": "CRS-2",
    "bucket_granularity": "shift",
    "bucket_start": "2026-04-18T06:00:00Z",
    "kwh_consumed": 4820,
    "qty_produced_mt": 38.2,
    "sec_kwh_per_mt": 126.18,
    "scope2_kgco2e": 3935.5,
    "is_provisional": false
  }
}

#### energy.meter.health_changed (v1.0)

Published when a meter transitions between healthy/degraded/offline.

{
  "event_type": "energy.meter.health_changed",
  "aggregate_id": "meter_crs2_incomer",
  "payload": {
    "meter_id": "meter_crs2_incomer",
    "from_status": "healthy",
    "to_status": "offline",
    "last_reading_at": "2026-04-18T11:30:00Z",
    "minutes_since_last_reading": 145
  }
}

#### energy.peak_demand.exceeded (v1.0)

Published when site demand crosses 95% (configurable) of contracted MD. Used for Energy Manager alerts; not for automatic load shedding in v1.

#### energy.discom_bill.uploaded (v1.0)

Published when the Energy Manager uploads a new bill. Triggers reconciliation computation.

#### energy.discom_bill.reconciled (v1.0)

Published when reconciliation completes; carries variance.

### 4.2 Events M8-lite Consumes

| Event | From | M8-lite Behaviour |
| --- | --- | --- |
| performance.kpi_snapshot.computed | M7 | If snapshot is shift/day granularity: trigger SEC snapshot computation for matching bucket |
| production.wo.confirmed | M7 | Used for production attribution to time windows when meters are attached to specific lines |
| master.emission_factors.updated | M2 | Recompute Scope 2 emissions for affected periods if factor changed |
| master.work_centres.updated | M2 | Refresh meter-to-wc mapping cache |

### 4.3 Event Volume

- Meter readings: 3 meters × 96/day = ~288 events/day

- Interval computed: same cadence = ~288 events/day

- SEC snapshots: 3 lines × 4 granularities × ~96 recomputes/day = ~1,150 events/day (but ~95% deduplicated by content hash before publish)

- Health change: rare, ~1–5 per week

- Peak demand: 0–10 per month depending on operations

Total: ~1,500 M8-lite events/day. Routine.

## 5. Ingestion Flow

The energy data plane has its own ingest path, distinct from operator events.

### 5.1 Smart Meter Ingestion via Edge Gateway

**Architecture flow.**

Smart Meter (Modbus-TCP, port 502)
       │
       │  ┌──────────────────────────────────────┐
       │  │  Edge Gateway (Phase 0 §6.2)          │
       │  │                                      │
       └─▶│  edge-modbus-scanner                 │
          │   - polls register every 15 min      │
          │   - buffers locally if Core down     │
          │                                      │
          │  edge-event-publisher                │
          │   - wraps in event envelope           │
          │   - signs with HMAC                   │
          │   - publishes to Redpanda             │
          └──────────────────┬───────────────────┘
                             │
                             ▼
                    Redpanda topic
                    'energy.meter.reading'
                             │
                             ▼
                    M8 Energy Ingest Worker
                    (in Core, FastAPI)
                       │
                       ├──▶ Validate, dedupe, persist
                       │       (meter_readings)
                       │
                       └──▶ Compute interval delta,
                            persist (interval_energy),
                            publish 'energy.interval.computed'

### 5.2 Modbus Polling Detail

For each meter, the Edge Gateway holds polling configuration loaded from M2’s tag mappings:

meter_id: meter_crs2_incomer
protocol: modbus_tcp
ip_address: 10.30.50.12
port: 502
unit_id: 1
poll_interval_sec: 900
registers:
  - address: 3204            # Schneider PM5350 active energy register
    type: float32_be
    scale: 0.001
    target_field: kwh_active_cum
  - address: 3054
    type: float32_be
    target_field: kw_active
  - address: 3192
    type: float32_be
    target_field: power_factor
  # ...

**On each poll:**

- Open Modbus connection (or reuse pooled)

- Read all configured registers in a single batch

- Parse per type/scale

- Construct event envelope, sign with device HMAC

- Publish to Redpanda

- On failure: retry 3 times with backoff; if persistent, mark meter as offline in local health state and continue with next meter

**Connection handling.** Modbus TCP connections are pooled per meter. Connection establishment can take 200–800ms; reusing connections keeps polling latency low.

### 5.3 MQTT Path (For Future Native IoT Devices)

When a device natively publishes via MQTT (not Modbus), the Edge Gateway’s local Mosquitto broker subscribes:

mqtt_topic: zedral/energy/meter/+/reading
qos: 1
parser: mqtt_meter_reading_v1
target_field_map: { ... }

Same envelope wrapping → same Redpanda topic. Edge code is uniform regardless of input protocol.

### 5.4 Site-Level Bill Ingestion (Manual Upload)

The Energy Manager uploads PSPCL bills via the Ops Console:

- Upload PDF

- Extract structured fields via simple regex/template (PSPCL bill format is fixed) — fall back to manual entry form if extraction fails

- Create discom_bills row

- Publish energy.discom_bill.uploaded

- Trigger reconciliation

PDFs stored in MinIO under m8/discom-bills/{year}/{month}/{bill_id}.pdf.

### 5.5 Input Freshness and Health

Per-meter:

- Expected reading every 15 min (96/day)

- Health classifier:

- **Healthy**: ≥ 95% completeness in last 24 h, last reading < 30 min old

- **Degraded**: 80–95% completeness OR last reading 30–120 min old

- **Offline**: < 80% completeness OR last reading > 120 min old

Health worker runs every 5 min; transitions trigger energy.meter.health_changed.

### 5.6 Gap-Filling and Interpolation

When a meter misses readings (network blip, brief outage):

- **Gap ****<**** 30 min** (1–2 missed readings): linear interpolation of cumulative kWh between bracketing reads; mark is_interpolated=TRUE

- **Gap 30 min – 4 h**: do NOT interpolate cumulative (could mask a real meter issue); leave as gap; show in UI with explicit “data gap” indicator

- **Gap ****>**** 4 h**: meter marked offline; manual reconciliation required when recovered

The interpolation policy is conservative — better to show a gap than to fabricate consumption data.

### 5.7 Initial Pilot Bootstrap

Before meters are installed (weeks 1–4), M8-lite can still bootstrap usefully:

- DISCOM bills can be uploaded retrospectively

- Site-level monthly kWh known

- SEC at site/monthly level can be computed against M7 production tonnage

- Per-line SEC = NULL until meters live

This means the Energy Manager has *some* visibility from Day 1, with full visibility coming when meters are commissioned (week 4–6).

## 6. Processing Logic

Three computational pipelines:

- **Reading → Interval delta** (continuous)

- **Interval → SEC** (event-triggered + scheduled)

- **SEC → Emissions** (per snapshot)

### 6.1 Reading-to-Interval Delta

def compute_interval_delta(meter_id, latest_reading):
    # Find the prior reading
    prior = m8_repo.get_reading_before(meter_id, latest_reading.recorded_at)
    if not prior:
        return  # bootstrap; no delta for the first reading

    # Compute delta in cumulative
    delta_kwh = latest_reading.kwh_active_cum - prior.kwh_active_cum

    # Sanity checks
    if delta_kwh < 0:
        # Possible meter rollover or replacement
        if delta_kwh < -100000:  # likely rollover at counter limit
            handle_meter_rollover(meter_id, prior, latest_reading)
            return
        else:
            quarantine_reading(latest_reading, "negative_delta_unlikely_rollover")
            return

    # Sanity check on max possible
    interval_min = (latest_reading.recorded_at - prior.recorded_at).total_seconds() / 60
    meter_capacity_kw = get_meter_capacity_kw(meter_id)
    max_possible_kwh = (meter_capacity_kw * interval_min) / 60
    if delta_kwh > max_possible_kwh * 1.1:  # 10% tolerance
        quarantine_reading(latest_reading, "delta_exceeds_capacity")
        return

    # Persist interval
    interval_record = IntervalEnergy(
        meter_id=meter_id,
        interval_start=prior.recorded_at,
        interval_end=latest_reading.recorded_at,
        kwh_consumed=delta_kwh,
        avg_kw=delta_kwh / (interval_min / 60),
        is_complete=not latest_reading.is_interpolated
    )
    persist(interval_record)
    publish('energy.interval.computed', interval_record)

    # If meter is line-attached, queue SEC recompute for affected buckets
    if get_meter_attachment(meter_id).attached_to_wc_id:
        queue_sec_recompute(get_meter_attachment(meter_id).attached_to_wc_id,
                            latest_reading.recorded_at)

**Meter rollover handling.** When the counter wraps (e.g., at 99999999.99), the next reading appears smaller than the prior. Detection threshold (< -100000) catches this. Adjustment: add meter_max_value + 1 to the latest reading’s effective cumulative for delta purposes; subsequent readings continue normally. Audit-logged.

### 6.2 SEC Computation

def compute_sec_snapshot(wc_id, bucket_granularity, bucket_start, bucket_end):
    # Sum energy consumed by meters attached to this wc in the bucket
    line_meters = m8_repo.get_meters_attached_to(wc_id)
    if not line_meters:
        return  # no per-line SEC possible
    
    kwh_consumed = m8_repo.sum_interval_kwh(
        meter_ids=line_meters,
        from_=bucket_start,
        to=bucket_end
    )

    # Get production from M7
    production = m7_client.get_production_qty(wc_id, bucket_start, bucket_end)
    if production.qty_good_mt <= 0:
        # No production; SEC undefined; persist for record
        sec = None
        is_provisional = True
    else:
        sec = kwh_consumed / production.qty_good_mt
        is_provisional = production.is_provisional

    # Get emission factor for the period
    emission_factor = m2_client.get_emission_factor(
        scope='2', region='IN-North', valid_on=bucket_start.date()
    )
    scope2 = kwh_consumed * emission_factor.value

    # Persist
    snapshot = SECSnapshot(
        wc_id=wc_id,
        bucket_granularity=bucket_granularity,
        bucket_start=bucket_start,
        bucket_end=bucket_end,
        kwh_consumed=kwh_consumed,
        qty_produced_mt=production.qty_good_mt,
        sec_kwh_per_mt=sec,
        scope2_kgco2e=scope2,
        emission_factor_id=emission_factor.id,
        is_provisional=is_provisional
    )
    persist(snapshot)
    publish('energy.sec.computed', snapshot)

**Provisional vs. final.** SEC is provisional if M7’s production data for the bucket is provisional. SEC is final once M7 marks its KPI snapshot final (typically 5 min after shift end + late event window).

### 6.3 Emissions Aggregation

Daily / weekly / monthly emissions rollups computed from SEC snapshots and direct site-level energy:

def compute_emissions_summary(period_granularity, period_start, period_end):
    # Sum site-total kWh from main meter (or bills if pre-meter)
    if has_site_meter():
        total_kwh = sum_site_meter_kwh(period_start, period_end)
    else:
        total_kwh = compute_from_bills(period_start, period_end)

    # Get applicable emission factor (most recent valid for the period)
    factor = m2_client.get_emission_factor('2', 'IN-North', period_end)

    summary = EmissionsSummary(
        period_granularity=period_granularity,
        period_start=period_start,
        period_end=period_end,
        scope='2',
        total_kwh=total_kwh,
        emission_factor_kg_per_kwh=factor.value,
        total_kgco2e=total_kwh * factor.value,
        factor_citation=factor.citation
    )
    persist(summary)

Scope 2 only in v1. Scope 1 (LPG, HSD) is Phase 2.

### 6.4 DISCOM Bill Reconciliation

When a bill is uploaded:

def reconcile_bill(bill):
    # Sum site meter kWh for the bill period
    site_meter = m8_repo.get_site_main_meter()
    if not site_meter:
        # No site meter yet; cannot reconcile in detail
        return
    
    zedral_kwh = m8_repo.sum_kwh(
        meter_id=site_meter.meter_id,
        from_=bill.bill_period_start,
        to=bill.bill_period_end
    )

    bill.zedral_total_kwh = zedral_kwh
    persist(bill)  # variance_pct auto-computed via generated column

    publish('energy.discom_bill.reconciled', bill)

    # Alert if variance > tolerance
    if bill.variance_pct > config.bill_reconciliation_tolerance_pct:
        send_alert('bill_reconciliation_drift', bill)

**Common variance causes** (documented in runbook):

- Transformer / distribution losses between PSPCL meter and CRS incomers (typical 1–3%)

- Different reading windows (PSPCL bill cuts off at midnight; meter reads include midnight reading too)

- Power factor adjustment in tariff vs. raw kWh

- Faulty meter (rare; Energy Manager investigates)

### 6.5 Peak Demand Monitoring

Every 5 min, check current site demand against contracted MD:

def check_peak_demand():
    site_meter = m8_repo.get_site_main_meter()
    latest = m8_repo.get_latest_reading(site_meter.meter_id)
    if not latest:
        return

    current_kva = max(latest.kva, 0)
    contracted_kva = config.contracted_md_kva
    pct = (current_kva / contracted_kva) * 100

    if pct >= config.md_breach_threshold_pct:
        # Check if we already alerted recently
        if not recent_alert('peak_demand', within_min=15):
            publish('energy.peak_demand.exceeded', {
                'meter_id': site_meter.meter_id,
                'current_kva': current_kva,
                'contracted_kva': contracted_kva,
                'pct': pct
            })
            send_alert('peak_demand_warning', current_kva, contracted_kva)

In v1, this is purely informational — Energy Manager gets notified, no automatic action.

## 7. Storage Strategy

### 7.1 Timescale Configuration

Three hypertables already declared in §3.1: meter_readings, interval_energy, sec_snapshots.

Continuous aggregates for fast dashboard queries:

CREATE MATERIALIZED VIEW m8_energy.energy_hourly_agg
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', interval_start) AS hour,
    meter_id,
    SUM(kwh_consumed) AS kwh_total,
    AVG(avg_kw) AS avg_kw,
    MAX(max_kw) AS max_kw
FROM m8_energy.interval_energy
GROUP BY hour, meter_id;

SELECT add_continuous_aggregate_policy('m8_energy.energy_hourly_agg',
    start_offset => INTERVAL '7 days',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '30 min');

Similar for daily, weekly, monthly.

### 7.2 Compression

Compression after 30 days, segmented by meter_id:

ALTER TABLE m8_energy.meter_readings SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'meter_id'
);

SELECT add_compression_policy('m8_energy.meter_readings', INTERVAL '30 days');

Saves ~85% disk for older data. At 5-year retention, total compressed footprint stays within ~500 MB even with 30 meters in Phase 2.

### 7.3 Retention Policy

After 5 years, raw 15-min readings drop; continuous aggregates retain hourly/daily/monthly indefinitely.

SELECT add_retention_policy('m8_energy.meter_readings', INTERVAL '5 years');

### 7.4 Hot / Warm / Cold

| Data | Hot (Postgres) | Warm (MinIO) | Cold |
| --- | --- | --- | --- |
| meter_readings raw 15-min | 1 yr; compressed after 30d | 4 yr (export) | — |
| interval_energy | Same | Same | — |
| sec_snapshots shift/day | 2 yr; aggregates permanent | — | — |
| discom_bills (PDF in MinIO + structured row) | 7 yr | — | — (regulatory) |
| emissions_summary | Permanent | — | — (regulatory baseline) |
| meter_health | Current state only | — | — |

## 8. API Surface

All endpoints at /api/m8/*.

### 8.1 Read APIs

#### GET /api/m8/energy/live

Real-time dashboard feed.

**Response:**

{
  "as_of": "2026-04-18T14:00:00Z",
  "site": {
    "current_kw": 1240.5,
    "current_kva": 1318.6,
    "contracted_kva": 1500,
    "pct_of_md": 87.9,
    "pf": 0.94,
    "kwh_today": 11842,
    "kwh_yesterday_to_now": 10934,
    "delta_pct": 8.3
  },
  "lines": [
    {
      "wc_id": "CRS-1",
      "current_kw": 412.3,
      "kwh_today": 4120,
      "sec_kwh_per_mt_today": 128.5,
      "meter_status": "healthy"
    },
    /* ... */
  ]
}

#### GET /api/m8/energy/trend

Time-series energy data.

**Query params:** meter_id or wc_id, granularity (15min/hour/day/week), from, to, metric (kwh/kw/pf/sec).

#### GET /api/m8/sec

SEC snapshots query.

**Query params:** wc_id, granularity, from, to.

#### GET /api/m8/emissions/summary

Emissions for a period.

**Query params:** granularity, from, to, scope.

#### GET /api/m8/meters

List all meters with health status.

#### GET /api/m8/meters/{meter_id}

Meter detail including config, latest readings, health history.

#### GET /api/m8/discom-bills

List of uploaded bills.

#### GET /api/m8/discom-bills/{bill_id}

Single bill with reconciliation detail.

#### GET /api/m8/peak-demand/log

History of peak demand events.

### 8.2 Write APIs

#### POST /api/m8/discom-bills

Upload a new DISCOM bill.

**Request:** multipart/form-data with PDF + extracted (or manually-entered) structured fields. Required role: energy_manager.

#### POST /api/m8/meters

Provision a new meter. Required role: platform_admin.

#### PATCH /api/m8/meters/{meter_id}

Update meter config or attachment. Required role: platform_admin or energy_manager.

#### POST /api/m8/meters/{meter_id}/decommission

Mark meter inactive (with optional replacement reference).

### 8.3 Admin APIs

- POST /api/m8/sec/recompute — force SEC recompute for a bucket

- POST /api/m8/emissions/recompute — recompute emissions for a period

- GET /api/m8/diagnostics — meter health summary, ingestion rate, lag

### 8.4 Export APIs

- GET /api/m8/export/energy-report.pdf — quarterly energy review pack

- GET /api/m8/export/sec-trend.xlsx — SEC raw data for ad-hoc analysis

### 8.5 Rate Limits

- Reads: 600/min/user

- Bill upload: 30/hour/user

- Recompute triggers: 10/hour/user

## 9. UI/UX Specification

M8-lite contributes a focused set of screens to the Energy Manager’s workflow.

### 9.1 Screen — Live Energy Dashboard

The Energy Manager’s home screen.

**Layout (single scroll):**

┌─────────────────────────────────────────────────────────────┐
│  SITE: Hero Steels Ludhiana   ●  14:00 IST                  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌──────────────────────────────────┐ │
│  │   1240 kW       │  │   PEAK DEMAND                    │ │
│  │   (current)     │  │   Current: 1318 kVA              │ │
│  │                 │  │   Contracted: 1500 kVA           │ │
│  │   PF: 0.94      │  │   ▓▓▓▓▓▓▓▓░░ 88%                 │ │
│  └─────────────────┘  └──────────────────────────────────┘ │
│                                                             │
│  Today vs. Yesterday (so far): 11,842 kWh (+8.3%)           │
├─────────────────────────────────────────────────────────────┤
│  PER LINE                                                   │
│                                                             │
│  CRS-1  ●  412 kW · Today 4,120 kWh · SEC 128.5 kWh/MT      │
│  CRS-2  ●  398 kW · Today 3,985 kWh · SEC 132.1 kWh/MT      │
│  CRS-3  ⚠  --- kW · Meter offline since 11:30                │
├─────────────────────────────────────────────────────────────┤
│  TODAY'S HOURLY PROFILE                                     │
│  [Line chart: kW over hours, with shift boundaries marked]  │
│                                                             │
│  THIS WEEK SEC TREND                                        │
│  [Three-line chart by line]                                 │
└─────────────────────────────────────────────────────────────┘

Auto-refreshes every 30 seconds. The peak demand bar visibly fills as the day progresses.

### 9.2 Screen — Energy Trend Explorer

Power-user view for deep dives.

- Configurable date range and granularity

- Multi-metric overlay (kW, kVA, PF, kWh, SEC)

- Per-meter or per-line filtering

- Annotation overlay (DISCOM tariff peak hours, PM windows, breakdowns from M5c)

- Export to CSV / PNG

### 9.3 Screen — SEC Trend

Specifically for the SMED / scheduling impact tracking.

- Three lines (CRS-1/2/3) showing SEC over time

- Configurable bucket (shift/day/week)

- Trendline overlay

- Side panel: “Most efficient day this month: 2026-04-12 (CRS-1, 119 kWh/MT)”

- Comparison to baseline (Hero Steels’ first month measured)

### 9.4 Screen — Emissions

- Quarterly Scope 2 emissions in tCO₂e

- Calculation transparency: “Total kWh × CEA grid factor 0.71 kg/kWh = X kgCO₂e”

- Trend chart vs. prior quarters

- Note section explaining the factor source and validity period

### 9.5 Screen — DISCOM Bill Reconciliation

- Upload zone (drag-and-drop PDF)

- After upload: extracted fields shown for review/correction

- Reconciliation result: “Bill 100,234 kWh vs. Zedral 99,180 kWh → variance 1.06% (within tolerance)”

- Historical bills table with variance trend (helps spot meter drift over time)

### 9.6 Screen — Meter Inventory & Health

For platform admin and Energy Manager.

- Table: all meters with status badges

- Click a meter → detail screen with:

- Configuration

- Recent readings (last 24h chart)

- Health history

- Maintenance log

### 9.7 Embedded Component — Energy Strip

Compact component embedded in M7 dashboards:

- Current site kW

- Today’s kWh

- Today’s kgCO₂e (Scope 2)

- Color-coded (green/amber/red based on % of contracted MD)

### 9.8 Performance SLOs

- Live dashboard load: < 800ms p95

- Trend chart 90-day query: < 1.5s p95

- Bill upload + reconciliation: < 5s p95 end-to-end

- Export PDF: < 20s

### 9.9 Accessibility

Standard accessibility per platform standards. Energy units always labelled (no unit ambiguity — kW vs. kWh is a known confusion source).

## 10. Integration with Other Modules

### 10.1 M8-lite ← M7 (OEE) — Read

For SEC computation, M8 queries M7 for production qty per (wc_id, bucket).

### 10.2 M8-lite ← M2 (Master Data) — Read

Emission factors, work centre attachments, meter tag mappings.

### 10.3 M8-lite → M7 (OEE) — Event-Driven

energy.sec.computed events feed M7’s kpi_snapshots.sec_kwh_per_mt field. M7 displays SEC alongside production KPIs.

### 10.4 M8-lite → Edge Gateway — Read

Edge Gateway reads M2 tag mappings to know what to poll. M8-lite owns the meter config that feeds those mappings.

### 10.5 M8-lite ← Edge Gateway — Event

Meter readings flow from Edge → Redpanda → M8 ingest worker.

### 10.6 M8-lite → CFO Pack (M7) — Read

M7’s CFO Pack consumes M8 data for the energy cost / SEC trend section.

### 10.7 M8-lite ↔ SAP — None Direct

No SAP integration in v1. Phase 2 may post energy cost allocations to SAP CO; deferred.

## 11. SAP Bidirectional Mapping

### 11.1 Inbound — None

M8-lite does not consume from SAP.

### 11.2 Outbound — None in v1

Phase 2 considerations (deferred):

- Energy cost allocation to SAP CO (Controlling) by cost centre — useful for product costing

- Utility invoice processing into SAP FI

## 12. Failure Modes & Recovery

### 12.1 Meter Communication Failures

| Mode | Detection | Recovery |
| --- | --- | --- |
| Meter Modbus connection times out | Edge polling timeout | Retry 3× with backoff; mark meter as degraded if persistent |
| Meter returns invalid response | Parse error at Edge | Quarantine reading; alert; investigate hardware |
| Meter physically offline | Health worker no readings >120 min | Status → offline; alert Energy Manager; retain historical data |
| Edge Gateway down | Health worker no events from edge_device | Alert; readings buffered locally on Edge until recovery |

### 12.2 Data Quality Failures

| Mode | Detection | Recovery |
| --- | --- | --- |
| Negative delta | Sanity check | Detect rollover vs. error; quarantine if not rollover |
| Delta exceeds capacity | Sanity check | Quarantine; alert |
| Missing readings (gap) | Health worker | Linear interpolation if < 30 min; gap marker if longer |
| Reading timestamp in future | Validation | Reject; possible meter clock drift |

### 12.3 Computation Failures

| Mode | Detection | Recovery |
| --- | --- | --- |
| SEC computation when production = 0 | Guard | Persist with NULL SEC; explicit “no production” flag |
| Emission factor missing for period | NULL JOIN | Use most recent valid; alert if > 6 months old |
| Bill PDF extraction fails | Parse error | Fall back to manual entry form |
| Bill reconciliation finds large variance | Threshold check | Alert Energy Manager; do not block bill storage |

### 12.4 Storage / Performance Failures

| Mode | Detection | Recovery |
| --- | --- | --- |
| Hypertable chunk compression slow | TimescaleDB metric | Reschedule policy; check disk I/O |
| Continuous aggregate refresh failure | TimescaleDB log | Manual refresh; investigate |
| Dashboard query slow with year-long range | Latency metric | Force aggregate use; tune TTL |

## 13. Acceptance Criteria

### 13.1 Functional

- ☐ 3 meters polled at 15-min cadence at Hero Steels CRS lines

- ☐ Meter readings persisted with full envelope including instantaneous values

- ☐ Interval energy delta computed correctly with rollover handling

- ☐ SEC computed per (wc, shift/day/week/month) when production attribution available

- ☐ Scope 2 emissions computed using CEA factor from M2

- ☐ DISCOM bill upload + structured extraction + reconciliation works

- ☐ Bill reconciliation variance computed and alerted when > tolerance

- ☐ Peak demand monitoring fires at threshold

- ☐ Meter health classifier transitions correctly

- ☐ Gap interpolation respects 30-min limit

- ☐ All events publish per schema

- ☐ M7 confirmed consuming SEC events for KPI display

### 13.2 Non-Functional

- ☐ Dashboard load < 800ms p95

- ☐ Trend query (90-day, 15-min granularity): < 1.5s p95 (via continuous aggregates)

- ☐ Hypertable compression saves ≥ 80% disk after 30-day aging

- ☐ Edge Gateway buffer survives 24h Core outage without data loss

- ☐ All RBAC enforced

### 13.3 Pilot Validation

- ☐ Energy Manager can complete JTBD-1 (live view) in < 30 sec

- ☐ Energy Manager can run SEC trend (JTBD-2) usable in actual conversations

- ☐ DISCOM bill reconciliation (JTBD-3) finds expected variance for first 3 monthly bills (1–3% expected)

- ☐ Quarterly Scope 2 number (JTBD-4) computed and defendable

- ☐ CFO quarterly review (JTBD-5) uses SEC trend constructively

- ☐ 30-day pilot: meter completeness ≥ 95% per meter

- ☐ 30-day pilot: site-meter-vs-bill reconciliation < 3% variance

### 13.4 Documentation

- ☐ OpenAPI spec

- ☐ Event schemas in Apicurio

- ☐ Reference document: SEC and Scope 2 calculation method (auditor-readable)

- ☐ Runbooks: meter offline, reconciliation drift, emission factor update

- ☐ Energy Manager user guide

- ☐ Phase 2 transition guide (path to M8-full)

### 13.5 Rollback Plan

If M8-lite fails post-go-live:

- Energy Manager reverts to PSPCL bills + Excel (status quo)

- Production KPIs in M7 lose SEC field but continue functioning

- Recovery: standard Zedral Update rollback

- Meter readings continue queueing on Edge buffer; replay on M8 recovery

## 14. Build Plan & Path to M8-Full

### 14.1 Phase 1 Build — M8-lite

| Sub-phase | Duration | Deliverable |
| --- | --- | --- |
| **M8-lite.0** — Foundation | Week 1 | Service skeleton, schema, hypertable setup, config |
| **M8-lite.1** — Meter ingestion (Modbus) | Weeks 2–3 | Edge Gateway scanner, ingest worker, validation, persistence |
| **M8-lite.2** — Hardware install + commissioning | Weeks 3–6 | 3 Schneider PM5350 meters at Hero Steels CRS-1/2/3 incomers; CT/PT installation; connectivity validation |
| **M8-lite.3** — Interval delta + meter rollover | Week 4 | Delta computation, rollover detection, quarantine workflow |
| **M8-lite.4** — Meter health worker | Week 5 | Health classifier, status events, dashboard surfacing |
| **M8-lite.5** — SEC computation | Week 5–6 | Event-driven + scheduled SEC, M7 integration |
| **M8-lite.6** — Scope 2 emissions | Week 6 | Daily/weekly/monthly emissions summary, M2 factor lookup |
| **M8-lite.7** — DISCOM bill upload + reconciliation | Week 7 | Upload UI, PDF extraction, reconciliation logic |
| **M8-lite.8** — Live dashboard | Weeks 7–8 | Energy Manager home screen, embedded strip in M7 |
| **M8-lite.9** — Trend + SEC explorer screens | Week 8 | Time-series exploration UI |
| **M8-lite.10** — Peak demand monitoring | Week 9 | Threshold alerts, log, dashboard surfacing |
| **M8-lite.11** — Quarterly export | Week 9 | PDF/Excel exports, calculation transparency |
| **M8-lite.12** — Integration test | Week 10 | With M2/M7/Edge end-to-end |
| **M8-lite.13** — Soak + pilot prep | Week 11 | Documentation, training, runbooks |

**Total:** 11 weeks (slightly less than other modules because scope is tighter — M8-full deferred).

### 14.2 Team

1 M8 engineer primary + fractional frontend (shared pool).

**Hiring JD starter:**

- **Must have:** Python backend, Postgres + TimescaleDB, Modbus protocol experience or willingness to learn, MQTT

- **Strong plus:** Industrial energy / electrical engineering domain, ISO 50001 awareness, BRSR / Indian ESG context

- **Nice to have:** Sustainability sector exposure, OPC-UA, SCADA integration

### 14.3 Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- | --- |
| R1 | Smart meter installation delayed beyond week 6 | Medium | High | Site-level (DISCOM bill-based) view live from Day 1 as fallback; chase electrical contractor early |
| R2 | Modbus register map differs from PM5350 documentation (vendor variance) | Medium | Medium | Field validation in pilot week 4; configurable register map; backup manual reading capability |
| R3 | Meter readings drift vs. PSPCL bill > tolerance | Medium | Medium | Investigate transformer losses, PT/CT calibration; document expected baseline drift |
| R4 | Emission factor disputes (which CEA value? which year?) | Low | Medium | Document factor source explicitly; allow Energy Manager to override per period if needed |
| R5 | Energy Manager doesn’t engage in pilot | High | Medium | Identify champion in Phase 0; weekly check-in; quick wins (DISCOM bill reconciliation) early |
| R6 | Phase 2 (M8-full) priority gets pushed back due to platform-wide delays | Medium | High | M8-lite designed to be standalone-useful; data continues accumulating for Phase 2 backfill |

### 14.4 Dependencies

| Dependency | What | Needed by |
| --- | --- | --- |
| Phase 0 Foundation | Platform, Edge Gateway, TimescaleDB | Week 1 |
| Hero Steels electrical contractor | Meter installation, CT/PT, communication wiring | Week 4 |
| 3× Schneider PM5350 (or equivalent) meters | Procured | Week 3 |
| M2 Emission Factors | CEA grid factor seeded | Week 5 |
| M7 KPI snapshots | Production qty per bucket available | Week 5 |
| Network: VLAN 30 reachability for meter IPs | Edge Gateway to meters | Week 4 |

### 14.5 Path to M8-Full (Phase 2)

After 3 months of M8-lite operation, Phase 2 builds on the data plane:

| M8-Full Module | Estimated Effort | Delivers |
| --- | --- | --- |
| Sub-metering expansion | 4 weeks | Add 5–10 sub-meters per line (motors, drives, pickling tank, annealing furnace) |
| Scope 1 Fuel Tracking | 3 weeks | LPG (annealing), HSD (DG sets) consumption tracking + Scope 1 emissions |
| BRSR Essential Indicators Report Generator | 4 weeks | Automated quarterly BRSR-format report |
| PAT Cycle Reporting | 3 weeks | BEE PAT-format SEC reporting |
| ISO 50001 EnPI Tracking | 3 weeks | Energy Performance Indicators with statistical baselining |
| Power Factor Management | 2 weeks | PF monitoring, capacitor bank coordination signals |
| Time-of-Day Tariff Awareness | 3 weeks | Energy cost optimisation; potential M4 scheduler integration for off-peak preference |
| ESG DMZ Egress Workflow | 3 weeks | Sustainability manager preview UI, signed bundle generation, regulator portal upload |
| CCTS Data Preparation | 4 weeks | Compliance carbon market reporting structure |
| Water + Waste Tracking | 6 weeks | Phase 3 — separate metering strategies, full BRSR water indicators |

Phase 2 M8-full is roughly a 12-week build.

### 14.6 Exit Criteria to M8-Full

Before starting M8-full Phase 2 work:

- 90 days of M8-lite production stability

- Meter completeness ≥ 95%

- DISCOM reconciliation < 3% variance consistently

- Energy Manager NPS ≥ +20

- Hero Steels confirms appetite for sub-metering capex

- BRSR/PAT cycle scope and format finalised with Hero Steels’ compliance team

## Revision History

| Version | Date | Author | Changes |
| --- | --- | --- | --- |
| v0.1 | 2026-04-18 | Product & Systems Engineering | Initial draft |

# Part IV — Program Context

Cross-module program management artefacts. These sections answer “who owns what”, “what’s pending”, “who to hire”, “what might go wrong”, and “when does what block what”.

## IV.A — Master RACI Matrix

**Roles:** PSE = Product & Systems Engineering (Zedral founders); EE = External Engineer (hire); FE = Frontend Engineer; OP = Hero Steels Operations; IT = Hero Steels IT/Basis; EM = Energy Manager; PLT = Plant Head; CFO = Chief Financial Officer

**Key:** R = Responsible · A = Accountable · C = Consulted · I = Informed

## RACI — Build Phase (Weeks 1–12)

| Deliverable | PSE | EE-Backend | EE-Frontend | IT/Basis | OP | EM | PLT | CFO |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Phase 0 Foundation (platform, event bus, auth) | **A,R** | — | — | C | I | — | I | — |
| M2 Master Data + Changeover Matrix bootstrap | **A** | R | — | C | R (SMED obs) | — | I | — |
| M1 Demand & Order Management | **A** | R | R | C | C | — | I | — |
| M1 SAP OData integration | A | R | — | **R (Basis)** | — | — | I | — |
| M3 Capacity Planning & RCCP | **A** | R | R | — | C | — | I | — |
| M4 APS Scheduling Engine (CP-SAT + UI) | **A** | R | R | — | C (planner) | — | I | — |
| M5a Material & Inventory Control | **A** | R | R | C | R (stores) | — | I | — |
| M5a SAP MM integration + GI write-back | A | R | — | **R (Basis)** | — | — | I | — |
| M6 Dispatch & Execution Control | **A** | R | R | — | R (ops + supervisors) | — | I | — |
| M6 Andon terminal hardware install | C | — | — | R | **A** | — | — | — |
| M7 Performance Analytics & OEE | **A** | R | R | — | C (supervisor) | — | C | C |
| M7 SAP Production Confirmation write-back | A | R | — | **R (Basis ext)** | — | — | I | C |
| M8-lite Energy data plane | **A** | R | R | — | — | R | I | I |
| M8-lite Smart meter install (3 meters) | C | — | — | **R** | C | R | I | — |
| M8-lite DISCOM bill reconciliation | C | R | — | — | — | **R** | I | C |
| Operator training (M6 Andon + M5a scan) | R | — | — | — | **A** | — | C | — |
| Planner training (M1/M3/M4/M7) | R | — | — | — | **A** | — | C | — |
| Supervisor training (M6/M7) | R | — | — | — | **A** | — | C | — |
| Energy Manager training (M8-lite) | R | — | — | — | — | **A** | I | — |
| CFO pack format sign-off (M7) | R | — | — | — | — | — | C | **A** |

## RACI — Operational Phase (Post-Go-Live)

| Operational Activity | Zedral Support | Customer IT | Customer Ops | EM | CFO |
| --- | --- | --- | --- | --- | --- |
| Platform health monitoring (tier 1, in-plant) | I | **A,R** | C | — | — |
| Platform health monitoring (tier 2, HQ weekly) | **A,R** | C | — | — | — |
| Break-glass remote support | **R** | **A** (customer authorises) | — | — | — |
| Release updates (apply) | R (ships) | **A** (approves + applies) | I | — | — |
| SAP sync failures | C | R | — | — | — |
| SAP production confirmation failures | C | R | C | — | **I** |
| Changeover matrix updates | C | — | **R,A** (planner) | — | — |
| OEE metric review | — | — | **R** (supervisor) | — | I |
| Shift performance reviews | — | — | **R** (supervisor + planner) | — | — |
| DISCOM bill reconciliation | C | — | — | **R,A** | I |
| BRSR/PAT report preparation (Phase 2) | C | — | — | **R,A** | I |

## RACI — Critical Decision Points

| Decision | PSE | Customer Sponsor | IT | Ops | EM | CFO |
| --- | --- | --- | --- | --- | --- | --- |
| Pilot go-live criteria | C | **A** | C | C | C | I |
| Pilot paid conversion | C | **A** | — | — | — | R |
| Phase 2 scope approval | R | **A** | I | C | C | C |
| Schedule override / rush injection policy | R | — | — | **A,R** (supervisor) | — | — |
| SAP extension specification sign-off | C | **A** | **R** (Basis) | — | — | — |
| Emission factor / accounting method | C | — | — | — | **A,R** | I |
| Incident severity classification (SEV-1/2/3/4) | **A,R** | — | C | — | — | — |

### Module Interaction Heatmap

Which modules talk to which, and how intensely:

                  M1    M2    M3    M4    M5a   M6    M7    M8
         M1:      ··    ●●    ○○○   ●●●   ○○●   ·○    ●○    ·
         M2:      ●●    ··    ●●    ●●●   ●     ●     ●     ●
         M3:      ●●●   ●●    ··    ●●●   ·●    ·     ○     ·
         M4:      ●●●   ●●●   ●●●   ··    ●●    ●●●   ○     ·
        M5a:      ○●●   ●     ·○    ●●    ··    ●●    ●     ·
         M6:      ·○    ●     ·     ●●●   ●●    ··    ●●●   ○
         M7:      ●○    ●     ○     ○     ●     ●●●   ··    ●●
         M8:      ·     ●     ·     ·     ·     ·     ●●●   ··

Legend:  ●●●  Hot integration (multiple events/APIs)
         ●●   Strong integration
         ●    Regular integration
         ○○   Occasional
         ○    Rare
         ·    None or minimal

**Observations:** - **M2 connects to everything** — as the master data service, it’s the most-referenced module - **M4 ↔ M6 is the hottest pair** — schedules become dispatch lists; rush injections trigger replan - **M6 ↔ M7 is the second hottest** — every floor event flows to OEE analytics - **M8 is relatively isolated** in Phase 1 — bidirectional with M7 only (SEC loop) - **M1 is**** ****“****upstream only****”** — it generally publishes; consumers are M3/M4/M5a/M7

## IV.B — Consolidated Pending Decisions Log

Every pending decision surfaced during documentation drafting. Each has a default that applies absent explicit answer.

## Phase 0 Foundation (from Parts 1–3)

| # | Decision | Default | Owner |
| --- | --- | --- | --- |
| PD-01 | Event envelope HMAC signing scope | Flag on; enabled for floor.* and asset.breakdown.*; off for system-internal events | PSE |
| PD-02 | M2 entities in scope for Phase 0 | 10 entities as specified; defer tool register, consumables to Phase 2; heat_number as field on M5a coils; packaging Phase 3 | PSE |
| PD-03 | SMED bootstrap access at Hero Steels | Assumed yes per existing pilot agreement | Customer Sponsor |
| PD-04 | Hardware BOM ownership at pilot | Customer purchases; Zedral delivers software | Customer Sponsor |
| PD-05 | SAP OData Basis prerequisite (4 extensions) | **Critical path; raise immediately with 6-week lead time** | IT/Basis + Customer Sponsor |
| PD-06 | AD federation at Hero Steels | Local Keycloak users in pilot; migrate to AD federation in Phase 2 | IT |
| PD-07 | Notification channels available at pilot | SMTP + in-app only in Phase 1; add SMS in Phase 2 when MSG91/Twilio account exists | Customer Sponsor + IT |
| PD-08 | Mega Production Document final format | Markdown source of truth + PDF (regulator/customer handover) + DOCX (internal) via Pandoc | PSE |
| PD-09 | Module doc delivery pace | One-per-reply during draft, batch on compile | PSE |
| PD-10 | Multi-tenancy roadmap | Deferred to Q3 2027; single-tenant per deployment throughout Phase 1–3 | PSE |

## Module-Level Decisions

| # | Module | Decision | Default |
| --- | --- | --- | --- |
| PD-11 | M1 | Priority scoring weights | Defaults seeded as per §6.2; tune after 30-day pilot observation |
| PD-12 | M1 | Manual WO override threshold | Min 20-char reason; no auto-expiry unless specified |
| PD-13 | M3 | Capacity threshold (green/amber/red) | 85%/100%; tunable per deployment |
| PD-14 | M3 | Historical line-share lookback | 90 days; minimum 30 days before auto-allocation activates |
| PD-15 | M4 | CP-SAT time limit | 60 seconds; tunable |
| PD-16 | M4 | Objective function weights | Defaults per §6.2; tune with planner over first 3 months |
| PD-17 | M4 | Auto-replan on breakdown | Enabled by default; per-config disableable |
| PD-18 | M5a | Coil aging thresholds | FG 90 days, stores 180 days, annealing 7 days (warning) |
| PD-19 | M5a | Reservation auto-expiry | 14 days warning, planner-configurable |
| PD-20 | M6 | Downtime categorisation threshold | Forced category for stoppages > 5 minutes |
| PD-21 | M6 | Handover auto-nudge | 15 minutes before shift end |
| PD-22 | M7 | OEE low-alert threshold | 50%; per-line tunable |
| PD-23 | M7 | SAP confirmation auto-trigger | True by default; supervisor-required config for pilot period |
| PD-24 | M7 | Recompute window for late events | 24 hours |
| PD-25 | M8-lite | Meter poll interval | 15 minutes |
| PD-26 | M8-lite | Bill reconciliation tolerance | 2% variance |
| PD-27 | M8-lite | Peak demand alert threshold | 95% of contracted MD |

## Deferred to Phase 2+

| # | Feature | Deferred Because | Revisit Trigger |
| --- | --- | --- | --- |
| DF-01 | Full M8 (BRSR/PAT reports) | Requires 3+ months clean data | Month 6 of pilot |
| DF-02 | M5b Quality full workflow | Sequential to M5a; NCR placeholders suffice in v1 | Phase 2 kickoff |
| DF-03 | M5c Maintenance full workflow | Same as M5b | Phase 2 kickoff |
| DF-04 | PLC/SCADA deep integration | Manual Andon adequate for pilot | Phase 2 Month 7 |
| DF-05 | ML-driven scheduling | 6+ months of data + deterministic proven insufficient | Phase 3+ |
| DF-06 | Multi-plant orchestration | Single plant pilot | Second customer (Phase 4+) |
| DF-07 | Closed-loop PLC control | Out of scope per Principle 5 | Not before senior safety review |
| DF-08 | Operator personal-device mobile | Security + DPDP concerns | Not pursued |
| DF-09 | Multi-tenant SaaS | Thesis conflicts with air-gap positioning | Not before Q3 2027 |

## v0.2 Additions — Hero Steels Open Questions (PD-28 through PD-37)

The following 10 decisions were surfaced by the Hero Steels paper sheet grounding exercise (April 2026). All are customer-confirmation items to be resolved during the Phase 0 Week 1 Line Incharge walkthrough. Each has a proposed default — documented in the Hero Steels Configuration Annex — but requires Hero’s explicit confirmation before go-live.

| # | Decision | Proposed Default | Owner | Blocks |
| --- | --- | --- | --- | --- |
| PD-28 | “Ann Hard or R/W Tension” field meaning (Sheet A col 8) | Captured as free-text conditional on grade; Hero confirms conditional logic | Hero Line Incharge + Zedral M6 team | Paper-compatible shift report field mapping |
| PD-29 | “Initial Level / Final” measurement (Sheet A summary block) | Presumed oil/coolant level; unit TBD | Hero Line Incharge | Shift report field mapping |
| PD-30 | “B.T. ECV” — one measurement or two separate fields | Presumed one combined value; Hero confirms | Hero Quality team | Paper-compatible report column count |
| PD-31 | “Roll Finish M/B” — valid values and meaning | Presumed Mill/Burnish; Hero confirms abbreviation + full valid set | Hero Line Incharge | master.rolls.roll_finish constraint |
| PD-32 | Re-rolling workflow — new coil ID vs. same, counts toward target, reason codes | Same coil ID retained; new dispatch item; counts separately as rerolling_mt | Hero Planner + Plant Head | dispatch_items.is_rerolling semantics |
| PD-33 | Shift timings precision (06:00/14:00/22:00) and scheduled breaks | As assumed; breaks TBD | Hero Plant Head | OEE Availability denominator |
| PD-34 | Multi-pass routing — is every CRS-1/2 WO multi-pass, or some single-pass variants | Presumed every CRS-1/2 WO is multi-pass; Hero confirms edge cases | Hero Production Planner | M4 routing flag, M6 workflow branch |
| PD-35 | Defect severity mapping — which of 45 codes are critical/major/minor/cosmetic | Zedral-proposed defaults in Annex Appendix 1; Hero Quality confirms | Hero Quality team | Auto-disposition in v1 + M5b foundation |
| PD-36 | Crew pattern stability — rotate or stable? cadence? | Presumed stable per shift pattern; previous-shift pre-population | Hero HR / Plant Head | Crew confirmation UX pre-population |
| PD-37 | Coil number format — SAP doc ref, physical barcode, logbook serial; HR vs CR numbering | TBD — critical for M5a scan UX and coil_id generation | Hero Line Incharge + SAP Basis | M5a scan validation + coil genealogy |

**Status tracking:** Each decision moves from PROPOSED → CONFIRMED → LOCKED as Hero signs off. Frozen at pilot go-live.

## IV.C — Hiring JD Compendium

Aggregated from every module’s Build Plan. Use as input to sourcing / recruitment.

## Summary: Team Composition at Full Phase 1 Build

| Role | Headcount | Primary modules |
| --- | --- | --- |
| Platform Engineer (Foundation, Phase 0) | 1 (founder or early hire) | Phase 0, M2 |
| M1 Backend Engineer | 1 | M1 |
| M3 Backend Engineer | 1 | M3 |
| M4 Algorithm Engineer | **1 (critical hire)** | M4 |
| M4 Frontend Engineer (Gantt specialist) | 1 | M4 |
| M5a Backend Engineer | 1 | M5a |
| M6 Backend Engineer | 1 | M6 |
| M6 Frontend Engineer (Floor Console) | 1 | M6 |
| M7 Analytics Engineer | 1 | M7 |
| M7 Integration Engineer | 1 | M7 SAP |
| M8 Backend Engineer | 1 | M8-lite |
| Shared Frontend Engineer (Ops Console) | 1 | All modules |
| Shared DevOps / SRE | 0.5 | Infra, observability, releases |

**Minimum viable Phase 1 team:** 3–4 engineers + 1 frontend, with founders covering Phase 0 + product. Scale up in weeks 4–6 as module work parallelises.

## JD — Platform / Foundation Engineer

**Must have:** - 5+ years Python backend + Postgres - Event-driven systems (Kafka / Redpanda) - Docker + Linux systems administration - Auth / identity systems (OIDC, LDAP federation) - REST API design

**Strong plus:** - On-premise / air-gapped deployment experience - OPC-UA or industrial protocol familiarity - Ansible, CI/CD

**Nice to have:** - Steel / manufacturing / OT sector exposure

## JD — M1 Demand & Order Management Backend Engineer

**Must have:** Python backend, Postgres, REST APIs, event-driven systems (Kafka/Redpanda/RabbitMQ)

**Strong plus:** SAP OData experience, manufacturing/ERP domain, pytest + testcontainers

**Nice to have:** Industrial/OT exposure, Indian steel or auto-parts manufacturing background, OR-Tools exposure

## JD — M3 Capacity Planning Engineer

**Must have:** Python backend, Postgres, REST API design, clear understanding of time-bucketed aggregation

**Strong plus:** Manufacturing / capacity-planning domain, ERP background, Pandas for calculation prototyping

**Nice to have:** Steel vertical exposure, OR-Tools familiarity (cross-pollination with M4)

## JD — M4 Algorithm Engineer (CRITICAL HIRE)

**Must have:** - Strong Python - OR-Tools (CP-SAT) production experience OR equivalent (CPLEX, Gurobi, IBM CPO) - Discrete optimisation foundations (constraint programming, scheduling theory) - Strong systems thinking

**Strong plus:** - Manufacturing scheduling or APS background - SMED / TPS exposure - Published work or open-source contributions in scheduling

**Nice to have:** - Steel / process industry exposure - Distributed systems for solver scaling

*Note: This is the single most important technical hire for the platform. Expect 3–6 month search.*

## JD — M4 Frontend Engineer (Gantt Specialist)

**Must have:** - React + TypeScript - Complex visualisation (D3 / Konva / React Flow) - Drag-drop UX - Performant virtualisation

**Strong plus:** - Gantt or scheduling UI experience - OT / industrial UX background

**Nice to have:** - WebGL or canvas-based rendering for very large datasets

## JD — M5a Material & Inventory Engineer

**Must have:** Python backend, Postgres, REST APIs, event-driven systems

**Strong plus:** SAP MM domain (MB51/MB52/movement types), material/inventory domain, manufacturing exposure

**Nice to have:** Steel industry, RFID/barcode integration experience

## JD — M6 Backend Engineer

**Must have:** Python backend, Postgres, REST APIs, event-driven systems, state machine design

**Strong plus:** Shop-floor / industrial software background, high-write systems experience, transactional messaging patterns

**Nice to have:** Steel / manufacturing exposure

## JD — M6 Frontend Engineer (Floor Console)

**Must have:** - React + TypeScript - Touch UI design - Accessibility - Performance optimisation

**Strong plus:** - Industrial / HMI UI experience - Kiosk mode deployment - Offline-first web apps

**Nice to have:** - Audio/visual design for factory environments - Multilingual UI

## JD — M7 Analytics Engineer

**Must have:** Python, Postgres, time-series databases (TimescaleDB / InfluxDB), BI / analytics engineering experience

**Strong plus:** Manufacturing / OEE domain, lean / Six Sigma background, SQL performance tuning

**Nice to have:** Steel / process industry, data visualisation design

## JD — M7 Integration Engineer

**Must have:** Python, REST APIs, SAP OData experience, event-driven systems

**Strong plus:** SAP PP module, manufacturing integration, financial reconciliation

**Nice to have:** Direct experience with SAP production confirmation extensions

## JD — M8 Energy Engineer

**Must have:** Python backend, Postgres + TimescaleDB, Modbus protocol experience or willingness to learn, MQTT

**Strong plus:** Industrial energy / electrical engineering domain, ISO 50001 awareness, BRSR / Indian ESG context

**Nice to have:** Sustainability sector exposure, OPC-UA, SCADA integration

## IV.D — Consolidated Risk Register

Top risks across the entire Phase 1 program, aggregated from module-level risk registers.

## P1 — Programme-Blocking Risks (Critical)

| # | Risk | Source Module(s) | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- | --- | --- |
| **PR-01** | **SAP Basis extension(s) not ready at Hero Steels by Week 8** | M1, M5a, M7 | High | **Critical** | Raise in Phase 0 Week 1; escalate via customer exec sponsor; contingency: manual CSV-based confirmation for first 2 weeks; defer write-back features if strictly necessary |
| **PR-02** | **M4 Algorithm Engineer not hired by Week 4** | M4 | Medium | **Critical** | Start search Week 1; 3–6 month pipeline; contingency: founder takes CP-SAT workstream; accept longer timeline |
| **PR-03** | **Changeover matrix ****<****40% coverage at pilot go-live** | M4, M2 | Medium | High | SMED bootstrap Week 1; dedicated IE resource; fallback conservative 180-min default; public planner-override feature from day 1 |
| **PR-04** | **Andon terminal hardware delivery delayed** | M6 | Low–Medium | High | Specify industrial terminals Week 1; procurement lead 4–6 weeks; backup paper workflow documented |
| **PR-05** | **Smart meter installation delayed beyond Week 6** | M8-lite | Medium | High | Site-level DISCOM bill ingest gives Day 1 value; chase contractor early; 3 × Schneider PM5350 procured Week 3 |

## P2 — Module-Blocking Risks (High)

| # | Risk | Module | Mitigation |
| --- | --- | --- | --- |
| PR-06 | SAP WO customisations cause parsing failures | M1 | Field mapping config; quarantine workflow; Basis consultation |
| PR-07 | Hero Steels coil ID conventions don’t map cleanly | M5a | Mapping config + manual override; Phase 0 walk-through |
| PR-08 | M2 routing std rates inaccurate (impact M3, M4) | M3, M4 | Bootstrap from historical DPR data; planner-editable; low-confidence flagging |
| PR-09 | Operators reject Floor Console as slower than paper | M6 | UX testing with Hero Steels operators Weeks 8–9; iterate; speed targets <5s per tap |
| PR-10 | CP-SAT timeout at production scale | M4 | Heuristic seed always returns valid answer; 4× scale load test before pilot |
| PR-11 | Gantt UI performance issues with many ops | M4 | Virtualised rendering from day 1 |
| PR-12 | OEE calculation produces number damaging trust | M7 | Shadow-mode running for 2 weeks; stakeholder reference doc review |
| PR-13 | Shift handover compliance <50% | M6 | Auto-nudge 15 min before shift end; supervisor KPI; <3-min completion target |

## P3 — Quality / Adoption Risks (Medium)

| # | Risk | Module | Mitigation |
| --- | --- | --- | --- |
| PR-14 | Planner overrides scheduler constantly | M4 | Explainability features; override-rate KPI; iterate on weights |
| PR-15 | Reservation conflicts stale (“set and forget”) | M5a | 14-day auto-expiry warning; weekly cleanup report |
| PR-16 | Downtime categories debated / inconsistent | M6 | 7 fixed categories in v1; change requires training; consistency KPI |
| PR-17 | Late events cause KPI flip-flop on dashboard | M7 | Recompute window + is_final flag; clear provisional indicator |
| PR-18 | DISCOM bill reconciliation drift > tolerance routine | M8-lite | Drift threshold config; investigate transformer losses; alert at 3% |
| PR-19 | Energy Manager doesn’t engage | M8-lite | Identify champion Phase 0; weekly check-in; quick wins (bill recon) early |
| PR-20 | Replan thrashing during chaotic shifts | M4 | Stability bonus in objective; trigger disabling; alert + planner pause |

## P4 — Support / Operational Risks (Low-Medium)

| # | Risk | Module | Mitigation |
| --- | --- | --- | --- |
| PR-21 | Overload predictions inaccurate (“bad predictions = distrust”) | M3 | Observe vs. reality; tune thresholds; communicate RCCP’s inherent approximation |
| PR-22 | Rush injections trigger M4 thrash | M4, M6 | Rate limit; justification required; impact preview |
| PR-23 | SAP rejects correction confirmation | M7 | Compensating reversal workflow; supervisor review |
| PR-24 | Emission factor disputes | M8-lite | Document source + validity; Energy Manager override per period |
| PR-25 | Hero Steels customer/SAP data has inconsistencies | M1, M5a | Data cleanup workstream parallel to build; soft validation |

## v0.2 Additions — Risks Surfaced by Hero Steels Grounding (PR-26 through PR-30)

| # | Risk | Module | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- | --- | --- |
| **PR-26** | **Multi-pass capture UX adds friction ****>**** 15s/pass, operators fall back to paper** | M6 | Medium | **High** | Shadow in-person UX test with Hero operator in week 8-9; pre-populate every field; SCADA auto-fill for tension/coolant where possible; target < 15s per pass |
| PR-27 | Paper-compatible shift report PDF layout doesn’t match Hero’s expectation | M7 | Medium | High | Field-for-field mapping reviewed with Shift Incharge at Phase 0; visual PDF proof-of-concept before M7 build completion |
| PR-28 | 45 defect codes overwhelming at reject UI (operator paralysis) | M6 | Medium | Medium | Family-based 6-tab grouping; recently-used codes at top; search by code number; most-common-3 prominently displayed |
| PR-29 | Roll change tonnage tracking drifts from Hero’s manual tracking | M6, M2 | Low | Medium | Nightly reconciliation vs. operator-reported tonnage; alert on drift > 5% |
| PR-30 | Shift Manager fails to approve reports in time, backlog grows | M7 | Medium | Medium | Auto-escalation if unapproved > 24h; dashboard visibility; SMTP nudge |

**Total: 30 tracked risks across the program** (v0.2 adds 5). Each has a named owner and mitigation. Review weekly during build, monthly post-go-live.

## IV.E — Critical-Path Dependency Diagram

## The 12-Week Pilot Build Timeline

Week:     1   2   3   4   5   6   7   8   9  10  11  12
          │   │   │   │   │   │   │   │   │   │   │   │
Phase 0:  ████████───────
                  │
M2 bootstrap (changeover matrix SMED): ─────────────────────────────▶ (runs throughout, 60% coverage by wk 6)
                  │
SAP Basis ext:    ═══════════════════════════════════════════▶  (CRITICAL PATH — 6 wk lead)
                  │
M1:               ────────────────────────────
                                              │
M3:                       ────────────────────────
                                                  │
M4:               ────────────────────────────────────────────── (algorithm + Gantt)
                                                  │
M5a:                  ───────────────────────────────────
                                                      │
M6:               ────────────────────────────────────────────── (floor console + hardware)
                                                      │
M7:                               ──────────────────────────────
                                                      │
M8-lite:              ────────────────────────────── (meter install in wks 4-6)
                                                              │
Integration tests:                                       ████
                                                                  │
Soak + Go-Live:                                                   ██

       └ Hero Steels go-live: end Week 12 / Month 6

## Critical-Path Items (in dependency order)

- **SAP Basis Extension (6-week lead time).** Without this, M1 pull and M7 write-back cannot function. **Must be raised in Phase 0 Week 1.**

- **M2 Changeover Matrix Bootstrap via SMED studies.** Without ≥60% matrix coverage, M4 scheduling defaults dominate and setup-savings proof fails.

- **Phase 0 Foundation.** Blocks all modules. Must complete by Week 2 end.

- **Andon terminal hardware installation (Week 4–6).** Blocks M6 pilot testing. Electrical contractor sequencing matters.

- **Smart meter installation (Week 4–6).** Blocks M8-lite per-line visibility. Same contractor as Andon usually.

- **M4 Algorithm Engineer hire.** Search starts Week 1; onboarding by Week 4 critical.

- **(v0.2)** **M6 multi-pass capture workflow.** +1 week added to M6 build (now 13 weeks). If M6 Frontend Engineer onboards Week 3 (not Week 4 as v0.1 assumed), pilot go-live remains Week 12. Otherwise slips to Week 13.

- **(v0.2)** **Hero paper-compatible shift report visual proof-of-concept.** Week 6 — before M7 build completes. PDF layout reviewed with Hero Line Incharge. Without this sign-off, we ship a report that looks “close but wrong” and operators resist the paper-retirement.

- **(v0.2)** **10 Hero Open Questions (PD-28 through PD-37) resolved Phase 0 Week 1.** Blocks: M5a coil ID convention (PD-37), M6 multi-pass routing flag (PD-34), M5b defect auto-disposition (PD-35), master.rolls.roll_finish constraint (PD-31).

## Module Dependency Graph (simplified)

graph TB
    P0[Phase 0 Foundation<br/>incl. M2 Master Data]
    SAP[SAP Basis Extensions<br/>6-week lead]
    M1[M1 Demand]
    M3[M3 Capacity]
    M4[M4 Scheduler]
    M5a[M5a Material]
    M6[M6 Dispatch]
    M7[M7 OEE]
    M8[M8-lite Energy]
    HW[Hardware Install<br/>Andon + Meters]
    GO[Pilot Go-Live<br/>Week 12]
    
    P0 --> M1
    P0 --> M3
    P0 --> M4
    P0 --> M5a
    P0 --> M6
    P0 --> M7
    P0 --> M8
    SAP --> M1
    SAP --> M5a
    SAP --> M7
    M1 --> M3
    M1 --> M4
    M1 --> M5a
    M2[(M2 Matrix SMED Bootstrap)]
    M2 --> M4
    M3 --> M4
    M5a --> M4
    M5a --> M6
    M4 --> M6
    M6 --> M7
    M8 --> M7
    HW --> M6
    HW --> M8
    M7 --> GO
    M6 --> GO

## Parallel Workstreams

Given the dependency graph, Phase 1 can parallelise across 3–4 workstreams after Week 2:

| Workstream | Owner | Weeks |
| --- | --- | --- |
| **A: Platform + M2 + M1 + M3** | Founder + M1 eng | 1–8 |
| **B: M4 Algorithm + Gantt** | M4 eng + Frontend | 2–12 |
| **C: M5a + M6 (floor + exec)** | M5a eng + M6 eng + Frontend | 2–12 |
| **D: M7 + M8-lite (analytics)** | M7 eng + M8 eng | 4–11 |

Integration convergence in Week 10.

# Part V — Reference Appendices

## Appendix A — Consolidated Glossary

Every term from every document, merged, de-duplicated, alphabetised.

| Term | Definition |
| --- | --- |
| **A/P/Q** | Availability / Performance / Quality — the three components of OEE |
| **ADR** | Architectural Decision Record — short document capturing a technical decision, its context, alternatives, and consequences |
| **Andon** | A shop-floor terminal for operator input and alerts; named for the Toyota Production System concept |
| **APS** | Advanced Planning and Scheduling — the family of software that produces finite-capacity production schedules |
| **ATP** | Available-to-Promise — inventory/capacity visibility for sales commitments; out of scope v1 |
| **Attainment %** | Production MT vs. target MT for a shift or period |
| **Availability** | (Run Time) / (Planned Production Time) — first component of OEE |
| **BEE** | Bureau of Energy Efficiency — Indian government body administering PAT and CCTS |
| **BOM** | Bill of Materials — the list of components needed to produce an item |
| **BRSR** | Business Responsibility and Sustainability Reporting — SEBI-mandated ESG disclosure framework |
| **CA** | Certificate Authority — issues TLS certificates |
| **CCTS** | Carbon Credit Trading Scheme — India’s compliance carbon market, operationalised June 2025 |
| **CEA** | Central Electricity Authority — publishes India’s grid emission factor |
| **Changeover Matrix** | Grade-to-grade setup time table; the single most critical master data object for scheduling |
| **CIS Controls** | Center for Internet Security baseline security controls framework |
| **CoA** | Certificate of Analysis — steel industry quality document, issued per coil / heat |
| **Coil Stage** | Physical material flow stage (stores / pickling / rolling / annealing / rewind / FG / dispatched) |
| **Confirmation (Production)** | SAP write-back confirming what was produced against a work order |
| **Contracted MD** | Contracted Maximum Demand — the kVA ceiling a DISCOM sets in the electricity tariff |
| **Continuous Aggregate** | TimescaleDB feature: auto-refreshed materialised view over a hypertable |
| **Core VLAN** | The network zone where Zedral platform services run |
| **CP-SAT** | Constraint Programming over Boolean SAT — the scheduling solver in Google OR-Tools |
| **CRP** | Capacity Requirements Planning — detailed time-sequenced capacity view (M4 territory) |
| **CRS** | Cold Rolling Strip / Shop — the cold-rolling mill operation at Hero Steels; CRS-1, CRS-2, CRS-3 are individual lines |
| **DISCOM** | Distribution Company — regional electricity retailer in India |
| **Dispatch List** | Shift-level ordered list of operations an operator executes |
| **DMZ** | Demilitarised Zone — network zone used for controlled egress between Core and Internet |
| **DPR** | Daily Production Report — plant-standard document summarising each day’s output |
| **DR / RPO / RTO** | Disaster Recovery / Recovery Point Objective / Recovery Time Objective |
| **EMS** | Energy Management System |
| **EnPI** | Energy Performance Indicator (ISO 50001) |
| **ERP** | Enterprise Resource Planning — usually refers to SAP at Hero Steels’ scale |
| **ESG** | Environmental, Social, and Governance — umbrella term for non-financial corporate disclosure |
| **Event** | A fact that happened — the atomic unit of the unified event backbone |
| **Event Envelope** | The standardised metadata wrapper around every event |
| **FG** | Finished Goods |
| **FORGE** | Internal codename for Zedral’s framework / architecture (legacy) |
| **Frozen Window** | The first 2 hours of the active schedule, immutable regardless of replan |
| **Gauge** | Thickness of steel strip, in mm |
| **Goods Receipt** | The SAP MM transaction recording receipt of material |
| **Goods Issue** | The SAP MM transaction recording consumption of material |
| **GRI** | Global Reporting Initiative — international ESG reporting framework |
| **GWP** | Global Warming Potential — conversion factor between different greenhouse gases and CO₂-equivalent |
| **Hero Steels (HSL)** | Anchor pilot customer; Hero Steels Limited, Ludhiana |
| **HMAC** | Hash-based Message Authentication Code — cryptographic signature mechanism used on event envelopes |
| **HMI** | Human Machine Interface — typically SCADA-layer UI at the machine |
| **HR Coil** | Hot-Rolled Coil — the input feedstock to a cold-rolling mill |
| **Hypertable** | TimescaleDB primary abstraction for time-series tables; auto-partitioned |
| **IDoc** | SAP’s native batch-integration document format (rejected for Zedral integration) |
| **ISA-95** | The ANSI/ISA standard for enterprise-control system integration; defines the 5-level Purdue Model |
| **Ideal Cycle Time** | Rated run rate from routing master; denominator for Performance in OEE |
| **JTBD** | Jobs To Be Done — product management framework for user goals |
| **KPI** | Key Performance Indicator |
| **kWh / kW / kVA / kVAR** | Energy (kWh) vs. instantaneous power (kW) vs. apparent power (kVA) vs. reactive power (kVAR) |
| **LDAP / AD** | Lightweight Directory Access Protocol / Microsoft Active Directory |
| **M1–M8** | The 8 workflow-ordered modules of Zedral |
| **Maker-Checker** | A controls pattern where one user initiates a change and a different user approves it |
| **Master Data** | Reference data shared across modules: work centres, routings, calendars, changeover matrix etc. (M2) |
| **MB51 / MB52** | SAP MM transactions for material movements (MB51) and stock overview (MB52) |
| **MD (Maximum Demand)** | Peak kVA drawn in a billing period; drives demand charges |
| **MES** | Manufacturing Execution System — the Level 3 software that links planning to floor execution |
| **MESA** | Manufacturing Enterprise Solutions Association — defined the 11 MESA functions of an MES |
| **Modbus** | Industrial communication protocol (serial RTU or TCP) |
| **MOU** | Memorandum of Understanding |
| **MQTT** | Lightweight IoT messaging protocol |
| **MTBF** | Mean Time Between Failures |
| **MTPA** | Metric Tonnes Per Annum |
| **MTTR** | Mean Time To Repair |
| **NCR** | Non-Conformance Report — quality event where something didn’t meet spec |
| **OData** | Open Data Protocol — SAP’s REST-like integration standard |
| **OEE** | Overall Equipment Effectiveness = Availability × Performance × Quality |
| **OIDC** | OpenID Connect — identity protocol built on OAuth 2.0 |
| **OPC-UA** | OPC Unified Architecture — modern, platform-independent, secure industrial communication protocol |
| **OR-Tools** | Google’s optimisation library; CP-SAT solver is its flagship |
| **OT** | Operational Technology — the machine-control network (vs. IT) |
| **OTIF** | On-Time In-Full — customer delivery KPI |
| **Outbox Pattern** | Transactional durability pattern — events written to DB in the same transaction as state change, then relayed async to message bus |
| **PAT** | Perform, Achieve, Trade — BEE’s energy efficiency scheme |
| **Pareto** | 80/20 analysis; in M7 context, typically downtime by reason category |
| **PF** | Power Factor — ratio of real to apparent power |
| **Performance (OEE)** | (Actual Count × Ideal Cycle Time) / Run Time — second component of OEE |
| **Pickling** | Acid bath process removing mill scale from HR coil; upstream of cold rolling |
| **Pin (M4)** | Planner-enforced scheduling constraint the solver must respect |
| **PLC** | Programmable Logic Controller — machine-level real-time controller |
| **PM** | Preventive Maintenance |
| **Projection** | A read-side table built by consuming events from the backbone (CQRS terminology) |
| **PSPCL** | Punjab State Power Corporation Limited — Hero Steels’ DISCOM |
| **Purdue Model** | The 5-level hierarchy of industrial automation (0: physical; 1: sensors; 2: control; 3: MES; 4: ERP) |
| **Quality (OEE)** | (Good Count) / (Total Count) — third component of OEE |
| **RACI** | Responsible / Accountable / Consulted / Informed — team responsibility matrix |
| **RBAC** | Role-Based Access Control |
| **RCCP** | Rough-Cut Capacity Planning — mid-range capacity view (weeks to months) |
| **Readiness (Material)** | Per-WO status: ready / partial / pending / shortage |
| **Redpanda** | Kafka-API-compatible event streaming platform |
| **Reject** | A production event where produced material fails quality and must be held |
| **Reservation (Coil)** | Pre-allocation of a specific coil to a specific WO |
| **Routing** | Sequence of operations to produce a given material |
| **SAP ECC** | SAP ERP Central Component — the on-premise SAP ERP product |
| **SAP Modules** | MM (Materials) / SD (Sales) / PP (Production) / QM (Quality) / PM (Maintenance) / CO (Controlling) / FI (Finance) |
| **SCADA** | Supervisory Control and Data Acquisition — the OT-layer software that monitors and controls process equipment |
| **Scope 1 / 2 / 3** | GHG Protocol emission categories — direct / purchased energy / value-chain |
| **SEBI** | Securities and Exchange Board of India |
| **SEC** | Specific Energy Consumption — energy per unit of production (kWh/tonne) |
| **Semver** | Semantic Versioning (MAJOR.MINOR.PATCH) |
| **Shift (A/B/C)** | Eight-hour shifts at Hero Steels: A (06:00–14:00), B (14:00–22:00), C (22:00–06:00) |
| **SLO / SLA / SLI** | Service Level Objective / Agreement / Indicator |
| **SMED** | Single-Minute Exchange of Die — the lean methodology for reducing changeover time |
| **SOP** | Standard Operating Procedure |
| **SPC** | Statistical Process Control |
| **Supersession (Confirmation)** | Correction of a prior confirmation by creating a new one that references and invalidates the original |
| **Tag** | A named data point on a SCADA/PLC system |
| **TDE** | Transparent Data Encryption — database-level encryption at rest |
| **Timescale / TimescaleDB** | Postgres extension for time-series data |
| **TLS** | Transport Layer Security — encryption for network traffic |
| **TOD** | Time-of-Day (tariff) — variable DISCOM rates by hour |
| **UUID-v7** | Time-ordered UUID variant; database-friendly sort order |
| **Variance** | Plan vs. actual delta on a scheduled operation |
| **WC** | Work Centre — a schedulable production unit (e.g., CRS-1) |
| **WIP** | Work In Progress — inventory between process stages |
| **WO / SO** | Work Order / Sales Order |
| **Zedral Release Bundle** | Self-contained signed offline-installable deployment artefact |

## Appendix B — Consolidated Data Dictionary

### Schema Ownership Map

Visual overview of the 9 schemas and their relationships:

flowchart LR
    subgraph Platform["Platform Schemas"]
        core[("core<br/>worker_inputs<br/>sap_sync_log<br/>config<br/>audit")]
        master[("master<br/>work_centres<br/>routings<br/>changeover_matrix<br/>calendars<br/>materials<br/>customers<br/>emission_factors")]
    end
    
    subgraph Demand["Demand-Side Schemas"]
        m1[("m1_demand<br/>work_orders<br/>sales_orders<br/>priority_history<br/>overrides")]
        m3[("m3_capacity<br/>capacity_snapshots<br/>overload_events<br/>actions")]
        m4[("m4_schedule<br/>schedules<br/>scheduled_ops<br/>pins<br/>what_if<br/>solver_runs")]
    end
    
    subgraph Execution["Execution-Side Schemas"]
        m5a[("m5a_material<br/>coils<br/>stage_history<br/>wo_readiness<br/>pre_allocations<br/>inbound")]
        m6[("m6_dispatch<br/>dispatch_lists<br/>execution_events<br/>stoppages<br/>handovers<br/>setup_timings")]
        m7[("m7_performance<br/>kpi_snapshots ⏱<br/>production_confirmations<br/>variance<br/>shift_summaries")]
        m8[("m8_energy<br/>meters<br/>meter_readings ⏱<br/>sec_snapshots ⏱<br/>discom_bills<br/>emissions_summary")]
    end
    
    master -.reference.-> m1 & m3 & m4 & m5a & m6 & m7 & m8
    m1 --> m3 & m4 & m5a & m7
    m3 --> m4
    m5a --> m4 & m6 & m7
    m4 --> m6
    m6 --> m7
    m7 --> m8
    m8 --> m7

    classDef timescale fill:#fff9c4,stroke:#f57f17,stroke-width:2px
    classDef platform fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef demand fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef exec fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    
    class core,master platform
    class m1,m3,m4 demand
    class m5a,m6,m7,m8 exec

**Symbol:** ⏱ = TimescaleDB hypertable (time-series partitioned)

Every table across every schema, with owner module, purpose, and retention. Full DDL lives in the module docs; this index provides navigation.

## Schema Ownership

| Schema | Owner Module | Purpose |
| --- | --- | --- |
| core | Phase 0 | Cross-cutting — worker_inputs, sap_sync_log, kpi_snapshots (bootstrap), machine_status, config, feature_flags, job_runs, audit |
| master | M2 (Phase 0) | Reference data shared across all modules |
| m1_demand | M1 | Work orders, sales orders, priorities |
| m3_capacity | M3 | Capacity snapshots, overloads |
| m4_schedule | M4 | Schedules, scheduled operations, pins, what-ifs |
| m5a_material | M5a | Coils, readiness, pre-allocations, inbound, forecasts |
| m6_dispatch | M6 | Dispatch lists, execution events, stoppages, handovers, setup timings |
| m7_performance | M7 | KPI snapshots (Timescale), production confirmations, variance |
| m8_energy | M8-lite | Meters, readings (Timescale), SEC, emissions, DISCOM bills |

## Table Inventory

| Schema.Table | Module | Purpose | Retention (hot) |
| --- | --- | --- | --- |
| master.work_centres | M2 | CRS lines + capabilities | Indefinite |
| master.routings | M2 | Material → operation sequence | Indefinite (versioned) |
| master.changeover_matrix | M2 | Grade-to-grade setup times (**critical**) | Indefinite |
| master.resource_calendars | M2 | Shift + PM + holiday schedule | Indefinite |
| master.rolls | M2 | Roll inventory, remaining life | Indefinite |
| master.operator_skills | M2 | Certification matrix | Indefinite |
| master.quality_specs | M2 | Grade spec limits | Indefinite |
| master.emission_factors | M2 | Scope factor lookup | Indefinite |
| master.stoppage_codes | M2 | **v0.2 NEW** Stoppage classification catalogue (Hero: 16 codes) | Indefinite (versioned) |
| master.defect_codes | M2 | **v0.2 NEW** Defect classification catalogue (Hero: 45 codes) | Indefinite (versioned) |
| master.materials | M2 | SAP material master sync | Indefinite |
| master.customers | M2 | SAP customer master sync | Indefinite |
| master.audit_log | M2 | Master data change audit | 7 years |
| m1_demand.sales_orders | M1 | SO sync from SAP SD | 2 yr closed → archive |
| m1_demand.sales_order_items | M1 | SO line items | Same as sales_orders |
| m1_demand.work_orders | M1 | WO from SAP PP + manual | 2 yr closed → archive |
| m1_demand.wo_so_link | M1 | WO↔SO many-to-many | Same as work_orders |
| m1_demand.priority_score_history | M1 | Scoring audit | 1 yr → 7 yr archive |
| m1_demand.priority_overrides | M1 | Manual override audit | Active indefinite, closed 90d |
| m1_demand.sap_watermarks | M1 | SAP pull tracking | Permanent (tiny) |
| m1_demand.validation_errors | M1 | WO validation failures | 90 days → 1 yr archive |
| m3_capacity.capacity_snapshots | M3 | Per-bucket load/available | 7 days fresh, downsampled to 1 yr |
| m3_capacity.wo_bucket_load | M3 | Drill-down WOs per bucket | Tied to snapshots |
| m3_capacity.overload_events | M3 | Overload lifecycle audit | 2 yr → 5 yr archive |
| m3_capacity.capacity_actions | M3 | Planner resolution audit | Same as overloads |
| m4_schedule.schedules | M4 | Versioned schedule rows | Active + 30 days superseded |
| m4_schedule.scheduled_operations | M4 | Timeline rows | Tied to schedules |
| m4_schedule.planner_pins | M4 | Manual scheduling constraints | Active indefinite |
| m4_schedule.what_if_scenarios | M4 | Sandboxed scenarios | 30 days unless saved |
| m4_schedule.solver_runs | M4 | Every solver invocation audit | 30 days → 1 yr archive |
| m4_schedule.matrix_misses | M4 | Missing changeover entries | 90 days (feeds M2 learner) |
| m5a_material.coils | M5a | Every physical coil (HR + WIP + FG) | Active indefinite, closed 2 yr |
| m5a_material.coil_stage_history | M5a | Transition audit | 1 yr → 7 yr archive |
| m5a_material.wo_readiness | M5a | Denormalised readiness per WO | Active (refreshed) |
| m5a_material.pre_allocations | M5a | Coil→WO reservations | Active indefinite, closed 90d |
| m5a_material.inbound_expected | M5a | GR’d but not arrived | Active indefinite |
| m5a_material.shortage_forecast | M5a | Weekly forecast runs | 90 days → 1 yr |
| m6_dispatch.dispatch_lists | M6 | Shift-level dispatch headers | 30 days superseded → 5 yr archive |
| m6_dispatch.dispatch_items | M6 | Ordered items within dispatch | Tied to lists |
| m6_dispatch.execution_events | M6 | **High-volume** append-only event log | 1 yr → 5 yr archive → 7 yr cold |
| m6_dispatch.stoppages | M6 | Materialised stoppage records | 2 yr → 7 yr archive |
| m6_dispatch.rejects | M6 | Reject events (pre-M5b placeholder) | 2 yr → 7 yr archive |
| m6_dispatch.shift_handovers | M6 | Shift-to-shift handover records | 2 yr → 7 yr archive |
| m6_dispatch.setup_timings | M6 | Extracted setup observations (**feeds M2 learner**) | 2 yr → 5 yr archive |
| m6_dispatch.production_passes | M6 | **v0.2 NEW** Per-pass thickness + process variables (multi-pass cold rolling) | 2 yr → 5 yr archive |
| m6_dispatch.roll_assignments | M6 | **v0.2 NEW** Which rolls ran which dispatch item | 2 yr → 5 yr archive |
| m6_dispatch.roll_changes | M6 | **v0.2 NEW** Roll change events with out/in roll IDs | 2 yr → 7 yr archive |
| m6_dispatch.shift_crew_assignments | M6 | **v0.2 NEW** Per-shift crew roster (Line Incharge, crew, crane operator) | 2 yr → 7 yr archive |
| m7_performance.kpi_snapshots | M7 | **Timescale hypertable** — core KPI time-series | 2 yr (compressed) → continuous aggregates permanent |
| m7_performance.production_confirmations | M7 | SAP confirmation truth | **7 years** |
| m7_performance.plan_actual_variance | M7 | Per-op variance | 1 yr → 5 yr archive |
| m7_performance.shift_summaries | M7 | Shift rollups | 2 yr → 7 yr archive |
| m7_performance.downtime_pareto_cache | M7 | Materialised Pareto | 1 yr (rebuildable) |
| m7_performance.setup_time_trend | M7 | Weekly setup rollups | 3 yr |
| m7_performance.schedule_adherence | M7 | Per-schedule adherence | Tied to schedules |
| m8_energy.meters | M8-lite | Meter inventory | Active indefinite |
| m8_energy.meter_readings | M8-lite | **Timescale hypertable** — raw meter reads | 1 yr (compressed) → 5 yr |
| m8_energy.interval_energy | M8-lite | Computed deltas | Same |
| m8_energy.sec_snapshots | M8-lite | SEC per bucket | 2 yr, aggregates permanent |
| m8_energy.discom_bills | M8-lite | Billing records with reconciliation | 7 years |
| m8_energy.meter_health | M8-lite | Current state per meter | Current only |
| m8_energy.emissions_summary | M8-lite | Scope 2 aggregates | Permanent (audit) |

Total: **~56 tables + 3 Timescale hypertables** across 9 schemas (v0.2 adds 2 master catalogue tables + 4 M6 tables).

## Appendix C — Consolidated Event Taxonomy

All events across the Unified Event Backbone, with publisher, consumers, and volume estimate at Hero Steels scale.

## Event Catalogue

| Topic | Publisher | Consumers | Partition Key | Est. Events/Day | Retention |
| --- | --- | --- | --- | --- | --- |
| erp.work_order.received | M1 | M3, M4, M5a, M7 | wo_id | ~20 | 7 days |
| erp.work_order.updated | M1 | M3, M4, M5a, M7 | wo_id | ~30 | 7 days |
| erp.work_order.cancelled | M1 | M3, M4, M5a, M7 | wo_id | ~2 | 7 days |
| erp.sales_order.received | M1 | (audit) | so_id | ~13 | 7 days |
| erp.sales_order.updated | M1 | — | so_id | ~5 | 7 days |
| erp.material_master.updated | M2 (via SAP Sync) | M1, M5a, M7 | material_code | ~2 | 7 days |
| master.changeover_matrix.updated | M2 | M4 | wc_id | ~5 | 30 days |
| master.calendar.updated | M2 | M3, M4 | wc_id+date | ~10 | 7 days |
| master.customers.updated | M2 | M1 | customer_id | ~1 | 7 days |
| master.emission_factors.updated | M2 | M8 | factor_id | ~0.1 | 30 days |
| master.operator_skills.updated | M2 | M6 | operator_id | ~0.3 | 7 days |
| master.routings.updated | M2 | M1, M3, M4 | material_code | ~2 | 7 days |
| plan.capacity.calculated | M3 | M4, M7, UI | snapshot_batch_id | ~100 | 7 days |
| plan.capacity.overload_detected | M3 | Notification, M4 | overload_id | ~2 | 30 days |
| plan.capacity.overload_resolved | M3 | Notification | overload_id | ~2 | 30 days |
| plan.schedule.run_started | M4 | UI, observability | schedule_id | ~15 | 7 days |
| plan.schedule.computed | M4 | M6, M7, UI | schedule_id | ~15 | 30 days |
| plan.schedule.published | M4 | **M6** (dispatch gen) | schedule_id | ~5 | 30 days |
| plan.schedule.infeasible | M4 | Notification | schedule_id | ~0.5 | 30 days |
| plan.scheduled_operation.changed | M4 | M6 | op_id | ~30 | 7 days |
| material.coil.received | M5a | M7 | coil_id | ~12 | 90 days |
| material.coil.staged | M5a | M6 | coil_id | ~70 | 30 days |
| material.coil.reserved | M5a | M1, M4 | coil_id | ~20 | 30 days |
| material.coil.consumed | M5a | M7 (via M6 trigger) | coil_id | ~12 | 30 days |
| material.coil.allocated (WO ready) | M5a | **M4** | wo_id | ~15 | 30 days |
| material.coil.shortage_detected | M5a | **M1**, M4, Notification | wo_id | ~3 | 90 days |
| material.coil.shortage_resolved | M5a | M1, M4 | wo_id | ~3 | 90 days |
| material.coil.quality_hold_set | M5a (v1) / M5b (v2) | M4, M1 | coil_id | ~1 | 90 days |
| material.coil.quality_hold_released | Same | Same | coil_id | ~1 | 90 days |
| material.coil.aged_out | M5a | Notification | coil_id | ~0.5 | 90 days |
| material.shortage_forecast.computed | M5a | Notification | forecast_id | ~0.1 (weekly) | 90 days |
| floor.dispatch.issued | M6 | UI, observability | dispatch_id | ~9 | 7 days |
| floor.setup.started | M6 | M7 (timing), matrix learner | wc_id | ~15 | 30 days |
| floor.setup.ended | M6 | **M7**, M2 learner | wc_id | ~15 | 30 days |
| floor.setup.abandoned | M6 | M7 | wc_id | ~0.5 | 30 days |
| floor.production.started | M6 | M7, M8 | wo_id | ~15 | 30 days |
| floor.production.completed | M6 | **M7** (→ SAP), M5a, M1, M8 | wo_id | ~15 | 30 days |
| floor.stoppage.started | M6 | M7, M5c, Notification | wc_id | ~10 | 30 days |
| floor.stoppage.ended | M6 | M7 | wc_id | ~10 | 30 days |
| floor.reject.raised | M6 | M7 (→ M5b in Phase 2) | ncr_id | ~4 | 90 days |
| floor.shift.handover_submitted | M6 | M7 | handover_id | ~9 | 30 days |
| floor.rush_order.injected | M6 | M4 (replan) | dispatch_id | ~2 | 30 days |
| floor.shift.summary_computed | M6 | M7, UI | — | ~9 | 30 days |
| floor.pass.started | M6 | M7 (timing), UI | wc_id | ~45 | 30 days |
| floor.pass.completed | M6 | **M7** (variance, shift summary) | wc_id | ~45 | 30 days |
| floor.roll.changed | M6 | M5c (Phase 2), M2 (rolls update), UI | wc_id | ~0.5 | 90 days |
| floor.shift.crew_confirmed | M6 | M7 (shift summary), UI, audit | wc_id | ~9 | 30 days |
| floor.shift_report.signed | M6 | M7, Notification (Shift Manager) | handover_id | ~9 | 7 years (regulatory) |
| floor.shift_report.approved | M6 | M7, audit | handover_id | ~9 | 7 years (regulatory) |
| floor.shift_report.correction_requested | M6 | Notification (Line Incharge) | handover_id | ~0.5 | 90 days |
| asset.pm.scheduled | M5c | M3, M4 | wc_id | ~1 | 30 days |
| asset.pm.cancelled | M5c | M3, M4 | wc_id | ~0.3 | 30 days |
| asset.breakdown.reported | M5c (v2) / M6 | M3, M4, M7 | wc_id | ~2 | 90 days |
| asset.breakdown.resolved | Same | M3, M4 | wc_id | ~2 | 90 days |
| production.wo.confirmed | M7 | **SAP** (→ M1, M5a, M8) | wo_id | ~15 | 30 days |
| performance.kpi_snapshot.computed | M7 | UI, M8 | — | ~800 (mostly deduped) | 7 days |
| performance.oee.low_alert | M7 | Notification | summary_id | ~0.5 | 30 days |
| performance.sap.confirm_failed | M7 | Notification | confirmation_id | ~0.2 | 90 days |
| performance.variance.detected | M7 | UI | variance_id | ~3 | 30 days |
| performance.shift.summary_computed | M7 | UI | summary_id | ~9 | 30 days |
| energy.meter.reading | Edge→M8 | M7, observability | meter_id | ~288 | 7 days |
| energy.interval.computed | M8 | M7 | meter_id | ~288 | 7 days |
| energy.sec.computed | M8 | **M7** | wc_id+bucket | ~400 | 7 days |
| energy.meter.health_changed | M8 | Notification | meter_id | ~0.2 | 30 days |
| energy.peak_demand.exceeded | M8 | Notification | site_id | ~0.5 | 365 days |
| energy.discom_bill.uploaded | M8 | (audit) | bill_id | ~0.03 (monthly) | 7 days |
| energy.discom_bill.reconciled | M8 | Notification | bill_id | ~0.03 | 90 days |
| erp.sync.requested | Multiple | SAP Sync Worker | sync_id | ~200 | 7 days |
| erp.sync.completed | SAP Sync Worker | Originator | sync_id | ~200 | 7 days |

**Total event volume at Hero Steels:** ~2,790 events/day across ~60 topics (v0.2 adds ~90 events/day, primarily from floor.pass.* events — roughly 45 pairs of pass events = ~90 events/day at 3 passes-per-coil × 15 coils/day). Peak burst: shift-change + multi-pass concurrency (~60 events in 10-minute window).

## Cross-Module Event Flow — The Backbone’s Load-Bearing Pairs

The most critical event linkages:

- **plan.schedule.published**** ****(M4) → M6** — triggers dispatch list generation. Without this, the floor doesn’t know what to run.

- **floor.production.completed**** ****(M6) → M7 → SAP** — the loop that closes production truth back to the enterprise system. Critical path for financial correctness.

- **material.coil.allocated**** ****(M5a) → M4** — unblocks WOs for scheduling. Without this, schedules pile up on material-pending orders.

- **floor.setup.ended**** ****(M6) → M7 + M2 matrix learner** — feeds the SMED feedback loop. Without this, the changeover matrix never learns.

- **energy.sec.computed**** ****(M8) → M7** — wires energy into OEE. Without this, the ESG thesis is disconnected from operations.

## Appendix D — Consolidated API Reference

All HTTP endpoints across all modules, organised by module.

**Common conventions:** - Auth: Keycloak OIDC bearer token (except Floor Console which uses device cert + operator badge) - Base path: /api/<module>/... - Error responses: RFC 7807 Problem Details - Pagination: limit/offset with total in response - Rate limits: documented per module (see individual module docs)

## M1 — Demand & Order Management (/api/m1/*)

**Read:** - GET /api/m1/work-orders — list WOs with filters - GET /api/m1/work-orders/{wo_id} — WO detail - GET /api/m1/work-orders/{wo_id}/priority-history - GET /api/m1/demand-summary — aggregate view - GET /api/m1/work-orders/queue — priority-ranked queue (consumed by M4)

**Write:** - POST /api/m1/work-orders — create manual WO (role: planner+) - PATCH /api/m1/work-orders/{wo_id}/priority — override priority - PATCH /api/m1/work-orders/{wo_id}/status — status transitions - POST /api/m1/work-orders/{wo_id}/reconcile — link manual to SAP WO

**Admin:** - POST /api/m1/sync/trigger · GET /api/m1/sync/status - POST /api/m1/priority-weights - GET /api/m1/validation-errors

## M3 — Capacity Planning (/api/m3/*)

**Read:** - GET /api/m3/capacity — snapshot feed with filters - GET /api/m3/capacity/bucket/{wc_id}/{bucket_start} — drill-down - GET /api/m3/overloads — active + historical - GET /api/m3/summary — rollup for dashboards

**Write:** - POST /api/m3/capacity/recalculate — manual trigger (role: planner+) - POST /api/m3/capacity-actions — planner resolution - POST /api/m3/capacity/pin-wo — force WO to specific line in RCCP

**Admin:** - PUT /api/m3/config · GET /api/m3/diagnostics

## M4 — APS Scheduler (/api/m4/*)

**Read:** - GET /api/m4/schedule/current — active published schedule with ops - GET /api/m4/schedule/{schedule_id} — specific version - GET /api/m4/schedule/gantt — Gantt feed with filters - GET /api/m4/schedule/diff — compare two schedules - GET /api/m4/wo-status/{wo_id} — where is this WO - GET /api/m4/solver-history — audit (role: planner+)

**Write:** - POST /api/m4/schedule/run — trigger scheduling run - POST /api/m4/schedule/{id}/approve — publish (role: planner+) - POST /api/m4/schedule/{id}/reject - PATCH /api/m4/schedule/operations/{op_id} — drag-drop with auto-pin - POST /api/m4/pins · DELETE /api/m4/pins/{pin_id} - POST /api/m4/what-if — create scenario - GET /api/m4/what-if/{scenario_id}/compare - POST /api/m4/what-if/{scenario_id}/promote

**Admin:** - PUT /api/m4/config · GET /api/m4/diagnostics - POST /api/m4/cache/invalidate

## M5a — Material & Inventory (/api/m5a/*)

**Read:** - GET /api/m5a/coils — search/list with filters - GET /api/m5a/coils/{coil_id} — detail + lifecycle - GET /api/m5a/wo-readiness — readiness dashboard - GET /api/m5a/wo-readiness/{wo_id} — per-WO drill-down - GET /api/m5a/stock-summary — aggregate stock - GET /api/m5a/inbound-expected — pending inbound - GET /api/m5a/shortage-forecast/latest

**Write:** - POST /api/m5a/coils/{coil_id}/scan — Floor Console stage transition - POST /api/m5a/coils/{coil_id}/reserve · DELETE /api/m5a/coils/{coil_id}/reserve - POST /api/m5a/coils/{coil_id}/quality-hold · DELETE /api/m5a/coils/{coil_id}/quality-hold - POST /api/m5a/coils/manual — manual coil creation (bootstrap) - PATCH /api/m5a/coils/{coil_id} — adjust attributes - POST /api/m5a/inbound-expected - POST /api/m5a/shortage-forecast/run

**Admin:** - POST /api/m5a/sync/trigger · GET /api/m5a/reconciliation/latest · POST /api/m5a/reconciliation/run

## M6 — Dispatch & Execution (/api/m6/*)

**Floor Console (device-authenticated):** - POST /api/m6/events — **single event submission endpoint for all floor events** - GET /api/m6/dispatch/current — current dispatch for device’s line+shift - GET /api/m6/dispatch/item/{item_id} — item detail - POST /api/m6/coils/scan — thin wrapper over M5a scan + logs mount event

**Ops Console (user-authenticated):** - GET /api/m6/live — real-time lines view - GET /api/m6/shift-summary/{wc_id}/{shift_date}/{shift} - POST /api/m6/dispatch/rush-inject — supervisor rush order - POST /api/m6/dispatch/items/{item_id}/skip - GET /api/m6/stoppages · GET /api/m6/downtime-pareto - GET /api/m6/handovers/{wc_id}/latest - POST /api/m6/handovers/sign

**Admin:** - PUT /api/m6/config · POST /api/m6/devices/provision · GET /api/m6/devices · GET /api/m6/diagnostics

## M7 — Performance Analytics & OEE (/api/m7/*)

**Read:** - GET /api/m7/kpi/live — real-time KPI across all lines - GET /api/m7/kpi/trend — time-series (granularity / metric / range) - GET /api/m7/shift-summary/{wc_id}/{shift_date}/{shift} - GET /api/m7/downtime-pareto - GET /api/m7/setup-trend - GET /api/m7/schedule-adherence/{schedule_id} - GET /api/m7/plan-actual-variance - GET /api/m7/production-confirmations - GET /api/m7/sec-trend · GET /api/m7/daily-rollup/{date} · GET /api/m7/weekly-rollup/{week_start}

**Write:** - POST /api/m7/production-confirmations/{id}/approve (if supervisor-required mode) - POST /api/m7/production-confirmations/{id}/correct — supersede - POST /api/m7/production-confirmations/{id}/retry-sap - POST /api/m7/shift-summary/{id}/notes

**Admin / Export:** - POST /api/m7/kpi/recompute · PUT /api/m7/config · GET /api/m7/diagnostics - GET /api/m7/export/weekly-pack.pdf · /monthly-pack.pdf · /shift-summary.pdf · /kpi-data.xlsx

## M8-lite — Energy (/api/m8/*)

**Read:** - GET /api/m8/energy/live — dashboard feed - GET /api/m8/energy/trend — time-series - GET /api/m8/sec — SEC snapshots - GET /api/m8/emissions/summary - GET /api/m8/meters · GET /api/m8/meters/{meter_id} - GET /api/m8/discom-bills · GET /api/m8/discom-bills/{bill_id} - GET /api/m8/peak-demand/log

**Write:** - POST /api/m8/discom-bills — multipart upload - POST /api/m8/meters — provision (role: platform_admin) - PATCH /api/m8/meters/{meter_id} - POST /api/m8/meters/{meter_id}/decommission

**Admin / Export:** - POST /api/m8/sec/recompute · POST /api/m8/emissions/recompute · GET /api/m8/diagnostics - GET /api/m8/export/energy-report.pdf · /sec-trend.xlsx

## Cross-cutting Platform APIs

**M2 Master Data (****/api/master/*****):** detailed endpoints in Phase 0 §5.4

**Auth (****/auth/*****):** Keycloak OIDC standard flows

**Admin (****/api/admin/*****):** - Health: /healthz, /readyz, /metrics (Prometheus) - System config: /api/admin/config - User / role management: via Keycloak admin

**Total endpoints across all modules: ~120** (the platform is API-rich by design — a frontend engineer can build any UI without backend code changes for most variations).

## The 5 Load-Bearing Event Chains — Visual Storyboard

These are the five end-to-end event sequences whose failure would break the platform. Understanding these is understanding how Zedral works.

### Chain 1 — The Plan Dispatches to the Floor

sequenceDiagram
    participant Planner
    participant M4 as M4 Scheduler
    participant Bus as Event Backbone
    participant M6 as M6 Dispatch
    participant Andon as Andon Terminal
    participant Operator

    Planner->>M4: Run Schedule
    M4->>M4: Heuristic seed + CP-SAT
    M4->>Bus: plan.schedule.computed
    Planner->>M4: Approve
    M4->>Bus: plan.schedule.published
    Bus->>M6: Consume published event
    M6->>M6: Generate dispatch lists<br/>per line per shift
    M6->>Bus: floor.dispatch.issued
    Andon->>M6: GET /dispatch/current<br/>(30-sec poll)
    M6-->>Andon: Dispatch items
    Andon->>Operator: Display next job

### Chain 2 — The Floor Confirms and Closes Back to SAP

sequenceDiagram
    participant Operator
    participant Andon
    participant M6
    participant Bus as Event Backbone
    participant M7
    participant M5a
    participant M1
    participant SAP

    Operator->>Andon: Tap "Complete Job"
    Andon->>M6: POST /events<br/>(production_completed)
    M6->>Bus: floor.production.completed
    Bus->>M7: Consume
    M7->>M7: Create production_confirmation<br/>status=PENDING
    M7->>Bus: production.wo.confirmed
    
    par Parallel consumers
        Bus->>M5a: Consume (coil consumed)
        M5a->>M5a: Decrement weight
    and
        Bus->>M1: Consume (qty update)
        M1->>M1: wo.qty_confirmed updated<br/>→ status=complete
    end
    
    M7->>SAP: POST OData<br/>(101 GR + 261 GI)
    SAP-->>M7: Confirmation doc ref
    M7->>M7: status=SUCCESS

### Chain 3 — Material Readiness Unblocks the Scheduler

sequenceDiagram
    participant Stores
    participant Andon
    participant M5a
    participant Bus as Event Backbone
    participant M4
    participant Planner

    Note over M5a: WO in shortage state<br/>(material not at stores)
    M5a->>Bus: material.coil.shortage_detected<br/>(earlier)
    
    Stores->>Andon: Scan incoming HR coil
    Andon->>M5a: POST /coils/{id}/scan<br/>(to stage: stores)
    M5a->>M5a: Update coil<br/>Recompute readiness
    M5a->>Bus: material.coil.received
    M5a->>Bus: material.coil.allocated<br/>(WO now ready)
    Bus->>M4: Consume allocated event
    
    alt Rush WO
        M4->>M4: Trigger immediate replan
    else Normal
        M4->>M4: Queue for next scheduled run
    end
    
    M4->>Planner: Schedule updated<br/>(UI refresh)

### Chain 4 — The SMED Feedback Loop (The Matrix Learns)

sequenceDiagram
    participant Operator
    participant Andon
    participant M6
    participant Bus as Event Backbone
    participant M7
    participant M2Learner as M2 Changeover Learner
    participant M4 as M4 (next run)

    Operator->>Andon: Tap "Start Setup"
    Andon->>M6: floor.setup.started
    
    Note over Operator,Andon: ...setup activity...
    
    Operator->>Andon: Tap "Setup Done"
    Andon->>M6: floor.setup.ended
    M6->>M6: Extract setup_timing row<br/>(grade_from→to, duration, context)
    M6->>Bus: floor.setup.ended
    Bus->>M7: Consume (variance calc)
    
    Note over M2Learner: Nightly job
    M2Learner->>M6: SELECT setup_timings<br/>WHERE observed_at > yesterday
    M2Learner->>M2Learner: Group by transition<br/>Compute median<br/>Update confidence
    M2Learner->>Bus: master.changeover_matrix.updated
    
    Note over M4: Next morning
    M4->>M4: Uses updated matrix<br/>Better setup estimates

### Chain 5 — Energy Closes the ESG Loop

sequenceDiagram
    participant Meter as Smart Meter
    participant Edge as Edge Gateway
    participant Bus as Event Backbone
    participant M8
    participant M7
    participant EnergyMgr as Energy Manager

    Meter->>Edge: Modbus poll<br/>(every 15 min)
    Edge->>Edge: Validate, sign HMAC
    Edge->>Bus: energy.meter.reading
    Bus->>M8: Consume
    M8->>M8: Compute interval delta<br/>Persist
    M8->>Bus: energy.interval.computed
    
    Note over M7: Shift closes
    M7->>Bus: performance.kpi_snapshot.computed<br/>(production qty finalised)
    Bus->>M8: Consume
    M8->>M7: Query production qty per bucket
    M8->>M8: Compute SEC = kWh / tonnes<br/>Compute Scope 2
    M8->>Bus: energy.sec.computed
    Bus->>M7: Consume (enrich snapshot)
    
    EnergyMgr->>M8: Open dashboard
    M8-->>EnergyMgr: Live kW, SEC trend,<br/>Emissions total

## Appendix E — Revision History

| Version | Date | Author | Changes |
| --- | --- | --- | --- |
| v0.1 | 2026-04-17 | Product & Systems Engineering | Initial drafts of Phase 0 Foundation Parts 1, 2, 3 |
| v0.1 | 2026-04-17 | Product & Systems Engineering | Phase 0 compiled |
| v0.1 | 2026-04-17 | Product & Systems Engineering | M1 — Demand & Order Management drafted |
| v0.1 | 2026-04-17 | Product & Systems Engineering | M3 — Capacity Planning & RCCP drafted |
| v0.1 | 2026-04-17 | Product & Systems Engineering | M4 — APS Finite Scheduling Engine drafted |
| v0.1 | 2026-04-17 | Product & Systems Engineering | M5a — Material & Inventory Control drafted |
| v0.1 | 2026-04-18 | Product & Systems Engineering | M6 — Dispatch & Execution Control drafted |
| v0.1 | 2026-04-18 | Product & Systems Engineering | M7 — Performance Analytics & OEE drafted |
| v0.1 | 2026-04-19 | Product & Systems Engineering | M8-lite — Energy Aggregation drafted |
| **v0.1** | **2026-04-19** | **Product ****&**** Systems Engineering** | **Mega Production Document compiled** |
| v0.2 | 2026-04-21 | Product & Systems Engineering | Hero Steels manual shift report sheets received (PQR/PRD/0908/02 + PQR/PRD/0908/02/A) |
| v0.2 | 2026-04-24 | Product & Systems Engineering | Field-by-field gap analysis authored (Hero_Sheets_Gap_Analysis.md) |
| v0.2 | 2026-04-24 | Product & Systems Engineering | Hero Steels Configuration Annex authored (Hero_Steels_Configuration_Annex.md) |
| **v0.2** | **2026-04-25** | **Product ****&**** Systems Engineering** | **Mega Doc revised: M2**** ****stoppage_codes**** ****+**** ****defect_codes**** ****entities;**** ****master.rolls**** ****extended; M6 multi-pass**** ****production_passes****, roll tracking, crew assignments; new events (****floor.pass.*****,**** ****floor.roll.changed****,**** ****floor.shift_report.signed/approved****,**** ****floor.shift.crew_confirmed****); M7 shift summary extensions + paper-compatible shift report PDF; UX rewrites for multi-pass, roll change, stoppage catalogue; PD-28 through PD-37 Hero Open Questions; PR-26 through PR-30 new risks. All structural changes surgical — no v0.1 content removed.** |

*End of Zedral Platform — Mega Production Document · v0.2*

*This is the complete Phase 1 engineering handover, with v0.2 amendments driven by the Hero Steels manual sheet grounding exercise. All subsequent changes flow as revision entries above. For Phase 2+ modules (M5b Quality, M5c Maintenance, M8-full), separate production documents will be authored following the same 14-section template and integrated into v0.3+ of this Mega Document.*

*Companion documents (v0.2 release):* - *Hero_Sheets_Gap_Analysis.md** **— internal audit driving these changes (~5,400 words)* - *Hero_Steels_Configuration_Annex.md** **— customer-specific reality layer with 45 defect codes, 16 stoppage codes, 10 Open Questions, full seed data (~6,600 words)* - *Zedral_Program_Summary_Pack.md** **— quick-reference extraction of Part IV + V (regenerate as v0.2)* - *Zedral_Visual_Storyboard.html** **— browser-renderable visual companion (v0.1; visual story remains valid under v0.2)*