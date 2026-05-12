Zedral Platform ��� Phase 0 Foundation Document

Platform Architecture �� Compiled Handover

Product & Systems Engineering

April 2026

Table of Contents

# Zedral Platform — Phase 0 Foundation Document

**Document status:** Draft v0.1 — Compiled · For review **Audience:** Founding engineering team, future hires, pilot customer technical stakeholders **Owner:** Product & Systems Engineering **Anchor pilot:** Hero Steels Limited (Ludhiana) — Cold Rolling Strip operation **Target v1 vertical:** Cold rolling / flat steel products **Deployment model:** On-premise, single-tenant, air-gapped OT with DMZ egress **Compiled from:** Phase 0 Foundation Parts 1, 2, and 3 **Total word count:** ~20,000 words · Est. full-read time: 2–2.5 hours

## How to Read This Document

This is the platform-level architecture foundation for the Zedral product. Every module (M1 through M8) inherits from the decisions captured here. This document is written to be **read once end-to-end before any module-specific work begins**, then referenced repeatedly.

Three reading modes supported:

- **Full read (2–2.5 hours)** — new hires, architects, customer technical stakeholders. Read sections 1–15 in order.

- **Principles-first read (30 min)** — product/engineering leads reviewing decisions. Read sections 1, 2, 14 in order.

- **Reference read (variable)** — module engineers looking up a specific decision. Use the TOC below to jump to the relevant section.

Every ADR, every decision, every deferral has a rationale captured in-line. If something feels arbitrary, it’s because the rationale wasn’t captured well — raise it.

## Master Table of Contents

**Part A — Product ****&**** Conceptual Foundation** 1. Product Definition 2. Architectural Principles — The 10 Commandments 3. System Architecture (C4 Levels 1 & 2) 4. The Unified Event Backbone 5. Master Data Engine — M2

**Part B — Structural ****&**** Integration Foundation** 6. Edge–Core–DMZ Topology 7. Integration Layer 8. Cross-Cutting Services 9. Technology Stack 10. Security & Compliance Baseline

**Part C — Operational ****&**** Evolutionary Foundation** 11. Observability Stack 12. Deployment & Update Strategy 13. Development Standards 14. Open Questions & Deferred Decisions 15. Glossary

**Appendix** - Consolidated Pending Decisions (10 items across Parts 1–3) - Phase 1 Module Roadmap

# Part A — Product & Conceptual Foundation

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
  material_grade     TEXT
);

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

# Part B — Structural & Integration Foundation

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

# Part C — Operational & Evolutionary Foundation

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

# Appendix A — Consolidated Pending Decisions

The following open decisions were raised during Phase 0 drafting. Each has a default that will be applied if no explicit answer is given before Phase 1 begins. Resolving these early reduces rework.

## From Part 1 (Conceptual Foundation)

Four decisions I need before proceeding — otherwise I’ll default as noted:

- **Event envelope signing (§4.3).** HMAC per event adds ~200 bytes per message and a key-management burden. For the pilot, is it acceptable to make signing a configurable flag (default on for shop-floor events, off for system-internal events)? **Default if no answer: flag, on for**** ****floor.***** ****and**** ****asset.breakdown.*****, off for the rest.**

- **M2 entities in scope (§5.1).** I’ve listed 10 entities. Potentially missing: **tool register** (blanking tools, slitter knives), **consumables** (coolant, rolling oil), **packaging specifications**, **heat numbers** (for traceability). Do you want these added to the Phase 0 M2 model, or deferred? **Default: defer tool register and consumables to Phase 2 M5c; add heat_number as a field on**** ****coil_inventory**** ****in Phase 1 M5a; packaging as Phase 3.**

- **SMED bootstrap timing (§5.6).** The 6-week observation window requires a Zedral person embedded at Hero Steels from week 1. Do you have that access lined up? **Default assumption: yes — Hero Steels cooperation confirmed per prior conversations.**

