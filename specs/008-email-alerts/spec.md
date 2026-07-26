# Feature Specification: Email Alerts with One-Click Acknowledge

**Feature Branch**: `008-email-alerts`

**Created**: 2026-07-09

**Status**: Draft

**Input**: Backlog epic E8. Traces to `Spec/SENTINEL_Crisis_Phase1_Spec.md` §6 (email with one-click Acknowledge) and §14 (email channel; third-party service now, Sodexo mail later). Stories S8.1, S8.2. Builds on Features 001–007.

The feature that lets people respond from their phone in another city: when someone is notified, an alert email carrying the incident ID and a **secure one-click Acknowledge link** is generated. Tapping it acknowledges without logging in, and the live tree updates. A **mock inbox** shows delivered emails in-app (honest for the pilot); the mail provider is **pluggable** (mock by default, a real HTTPS email API via configuration).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Alert email with an Acknowledge link (Priority: P1)

When a contact is notified (on report, and on escalation), an alert email is generated for them containing the incident ID, severity, description, and a large one-click Acknowledge link. In the pilot these appear in an in-app mock inbox showing exactly what each recipient receives.

**Why this priority**: This is the alert delivery itself — the thing that reaches the responder. Without it there is nothing to acknowledge remotely.

**Independent Test**: Report an incident, open its live view → the mock inbox lists one email per notified contact, each showing recipient, incident ID, severity, and an Acknowledge link.

**Acceptance Scenarios**:

1. **Given** a reported incident, **When** contacts are notified, **Then** one alert email per notified contact is generated with the incident ID, severity, description, and a unique Acknowledge link.
2. **Given** sequential escalation notifies the next contact, **When** that happens, **Then** an alert email is generated for the newly-notified contact.
3. **Given** the mock provider, **When** an email is generated, **Then** it is stored and shown in the in-app inbox with a delivery timestamp.

---

### User Story 2 - One-click acknowledge from the link (Priority: P1)

A recipient taps the Acknowledge link from their email — on any device, without logging in — and their acknowledgement is recorded: their live-tree row turns acknowledged, the count updates, and the action is audited. The link is a secure per-person token.

**Why this priority**: This is the whole point — remote acknowledgement that updates everyone's view in real time. Equal P1.

**Independent Test**: Take an email's Acknowledge link, open it with no session → it records that person's acknowledgement, shows a confirmation, and the live tree reflects it; using it again is harmless.

**Acceptance Scenarios**:

1. **Given** an alert email's Acknowledge link, **When** it is opened without authentication, **Then** that person is acknowledged, a confirmation is shown, and the live tree updates.
2. **Given** an already-used or already-acknowledged link, **When** opened again, **Then** it is idempotent (still shows acknowledged; no double count, no error).
3. **Given** an invalid or unknown token, **When** opened, **Then** a clear "invalid link" response is shown (not an error page).
4. **Given** a token-acknowledge, **When** recorded, **Then** it is written to the user-action audit log and never changes incident status (ACK ≠ Close).

---

### User Story 3 - Pluggable provider & delivery tracking (Priority: P2)

The mail provider is configurable: a mock provider (in-app inbox) by default, or a real HTTPS email API via configuration. "Delivered" means the provider accepted the message.

**Why this priority**: Lets the pilot run safely on the mock inbox and switch to real email (test addresses, then real) without code changes. P2 because Stories 1–2 deliver the loop.

**Independent Test**: With the mock provider, emails show delivered in-app; configuring a real provider (out of scope to send here) routes through the same interface — verified by the abstraction, not by sending to real people.

**Acceptance Scenarios**:

1. **Given** the default configuration, **When** emails are generated, **Then** they are delivered to the mock inbox and marked delivered.
2. **Given** a real provider is configured, **When** an email is generated, **Then** the same generation path calls the provider; a delivery failure is recorded without crashing the incident flow.

---

### Edge Cases

- Anonymous incident → recipients are the chain contacts (not the reporter); the reporter's identity is irrelevant to alert emails.
- A contact notified twice (e.g., re-notify on override to parallel) → their Acknowledge link is stable (one token per person per incident); no duplicate acknowledgement.
- Real provider fails/times out → the failure is recorded on the email; the incident, chain, and engine are unaffected.
- Token for a resolved incident → acknowledging still records but never re-opens or changes status.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: When a chain contact is set to notified (on report and on escalation), the system MUST generate an alert email for them containing the incident ID, severity, description, location, and a one-click Acknowledge link.
- **FR-002**: Each Acknowledge link MUST use a secure, hard-to-guess, per-person-per-incident token; the token acknowledges only that person for that incident.
- **FR-003**: The Acknowledge link MUST work without authentication from any device, record the acknowledgement (timestamp), update the live tree, and write a user-action audit entry.
- **FR-004**: Token acknowledgement MUST be idempotent and MUST NOT change incident status (ACK ≠ Close); an invalid/unknown token returns a clear message, not an error page.
- **FR-005**: The system MUST show generated emails in an in-app mock inbox per incident (recipient, incident ID, severity, description, Acknowledge link, delivery time), visible to Admin/Member.
- **FR-006**: The mail provider MUST be pluggable via configuration — a mock provider (in-app inbox) by default, or a real HTTPS email API — behind one interface; the generation path MUST be identical.
- **FR-007**: "Delivered" MUST mean the provider accepted the message; a provider failure MUST be recorded on the email and MUST NOT break the incident/escalation flow.
- **FR-008**: The mock-inbox list MUST be Admin/Member only; the public Acknowledge link is the only unauthenticated surface and is limited to acknowledging via a valid token.
- **FR-009**: The web UI MUST show the delivered-emails inbox on the live tree (each email with a working Acknowledge action) matching the prototype.

### Key Entities *(include if feature involves data)*

- **IncidentChainEntry** (extended): gains `ackToken` (unique per person-per-incident) used by the Acknowledge link.
- **EmailMessage** (new): incident, node, toEmail, toName, subject, body, ackToken, createdAt, deliveredAt, failedReason — the record shown in the mock inbox and the delivery status.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every notified contact has exactly one alert email generated with a working, unique Acknowledge link.
- **SC-002**: Opening an Acknowledge link (no session) acknowledges that person and the live tree reflects it; repeating is idempotent.
- **SC-003**: Token acknowledgement writes an audit entry and never changes incident status.
- **SC-004**: With the mock provider, 100% of generated emails are shown in-app as delivered; a simulated provider failure is recorded without breaking the flow.
- **SC-005**: The mock inbox is Admin/Member only; an invalid token yields a clear message.

## Assumptions

- **Mock inbox is the Phase-1 default** — honest, safe, and demonstrable; real sending is a configuration switch, tested to a test address first and to real people only as an announced acceptance test (see `Spec/STAKEHOLDER_DISCOVERY.md`).
- **Real provider = HTTPS email API** (e.g. Resend/SendGrid) rather than SMTP, because the pilot machine's network blocks raw SMTP ports; wired behind the interface, off by default.
- **Ack link target**: a public API endpoint that records the acknowledgement and returns a simple confirmation page (works on any phone, no app/login).
- **One token per person per incident** (stable Acknowledge link), reused if they are notified again.
- Builds on Features 001–007 (chain state, acknowledge, escalation engine, audit).
