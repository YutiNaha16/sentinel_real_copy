# Feature Specification: Incident Lifecycle — Override, Close & Re-open

**Feature Branch**: `004-incident-lifecycle`

**Created**: 2026-07-09

**Status**: Draft

**Input**: Backlog epic E9. Traces to `Spec/SENTINEL_Crisis_Phase1_Spec.md` §3 (override, logged) and §7 (close-with-reason, stand-down, configurable re-open window, anonymous → admin-only). Stories S9.1, S9.2, S9.3. Builds on Features 001–003.

Ends an incident cleanly — with a reason for the record — and re-classifies or re-opens when needed. **Out of scope**: real email/stand-down delivery (a later feature) — here "notify / stand down" is a recorded action; the config-editing UI (Feature 007) — the re-open window is a seeded, DB-stored value.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Close an incident with a reason (Priority: P1)

Anyone in the incident's chain, or an admin, closes an incident by selecting a reason (a predefined list plus a free-text "Other"). The incident becomes Resolved, the escalation engine stops acting on it, a stand-down is recorded for everyone alerted plus the reporter, and the action is logged.

**Why this priority**: Without close, incidents never end — they pile up and the engine keeps escalating/alarming them. Closing is the most-needed lifecycle action.

**Independent Test**: On an active incident, close with a reason → status becomes Resolved, it drops off the active/live list, the engine no longer touches it, and an audit entry records who closed it and why.

**Acceptance Scenarios**:

1. **Given** an active incident, **When** an admin or a chain member closes it with a reason, **Then** its status becomes Resolved, `closedAt` is set, the reason is stored, and a "Closed incident" audit entry (with the reason) is written.
2. **Given** a close, **When** it completes, **Then** a stand-down record is created (for everyone alerted + the reporter) and the incident no longer appears in the active/live list.
3. **Given** a resolved incident, **When** the escalation engine runs, **Then** it performs no escalation, reminders, or alarm for it.
4. **Given** a Reporter or Auditor (not in the chain), **When** they attempt to close (including a direct server call), **Then** it is refused (403).
5. **Given** close is requested with no reason, **When** submitted, **Then** it is rejected (reason is required).

---

### User Story 2 - Override severity on an active incident (Priority: P1)

An admin, or anyone in the chain, re-classifies a live incident's severity with a reason. The change is logged (who, from → to, reason). If the new severity crosses into parallel (L2/L3), anyone still only waiting in the chain is now notified.

**Why this priority**: Real incidents turn out worse or milder than first assessed; the people handling them must be able to re-classify, and every change must be auditable. Equal P1.

**Independent Test**: On an active sequential incident, override to L3 with a reason → the incident's severity changes, the previously-waiting chain members become Notified, and an audit entry records the from → to and reason.

**Acceptance Scenarios**:

1. **Given** an active incident, **When** an admin or chain member overrides its severity with a reason, **Then** the severity changes and an "Overrode severity" audit entry records who, from → to, and the reason.
2. **Given** an override that moves severity from sequential (L0/L1) to parallel (L2/L3), **When** applied, **Then** every chain member still in "Waiting" becomes "Notified" (timestamped).
3. **Given** an override with no reason, **When** submitted, **Then** it is rejected.
4. **Given** a Reporter or Auditor (not in the chain), **When** they attempt to override, **Then** it is refused (403).

---

### User Story 3 - Re-open a resolved incident within the window (Priority: P2)

A resolved incident can be re-opened within a configurable window — by the reporter (if they did not report anonymously) or an admin. For anonymous incidents, only an admin can re-open. Every re-open is logged.

**Why this priority**: "Resolved" is sometimes premature. P2 because Stories 1–2 deliver the core lifecycle; re-open is the recovery path.

**Independent Test**: Close an incident, then re-open it as the reporter within the window → status returns to Active. Outside the window, or by a non-permitted user, re-open is refused. For an anonymous incident, only an admin succeeds.

**Acceptance Scenarios**:

