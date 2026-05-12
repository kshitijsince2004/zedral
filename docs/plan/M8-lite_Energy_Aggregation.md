Zedral Platform ��� M8-lite Production Document

Energy Aggregation �� Phase 1

Product \& Systems Engineering

April 2026

Table of Contents

# Zedral Platform — Module M8-lite Production Document

## M8-lite — Energy Aggregation (Phase 1 Scope)

**Document status:** Draft v0.1 · For engineering handover **Audience:** M8 module engineering team, adjacent module teams (M7 OEE for SEC integration, Edge Gateway team), Hero Steels Energy Manager / sustainability champion, CFO **Owner:** Platform Engineering · M8 technical lead TBD **Depends on:** Phase 0 Foundation · M2 Master Data (emission factors) · M7 Performance (production tonnage) · Edge Gateway · Smart meter hardware **Phase:** 1 (Pilot Core Loop · Months 2–6) **Inherits:** All 10 Architectural Principles, especially **Principle 7 (Offline-Capable)** for meter ingestion **Companion document:** M8-full (Phase 2) — sub-metering, full BRSR/PAT report generation, DMZ egress for ESG. This document is M8-lite only.

## Table of Contents

- Scope & Non-Goals — and Why M8 Is Split into Lite + Full

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

- Build Plan & Path to M8-Full

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

*End of M8-lite — Energy Aggregation Production Document* *Total: ~7,500 words · Est. reading time: 40 minutes*

**Phase 1 Module Documentation Complete.**

Next: **Mega Production Document compile step** — merging Phase 0 Foundation + M1 + M3 + M4 + M5a + M6 + M7 + M8-lite into one unified handover artefact with consolidated glossary, master RACI, hiring JD compendium, full API reference, full data dictionary, full event taxonomy, and critical-path dependency diagram. Exported to MD + DOCX + PDF.