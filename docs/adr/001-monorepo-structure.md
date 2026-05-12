# ADR 001 — Monorepo Structure with pnpm Workspaces

**Status:** Accepted  
**Date:** 2026-04-23

## Context

The Zedral platform has two React frontends (Ops Console and Floor Console) and four FastAPI backend services. Without a monorepo, shared types, utilities, and UI components would be duplicated across apps, causing drift and maintenance burden.

## Decision

Use a **pnpm workspace monorepo** with the following structure:
- `apps/` — deployable applications (ops-console, floor-console)
- `packages/` — shared libraries (shared-types, future: ui, hooks, api-client)
- `backend/` — Python FastAPI services
- `infra/` — Docker Compose, SQL migrations, Redpanda bootstrap
- `docs/` — Architecture docs, ADRs, plan files

## Consequences

**Positive:**
- Single `pnpm install` installs all dependencies
- Shared types are consumed as workspace packages — no publish step needed
- Root scripts (`pnpm dev:ops`, `pnpm dev:floor`) provide consistent DX
- TypeScript paths resolve across packages automatically

**Negative:**
- Slightly more complex initial setup
- Developers need pnpm ≥ 9 installed
