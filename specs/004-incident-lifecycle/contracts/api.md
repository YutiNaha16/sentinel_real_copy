# API Contracts — Feature 004

Base `/api`. All require auth. Permission is enforced server-side and covered by e2e tests.

## POST /incidents/:reference/close
Close an active incident.
- Permission: **admin, or a chain member of this incident**. Others → 403.
- Body: `{ "reason": "string" }` (required; 400 if blank).
- 404 if reference unknown; 409 if already resolved.
- Effect: `status=RESOLVED`, `closedAt`, `closeReason`; audit + `STANDDOWN` event; drops off the active/live list.
- 200 → `{ reference, status: "RESOLVED", closedAt }`.

## POST /incidents/:reference/override
Re-classify severity on an active incident.
- Permission: **admin, or a chain member of this incident**. Others → 403.
- Body: `{ "severity": "L0|L1|L2|L3", "reason": "string" }` (both required).
- 404 if unknown; 409 if resolved.
- Effect: severity updated; if crossing to parallel, all `WAITING` chain entries → `NOTIFIED`; audit (from → to + reason).
- 200 → `{ reference, severity }`.

## POST /incidents/:reference/reopen
Re-open a resolved incident.
- Permission: **admin always**; **reporter only if they are the (non-anonymous) reporter**; **anonymous incidents → admin only**. Others / not-the-reporter → 403.
- 404 if unknown; 409 if not resolved; 422 if outside the re-open window (with a clear message).
- Effect: `status=ACTIVE`, `adminAlarmedAt=null`, `closedAt=null`, `closeReason=null`; audit. Chain state preserved.
- 200 → `{ reference, status: "ACTIVE" }`.

## Reads (already available)
`GET /incidents` (role-scoped log) and `GET /incidents/:reference/tree` already return `status`; the log is used by the web to offer Re-open on resolved incidents. Predefined close reasons are a UI concern (free text stored).
