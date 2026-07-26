# Implementation Plan: Incident Lifecycle — Override, Close & Re-open

**Branch**: `004-incident-lifecycle` | **Date**: 2026-07-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification. Builds on Features 001–003.

## Summary

Add the incident lifecycle actions: override severity (with re-notify on crossing to parallel), close with a required reason (+ stand-down record, engine stops), and re-open within a configurable window (permission-gated). Permission for close/override is "admin, or a user whose node is in this incident's chain". Re-open follows the reporter/anonymous rules. All actions are audited. A small `AppConfig` holds the re-open window.

## Technical Context

**Language/Version**: TypeScript / Node 24. **No new dependencies.**
**Storage**: PostgreSQL — extend `Incident` (`closeReason`, `closedAt`), add `AppConfig` (singleton), add `STANDDOWN` to the event-kind enum.
**Testing**: Jest + Supertest e2e — close/override/reopen behaviour + permissions + engine-skips-resolved + window enforcement.
**Constraints**: honest — "stand-down/notify" is a recorded event (no real email yet).

## Constitution Check

| Principle | Compliance |
|---|---|
| I. Least privilege | Close/override: admin or in-chain member (server-checked). Re-open: reporter-non-anon or admin; anonymous → admin only. Reporter/Auditor/non-chain → 403. e2e-proven. |
| III. Immutable audit | Close/override/re-open each write an append-only audit entry; close also writes a stand-down event. |
| IV. ACK ≠ Close | Close is an explicit, reasoned action distinct from acknowledgement; overriding/closing never fabricate acks. |
| VIII. Configurable | Re-open window is a DB value (seeded), not a constant. |
| IX. Design fidelity | Close/override/re-open dialogs match the prototype (reason lists + Other). |
| VI. Honest limitations | Stand-down is recorded, not emailed (yet) — stated. |

**Result**: PASS.

## Project Structure (delta)

```text
apps/api/prisma/schema.prisma          # Incident + closeReason/closedAt; AppConfig; enum + STANDDOWN
apps/api/prisma/migrations/…           # migration
apps/api/prisma/seed.ts                # seed AppConfig (reopenWindowHours=72)
apps/api/src/incidents/
  incidents.service.ts                 # close(), override(), reopen(); chain-permission helper
  incidents.controller.ts              # POST :ref/close, :ref/override, :ref/reopen
  dto/close.dto.ts, dto/override.dto.ts
packages/shared + apps/web/src/types.ts # (status already present; reason optional)
apps/web/src/pages/LiveTreePage.tsx    # Close + Override dialogs on an active incident
apps/web/src/pages/LogPage.tsx         # Re-open control on resolved incidents
apps/api/test/lifecycle.e2e-spec.ts    # new e2e suite
```

**Structure Decision**: lifecycle lives in the existing `incidents` module (it operates on the incident aggregate).

## Phase 0 — Research decisions

- **Permission model**: `canManage(user, incident)` = `role===ADMIN || (user.nodeId ∈ incident.chain.nodeIds)`. Re-open uses its own rule (reporter/anonymous/admin).
- **Re-open semantics** (spec §17): flip status → ACTIVE and clear `adminAlarmedAt`; preserve chain state (do not restart escalation). Simpler and less surprising.
- **Stand-down**: recorded as a `STANDDOWN` escalation event on the incident (visible in the activity feed); real email is a later feature.
- **Override → parallel**: set every `WAITING` chain entry to `NOTIFIED` (timestamped); leave notified/escalated/acknowledged untouched.
- **Window**: `now ≤ closedAt + reopenWindowHours` (inclusive), value from `AppConfig`.

## Phase 1 — Design outputs

- **data-model.md**: Incident `closeReason`/`closedAt`; `AppConfig`; `STANDDOWN` event kind.
- **contracts/api.md**: `POST /incidents/:reference/close`, `/override`, `/reopen` with role rules and payloads.

## Complexity Tracking

No constitution violations.
