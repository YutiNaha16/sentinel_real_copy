# API Contracts — Feature 008

Base `/api`. One public endpoint (token-ack); the rest require auth.

## GET /public/ack/:token   (PUBLIC — no auth)
The Acknowledge link tapped from an alert email.
- Looks up the chain entry by `ackToken`.
- Unknown token → 200 HTML "This acknowledgement link is invalid or has expired."
- Valid token → records that person's acknowledgement (idempotent), writes an audit entry, **never** changes incident status; returns a small HTML confirmation ("You've acknowledged INC-… — thank you.").
- Safe to open repeatedly (idempotent).

## GET /incidents/:reference/emails   (Admin/Member)
The in-app mock inbox for an incident.
- Roles: **ADMIN, MEMBER**. Reporter/Auditor → 403.
- 200 → `[{ toName, toEmail, subject, severity, body, ackLink, deliveredAt, failedReason }]` newest first.

## Behaviour at notify points (no new request shape)
- `POST /incidents` (report), override→parallel, and engine escalation each generate an `EmailMessage` per newly-notified contact with a stable `ackLink`, then deliver via the configured provider (mock by default).

## Configuration (env)
- `EMAIL_PROVIDER` = `mock` (default) | `http`
- `EMAIL_API_URL`, `EMAIL_API_KEY`, `EMAIL_FROM` — for the real HTTPS provider
- `PUBLIC_BASE_URL` — base for the Acknowledge link (default `http://localhost:3000`)

## Notes
- Real sending is off by default; when enabled it is tested to a test address first, and to real people only as an announced acceptance test.
- The public ack link is the only unauthenticated surface; it can only acknowledge via a valid per-person token and cannot read data.
