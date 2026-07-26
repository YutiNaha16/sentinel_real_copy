# API Contracts — Feature 010

Base `/api`. Read-only.

## GET /notifications
The merged activity feed (newest first, capped ~40).
- Roles: **any authenticated** user. Unauthenticated → 401.
- Scope: Admin/Member/Auditor → organisation-wide; Reporter → only events for incidents they reported and their own actions.
- 200 →
```jsonc
[
  { "at": "…Z", "category": "ALARM",       "message": "ADMIN ALARM — nobody in the chain has acknowledged INC-142307" },
  { "at": "…Z", "category": "ACK",         "message": "Prashant Kamble · Acknowledged · INC-142307 · via email link" },
  { "at": "…Z", "category": "ESCALATION",  "message": "Escalated: Prashant Kamble → Nurul Qureshi" },
  { "at": "…Z", "category": "ALERT",       "message": "S. Menon · Reported incident · INC-142307 · severity L2 (auto from type)" }
]
```

## Notes
- Derived entirely from `AuditUserAction` + `EscalationEvent`; no new persistence, no fabricated items.
- Read-only; the feed never mutates data.
