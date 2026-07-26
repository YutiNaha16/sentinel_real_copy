# Data Model — Feature 003 (delta on Feature 002)

Adds escalation configuration, engine state, and an activity feed. See [spec.md](./spec.md).

## New enum

- **EscalationEventKind**: `ESCALATION` · `REMINDER` · `ALARM`

## Enum change

- **ChainState** gains `ESCALATED` (now: `WAITING` · `NOTIFIED` · `ESCALATED` · `ACKNOWLEDGED`).

## New entity: EscalationConfig  (one row per severity)

| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| severity | Severity, **unique** | L0/L1/L2/L3 |
| escalateAfterSec | int | sequential timeout before escalating to next |
| remindEverySec | int | reminder interval |
| maxReminders | int | reminder cap per person |
| adminAlarmAfterSec | int | alarm if nobody acked by this age |
| updatedAt | timestamptz | |

**Seed (demo-friendly seconds so a live demo shows escalation/alarm quickly; production values + editing UI = Feature 007):**

| Severity | escalateAfter | remindEvery | maxReminders | adminAlarmAfter |
|---|---|---|---|---|
| L0 (seq) | 45s | 30s | 2 | 120s |
| L1 (seq) | 30s | 20s | 3 | 90s |
| L2 (parallel) | — (n/a) | 20s | 3 | 60s |
| L3 (parallel) | — (n/a) | 15s | 4 | 45s |

*(`escalateAfterSec` is ignored for parallel severities, which notify everyone at once.)*

## IncidentChainEntry (extended)

| New field | Type | Notes |
|---|---|---|
| reminderCount | int, default 0 | reminders sent to this person |
| lastRemindedAt | timestamptz? | last reminder time |
| *(state)* | ChainState | may now be `ESCALATED` |

## Incident (extended)

| New field | Type | Notes |
|---|---|---|
| adminAlarmedAt | timestamptz? | set once when the admin alarm fires |

## New entity: EscalationEvent  (activity feed / append-only)

| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| incidentId | uuid, FK→Incident (cascade) | |
| at | timestamptz | |
| kind | EscalationEventKind | ESCALATION / REMINDER / ALARM |
| message | string | e.g. "Escalated: Prashant → Nurul", "Reminder 2/3 to Nurul", "ADMIN ALARM — nobody responded" |

## Engine logic (pure `processDue(now)`, per ACTIVE incident)

Load config for `incident.severity`, entries ordered by `order`, `acked = entries where ACKNOWLEDGED`.

1. **Escalation (sequential only):** let `frontier` = first entry in `NOTIFIED`. If `frontier.notifiedAt + escalateAfterSec ≤ now`: set `frontier → ESCALATED`; let `next` = first `WAITING`; if `next`, set `next → NOTIFIED, notifiedAt = now`; record `ESCALATION` event.
2. **Reminders:** for each entry in {`NOTIFIED`, `ESCALATED`} with `reminderCount < maxReminders` and elapsed since `lastRemindedAt ?? notifiedAt` ≥ `remindEverySec`: increment `reminderCount`, set `lastRemindedAt = now`, record `REMINDER` event.
3. **Admin alarm:** if `acked.length === 0` and `incident.adminAlarmedAt` is null and `incident.createdAt + adminAlarmAfterSec ≤ now`: set `adminAlarmedAt = now`, record `ALARM` event.

All timestamp-driven → idempotent and restart-safe. Never mutates `incident.status`.

## Live-tree read shape (extended)

`GET /incidents/:reference/tree` now also returns `adminAlarmedAt`, each entry's `reminderCount`, `ESCALATED` as a possible `state`, and `events: [{ at, kind, message }]` (most recent first, capped).
