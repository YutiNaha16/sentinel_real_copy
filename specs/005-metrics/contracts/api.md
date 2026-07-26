# API Contracts — Feature 005

Base `/api`. Read-only. Role rules enforced server-side and covered by e2e tests.

## GET /metrics
Organisation-wide (Admin/Auditor) or team-scoped (Member) response metrics.
- Roles: **ADMIN, MEMBER, AUDITOR**. Reporter → 403.
- 200 → `MetricsSummary`:
```jsonc
{
  "scope": "org",                 // "org" for admin/auditor, "team" for member
  "totals": { "incidents": 43, "acknowledged": 40, "resolved": 31 },
  "mttaMinutes": 2.1,             // null if no acknowledgements
  "mttrMinutes": 38.4,            // null if none resolved
  "totalCompletionMinutes": 12.7, // mean last-ack − created; null if none
  "ackRatePct": 94,              // acknowledged ÷ delivered entries
  "deliveryRatePct": 100,        // delivered ÷ total entries
  "resolutionMix": [             // last 30 days, per severity
    { "severity": "L0", "count": 12 },
    { "severity": "L1", "count": 19 },
    { "severity": "L2", "count": 9 },
    { "severity": "L3", "count": 3 }
  ],
  "perHop": {                    // most recent incident
    "reference": "INC-142307",
    "hops": [
      { "displayName": "Prashant Kamble", "state": "ACKNOWLEDGED", "latencySeconds": 34 },
      { "displayName": "Nurul Qureshi", "state": "NOTIFIED", "latencySeconds": null }
    ],
    "breakingNode": "Nurul Qureshi"   // first notified/escalated but unacknowledged; null if none
  },
  "canExport": true                 // true for admin/auditor
}
```
All numbers derive from stored timestamps; empty sets are `null` (rendered "—").

## GET /metrics/export.csv
- Roles: **ADMIN, AUDITOR** only. Member/Reporter → 403.
- 200 → `text/csv` attachment with per-incident rows: `reference, severity, status, createdAt, firstAckAt, closedAt, mttaSeconds, mttrSeconds, ackCount, chainSize`.

## Notes
- "Delivered" = a chain entry that reached at least "notified" (honest proxy; no external mail confirmation yet).
- No new persistence; computed on read from `Incident` + `IncidentChainEntry`.
