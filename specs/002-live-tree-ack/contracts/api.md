# API Contracts — Feature 002

Base `/api`. All require auth. Role rules enforced server-side and covered by e2e tests.

## GET /incidents/active
Selector for the live view — active incidents only.
- Roles: **ADMIN, MEMBER**. Reporter/Auditor → 403.
- 200 → `[{ reference, severity, status, typeName, ackCount, chainSize }]` (active only, newest first).

## GET /incidents/:reference/tree
The live escalation tree for one incident.
- Roles: **ADMIN, MEMBER**. Reporter/Auditor → 403.
- 404 if the reference does not exist.
- 200 →
```json
{
  "reference": "INC-142307",
  "severity": "L2",
  "status": "ACTIVE",
  "description": "Core switch unresponsive",
  "location": "DC-2",
  "reporterLabel": "S. Menon",
  "createdAt": "2026-07-09T…Z",
  "ackCount": 1,
  "chainSize": 3,
  "entries": [
    { "nodeId": "…", "order": 1, "displayName": "Prashant Kamble", "title": "…",
      "state": "ACKNOWLEDGED", "notifiedAt": "…Z", "ackAt": "…Z" },
    { "nodeId": "…", "order": 2, "displayName": "Nurul Qureshi", "title": "…",
      "state": "NOTIFIED", "notifiedAt": "…Z", "ackAt": null }
  ]
}
```
Intended to be polled (~4s) by the web client.

## POST /incidents/:reference/ack
Acknowledge one chain person.
- Roles: **ADMIN, MEMBER**. Reporter/Auditor → 403.
- Body: `{ "nodeId": "uuid" }`.
- 404 if reference or chain entry not found.
- Behaviour: set that entry `ACKNOWLEDGED` + `ackAt=now`; **idempotent** (already-acked → 200 no-op); append `AuditUserAction`; **never** change incident status.
- 200 → `{ reference, nodeId, state: "ACKNOWLEDGED", ackCount, chainSize }`.

## Change to Feature 001
`POST /incidents` (report) now also creates the incident's `IncidentChainEntry` rows (init rules in data-model.md) inside the same transaction. No contract shape change for the caller.
