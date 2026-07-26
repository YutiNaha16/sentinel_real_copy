# Data Model — Feature 002 (delta on Feature 001)

Adds per-incident chain state. See [spec.md](./spec.md). Prisma schema in `apps/api/prisma/schema.prisma`.

## New enum

- **ChainState**: `WAITING` · `NOTIFIED` · `ACKNOWLEDGED`
  (`ESCALATED` is reserved for Feature 003; not produced here.)

## New entity: IncidentChainEntry

One row per (incident, node) — the live status of each person for that incident.

| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| incidentId | uuid, FK→Incident (cascade delete) | |
| nodeId | uuid, FK→Node | the person |
| order | int | position at time of incident (from node.order) |
| state | ChainState | `WAITING` / `NOTIFIED` / `ACKNOWLEDGED` |
| notifiedAt | timestamptz? | when set to NOTIFIED |
| ackAt | timestamptz? | when ACKNOWLEDGED (drives MTTA later) |
| createdAt | timestamptz | |

**Constraints**: `@@unique([incidentId, nodeId])`; entries ordered by `order`.

## Incident (existing) — relation added

- `chain IncidentChainEntry[]` — the incident's chain-state rows.
- No other change; `createdAt` already present (basis for MTTA in Feature 006).

## Initialisation rules (on report — updates Feature 001's create flow)

For each node in the incident's tree, ordered by `order`:
- **Parallel** (severity L2/L3): every entry `NOTIFIED`, `notifiedAt = now`.
- **Sequential** (severity L0/L1): first entry `NOTIFIED` (`notifiedAt = now`); the rest `WAITING` (`notifiedAt = null`).

Created in the **same transaction** as the incident + its audit entry.

## Acknowledge rules

- Sets the entry's `state = ACKNOWLEDGED`, `ackAt = now`.
- **Idempotent**: if already `ACKNOWLEDGED`, no-op success (no double count).
- Writes an `AuditUserAction` ("Acknowledged", target = `INC-… · <person>`).
- **Never** changes `Incident.status` (ACK ≠ Close).

## Backfill (one-time)

For every `ACTIVE` incident with no chain entries, create entries from its tree using the same initialisation rules based on the incident's severity. Script: `apps/api/prisma/backfill-chain.ts` (idempotent — skips incidents that already have entries).

## Live-tree read shape

For an incident: `{ reference, severity, status, description, location, reporterLabel, createdAt, ackCount, chainSize, entries: [{ nodeId, order, displayName, title, state, notifiedAt, ackAt }] }`, ordered by `order`.
