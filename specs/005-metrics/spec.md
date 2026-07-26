# Feature Specification: Response Metrics

**Feature Branch**: `005-metrics`

**Created**: 2026-07-09

**Status**: Draft

**Input**: Backlog epic E11. Traces to `Spec/SENTINEL_Crisis_Phase1_Spec.md` §10 (MTTA, MTTR, total completion, per-hop latency, delivery/ack rates, breaking-node) and §11 (CSV export). Stories S11.1–S11.4, S12.2. Builds on Features 001–004.

Response performance for compliance and improvement — the numbers that prove the system works, computed from the **real** timestamps captured by earlier features (report, acknowledge, escalate, close). **Out of scope**: PDF export (a later enhancement; CSV is delivered here); "delivered" means the alert was dispatched to a contact (no external mail confirmation yet — Feature for email is later).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See response metrics (Priority: P1)

An admin (or auditor) opens Metrics and sees headline figures — MTTA (mean time to first acknowledgement), MTTR (mean time to resolution), acknowledgement rate, and delivery rate — plus a resolution mix by severity, all computed from real incident data.

**Why this priority**: These are the numbers stakeholders ask for to judge whether the system works; without them the pilot can't demonstrate value or support compliance.

**Independent Test**: With incidents that have been acknowledged and closed, open Metrics → MTTA/MTTR/ack-rate/delivery-rate show real values and the resolution mix reflects the incidents by severity.

**Acceptance Scenarios**:

1. **Given** incidents with acknowledgements, **When** metrics are computed, **Then** MTTA equals the mean of (first-acknowledgement − created) across incidents that were acknowledged.
2. **Given** resolved incidents, **When** metrics are computed, **Then** MTTR equals the mean of (closed − created) across resolved incidents.
3. **Given** any set of incidents, **When** metrics are computed, **Then** acknowledgement rate and delivery rate are between 0% and 100% and reflect acknowledged / delivered chain entries.
4. **Given** incidents across severities in the last 30 days, **When** metrics are computed, **Then** the resolution mix shows the count per severity.
5. **Given** no incidents at all, **When** metrics are computed, **Then** the figures are shown as not-available (no divide-by-zero, no crash).

---

### User Story 2 - Per-hop latency & breaking-node (Priority: P2)

For a chosen incident, the admin sees the latency between each escalation hop and a flag on the node where the chain stalled (notified/escalated but not acknowledged), so improvement efforts can target the bottleneck.

**Why this priority**: Turns raw timings into an actionable "where does our chain break" insight. P2 because the headline figures (Story 1) deliver the core value first.

**Independent Test**: For an incident where an early contact acknowledged and a later one has not, the per-hop view shows each hop's latency and flags the stalled node as the breaking node.

**Acceptance Scenarios**:

1. **Given** an incident's chain, **When** per-hop latency is computed, **Then** each contacted person shows the time from their notification to their acknowledgement (or "pending" if not yet acknowledged).
2. **Given** an incident with an unacknowledged notified/escalated node, **When** the breaking node is identified, **Then** the first such node is flagged as where the chain stalls.

---

### User Story 3 - Role scoping & CSV export (Priority: P2)

Admins and auditors see organisation-wide metrics and can export them as CSV; a member sees the same figures scoped to their team but cannot export.

**Why this priority**: Keeps reporting controlled (admin/auditor) while still giving members visibility — matches the least-privilege rule. P2 because the metrics themselves (Stories 1–2) come first.

**Independent Test**: Admin and Auditor can open Metrics and download a CSV; a Member can view metrics but has no export; a Reporter cannot open Metrics at all.

**Acceptance Scenarios**:

1. **Given** an Admin or Auditor, **When** they request the metrics CSV, **Then** a CSV of the metrics/per-incident data is returned.
2. **Given** a Member, **When** they open Metrics, **Then** they see the figures but the export is unavailable (and a direct export call is refused).
3. **Given** a Reporter, **When** they request metrics (view or export), **Then** it is refused (403).

---

### Edge Cases

- No incidents / no acknowledgements / no resolutions → the affected figure shows "—" (not available) rather than 0 or an error.
- An incident acknowledged before it was (artificially) created, or clock skew → latency is floored at zero, never negative.
- Anonymous incidents → included in aggregates (they still have timings); reporter identity is irrelevant to metrics.
- The "last 30 days" window has no incidents → resolution mix shows zeros.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST compute MTTA as the mean of (first acknowledgement − created) over incidents that were acknowledged; incidents with no acknowledgement are excluded from MTTA.
- **FR-002**: The system MUST compute MTTR as the mean of (closed − created) over resolved incidents; unresolved incidents are excluded from MTTR.
- **FR-003**: The system MUST compute total completion time per incident as (last acknowledgement − created).
- **FR-004**: The system MUST compute acknowledgement rate (acknowledged chain entries ÷ delivered chain entries) and delivery rate (delivered ÷ total chain entries), each clamped to 0–100%.
- **FR-005**: The system MUST compute a resolution mix — incident counts per severity — over the last 30 days.
- **FR-006**: The system MUST compute per-hop latency for an incident (per contacted person: notification → acknowledgement, or pending) and identify the breaking node (first notified/escalated but unacknowledged person).
- **FR-007**: All metrics MUST derive from real stored timestamps; no fabricated or hard-coded figures.
- **FR-008**: Metrics view MUST be available to Admin, Member, and Auditor; Reporter MUST be refused (403).
- **FR-009**: CSV export MUST be available to Admin and Auditor only; Member and Reporter export MUST be refused (403).
- **FR-010**: All metrics computations MUST be safe with zero/partial data (no divide-by-zero, no negative latency; missing values shown as not-available).
- **FR-011**: The web UI MUST present the metrics dashboard (KPI tiles, resolution mix, per-hop latency with breaking-node flag) matching the prototype, with export shown only to permitted roles.

### Key Entities *(include if feature involves data)*

- *(No new persistence.)* Metrics are computed on read from existing entities: **Incident** (created/closed), **IncidentChainEntry** (notified/ack timestamps, state), and severities. A **MetricsSummary** read-model is assembled per request.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: MTTA and MTTR match hand-computed values from the underlying timestamps for a known dataset.
- **SC-002**: Acknowledgement and delivery rates are always within 0–100%, and latencies are never negative.
- **SC-003**: Metrics render with zero incidents without error (figures shown as not-available).
- **SC-004**: Role rules hold when exercised directly: Reporter blocked from metrics; Member blocked from export; Admin/Auditor allowed.
- **SC-005**: The CSV export contains the metrics/per-incident rows for Admin/Auditor.

## Assumptions

- **"Delivered" = dispatched to a contact** (a chain entry that reached at least "notified") — an honest proxy until real email delivery (a later feature) can confirm receipt.
- **Team scope for Member** = the IT/Cyber tree (the only tree in the pilot), so member and org figures coincide now but the scoping rule is enforced for the future.
- **PDF export is deferred**; CSV is delivered now (real file).
- **No schema change** — metrics are computed from existing data.
- Builds on Features 001–004.
