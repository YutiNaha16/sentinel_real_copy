# Feature Specification: Call-Tree Editing

**Feature Branch**: `009-call-tree-editing`

**Created**: 2026-07-09

**Status**: Draft

**Input**: Backlog epic E3. Traces to `Spec/SENTINEL_Crisis_Phase1_Spec.md` §8 (build/edit the tree in-app, LDAP-ready fields, changes audited, export for review). Stories S3.1, S3.2, S3.8. Builds on Features 001–008. *(Leave cover and CSV upload are a follow-up feature.)*

The admin's complete control of the escalation chain: add, edit, remove, and reorder people, keeping the order and parent pointers consistent, with validation and a full audit trail — so the company can build their real chain in-app instead of relying on the seed. Plus export the matrix and download a sample template.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Add, edit, and remove people (Priority: P1)

An admin adds a person (name, role, email, phone, backup), edits any person's details, or removes a person. The chain stays consistent — order and parent pointers are recomputed — and every change is audited.

**Why this priority**: Without editing, the chain is frozen at the seed; the company can't put their real people in. This is the core capability.

**Independent Test**: Add a fourth person → they appear at the end of the chain with the next position; edit their role → it persists; remove them → the chain closes up to three with correct order. Each action shows in the config-change audit log.

**Acceptance Scenarios**:

1. **Given** the tree, **When** an admin adds a person with valid details, **Then** they are appended to the chain with the next position, order/parents stay consistent, and an audit entry records the addition.
2. **Given** a person, **When** an admin edits their fields, **Then** the changes persist and an audit entry records the edit.
3. **Given** a person, **When** an admin removes them, **Then** they are removed, order is recomputed (1..N), any backup pointing to them is cleared, and an audit entry records the removal.
4. **Given** invalid input (missing name, malformed email), **When** saving, **Then** it is rejected with a clear message.
5. **Given** a non-admin, **When** they attempt any edit (including a direct server call), **Then** it is refused (403).

---

### User Story 2 - Reorder the chain (Priority: P1)

An admin moves a person up or down in the escalation order. Escalation follows the new order immediately.

**Why this priority**: The order *is* the escalation sequence; being able to set who is contacted first/second/third is essential. Equal P1.

**Independent Test**: Move the 3rd person up → they become 2nd, the former 2nd becomes 3rd, and parent pointers follow; a new sequential incident escalates in the new order.

**Acceptance Scenarios**:

1. **Given** a person not already first, **When** an admin moves them up, **Then** they swap position with the person above and order/parents are recomputed.
2. **Given** a person not already last, **When** an admin moves them down, **Then** they swap with the person below.
3. **Given** the move, **When** applied, **Then** an audit entry records the reorder.

---

### User Story 3 - Export & sample template (Priority: P2)

An admin exports the current matrix as CSV (for periodic review) and downloads a sample template with the expected columns.

**Why this priority**: Supports review and future bulk setup. P2 because editing (Stories 1–2) delivers the core.

**Independent Test**: Export returns a CSV of the current people with their positions; the sample template returns a CSV with the header columns and an example row.

**Acceptance Scenarios**:

1. **Given** the tree, **When** an admin exports, **Then** a CSV of the current chain (order, name, role, email, phone, backup) is returned.
2. **Given** the template request, **When** an admin downloads it, **Then** a CSV with the expected columns and an example row is returned.

---

### Edge Cases

- Removing the only/first person → the next person becomes first (order 1, parent null); the chain never ends up with a broken parent.
- Setting a person's backup to themselves → rejected.
- Moving the first person up or the last person down → no-op (rejected/ignored gracefully).
- Editing an email to a malformed value → rejected.
- Backup referencing a removed person → cleared automatically on removal.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST let an admin add a person to the IT/Cyber chain with name, role, email, phone, and optional backup; the person is appended with the next position.
- **FR-002**: The system MUST let an admin edit a person's name, role, email, phone, and backup.
- **FR-003**: The system MUST let an admin remove a person; on removal, order MUST be recomputed (1..N), parent pointers MUST stay consistent, and any backup pointing to the removed person MUST be cleared.
- **FR-004**: The system MUST let an admin move a person up or down; order and parent pointers MUST be recomputed to match.
- **FR-005**: Node fields MUST remain LDAP-ready (name→displayName, role→title, email→mail, parent→manager).
- **FR-006**: The system MUST validate input — name required, email well-formed, backup ≠ self — and reject invalid changes with a clear message.
- **FR-007**: Every add / edit / remove / reorder MUST be written to the configuration-change audit log with the actor and what changed.
- **FR-008**: All editing operations MUST be Admin-only; Member/Reporter/Auditor are refused (403). (Hierarchy-scoped member editing is a later enhancement.)
- **FR-009**: The escalation engine and new incidents MUST use the updated order immediately (no restart).
- **FR-010**: The system MUST let an admin export the current matrix as CSV and download a sample template CSV.
- **FR-011**: The web UI MUST present the full call tree with Add / Edit / Remove / move controls, export, and template download, matching the prototype (Admin only).

### Key Entities *(include if feature involves data)*

- *(No new persistence.)* Edits the existing **Node** (displayName, title, email, phone, order, parentId, backupId). Writes **AuditConfigChange** on every change. Order is kept 1..N with `parentId` = the previous node.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After any add/remove/reorder, the chain has contiguous order 1..N and each node's parent is the node directly above (first has no parent).
- **SC-002**: A malformed email or self-backup is rejected; a valid change persists.
- **SC-003**: Every edit appears in the configuration-change audit log with actor and detail.
- **SC-004**: A new sequential incident after a reorder escalates in the new order.
- **SC-005**: All editing is Admin-only when exercised directly against the server.
- **SC-006**: Export and template return valid CSV with the expected columns.

## Assumptions

- **No new persistence** — edits the existing Node model; order/parent kept consistent by a resequence step after every change.
- **Linear chain** (single path, order 1..N) as in the pilot; `parentId` is derived from order, not set independently.
- **Admin-only editing** for this feature; hierarchy-scoped member editing and leave cover come later.
- **CSV upload (bulk replace) is a follow-up feature**; this feature delivers in-app editing + export + sample template.
- Builds on Features 001–008 (audit config-change writer, escalation reading the tree live).
