# Implementation Plan: Admin Configuration

**Branch**: `007-configuration` | **Date**: 2026-07-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification. Builds on Features 001–006. **No schema change** — edits existing config stores.

## Summary

Admin-only screens to edit the escalation timers (per level), the incident-type → severity mapping, and general settings (re-open window, retention). Each save validates, persists to the existing tables, and writes a configuration-change audit entry (from → to). The engine and reporting already read these values live, so changes take effect immediately.

## Technical Context

**Language/Version**: TypeScript / Node 24. **No new dependencies, no migration.**
**Storage**: reads/writes `EscalationConfig`, `IncidentType`, `AppConfig`; writes `AuditConfigChange`.
**Testing**: Jest + Supertest e2e — update persists + audits, engine uses new value, validation, and Admin-only scoping.
**Constraints**: values validated (positive timers; retention ≥ 18); no-op saves write nothing.

## Constitution Check

| Principle | Compliance |
|---|---|
| I. Least privilege | All config read/write = Admin only; others 403 (e2e-proven). |
| III. Immutable audit | Every change written to the config-change log (from → to); no-op writes nothing. |
| VIII. Configurable | This is the feature that makes the seeded values editable — no hard-coded operational values remain. |
| IX. Design fidelity | Three tabs (Escalation levels, Severity mapping, General) match the prototype. |

**Result**: PASS.

## Project Structure (delta)

```text
apps/api/src/config/
  config.service.ts       # get(); updateEscalation(); updateMapping(); updateGeneral(); diff + audit
  config.controller.ts    # GET /config; PUT /config/escalation | /severity-mapping | /general (Admin)
  dto/*.ts                # validated payloads
  config.module.ts        # imports AuditModule
apps/web/src/types.ts     # ConfigState DTO
apps/web/src/pages/ConfigPage.tsx   # tabs, editable, save
apps/web/src/components/Sidebar.tsx + App.tsx   # nav + route (Admin)
apps/api/test/config.e2e-spec.ts    # update/audit/validation/role tests
```

**Structure Decision**: a dedicated Admin-only `config` module; imports `AuditModule` to log changes.

## Phase 0 — Decisions

- **Audit granularity**: one entry per changed level/type/section with a concise from → to target; no-op saves skip.
- **Validation**: timers positive integers; retention ≥ 18 (reject below); re-open window positive.
- **Live effect**: engine reads `EscalationConfig` each run; reporting reads `IncidentType`; re-open reads `AppConfig` — so no restart needed.
- **Update shape**: replace-the-set PUTs (client sends the full section); server diffs against current to audit only real changes.

## Phase 1 — contracts

- `GET /config` (Admin) → `{ levels, severityMapping, general }`.
- `PUT /config/escalation`, `PUT /config/severity-mapping`, `PUT /config/general` (Admin).

## Complexity Tracking

No constitution violations.
