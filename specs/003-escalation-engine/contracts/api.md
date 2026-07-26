# API Contracts — Feature 003

The engine is **internal** (a timed service) — no new user-facing mutating endpoint. Feature 003 extends the existing live-tree read; role rules unchanged (Admin/Member).

## GET /incidents/:reference/tree  (extended)

Adds engine-derived fields. Roles: **ADMIN, MEMBER** (Reporter/Auditor 403), as in Feature 002.

```jsonc
{
  "reference": "INC-142307",
  "severity": "L1",
  "status": "ACTIVE",
  "description": "…",
  "location": "…",
  "reporterLabel": "…",
  "createdAt": "…Z",
  "adminAlarmedAt": null,            // NEW — timestamp when the admin alarm fired, else null
  "ackCount": 0,
  "chainSize": 3,
  "entries": [
    { "nodeId": "…", "order": 1, "displayName": "Prashant Kamble", "title": "…",
      "state": "ESCALATED",          // NEW possible value
      "notifiedAt": "…Z", "ackAt": null,
      "reminderCount": 2 },          // NEW
    { "nodeId": "…", "order": 2, "displayName": "Nurul Qureshi", "title": "…",
      "state": "NOTIFIED", "notifiedAt": "…Z", "ackAt": null, "reminderCount": 0 }
  ],
  "events": [                        // NEW — recent activity, newest first, capped (~10)
    { "at": "…Z", "kind": "ESCALATION", "message": "Escalated: Prashant Kamble → Nurul Qureshi" },
    { "at": "…Z", "kind": "REMINDER",   "message": "Reminder 1/3 to Prashant Kamble" }
  ]
}
```

## Engine behaviour (internal, no HTTP)

- A service runs `processDue(now)` on a short interval (~5s) for all ACTIVE incidents; the same method is called directly by tests with a supplied `now`.
- Produces state changes (escalate/notify-next, reminder counts) and `EscalationEvent` rows per the logic in data-model.md.
- Guarantees: exactly-once alarm; no reminder past the cap; acknowledged people untouched; incident status never changed; safe to re-run and restart.

## Config (seeded, no editing endpoint yet)

`EscalationConfig` per severity is seeded (demo-friendly seconds). The admin editing screen is Feature 007; until then values are changed via seed/DB.