- **Hardware BOM (§3.4).** The ₹11.6L BOM assumes Hero Steels buys the hardware themselves, Zedral delivers only software. Confirm, or should we model a bundled hardware+software offering?

Silence on any of these = I proceed with the defaults and flag as assumptions in the final compiled document.

## From Part 2 (Structural Foundation)

Three decisions:

- **SAP OData Basis prerequisite (§7.1).** Four OData services need to be published or extended by Hero Steels’ SAP Basis team before Phase 1 go-live. Is a named Basis contact already engaged, or does this need to be raised as a dependency now? **If you don’t have one, raise it this week** — 6-week lead time means this is the critical path item.

- **AD federation (§8.1).** Hero Steels — is there an Active Directory to federate against, or do we provision all users locally in Keycloak? If AD exists, we need the LDAP bind account as a Phase 0 prerequisite. **Default if no answer: local Keycloak users in pilot, migrate to AD federation in Phase 2.**

- **Notification channels (§8.3).** Which channels are actually usable at Hero Steels? SMTP relay available? Teams or Slack? SMS gateway? **Default: SMTP + in-app only in Phase 1; add SMS in Phase 2 once customer’s MSG91/Twilio account is available.**

Silence = proceed with defaults.

## From Part 3 (Operational Foundation)

# Appendix B — Phase 1 Module Roadmap

After Phase 0 Foundation is approved, seven Phase 1 module production docs will be written, in dependency order. Each uses the uniform 14-section template:

Scope & non-goals · Personas & JTBDs · Data model · Event schemas · Ingestion flow · Processing logic · Storage strategy · API surface · UI/UX specification · Integration with other modules · SAP bidirectional mapping · Failure modes & recovery · Acceptance criteria · Build plan

### Module delivery sequence

| # | Module | Purpose | Est. doc size | Dependencies |
| --- | --- | --- | --- | --- |
| 1 | **M1 — Demand ****&**** Order Management** | Ingests WO and SO from SAP; maintains priority-ranked demand queue | ~7,000 words | M2 (master data), SAP connector |
| 2 | **M3 — Capacity Planning ****&**** RCCP** | Load vs. capacity traffic light per line per period | ~6,000 words | M1, M2 |
| 3 | **M4 — APS Finite Scheduling Engine** | CP-SAT-based schedule generator with changeover optimisation | ~10,000 words | M1, M2, M3, M5a, M5c |
| 4 | **M5a — Material ****&**** Inventory Control** | Coil inventory, WIP location, shortage prediction | ~7,000 words | M1, SAP MM |
| 5 | **M6 — Dispatch ****&**** Execution Control** | Floor-facing dispatch lists, setup timers, execution events | ~9,000 words | M4, M5a, Andon hardware |
| 6 | **M7 — Performance Analytics ****&**** OEE** | KPI calculator — OEE, variance, Pareto, SEC integration | ~7,000 words | M6, M8-lite |
| 7 | **M8-lite — Energy Aggregation (site-level)** | Smart meter ingest, SEC at plant level, site-level emissions | ~6,000 words | Edge, M2 emission factors |

**Phase 1 build timeline:** Months 2–6 (Hero Steels go-live at end of Month 6)

**Compile step:** After all seven module docs are drafted, a unified Mega Production Document is compiled — Phase 0 + M1 + M3 + M4 + M5a + M6 + M7 + M8-lite — with consolidated glossary, master RACI, per-module hiring JDs, consolidated API reference, consolidated data dictionary, consolidated event taxonomy. Exported to Markdown (source of truth), PDF (regulator/customer handover), and DOCX (internal teams) via Pandoc.

# Revision History

| Version | Date | Author | Changes |
| --- | --- | --- | --- |
| v0.1 | 2026-04-17 | Product & Systems Engineering | Initial compiled draft (Parts 1, 2, 3 merged) |

*End of Phase 0 Foundation Document — Compiled*

*This is the source-of-truth platform architecture. All module production docs inherit from this document. Any change to a Phase 0 decision requires an ADR and a coordinated review across module teams.*