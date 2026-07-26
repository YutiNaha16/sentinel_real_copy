# API Contracts — Feature 006

Base `/api`. Read-only. Role rules enforced server-side and covered by e2e tests.

## GET /audit
The two audit logs, newest first (capped ~200 each).
- Roles: **ADMIN, AUDITOR** only. Member/Reporter → 403.
- 200 →
```jsonc
{
  "userActions": [
    { "at": "…Z", "actorLabel": "Prashant Kamble", "action": "Acknowledged", "target": "INC-142307 · Prashant Kamble" }
  ],
  "configChanges": [
    { "at": "…Z", "actorLabel": "Administrator", "action": "Changed L2 escalation timeout", "target": "10 min → 5 min" }
  ]
}
```
`configChanges` is legitimately empty until the config-editing feature records changes.

## GET /audit/export.csv
- Roles: **ADMIN, AUDITOR** only. Member/Reporter → 403.
- 200 → `text/csv` with columns `log,at,actor,action,target` (`log` = `user` or `config`).

## Notes
- Read-only: no create/edit/delete endpoints. Entries are written only by the actions that cause them (Features 001–004 for user actions; the future config feature for config changes).
- A `logConfigChange` writer is added to `AuditService` for future use; not called in this feature.
