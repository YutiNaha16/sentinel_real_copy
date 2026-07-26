# Feature Specification: Live Escalation Tree & Acknowledgement

**Feature Branch**: `002-live-tree-ack`

**Created**: 2026-07-09

**Status**: Draft

**Input**: Backlog epic E7 (Acknowledgement & Live Status) + the chain-initialisation part of E6/E5. Traces to `Spec/SENTINEL_Crisis_Phase1_Spec.md` §5 (sequential vs parallel), §6 (acknowledgement, ACK≠Close), and `Spec/EPICS_AND_STORIES.md` stories S6.1, S7.1, S7.2, S7.3, S7.4. Builds on Feature 001.

This is the **anti-rumour view**: when an incident is live, everyone can see who has been alerted and who has acknowledged, updating in near real time. **Out of scope here** (later features): automatic escalation timers, reminders, the "nobody responded" alarm (Feature 003); email alerts with an Acknowledge link (Feature 004); close/re-open/override (Feature 005).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See the live escalation tree (Priority: P1)

An Admin or Member opens an active incident and sees each person in its chain with a status — Acknowledged, Notified (waiting), or Waiting-in-chain — plus a headline count ("2 of 3 acknowledged"). The view refreshes on its own so the picture stays current without a manual reload.

**Why this priority**: This is the core value of the whole system — replacing rumour with a visible, shared fact of who has responded. Nothing else in this feature matters without it.

**Independent Test**: Report an incident, open its live tree → each chain member shows a coloured status and the count reads "0 of N"; after someone acknowledges, the same view reflects it within a few seconds.

**Acceptance Scenarios**:

1. **Given** an active L2/L3 (parallel) incident, **When** the tree is opened, **Then** every person shows "Notified" and the count is "0 of N".
2. **Given** an active L0/L1 (sequential) incident, **When** the tree is opened, **Then** the first contact shows "Notified" and the rest show "Waiting in chain".
3. **Given** the tree is open, **When** a person acknowledges, **Then** the view reflects their "Acknowledged" state and updated count within the refresh interval, without a manual page reload.
4. **Given** a Reporter or Auditor, **When** they attempt to open a live tree (including a direct server call), **Then** it is refused (403) — acknowledgement/live-tree is Admin/Member only.

---

### User Story 2 - Acknowledge (Priority: P1)

A person in the chain (acting as Admin or Member) acknowledges an incident. Their row turns "Acknowledged" with a timestamp, the count increments, and the action is recorded in the audit trail. Each person acknowledges independently; full acknowledgement by everyone is **not** required.

**Why this priority**: Acknowledgement is the event the live tree exists to show, and the source of the MTTA metric later. Equal P1 with Story 1.

**Independent Test**: On a live incident, acknowledge for a notified person → their status becomes "Acknowledged" with a time, the count goes from "0 of 3" to "1 of 3", and an audit entry appears. Acknowledging is distinct from closing.

**Acceptance Scenarios**:

1. **Given** a notified person, **When** they acknowledge, **Then** their state becomes "Acknowledged" with a UTC timestamp and the count increments by one.
2. **Given** a person who already acknowledged, **When** acknowledge is attempted again, **Then** it is idempotent (no double count, no error state).
3. **Given** an acknowledgement, **When** it is recorded, **Then** a "Acknowledged" entry is written to the user-action audit log; the incident is **not** closed (ACK ≠ Close).
4. **Given** a Reporter or Auditor, **When** they attempt to acknowledge, **Then** it is refused (403).

---

### User Story 3 - Switch between multiple active incidents (Priority: P2)

When more than one incident is active, the user can switch between them from the live view and see each one's own tree and count.

**Why this priority**: Real operations run several incidents at once; without switching, the live view only serves the simplest case. P2 because Stories 1–2 already deliver the core for a single incident.

**Independent Test**: With two active incidents, the live view lists both; selecting each shows its distinct chain and count.

**Acceptance Scenarios**:

1. **Given** two or more active incidents, **When** the live view loads, **Then** all active incidents are selectable with their severity and reference.
2. **Given** a selected incident, **When** the user switches to another, **Then** the tree and count update to that incident.

