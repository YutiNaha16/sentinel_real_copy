# Feature Specification: Admin Configuration

**Feature Branch**: `007-configuration`

**Created**: 2026-07-09

**Status**: Draft

**Input**: Backlog epic E4. Traces to `Spec/SENTINEL_Crisis_Phase1_Spec.md` §3 (admin-editable severity mapping), §5 (per-level configurable timeouts/reminders/retries), §7 (configurable re-open window), §12 (retention, config changes logged). Stories S4.1–S4.3. Builds on Features 001–006.

Everything tunable in one place — the settings that make the system fit real operations. Admin-only; **every change is written to the configuration-change audit log** (the log Feature 006 exposed). No fabricated values — the seeded config becomes editable.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Edit escalation timers (Priority: P1)

An admin sets, per severity level, how long before escalation, the reminder interval, the maximum reminders, and the admin-alarm time. The escalation engine immediately uses the new values, and each change is recorded in the config audit log.

**Why this priority**: These timers govern the whole escalation engine; being able to tune them for real operations (vs the demo defaults) is the core of configuration.

**Independent Test**: Change L1's escalate-after from 30s to 20s and save → the value persists, the engine uses it, and a config-audit entry records the change.

**Acceptance Scenarios**:

1. **Given** the escalation config, **When** an admin changes a level's values and saves, **Then** the new values persist and the engine uses them on its next run.
2. **Given** a change, **When** it is saved, **Then** a configuration-change audit entry records who changed what (from → to).
3. **Given** an invalid value (non-positive or non-integer), **When** saving, **Then** it is rejected with a clear message.
4. **Given** a non-admin, **When** they attempt to read or write configuration (including a direct server call), **Then** it is refused (403).

---

### User Story 2 - Edit the severity mapping (Priority: P1)

An admin changes which default severity each incident type maps to. New reports use the updated mapping; each change is logged.

**Why this priority**: The type→severity mapping decides how every new incident is treated; only domain owners can set it, so it must be editable. Equal P1.

**Independent Test**: Change "Network outage" from L2 to L3 and save → a new report of that type pre-fills L3, and a config-audit entry records the change.

**Acceptance Scenarios**:

1. **Given** the mapping, **When** an admin changes a type's default severity and saves, **Then** new reports of that type use the new default.
2. **Given** a mapping change, **When** saved, **Then** a config-audit entry records the type and from → to.

---

### User Story 3 - Edit general settings (Priority: P2)

An admin sets the re-open window and the audit retention (with a policy floor). Changes take effect immediately and are logged.

**Why this priority**: Rounds out the tunables; P2 because timers and mapping (Stories 1–2) carry the operational weight.

**Independent Test**: Change the re-open window to 48 hours and save → re-open enforcement uses 48h, and a config-audit entry records it.

**Acceptance Scenarios**:

1. **Given** general settings, **When** an admin changes the re-open window and saves, **Then** re-open enforcement uses the new window.
2. **Given** a retention value below the 18-month floor, **When** saving, **Then** it is rejected (or clamped to the floor) with a clear message.
3. **Given** any general change, **When** saved, **Then** a config-audit entry records it.

---

### Edge Cases

- Saving with no actual change → no audit entry is written (nothing changed).
- Multiple fields changed on one save → each meaningful change is captured in the audit target (or one entry per level/type), not lost.
- Non-integer / negative / zero timer values → rejected before persisting.
- Retention below floor → rejected or clamped to the minimum (18 months).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST expose the current configuration (escalation levels, severity mapping, general settings) to Admin only; non-admins are refused (403).
- **FR-002**: The system MUST let an admin update per-level escalation timers (escalate-after, reminder interval, max reminders, admin-alarm-after); values MUST be positive integers.
- **FR-003**: The escalation engine MUST use the updated timers on its next run (no restart required).
- **FR-004**: The system MUST let an admin update the incident-type → default-severity mapping; new reports MUST use the updated mapping.
- **FR-005**: The system MUST let an admin update general settings — re-open window (positive) and audit retention (≥ 18 months) — with the retention floor enforced.
- **FR-006**: Every configuration change MUST be written to the configuration-change audit log with actor and from → to; a save with no change writes nothing.
- **FR-007**: All configuration reads and writes MUST be Admin-only; Member/Reporter/Auditor are refused (403).
- **FR-008**: Invalid values MUST be rejected before persisting, with a clear message.
- **FR-009**: The web UI MUST present configuration as tabs (Escalation levels, Severity mapping, General) matching the prototype, editable and saveable, Admin-only.

### Key Entities *(include if feature involves data)*

- *(No new persistence.)* Reads/writes existing **EscalationConfig** (per level), **IncidentType** (defaultSeverity), **AppConfig** (reopenWindowHours, retentionMonths). Writes **AuditConfigChange** on every change (via the writer added in Feature 006).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A saved timer change persists and the engine uses it on the next run.
- **SC-002**: A saved mapping change is reflected in the next report's pre-filled severity.
- **SC-003**: Every saved change appears in the configuration-change audit log with actor and from → to; no-op saves add nothing.
- **SC-004**: Invalid values (non-positive timers, retention below floor) are rejected.
- **SC-005**: All config endpoints are Admin-only when exercised directly against the server.

## Assumptions

- **No new persistence** — all three config stores already exist and are seeded.
- **Audit granularity**: one audit entry per changed level/type/section, with a concise from → to target (not per micro-field), to keep the log readable.
- **Retention floor** = 18 months (spec §12); values below are rejected.
- Builds on Features 001–006 (esp. the `logConfigChange` writer and the escalation engine reading config each run).
