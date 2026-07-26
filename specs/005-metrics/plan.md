# Implementation Plan: Response Metrics

**Branch**: `005-metrics` | **Date**: 2026-07-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification. Builds on Features 001–004. **No schema change** — metrics compute from existing data.

## Summary

Add a read-only metrics layer computed from stored timestamps: MTTA, MTTR, total completion, ack/delivery rates, resolution mix (30 days), and per-hop latency with breaking-node detection. Exposed via `GET /metrics` (Admin/Member/Auditor) and `GET /metrics/export.csv` (Admin/Auditor). A React dashboard renders the KPIs, resolution mix, and per-hop latency, matching the prototype.

## Technical Context

**Language/Version**: TypeScript / Node 24. **No new dependencies, no migration.**
**Storage**: reads `Incident` + `IncidentChainEntry` only.
**Testing**: Jest + Supertest e2e — value sanity (rates 0–100%, non-negative latency), zero-data safety, and role scoping (Reporter blocked from view; Member blocked from export).
**Constraints**: honest — "delivered" = dispatched to a contact (no external mail confirmation yet).

## Constitution Check

| Principle | Compliance |
|---|---|
| I. Least privilege | `GET /metrics` = Admin/Member/Auditor; export = Admin/Auditor. Reporter 403. e2e-proven. |
| VI. Honest limitations | "Delivered" defined as dispatched-to-contact; stated in UI/spec. |
| VII. Walking skeleton | Adds the insight layer on real data captured by 001–004. |
| VIII. Configurable | 30-day window is a named constant, not a magic literal; no fabricated numbers. |
| IX. Design fidelity | KPI tiles, resolution mix bars, per-hop latency + breaking-node flag match the prototype. |

**Result**: PASS.

## Project Structure (delta)

```text
apps/api/src/metrics/
  metrics.service.ts     # pure computation from incidents/chain
  metrics.controller.ts  # GET /metrics, GET /metrics/export.csv
  metrics.module.ts
packages/shared + apps/web/src/types.ts   # MetricsSummary DTO
apps/web/src/pages/MetricsPage.tsx        # dashboard (ported)
apps/web/src/components/Sidebar.tsx + App.tsx  # nav + route
apps/api/test/metrics.e2e-spec.ts         # value + role tests
```

**Structure Decision**: a dedicated read-only `metrics` module; no writes, no new tables.

## Phase 0 — Computation decisions

- **MTTA** = mean over incidents with ≥1 ack of (min(ackAt) − createdAt). **MTTR** = mean over resolved of (closedAt − createdAt). **Total completion** = max(ackAt) − createdAt.
- **Delivered** entry = `notifiedAt != null` (reached a contact). **Ack rate** = acknowledged ÷ delivered; **Delivery rate** = delivered ÷ total. Clamped 0–100.
- **Resolution mix** = counts per severity for incidents created in the last 30 days.
- **Per-hop latency** (for the most recent incident): per delivered entry, (ackAt − notifiedAt) or "pending"; **breaking node** = first `NOTIFIED`/`ESCALATED` entry without an ack.
- **Safety**: empty sets → null (rendered as "—"); latencies floored at 0.

## Phase 1 — Design outputs

- **contracts/api.md**: `GET /metrics`, `GET /metrics/export.csv` with role rules and the `MetricsSummary` shape.

## Complexity Tracking

No constitution violations.