1. **Given** a resolved incident within the re-open window, **When** the reporter (non-anonymous) or an admin re-opens it, **Then** its status returns to Active, the admin-alarm flag is cleared, and a "Re-opened incident" audit entry is written.
2. **Given** a resolved incident past the re-open window, **When** re-open is attempted, **Then** it is refused with a clear message.
3. **Given** an anonymous resolved incident, **When** a non-admin attempts to re-open, **Then** it is refused; only an admin may re-open it.
4. **Given** a re-opened incident, **When** the engine next runs, **Then** it resumes acting (can re-alarm if still unanswered).

---

### Edge Cases

- Closing an already-resolved incident → rejected (already closed).
- Overriding to the same severity → allowed but recorded as a no-op change (or rejected as no change — see Assumptions).
- Re-open exactly at the window boundary → treated as within the window (inclusive) per the configured value.
- Override crossing into parallel when some are already acknowledged → acknowledged people stay acknowledged; only "Waiting" people are newly notified.
- A chain member who is not part of *this* incident's chain → treated as not-in-chain for close/override permission.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST let an admin, or a user whose node is in the incident's chain, close an active incident; Reporter/Auditor and non-chain members MUST be refused (403).
- **FR-002**: Closing MUST require a reason (predefined option or free-text "Other"); the incident becomes Resolved with `closedAt` set and the reason stored.
- **FR-003**: On close, the system MUST record a stand-down for everyone alerted plus the reporter, and the incident MUST leave the active/live list.
- **FR-004**: The escalation engine MUST NOT act on non-active incidents (already guaranteed — verified here).
- **FR-005**: The system MUST let an admin or a chain member override an active incident's severity with a required reason; the change MUST be logged (who, from → to, reason).
- **FR-006**: An override that crosses from sequential to parallel MUST notify every still-"Waiting" chain member (timestamped); acknowledged/notified members are unaffected.
- **FR-007**: The system MUST let a resolved incident be re-opened within a configurable window by the reporter (if not anonymous) or an admin; anonymous incidents are admin-only.
- **FR-008**: Re-open MUST be refused outside the window or by non-permitted users, with a clear message; on success the status returns to Active and the admin-alarm flag is cleared.
- **FR-009**: Every close, override, and re-open MUST be written to the append-only user-action audit log.
- **FR-010**: The re-open window MUST be a configurable value stored in the database (seeded; editing UI is a later feature).
- **FR-011**: The web UI MUST provide Close and Override controls on an active incident (for permitted roles) and a Re-open control for resolved incidents (for permitted users), matching the prototype dialogs.

### Key Entities *(include if feature involves data)*

- **Incident** (extended): gains `closeReason` and `closedAt`.
- **AppConfig** (new, single row): `reopenWindowHours` (and `retentionMonths`, for later) — general configuration.
- **AuditUserAction** (existing): receives close / override / re-open entries.
- **EscalationEvent** or a stand-down record (existing feed): a stand-down entry on close.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of closes set status Resolved with a stored reason and a matching audit entry, and remove the incident from the active list.
- **SC-002**: The engine performs zero actions on resolved incidents.
- **SC-003**: 100% of overrides record who/from→to/reason; a sequential→parallel override notifies all previously-waiting members.
- **SC-004**: Re-open succeeds only within the window and only for permitted users (reporter-non-anon or admin; anonymous → admin only), and clears the alarm flag.
- **SC-005**: All close/override/re-open role and permission rules hold when exercised directly against the server.

## Assumptions

- **Re-open behaviour** (spec §17 open question): re-open simply flips status back to Active and clears the admin-alarm flag; it does **not** restart escalation from the top (the chain state is preserved). This is the simpler, less-surprising default; can be revisited with the stakeholder.
- **"Stand-down / notify" = recorded action** in this feature; real email delivery is a later feature. Stated honestly.
- **Chain membership** for close/override = the acting user's linked node is one of the incident's chain nodes (admins always permitted).
- **Override to the same severity** is accepted and recorded (no-op change) rather than rejected, to keep the action forgiving.
- **Seeded re-open window**: 72 hours (3 days), matching the prototype default; editable later (Feature 007).
- Builds on Features 001–003 (chain state, audit, engine).
