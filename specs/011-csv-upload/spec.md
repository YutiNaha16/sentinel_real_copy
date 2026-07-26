# Feature Specification: Bulk Call-Tree Upload (CSV)

**Feature Branch**: `011-csv-upload`

**Created**: 2026-07-10

**Status**: Draft

**Input**: Backlog epic E3 (S3.6, S3.7). Traces to `Spec/SENTINEL_Crisis_Phase1_Spec.md` §8 (build the tree by template upload; validate on upload). Builds on Feature 009 (editing + export/template). Admin only.

Bulk-load the escalation chain from a filled-in CSV template — validated strictly and applied atomically — so the company can set up their real chain in one step instead of adding people one by one.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Upload a valid CSV replaces the chain (Priority: P1)

An admin uploads a CSV of people (order, name, role, email, phone, backup). If it passes validation, the active IT/Cyber chain is replaced with the uploaded people in one atomic operation, and the change is audited.

**Why this priority**: This is the feature — one-step setup from the exported/sample template.

**Independent Test**: Upload a well-formed CSV of N people → the tree now shows those N in the given order; backups resolve; the change appears in the config-change audit log.

**Acceptance Scenarios**:

1. **Given** a valid CSV, **When** uploaded, **Then** the active chain becomes exactly the uploaded people, ordered as given, with backups resolved by name.
2. **Given** the upload, **When** applied, **Then** it happens atomically (all-or-nothing) and is recorded in the audit log.
3. **Given** an existing person with the same email, **When** in the upload, **Then** their record is reused/updated (preserving links) rather than duplicated.

---

### User Story 2 - Invalid CSV is rejected with clear errors (Priority: P1)

If the CSV is malformed or fails validation, nothing is changed and the admin gets clear, per-row errors.

**Why this priority**: A broken chain in a crisis tool is unacceptable; rejection with clear feedback is as important as applying. Equal P1.

**Independent Test**: Upload a CSV with a missing name, a bad email, or an unresolved backup → the request is rejected with specific errors and the tree is unchanged.

**Acceptance Scenarios**:

1. **Given** a CSV with a missing required field or malformed email, **When** uploaded, **Then** it is rejected with a per-row error and the tree is unchanged.
2. **Given** a backup referencing a name not in the file, **When** uploaded, **Then** it is rejected with a clear error.
3. **Given** duplicate names/emails or non-contiguous order, **When** uploaded, **Then** it is rejected with a clear error.
4. **Given** any validation failure, **When** rejected, **Then** no partial change is made.

---

### User Story 3 - Admin-only (Priority: P2)

Only admins can upload; others are refused.

**Independent Test**: A non-admin upload attempt is refused (403).

**Acceptance Scenarios**:

1. **Given** a non-admin, **When** they attempt an upload (including a direct server call), **Then** it is refused (403).

---

### Edge Cases

- Empty file / header only → rejected ("at least one person required").
- A person whose email matches an existing active person → updated in place (keeps id/links); people not in the upload are removed (soft-removed, preserving incident history).
- Backup pointing to self → rejected.
- Extra/unknown columns → ignored; missing required columns → rejected.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST accept a CSV upload (admin only) with columns order, name, role, email, phone, backup.
- **FR-002**: The system MUST validate: at least one row; name non-empty; email well-formed; order positive integers forming a contiguous 1..N; no duplicate names or emails; each backup resolves to a listed name and ≠ self.
- **FR-003**: On any validation failure the system MUST reject the whole upload with clear per-row errors and make no change.
- **FR-004**: On success the system MUST replace the active chain atomically — reuse people matched by email (preserving their id/links), create new ones, soft-remove those not in the upload — ordered as given, backups resolved, order/parents contiguous.
- **FR-005**: The upload MUST be Admin-only; others are refused (403).
- **FR-006**: The change MUST be written to the configuration-change audit log.
- **FR-007**: New incidents and the engine MUST use the uploaded chain immediately.
- **FR-008**: The web UI MUST provide an upload control (Admin) that reads the file, posts it, and shows success or the validation errors — matching the prototype's upload dialog.

### Key Entities *(include if feature involves data)*

- *(No new persistence.)* Rewrites the existing **Node** set (upsert by email, soft-remove the rest), keeping order 1..N and parents consistent; writes **AuditConfigChange**.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A valid upload results in the tree matching the file exactly (people, order, backups).
- **SC-002**: An invalid upload changes nothing and returns specific errors.
- **SC-003**: A person matched by email keeps their id (not duplicated); removed people are soft-removed (history preserved).
- **SC-004**: Upload is Admin-only and audited.

## Assumptions

- **CSV posted as text** in a JSON body (the web reads the file and sends its contents) — avoids multipart handling on the pilot.
- **Match key = email** for reuse; **backup key = name** (as in the export/template).
- **Atomic** via a single transaction; resequence afterwards keeps order/parents consistent.
- Builds on Feature 009 (Node.active soft-remove, resequence, audit).