---

### Edge Cases

- An incident created before this feature (no chain state) → the live tree shows a clear "no chain recorded" state rather than an error; a one-time backfill gives existing active incidents a chain.
- A Member who is not part of the incident's tree opening the live tree → allowed to view (they are in the IT/Cyber tree), consistent with "members see all active incidents in their tree".
- Acknowledging a person who is only "Waiting in chain" (not yet notified, sequential) → allowed; it records their acknowledgement and counts (a person may respond early).
- All people acknowledged → count shows "N of N"; the incident remains active until explicitly closed (Feature 005).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: On reporting an incident, the system MUST create a chain-state entry per person in the incident's tree, initialised by severity: parallel (L2/L3) → all "Notified"; sequential (L0/L1) → first "Notified", rest "Waiting in chain".
- **FR-002**: The system MUST expose an active incident's live tree: each person with display name, position, role, and current state (Waiting / Notified / Acknowledged), plus an acknowledged count and chain size.
- **FR-003**: The live tree MUST be role-scoped: Admin and Member may view; Reporter and Auditor MUST be refused (403).
- **FR-004**: The system MUST let an Admin or Member acknowledge on behalf of a chain person; acknowledgement records a UTC timestamp and sets that person's state to "Acknowledged".
- **FR-005**: Acknowledgement MUST be independent per person and MUST NOT require full acknowledgement; the count reflects how many of N have acknowledged.
- **FR-006**: Acknowledgement MUST be idempotent — acknowledging an already-acknowledged person does not double-count or error.
- **FR-007**: Every acknowledgement MUST be written to the append-only user-action audit log.
- **FR-008**: Acknowledgement MUST NOT close or resolve the incident (ACK ≠ Close); the two are distinct events.
- **FR-009**: Reporter and Auditor MUST NOT be able to acknowledge (403).
- **FR-010**: The live view MUST refresh automatically (near real time) so acknowledgements appear without a manual reload.
- **FR-011**: When multiple incidents are active, the system MUST let the user select among them and show each incident's own tree and count.
- **FR-012**: The system MUST provide a one-time backfill so incidents created before this feature gain chain-state entries.
- **FR-013**: The web UI MUST reproduce the prototype's live-tree look (coloured status dots, position tags, per-row acknowledge control, headline count).

### Key Entities *(include if feature involves data)*

- **IncidentChainEntry** (new): one row per (incident, node) — position/order, state (waiting / notified / acknowledged), notifiedAt, ackAt. Drives the live tree and, later, escalation and metrics.
- **Incident** (existing): gains a relation to its chain entries; `createdAt` already present for later MTTA.
- **AuditUserAction** (existing): receives an "Acknowledged" entry per acknowledgement.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of newly reported incidents have a chain-state entry per tree member, initialised correctly for their severity mode.
- **SC-002**: An acknowledgement is reflected in the live view within the refresh interval (target ≤ 5s) without a manual reload.
- **SC-003**: The acknowledged count always equals the number of "Acknowledged" chain entries (never drifts, even with repeated acknowledgement).
- **SC-004**: 100% of live-tree and acknowledge role restrictions (Reporter/Auditor 403) hold when exercised directly against the server.
- **SC-005**: Every acknowledgement is retrievable from the audit log with actor and UTC timestamp, and no acknowledgement changes incident status.

## Assumptions

- **Near real time = polling** in Phase 1: the web view refetches on a short interval. WebSocket/SSE is a later enhancement, noted not built (keeps the pilot honest and simple).
- **Acknowledge-on-behalf**: in this feature, an Admin/Member acknowledges a chain person from the tree (mirrors the prototype's per-row button). Self-service email acknowledgement arrives in Feature 004.
- **No timers**: automatic escalation, reminders, and the admin alarm are Feature 003; here states change only by explicit acknowledgement.
- **Backfill**: existing active incidents get chain entries via a one-time script/migration so the live tree works for them too.
- Builds directly on Feature 001's data model, auth, RBAC, and audit.
