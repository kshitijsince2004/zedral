# ADR 002 — One FastAPI Service Per Zedral Module

**Status:** Accepted  
**Date:** 2026-04-23

## Context

The Zedral backend covers M1 (Demand), M2 (Master Data), M5a (Material), M6 (Dispatch), and future modules. We need to decide whether to build a monolith or separate services.

## Decision

**One FastAPI service per module**, each running on its own port:
- M2 Master Data → port 8001
- M1 Demand → port 8002
- M5a Material → port 8003
- M6 Dispatch → port 8004

All services share `backend/shared/zedral_common/` for common utilities (DB pool, Kafka producer, event envelope, auth, logging, health check).

## Consequences

**Positive:**
- Each module can be deployed, scaled, and updated independently
- Clear ownership boundaries — M6 team doesn't touch M2 code
- Failure isolation — M6 going down doesn't affect M2
- Matches the plan documents' module boundaries exactly

**Negative:**
- More Docker containers to manage (mitigated by Docker Compose)
- Cross-service calls require HTTP (acceptable — modules communicate via events, not direct calls)
