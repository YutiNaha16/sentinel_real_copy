# Implementation Plan: Automatic Escalation Engine

**Branch**: `003-escalation-engine` | **Date**: 2026-07-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/003-escalation-engine/spec.md`. Builds on Feature 002.

## Summary

Add a database-backed, per-level escalation configuration and an engine that, on a short interval, processes active incidents to (a) escalate a timed-out sequential contact to the next person, (b) remind unacknowledged people up to a cap, and (c) admin-alarm a fully-silent incident once. Escalated state, the alarm flag, and a recent-activity feed are surfaced on the live tree. The engine's core is a **pure function of (incident state, now)** so it is deterministic and unit-testable; a lightweight interval drives it in the running app.

## Technical Context

**Language/Version**: TypeScript / Node 24 (unchanged).
**Primary Dependencies**: NestJS, Prisma, React. **No new runtime dependency** — a simple `setInterval` in an injectable service drives the tick (avoids adding `@nestjs/schedule`; keeps it simple and testable). The web reuses the live-tree polling from Feature 002.
**Storage**: PostgreSQL — new `EscalationConfig`, `EscalationEvent`; extend `IncidentChainEntry` and `Incident`.
**Testing**: Jest + Supertest e2e — the engine is tested by back-dating timestamps and invoking `processDue(now)` directly (deterministic; no real waiting).
**Constraints**: honest — "notify" is a state change + recorded event, not a real email (that is Feature 004). Demo-friendly seeded timers.

## Constitution Check

| Principle | Compliance |
|---|---|
| I. Least privilege | No new user-triggered mutation; engine is internal. Live-tree additions remain Admin/Member only. |
| III. Immutable audit | Escalation/reminder/alarm recorded as append-only `EscalationEvent`; alarm also noted. |
| IV. ACK ≠ Close | Engine never changes incident status; acknowledged people are never escalated/reminded. |
| VI. Honest limitations | "Notify/remind/alarm" = state + event, no real email yet — stated in spec/README. |
| VII. Walking skeleton | Adds the automation layer onto the live tree slice. |
| VIII. Configurable | Timers are DB rows per level (seeded), not hard-coded constants. |
| IX. Design fidelity | Escalated dots + pulsing alarm banner + activity feed match the prototype. |
| XI. Restart-safe | Due work reconstructed from persisted timestamps each tick (FR-011). |

**Result**: PASS.

## Project Structure (delta)

```text
apps/api/prisma/schema.prisma            # + EscalationConfig, EscalationEvent; extend chain + incident
apps/api/prisma/migrations/…             # + migration
apps/api/prisma/seed.ts                  # + seed EscalationConfig (demo-friendly)
apps/api/src/escalation/
  escalation.service.ts                  # pure processDue(now) + escalate/remind/alarm helpers
  escalation.scheduler.ts                # setInterval driver (onModuleInit), calls processDue(new Date())
  escalation.module.ts
apps/api/src/incidents/incidents.service.ts   # getTree() also returns adminAlarmedAt + events
packages/shared/src/index.ts             # + ESCALATED state, EscalationEvent DTO, tree fields
apps/web/src/pages/LiveTreePage.tsx      # escalated state, alarm banner, activity feed
apps/web/src/styles.css                  # alarm banner (pulse), event list
apps/api/test/escalation.e2e-spec.ts     # deterministic engine tests
```

**Structure Decision**: a dedicated `escalation` module owns the engine; `incidents` only exposes the resulting state on the live tree.

## Phase 0 — Research decisions

- **Scheduler**: `setInterval` (~5s) in an injectable service `onModuleInit`, guarded against overlapping runs. Rejected `@nestjs/schedule` to avoid a dependency for a single interval. The engine function takes `now` so tests bypass timers entirely.
- **One hop per tick per incident**: escalation advances a single contact per run (predictable; each hop gets its own event). Short demo timers still progress quickly across ticks.
- **Reminders after escalation**: reminders apply to `NOTIFIED` or `ESCALATED` (unacknowledged) entries, so the original person keeps being reminded post-escalation (spec §5) until acknowledged or capped.
- **Idempotency & restart-safety**: decisions derive from persisted timestamps (`notifiedAt`, `lastRemindedAt`, `incident.createdAt`, `adminAlarmedAt`) — re-running is safe and restart reconstructs due work.
- **Alarm basis**: measured from `incident.createdAt`; fires once when `ackCount === 0`.

## Phase 1 — Design outputs

- **data-model.md**: `EscalationConfig`, `EscalationEvent`, chain `ESCALATED` + `reminderCount` + `lastRemindedAt`, `Incident.adminAlarmedAt`, and the seeded demo timers.
- **contracts/api.md**: the extended `GET /incidents/:reference/tree` (adds `adminAlarmedAt`, entry `state` may be `ESCALATED`, `reminderCount`, and `events[]`). No new mutating endpoint (engine is internal).

## Complexity Tracking

No constitution violations.
