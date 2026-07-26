# Implementation Plan: Notifications Feed

**Branch**: `010-notifications` | **Date**: 2026-07-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification. Builds on Features 001–009. **No schema change** — merges existing logs.

## Summary

A read-only `GET /notifications` that merges `AuditUserAction` and `EscalationEvent` into one chronological, newest-first feed, role-scoped (Reporter → own incidents only), capped ~40. A Notifications page + nav entry for all signed-in roles.

## Technical Context

**Language/Version**: TypeScript / Node 24. **No new dependencies, no migration.**
**Storage**: reads `AuditUserAction`, `EscalationEvent` (+ owning `Incident` for reporter scoping).
**Testing**: Jest + Supertest e2e — merged feed shape, ordering, reporter scoping, auth required.
**Constraints**: read-only; capped; derived from real data.

## Constitution Check

| Principle | Compliance |
|---|---|
| I. Least privilege | Reporter sees only their own incidents' items; others org-wide; unauth 401. |
| III. Immutable audit | Read-only over existing logs; no writes. |
| VI. Honest limitations | Feed is a view of recorded facts; nothing fabricated. |
| IX. Design fidelity | Category chip + message + time, matching the prototype's notifications panel. |

**Result**: PASS.

## Project Structure (delta)

```text
apps/api/src/notifications/
  notifications.service.ts   # merge + scope + categorise
  notifications.controller.ts # GET /notifications (any authenticated)
  notifications.module.ts
apps/web/src/types.ts         # NotificationItem DTO
apps/web/src/pages/NotificationsPage.tsx
apps/web/src/components/Sidebar.tsx + App.tsx  # nav + route (all roles)
apps/api/test/notifications.e2e-spec.ts
```

**Structure Decision**: a small read-only `notifications` module.

## Phase 0 — Decisions

- **Merge**: fetch recent `AuditUserAction` and `EscalationEvent`, map both to `{ at, category, message }`, sort desc, take 40.
- **Reporter scope**: escalation events where `incident.reporterUserId = me`; audit actions where `actorUserId = me`.
- **Category**: audit action → ALERT (Reported) / ACK (Acknowledged) / CLOSE / REOPEN / OVERRIDE; escalation kind → ESCALATION / REMINDER / ALARM / STAND-DOWN.
- **Auth**: any authenticated role (no `@Roles`), so Reporter is included with their scope.

## Phase 1 — contracts

- `GET /notifications` → `NotificationItem[]` (newest first, capped, role-scoped).

## Complexity Tracking

No constitution violations.
