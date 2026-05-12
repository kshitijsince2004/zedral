# ADR 003 — Redpanda as Event Backbone

**Status:** Accepted  
**Date:** 2026-04-23

## Context

The Zedral platform needs modules to communicate without tight coupling. M6 floor events must reach M7 (OEE), M5a (coil consumption), and M1 (WO status) without M6 knowing about them directly.

## Decision

Use **Redpanda** (Kafka-API-compatible, single-binary, no ZooKeeper) as the event backbone.

Every operational fact is published exactly once to a topic. Consumers project events into their own read models. This is Principle 1 of the Zedral architecture: "One Event, Many Views."

Topic naming: `<domain>.<aggregate>.<event>` (e.g., `floor.production.completed`)

All events use the standard `EventEnvelope` with: `event_id` (UUID v7), `event_type`, `occurred_at`, `recorded_at`, `source`, `plant_id`, `aggregate_id`, `payload`, `signature`.

## Consequences

**Positive:**
- Modules are fully decoupled — adding M7 doesn't require changing M6
- Full audit trail — every event is durable and replayable
- Offline-capable — Floor Console queues events locally, drains when online
- BRSR/ESG compliance — event log is the audit record

**Negative:**
- Requires Redpanda running (mitigated by Docker Compose)
- Eventual consistency — consumers may lag behind producers by seconds
