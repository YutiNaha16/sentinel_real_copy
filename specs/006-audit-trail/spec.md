# Feature Specification: Audit Trail View

**Feature Branch**: `006-audit-trail`

**Created**: 2026-07-09

**Status**: Draft

**Input**: Backlog epic E13. Traces to `Spec/SENTINEL_Crisis_Phase1_Spec.md` §12 (all user actions logged, all config changes logged, separate logs, 18-month retention). Stories S13.1–S13.4. Builds on Features 001–005.

The compliance backbone: a read-only view of every action and every setting change, timestamped, in **two separate logs** — because auditors ask for "who changed the escalation timeout?" to be answerable at a glance, distinct from operational activity. The data is already recorded by earlier features; this exposes it.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Review the audit trail (Priority: P1)

An admin or auditor opens the Audit trail and sees two timestamped logs: **user actions** (report, acknowledge, override, close, re-open) and **configuration changes** — each with who, what, target, and time, newest first.

**Why this priority**: This is the whole feature — making the recorded trail visible and answerable is the compliance value.

**Independent Test**: After some incidents have been reported/acknowledged/closed, open the Audit trail → the user-actions log lists those actions with actor and timestamp; the configuration-changes log is shown separately.

**Acceptance Scenarios**:

1. **Given** recorded user actions, **When** the audit trail is opened, **Then** they appear newest-first with time, actor, action, and target.
2. **Given** the two logs, **When** the audit trail is opened, **Then** user actions and configuration changes are shown as **separate** logs.
3. **Given** no configuration changes yet, **When** the config log is viewed, **Then** it shows an empty state (no fabricated entries).

---

### User Story 2 - Role scoping & export (Priority: P2)

Only admins and auditors can see the audit trail, and they can export it as CSV. Members and reporters cannot access it.

**Why this priority**: The audit trail is sensitive oversight data; access must be tight. P2 because Story 1 delivers the core.

**Independent Test**: Admin and Auditor can open the audit trail and download a CSV; Member and Reporter are refused (403).

**Acceptance Scenarios**:

1. **Given** an Admin or Auditor, **When** they open or export the audit trail, **Then** it succeeds.
2. **Given** a Member or Reporter, **When** they request the audit trail (view or export, including a direct server call), **Then** it is refused (403).

---

### Edge Cases

- Very large logs → the view returns the most recent entries (capped), newest first, so it stays responsive.
- No user actions at all (fresh system) → the user-actions log shows an empty state.
- Configuration changes exist only once the config-editing feature is used → until then that log is legitimately empty.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST expose the recorded user-action audit log (report, acknowledge, override, close, re-open) with actor, action, target, and UTC timestamp, newest first.
- **FR-002**: The system MUST expose the configuration-change audit log **separately** from user actions.
- **FR-003**: The audit trail (view and export) MUST be restricted to Admin and Auditor; Member and Reporter MUST be refused (403).
- **FR-004**: The system MUST provide a CSV export of the audit logs for Admin and Auditor.
- **FR-005**: The audit logs MUST remain append-only and MUST NOT be editable or deletable through this feature (read-only).
- **FR-006**: The system MUST return the most recent entries (capped) to stay responsive, newest first.
- **FR-007**: A writer for configuration-change entries MUST be available so future config edits are recorded (no fabricated entries are added now).
- **FR-008**: The web UI MUST present the two logs as separate, read-only tables matching the prototype, with export shown to permitted roles.

### Key Entities *(include if feature involves data)*

- *(No new persistence.)* **AuditUserAction** (already written by Features 001–004) and **AuditConfigChange** (schema exists; writer added for future config edits). Read-only here.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The user-actions log reflects real recorded actions with correct actor and timestamp, newest first.
- **SC-002**: User actions and configuration changes are presented as two separate logs.
- **SC-003**: Access and export are allowed only for Admin/Auditor; Member/Reporter are refused when exercised directly against the server.
- **SC-004**: The CSV export contains the audit rows for Admin/Auditor.
- **SC-005**: No audit entry can be created, edited, or deleted through this feature.

## Assumptions

- **No new persistence** — both tables already exist; this feature is read + export, plus a `logConfigChange` writer for future use.
- **Configuration-change log is empty until** the config-editing feature (later) records changes — shown honestly as an empty state.
- **Retention** (≥18 months) is a later data-lifecycle concern; nothing is purged here.
- Builds on Features 001–005.
