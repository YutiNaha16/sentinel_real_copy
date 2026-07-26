# Data Model — Feature 004 (delta on Feature 003)

Adds close/re-open state and general config. See [spec.md](./spec.md).

## Enum change

- **EscalationEventKind** gains `STANDDOWN` (now: `ESCALATION` · `REMINDER` · `ALARM` · `STANDDOWN`).

## Incident (extended)

| New field | Type | Notes |
|---|---|---|
| closeReason | String? | reason captured at close |
| closedAt | timestamptz? | when resolved (basis for the re-open window) |

*(Status already exists: `ACTIVE` / `RESOLVED`. `adminAlarmedAt` from Feature 003 is cleared on re-open.)*

## New entity: AppConfig  (single row)

| Field | Type | Notes |
|---|---|---|
| id | int (PK, fixed = 1) | singleton |
| reopenWindowHours | int | default 72 (3 days) |
| retentionMonths | int | default 18 (used by later features) |
| updatedAt | timestamptz | |

Seeded once; editing UI is Feature 007.

## Actions

**Close** (admin or in-chain member; active only):
- require `reason`; set `status=RESOLVED`, `closedAt=now`, `closeReason=reason`.
- write `AuditUserAction` ("Closed incident · reason: …").
- write `EscalationEvent` kind `STANDDOWN` ("Stand down — resolved: … (all alerted + reporter notified)").
- the engine already skips non-active incidents → escalation/reminders/alarm stop.

**Override severity** (admin or in-chain member; active only):
- require `severity` + `reason`; set `incident.severity`.
- if new severity is parallel (L2/L3): set every chain entry in `WAITING` → `NOTIFIED` (`notifiedAt=now`).
- write `AuditUserAction` ("Overrode severity · L1 → L3 · reason: …").

**Re-open** (resolved only; reporter-non-anon or admin; anonymous → admin only; within window):
- allowed if `now ≤ closedAt + reopenWindowHours`.
- set `status=ACTIVE`, `adminAlarmedAt=null`, `closedAt=null`, `closeReason=null`.
- write `AuditUserAction` ("Re-opened incident").
- chain state preserved (no escalation restart).

## Permission helper

`canManage(user, incident)` = `user.role === ADMIN` OR (`user.role === MEMBER` AND `user.nodeId` is one of the incident's chain `nodeId`s). Reporter/Auditor never manage.
