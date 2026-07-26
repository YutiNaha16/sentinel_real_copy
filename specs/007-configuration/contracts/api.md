# API Contracts — Feature 007

Base `/api`. **Admin only** on every endpoint (Member/Reporter/Auditor → 403). All writes audited (config log).

## GET /config
- 200 →
```jsonc
{
  "levels": [
    { "severity": "L0", "escalateAfterSec": 45, "remindEverySec": 30, "maxReminders": 2, "adminAlarmAfterSec": 120 }
    // L1, L2, L3 …
  ],
  "severityMapping": [
    { "id": "…", "key": "outage", "name": "Network outage", "description": "…", "defaultSeverity": "L2" }
    // …
  ],
  "general": { "reopenWindowHours": 72, "retentionMonths": 18 }
}
```

## PUT /config/escalation
- Body: `{ "levels": [{ "severity": "L1", "escalateAfterSec": 20, "remindEverySec": 15, "maxReminders": 3, "adminAlarmAfterSec": 90 }, …] }`.
- Validation: all values positive integers → else 400.
- Effect: updates each level; writes a config-audit entry per changed level (`Changed L1 escalation` · `escalate 30→20s, …`). 200 → updated `levels`.

## PUT /config/severity-mapping
- Body: `{ "mapping": [{ "id": "…", "defaultSeverity": "L3" }, …] }`.
- Effect: updates each type's default; audit entry per changed type (`Edited severity mapping` · `Network outage: L2 → L3`). 200 → updated `severityMapping`.

## PUT /config/general
- Body: `{ "reopenWindowHours": 48, "retentionMonths": 18 }`.
- Validation: `reopenWindowHours` positive; `retentionMonths` ≥ 18 → else 400.
- Effect: updates `AppConfig`; audit entry for each changed field. 200 → updated `general`.

## Notes
- Server diffs each PUT against current values and audits only real changes (no-op saves write nothing).
- Engine/reporting/re-open read these stores live, so changes take effect on the next run without a restart.
