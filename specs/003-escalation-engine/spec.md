# Feature Specification: Automatic Escalation Engine

**Feature Branch**: `003-escalation-engine`

**Created**: 2026-07-09

**Status**: Draft

**Input**: Backlog epic E6. Traces to `Spec/SENTINEL_Crisis_Phase1_Spec.md` §5 (escalation logic, timeouts, reminders, retries, admin alarm) and `Spec/EPICS_AND_STORIES.md` stories S6.2, S6.3, S6.4, S6.5. Builds on Feature 002 (chain state).

The system's automatic safety net: once an incident is live, timers run on their own — escalating to the next contact when no one acknowledges, reminding unacknowledged people up to a retry cap, and alarming the admin if the whole chain stays silent. **Out of scope here**: real email delivery (Feature 004) — "notify/remind/alarm" here update chain state and record activity events; close/re-open/override (Feature 005); the config-editing UI (Feature 007 — values live in the DB, seeded and demo-friendly).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Automatic escalation on timeout (Priority: P1)

For a sequential incident (L0/L1), if the current contact does not acknowledge within that level's timeout, the system escalates: the current person is marked Escalated and the next contact is Notified — automatically, with no one having to chase.

**Why this priority**: Escalation is the core promise — a silent contact must never stall an incident. Without it the chain is inert.

**Independent Test**: Fire an L1 incident; the first contact is Notified. Without acknowledging, wait past the level timeout → the first contact becomes Escalated and the second becomes Notified. Verified deterministically by advancing the clock and running the engine.

**Acceptance Scenarios**:

1. **Given** a sequential incident whose current contact has been Notified longer than the level's escalate-after time without acknowledging, **When** the engine runs, **Then** that contact becomes Escalated and the next waiting contact becomes Notified (with a timestamp), and an escalation activity event is recorded.
2. **Given** the last contact in a sequential chain times out, **When** the engine runs, **Then** there is no next contact to notify and the incident proceeds toward the admin alarm (Story 3).
3. **Given** a contact who acknowledges before the timeout, **When** the engine runs, **Then** no escalation occurs for them.
4. **Given** a parallel incident (L2/L3, everyone already notified), **When** the engine runs, **Then** no sequential escalation happens (but reminders and the alarm still apply).

---

### User Story 2 - Reminders up to a retry cap (Priority: P1)

Anyone who has been notified but has not acknowledged is reminded on a configured interval, up to a maximum number of reminders — including the original person even after escalation — then reminders stop.

**Why this priority**: Nudging responders (without human effort) materially improves response, and the retry cap prevents endless spam. Equal P1.

**Independent Test**: Fire an incident; for a notified, unacknowledged person, advancing the clock by the reminder interval and running the engine produces one reminder each interval, stopping after the cap.

**Acceptance Scenarios**:

1. **Given** a notified, unacknowledged person and elapsed time ≥ the reminder interval since their last reminder (or since they were notified), **When** the engine runs, **Then** exactly one reminder is recorded and their reminder count increases by one.
2. **Given** a person who has reached the reminder cap, **When** the engine runs, **Then** no further reminders are sent to them.
3. **Given** a person who acknowledges, **When** the engine runs, **Then** no further reminders are sent to them.
4. **Given** an escalated (still-unacknowledged) original person below the cap, **When** the engine runs at the interval, **Then** they continue to be reminded.

---

### User Story 3 - Admin alarm when nobody responds (Priority: P1)

If no one in the entire chain has acknowledged by the alarm time, the admin is alarmed once — a prominent, unmissable signal that the incident is going unanswered.

**Why this priority**: The last line of defence against a fully-silent incident. Equal P1.

**Independent Test**: Fire an incident, acknowledge no one, advance the clock past the alarm time, run the engine → the incident is flagged alarmed exactly once and an alarm activity event is recorded.

**Acceptance Scenarios**:

1. **Given** an active incident with zero acknowledgements and age ≥ the alarm time, **When** the engine runs, **Then** the incident is flagged as admin-alarmed (with a timestamp) and an alarm event is recorded — exactly once.
2. **Given** an incident that is already alarmed, **When** the engine runs again, **Then** no duplicate alarm is raised.
3. **Given** an incident where at least one person has acknowledged, **When** the alarm time passes, **Then** no admin alarm is raised.

---

### User Story 4 - See the escalation happening (Priority: P2)

On the live tree, an escalated person shows an Escalated state, an alarmed incident shows a prominent alarm banner, and a recent-activity feed lists what the system did (escalations, reminders, alarms) — so the automatic behaviour is visible, not hidden.

**Why this priority**: The engine's value is only realised if people can see it working. P2 because Stories 1–3 deliver the behaviour; this surfaces it.

