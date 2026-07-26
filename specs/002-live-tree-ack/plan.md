# Implementation Plan: Live Escalation Tree & Acknowledgement

**Branch**: `002-live-tree-ack` | **Date**: 2026-07-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-live-tree-ack/spec.md`. Builds on Feature 001.

## Summary

Add per-incident chain state so an incident's escalation tree becomes a live, role-scoped view of who is notified vs acknowledged, with an in-app Acknowledge action and switching across multiple active incidents. Reporting now initialises a chain-state row per tree member (sequential vs parallel). Real time is achieved by short-interval polling on the web. No timers/escalation/email in this feature.

## Technical Context

**Language/Version**: TypeScript 5.x / Node 24 (unchanged).
**Primary Dependencies**: NestJS 11, Prisma, React 18 + Vite, TanStack Query (already present) — its polling (`refetchInterval`) provides near-real-time updates without new dependencies.
**Storage**: PostgreSQL (new table `IncidentChainEntry` + migration).
**Testing**: Jest + Supertest e2e (extend the existing suite): chain init, live-tree role scoping, acknowledge (idempotent, ACK≠Close), multi-incident.
**Project Type**: Web application (unchanged structure).
**Performance/Scale**: pilot scale; polling interval ~4s; trivial load.
**Constraints**: no-admin portable env; honest limitations (polling, acknowledge-on-behalf).

## Constitution Check

| Principle | Compliance |
|---|---|
| I. Server-enforced least privilege | Live-tree + acknowledge guarded `@Roles(ADMIN, MEMBER)`; Reporter/Auditor 403, proven by e2e. |
| II. Contact privacy | Live tree shows chain members of the incident's tree (operational need); no cross-tree/global exposure added. |
| III. Immutable audit | Each acknowledge writes an append-only `AuditUserAction` in the same transaction. |
| IV. ACK ≠ Close | Acknowledge sets chain-entry state + timestamp only; never touches incident status. Enforced + tested. |
| V. LDAP-ready / multi-tree | No change; chain entries reference existing nodes. |
| VI. Honest limitations | Real time = polling; acknowledge-on-behalf — both stated in spec/README. |
| VII. Walking skeleton first | Extends the skeleton with the next thin, testable slice. |
| VIII. Configurable | Polling interval is config, not hard-coded magic; severity→mode uses shared `isParallel`. |
| IX. Design fidelity | Live tree ports the prototype (status dots, position tags, per-row acknowledge, count). |

**Result**: PASS.

## Project Structure (delta)

```text
apps/api/prisma/schema.prisma        # + IncidentChainEntry, ChainState enum
apps/api/prisma/migrations/…         # + migration
apps/api/prisma/backfill-chain.ts    # one-time backfill for pre-existing incidents
apps/api/src/incidents/
  incidents.service.ts               # init chain on create; live-tree + acknowledge methods
  incidents.controller.ts            # + GET active, GET :ref/tree, POST :ref/ack
packages/shared/src/index.ts         # + ChainState, LiveTree DTOs
apps/web/src/pages/LiveTreePage.tsx  # new — ported live tree with polling
apps/web/src/api/*                    # hooks: useActiveIncidents, useLiveTree, useAcknowledge
apps/api/test/live-tree.e2e-spec.ts  # new e2e suite
```

**Structure Decision**: extend existing `incidents` module rather than a new module — chain state is part of the incident aggregate.

## Phase 0 — Research decisions

- **Real time**: TanStack Query `refetchInterval` (~4s) — no WebSocket/SSE dependency for the pilot; revisit for production. Honest and simple.
- **Chain init on report**: reuse `isParallel(severity)` from `packages/shared`. Sequential → first node `notified`, others `waiting`; parallel → all `notified`.
- **Acknowledge-on-behalf**: an Admin/Member acknowledges a chain node (matches prototype). Guarded; audited. Self-service email ack is Feature 004.
- **Backfill**: a script creates chain entries for existing active incidents so their live tree works.
- **Idempotency**: acknowledging an already-acknowledged entry is a no-op success.

## Phase 1 — Design outputs

- **data-model.md**: `IncidentChainEntry` (+ `ChainState` enum), Incident relation, init + backfill rules.
- **contracts/api.md**: `GET /incidents/active`, `GET /incidents/:reference/tree`, `POST /incidents/:reference/ack`.

## Complexity Tracking

No constitution violations.
