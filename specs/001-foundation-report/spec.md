# Feature Specification: Foundation & First Incident-Report Slice

**Feature Branch**: `001-foundation-report`

**Created**: 2026-07-08

**Status**: Draft

**Input**: Backlog epics E1 (Foundation), E2 (Identity/RBAC — minimal), E3 (Call tree — read), E5 (Reporting), E10 (Incident log — read), E13 (Audit — write). Traces to `Spec/SENTINEL_Crisis_Phase1_Spec.md` §2, §3, §4, §9, §12, §13 and `Spec/EPICS_AND_STORIES.md` stories S1.1–S1.5, S2.1–S2.3, S3.2–S3.3, S5.1–S5.5, S10.1, S13.1.

This is the **walking-skeleton foundation slice**: it stands up persistence, identity, the seeded IT/Cyber call tree, and the ability to report and list incidents — the base every later feature builds on. Routing, escalation timers, acknowledgement, and notifications are **out of scope here** and arrive in later features.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See the IT/Cyber escalation chain (Priority: P1)

An authorised user opens the call tree and sees the seeded IT/Cyber escalation chain — the three pilot people in order (Prashant Kamble → Nurul Qureshi → Anupam Singh), each with their role and position. An Admin sees the full chain and contact details; a Member sees only their own slice (the person above them, their backup, and who reports to them).

**Why this priority**: It proves the entire stack is standing — database, persistence, identity, role-scoped data access — with the smallest possible surface. It is the first thing that must work before anything can be reported or routed.

**Independent Test**: Log in as Admin → open the call tree → see all three people in order with contact details. Log in as a Member → see only the privacy-scoped slice, never the whole org. Delivers value: the chain is real, persisted, and correctly scoped.

**Acceptance Scenarios**:

1. **Given** the system is seeded with the IT/Cyber tree, **When** an Admin opens the full call tree, **Then** all three people appear in escalation order (1st/2nd/3rd) with name, role, email, phone, and backup.
2. **Given** a Member (Prashant) is logged in, **When** they open their call tree, **Then** they see only their parent, their backup, and their direct reports — and no contact details for anyone outside that slice.
3. **Given** a Reporter or Auditor attempts to open the full call tree, **When** the request is made directly to the server, **Then** it is refused (403) — the restriction is not merely hidden in the UI.

---

### User Story 2 - Report an incident (Priority: P1)

A user (Admin, Member, or Reporter — not Auditor) reports an incident in two steps: pick an incident type (which pre-fills severity from the configured mapping), then add location and a description and send. They may override the pre-filled severity, and may choose to report anonymously. The incident is persisted with a unique incident ID and the action is written to the audit log.

**Why this priority**: Reporting is the entry point of the whole system; without a persisted, audited incident there is nothing to route, acknowledge, or measure. Equal P1 with Story 1 — together they form the minimum viable slice.

**Independent Test**: Log in → choose "Network outage" → severity pre-fills to L2 → add location + description → send → a new incident exists with a unique ID, the chosen severity, and an audit entry recording who reported it. Fully testable without any routing or notification.

**Acceptance Scenarios**:

1. **Given** the severity mapping, **When** the user selects an incident type, **Then** the severity is pre-filled from that type and shown as the default.
2. **Given** a pre-filled severity, **When** the user changes it before sending, **Then** the incident is created with the overridden severity and the override is recorded in the audit log (who, from→to).
3. **Given** the user ticks "report anonymously", **When** the incident is sent, **Then** no reporter identity is stored, and the record is flagged anonymous.
4. **Given** an L2 or L3 selection, **When** the user sends, **Then** a confirmation naming the recipients and the parallel behaviour is required before the incident is created; L0/L1 send without confirmation.
5. **Given** any successful report, **When** the incident is created, **Then** it receives a unique incident ID and a "Reported incident" entry is appended to the user-action audit log with a UTC timestamp.
6. **Given** the Auditor role, **When** a report is attempted (including a direct server call), **Then** it is refused (403).

---

### User Story 3 - See reported incidents in the log (Priority: P2)

A user opens the incident log and sees the incidents that exist, with ID, time, severity, type, location, reporter, and status. Visibility is role-scoped: Admin/Auditor see all; a Reporter sees only incidents they raised ("My reports").

**Why this priority**: Closes the loop for the slice — a report you can't see afterwards has little value — and establishes the role-scoped record view that Auditor/Reporter depend on. P2 because Stories 1–2 already prove the stack; this makes it usable.

**Independent Test**: Report two incidents as different users → open the log as Admin (both visible) → open as the Reporter (only their own visible). Delivers value: a role-correct, persisted record.

**Acceptance Scenarios**:

1. **Given** several incidents exist, **When** an Admin opens the incident log, **Then** every incident is listed with ID, time, severity, type, location, reporter, and status.
2. **Given** a Reporter opens the log, **When** the list renders, **Then** only incidents they raised are shown and the screen is titled "My reports".
3. **Given** an anonymous incident, **When** any user views the log, **Then** the reporter shows as "Anonymous".

---

### Edge Cases