**Independent Test**: With an incident mid-escalation, the live tree shows Escalated on the timed-out person and an activity feed entry; once alarmed, a red banner appears.

**Acceptance Scenarios**:

1. **Given** an escalated chain entry, **When** the live tree is viewed, **Then** that person shows an "Escalated" state distinctly from Notified/Acknowledged.
2. **Given** an alarmed incident, **When** the live tree is viewed, **Then** a prominent alarm banner is shown.
3. **Given** engine activity, **When** the live tree is viewed, **Then** a recent-activity feed lists escalations, reminders, and alarms with timestamps.

---

### Edge Cases

- Two escalations due in one engine run (e.g. very short demo timers) → the engine advances one hop per run per incident; the next hop escalates on the following run (predictable, no skipping of activity records).
- An incident acknowledged by someone after the alarm would have fired → alarm is suppressed (someone responded).
- The engine runs while an acknowledgement arrives → acknowledgement wins; an acknowledged person is never escalated or reminded.
- Reminder interval shorter than engine tick → at most one reminder per tick per person; counts never exceed the cap.
- Resolved incidents (Feature 005, later) → the engine skips non-active incidents.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST run an escalation engine automatically on a short interval, processing all ACTIVE incidents; the processing MUST also be invocable deterministically for testing.
- **FR-002**: Escalation timing MUST be configurable per severity level — escalate-after, reminder interval, maximum reminders, and admin-alarm-after — stored in the database (seeded with demo-friendly defaults; editing UI is a later feature).
- **FR-003**: For sequential severities (L0/L1), when the current notified contact has been waiting longer than escalate-after without acknowledging, the engine MUST mark them Escalated and Notify the next waiting contact (timestamped).
- **FR-004**: For parallel severities (L2/L3), the engine MUST NOT perform sequential escalation (everyone is already notified) but MUST still apply reminders and the admin alarm.
- **FR-005**: The engine MUST send reminders to notified-or-escalated, unacknowledged people at the reminder interval, incrementing a per-person reminder count, up to the maximum; then stop.
- **FR-006**: Reminders MUST stop for a person on acknowledgement or on reaching the cap; the original person MUST continue to be reminded after escalation until acknowledged or capped.
- **FR-007**: When no one in the chain has acknowledged by admin-alarm-after (measured from incident creation), the engine MUST flag the incident as admin-alarmed exactly once and record an alarm event.
- **FR-008**: The engine MUST never raise a duplicate alarm, never escalate or remind an acknowledged person, and never change an incident's status (it does not close incidents).
- **FR-009**: Every escalation, reminder, and alarm MUST be recorded as an activity event (with incident, kind, message, timestamp) for visibility and audit.
- **FR-010**: The live tree MUST expose the Escalated state, the admin-alarmed flag, and a recent-activity feed; the web UI MUST show escalated status, a prominent alarm banner, and the activity list.
- **FR-011**: All engine actions MUST be safe to re-run (idempotent per due-time) and MUST survive process restarts by reconstructing due work from persisted timestamps.

### Key Entities *(include if feature involves data)*

- **EscalationConfig** (new): per severity level — escalateAfterSec, remindEverySec, maxReminders, adminAlarmAfterSec. Seeded; editable later.
- **IncidentChainEntry** (existing, extended): gains `ESCALATED` state, a `reminderCount`, and `lastRemindedAt`.
- **Incident** (existing, extended): gains `adminAlarmedAt`.
- **EscalationEvent** (new): incident, kind (ESCALATION / REMINDER / ALARM), message, timestamp — the activity feed.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of sequential incidents whose contact exceeds escalate-after without acknowledging escalate to the next contact on the next engine run.
- **SC-002**: Reminder counts never exceed the configured maximum, and acknowledged people receive zero further reminders.
- **SC-003**: An unacknowledged incident is admin-alarmed exactly once, and never when someone has acknowledged.
- **SC-004**: The engine changes no incident's status and produces an activity event for every escalation, reminder, and alarm.
- **SC-005**: After a process restart, pending escalations/reminders/alarms still fire based on persisted timestamps (no lost timers).
- **SC-006**: The live tree visibly shows escalated people, the alarm banner, and the recent-activity feed.

## Assumptions

- **"Notify / remind / alarm" = state change + recorded event** in this feature; real email delivery is Feature 004. This is stated honestly (no message actually leaves the system yet).
- **Demo-friendly timers**: seeded config uses short seconds (not production minutes) so escalation and the alarm are demonstrable in a live demo; production values and an editing UI come with Feature 007.
- **Engine cadence**: a short fixed interval (a few seconds) drives the timers; the core logic is a pure, testable function fed the current time.
- **Clock time** only (no business-hours logic — that is Phase 2), consistent with the spec.
- Builds on Feature 002's chain-state model, and on Feature 001's audit and RBAC.
