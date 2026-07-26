# Feature Specification: Notifications Feed

**Feature Branch**: `010-notifications`

**Created**: 2026-07-10

**Status**: Draft

**Input**: Backlog epic E8 (S8.4). Traces to the demo guide §15 (the running story of everything: alerts, acks, escalations, alarms, stand-downs). Builds on Features 001–009. Read-only aggregation of data already recorded.

The running story of everything the system did — reports, acknowledgements, escalations, reminders, admin alarms, stand-downs — in one chronological feed, so anyone can see the whole activity at a glance.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See the activity feed (Priority: P1)

A signed-in user opens Notifications and sees a chronological, newest-first feed merging user actions (report, acknowledge, close, re-open, override) and engine events (escalation, reminder, alarm, stand-down), each with a category, a message, and a time.

**Why this priority**: This *is* the feature — surfacing the combined story from the two logs we already keep.

**Independent Test**: After incidents have been reported, acknowledged, escalated, and closed, open Notifications → those events appear newest-first with sensible category labels and timestamps.

**Acceptance Scenarios**:

1. **Given** recorded user actions and engine events, **When** the feed is opened, **Then** items from both appear merged and sorted newest-first.
2. **Given** each item, **When** shown, **Then** it has a category (e.g. ALERT, ACK, ESCALATION, REMINDER, ALARM, STAND-DOWN, CLOSE), a human message, and a timestamp.
3. **Given** a large history, **When** the feed loads, **Then** it returns the most recent items (capped) and stays responsive.

---

### User Story 2 - Role scoping (Priority: P2)

Admin, Member, and Auditor see organisation-wide activity; a Reporter sees only activity for incidents they raised (and their own actions).

**Why this priority**: Keeps the feed within each role's visibility. P2 because the feed itself (Story 1) is the core.

**Independent Test**: A Reporter's feed contains only their own incidents' events; Admin's feed contains everything.

**Acceptance Scenarios**:

1. **Given** an Admin/Member/Auditor, **When** they open the feed, **Then** they see system-wide activity.
2. **Given** a Reporter, **When** they open the feed, **Then** they see only events tied to incidents they reported (and their own actions).
3. **Given** an unauthenticated request, **When** it hits the feed, **Then** it is refused (401).

---

### Edge Cases

- No activity yet → an empty feed (no error).
- Anonymous incidents → their engine events still appear in org-wide feeds; a Reporter never sees another reporter's items.
- Very old events beyond the cap → excluded (only recent items returned).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST return a chronological, newest-first feed merging user-action audit entries and escalation events.
- **FR-002**: Each feed item MUST carry a category, a human-readable message, and a UTC timestamp.
- **FR-003**: The feed MUST be capped to a recent window (e.g. 40 items) for responsiveness.
- **FR-004**: Admin, Member, and Auditor MUST see organisation-wide activity; a Reporter MUST see only events for incidents they reported and their own actions.
- **FR-005**: The feed MUST require authentication (401 otherwise); it is read-only.
- **FR-006**: The feed MUST derive entirely from already-recorded data (no new persistence, no fabricated items).
- **FR-007**: The web UI MUST present the feed (category chip, message, time) and a nav entry for all signed-in roles, matching the prototype's notifications panel.

### Key Entities *(include if feature involves data)*

- *(No new persistence.)* Reads **AuditUserAction** and **EscalationEvent** (with the owning incident for reporter scoping); assembles a **NotificationItem** read-model per request.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The feed shows items from both logs, correctly ordered newest-first.
- **SC-002**: A Reporter's feed contains only their own incidents' items; an Admin's contains system-wide items.
- **SC-003**: The feed is capped and returns quickly; an empty history yields an empty feed without error.
- **SC-004**: The endpoint requires authentication and never mutates data.

## Assumptions

- **No new persistence** — merges the two existing logs on read.
- **Reporter scoping** uses `EscalationEvent.incident.reporterUserId` and `AuditUserAction.actorUserId`.
- **Category** is derived from the action/kind (ALERT/ACK/ESCALATION/REMINDER/ALARM/STAND-DOWN/CLOSE/REOPEN/OVERRIDE/OTHER).
- Builds on Features 001–009.
