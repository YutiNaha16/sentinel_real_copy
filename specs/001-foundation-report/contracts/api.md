# API Contracts — Feature 001

Base: `/api`. Auth via `Authorization: Bearer <jwt>` except `POST /auth/login`. All errors use the shared error contract: `{ statusCode, error, message, correlationId }`. Every role rule below is enforced **server-side** (Constitution I) and covered by an e2e authorization test.

## Auth & identity

### POST /auth/login
Request `{ email, password }` → 200 `{ accessToken, user: { id, displayName, role } }` · 401 on bad credentials.

### GET /me
→ 200 `{ id, displayName, role, nodeId | null }` · 401 if unauthenticated.

## Call tree

### GET /trees/it-cyber
Role-scoped response.
- **ADMIN** → full ordered chain: `[{ id, order, displayName, title, email, phone, backupName, parentName }]`.
- **MEMBER** → only `{ parent | null, self, backup | null, reports: [] }`, contact details limited to that slice.
- **REPORTER / AUDITOR** → **403** (not in scope for tree view this slice; Auditor read-only oversight arrives with the incident log).

*Rationale:* contact privacy (Constitution II) enforced by computing the DTO server-side per role.

## Incident types

### GET /incident-types
→ 200 `[{ id, key, name, description, defaultSeverity }]` where `active = true`. Available to any authenticated non-Auditor (used by the report screen). Auditor → 403.

## Incidents

### POST /incidents
Roles: **ADMIN, MEMBER, REPORTER**. Auditor → **403**.
Request:
```json
{
  "typeId": "uuid",
  "severity": "L0|L1|L2|L3",     // optional; defaults to type.defaultSeverity
  "location": "string",           // optional; defaults to "(not specified)"
  "description": "string",        // REQUIRED (FR-016) — 400 if missing/blank
  "anonymous": false,
  "confirmedHighSeverity": false  // MUST be true when resulting severity is L2/L3 (FR-011)
}
```
Behaviour:
- Severity defaults from the type; if the client sends a different value, record an override audit entry (from→to).
- If resulting severity is L2/L3 and `confirmedHighSeverity != true` → **409/422** asking for confirmation.
- Generate unique `reference` (`INC-XXXXXX`). Persist `status=ACTIVE`.
- When `anonymous=true`: store no `reporterUserId`, set `reporterLabel="Anonymous"`.
- In one transaction: create incident **and** append `AuditUserAction` ("Reported incident", plus a second entry for any override).
→ 201 `{ id, reference, severity, status }`.

### GET /incidents
Role-scoped list.
- **ADMIN / AUDITOR** → all incidents.
- **REPORTER** → only incidents where `reporterUserId = me` ("My reports").
- **MEMBER** → incidents in their tree (full ack/scoping refined when the live tree arrives).
Item: `{ reference, createdAt, severity, typeName, location, reporterLabel, status, ackCount, chainSize }` (`ackCount=0`, `chainSize` from tree in this slice).