- Reporting with no location → location defaults to "(not specified)". Description is **mandatory**; sending without it is blocked with a clear validation message.
- Selecting a type then changing it before sending → severity re-pre-fills from the newly selected type unless the user has explicitly overridden it.
- A Member whose slice has no parent (top of chain) or no reports → the tree view still renders their own node without error.
- Two incidents reported in the same second → both receive distinct unique IDs.
- Direct API calls that skip the UI → server authorisation still applies for every role restriction.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST persist all data (users, roles, call tree, incidents, audit entries) durably with UTC timestamps; data survives restarts.
- **FR-002**: The system MUST support multiple call trees in its data model but seed and use only the IT/Cyber tree in this feature.
- **FR-003**: The system MUST seed the IT/Cyber tree with the three pilot people in escalation order, each with name, role, email, phone, and backup, mapped to LDAP-ready attributes.
- **FR-004**: The system MUST authenticate users and assign exactly one role (Admin, Member, Reporter, Auditor).
- **FR-005**: The system MUST enforce role permissions on the server for every operation; a forbidden operation is refused even when called directly, not merely hidden in the UI.
- **FR-006**: The system MUST restrict a Member's view of the call tree to {parent, self, backup, direct reports} and MUST NOT expose contact details outside that slice.
- **FR-007**: The system MUST let Admin, Member, and Reporter report an incident; the Auditor MUST NOT be able to report.
- **FR-008**: The system MUST maintain an admin-editable mapping of incident type → default severity and pre-fill severity from the selected type at report time.
- **FR-009**: Users MUST be able to override the pre-filled severity before sending; every override MUST be recorded in the audit log with who and from→to.
- **FR-010**: The system MUST offer anonymous reporting; when chosen, no reporter identity is stored and the incident is flagged anonymous, with a clear warning that anonymous incidents can later be re-opened only by an Admin.
- **FR-011**: The system MUST require a confirmation step for L2/L3 reports (naming recipients and parallel behaviour) and MUST send L0/L1 without that confirmation.
- **FR-012**: The system MUST assign every incident a unique incident ID at creation.
- **FR-013**: The system MUST append every user action in this feature (report, override) to a user-action audit log that is append-only and separate from configuration-change logs.
- **FR-014**: The system MUST show the incident log with ID, time, severity, type, location, reporter, and status; Admin/Auditor see all incidents, a Reporter sees only their own, and anonymous incidents show reporter as "Anonymous".
- **FR-015**: The web UI MUST reproduce the approved prototype's look and behaviour for the screens in scope (call tree, report, incident log).
- **FR-016**: The system MUST require a free-text description when reporting; an incident cannot be sent without it. *(This is a configuration choice that may be relaxed later.)*
- **FR-017**: The data model MUST support admin add / remove / edit of incident types and call-tree people; nothing in scope may hard-code these as fixed or unremovable. (Full management UIs arrive in later features E3/E4.)

*Deferred to later features (explicitly not in this slice): routing/dispatch, sequential vs parallel notification delivery, escalation timers, reminders, admin alarm, acknowledgement, email, close/re-open, metrics, configuration editing UIs, onboarding/self-service, leave cover, template upload.*

### Key Entities *(include if feature involves data)*

- **User**: a person who logs in; has one role (Admin/Member/Reporter/Auditor) and may be linked to a call-tree node.
- **CallTree**: a named escalation matrix (only IT/Cyber populated now); owns an ordered set of nodes.
- **Node**: a person in a tree — name, role/title, email, phone, position/order, parent, backup. LDAP-ready.
- **IncidentType**: a category (e.g. Network outage) with a default severity; the mapping is admin-editable.
- **Incident**: a reported event — unique ID, type, severity, location, description, reporter (or anonymous flag), status, created timestamp; belongs to a tree.
- **AuditEntry (user action)**: append-only record — who, action, target, UTC timestamp; separate from config-change log.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can report an incident (type → detail → send) in under 60 seconds.
- **SC-002**: 100% of reports produce a persisted incident with a unique ID and a matching audit entry.
- **SC-003**: 100% of role restrictions in scope (Auditor cannot report; Reporter/Auditor cannot open the full tree; Member sees only their slice) hold when exercised directly against the server, not just the UI.
- **SC-004**: Every severity override and every report is retrievable from the audit log with actor and timestamp.
- **SC-005**: The three seeded people appear in correct escalation order for an Admin, and a Member sees only their scoped slice.
- **SC-006**: Data persists across a full restart of the system with no loss.

## Assumptions

- **Pilot roster**: exactly three people (Prashant Kamble, Nurul Qureshi, Anupam Singh) in that escalation order; more can be added later with no rework. *(confirmed by user)*
- **Incident types & default severities**: the prototype's six types and their L0–L3 defaults are used as placeholders, marked "to confirm" with the stakeholder before go-live.
- **Authentication**: local email/password logins for the pilot, behind a pluggable interface so company SSO can be added later without rearchitecting.
- **Data protection**: GDPR posture assumed (EU); real employee contact data is entered only after the stakeholder/legal gates in `Spec/STAKEHOLDER_DISCOVERY.md` are cleared. During build, test contacts are used.
- **UI**: the approved `SENTINEL_Interactive_Prototype.html` is the visual target; screens are ported to React components, not redesigned.
- **Retention**: audit/incident data retained ≥ 18 months (enforced as a floor in later features; nothing is hard-deleted here).
- **Description is mandatory** on report (user decision, 2026-07-08); this can be relaxed to optional later via configuration if desired.
- **Add/remove everywhere**: incident types and people are managed data, not fixed lists — the model supports create/remove/edit from the start (management UIs delivered in E3/E4).
