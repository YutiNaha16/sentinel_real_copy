# Implementation Plan: Audit Trail View

**Branch**: `006-audit-trail` | **Date**: 2026-07-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification. Builds on Features 001–005. **No schema change** — reads existing audit tables.

## Summary

Expose the two audit logs (user actions, configuration changes) as a read-only, Admin/Auditor-only view with CSV export. Add a `logConfigChange` writer to `AuditService` for future config edits (no fabricated entries now).

## Technical Context

**Language/Version**: TypeScript / Node 24. **No new dependencies, no migration.**
**Storage**: reads `AuditUserAction` + `AuditConfigChange`.
**Testing**: Jest + Supertest e2e — content + role scoping (Admin/Auditor allowed; Member/Reporter 403).
**Constraints**: read-only; append-only logs never mutated.

## Constitution Check

| Principle | Compliance |
|---|---|
| I. Least privilege | View + export = Admin/Auditor only; Member/Reporter 403 (e2e-proven). |
| III. Immutable audit | Read-only; no edit/delete path; two separate logs preserved. |
| VII. Walking skeleton | Surfaces data recorded by earlier features. |
| IX. Design fidelity | Two separate read-only tables match the prototype. |

**Result**: PASS.

## Project Structure (delta)

```text
apps/api/src/audit/
  audit.service.ts        # + getUserActions(), getConfigChanges(), toCsv(), logConfigChange()
  audit.controller.ts     # GET /audit, GET /audit/export.csv (Admin/Auditor)
  audit.module.ts         # register controller
apps/web/src/types.ts     # AuditEntry, AuditTrail DTOs
apps/web/src/pages/AuditPage.tsx        # two read-only tables + export
apps/web/src/components/Sidebar.tsx + App.tsx   # nav + route (Admin/Auditor)
apps/api/test/audit.e2e-spec.ts         # content + role tests
```

**Structure Decision**: extend the existing `audit` module (it already owns `AuditService`); add a controller.

## Phase 0 — Decisions

- **Read shape**: `{ userActions: [...], configChanges: [...] }`, each newest-first, capped (200).
- **Export**: single CSV with a `log` column distinguishing user vs config rows.
- **Config writer**: `logConfigChange(db, {actorLabel, action, target})` added now for the future config-editing feature; not invoked here (log stays honestly empty).

## Phase 1 — contracts

- `GET /audit` (Admin/Auditor) → `{ userActions, configChanges }`.
- `GET /audit/export.csv` (Admin/Auditor) → CSV.

## Complexity Tracking

No constitution violations.
