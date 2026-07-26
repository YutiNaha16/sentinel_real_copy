# Implementation Plan: Email Alerts with One-Click Acknowledge

**Branch**: `008-email-alerts` | **Date**: 2026-07-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification. Builds on Features 001–007.

## Summary

Generate an alert email (incident ID, severity, description, and a secure tokenised Acknowledge link) whenever a contact is notified — on report and on escalation. A mock provider stores them in an in-app inbox; a real HTTPS email provider plugs in via configuration. A public, unauthenticated endpoint acknowledges from the link (idempotent, audited, never closes). The live tree shows the delivered-emails inbox with working Acknowledge actions.

## Technical Context

**Language/Version**: TypeScript / Node 24.
**Primary Dependencies**: NestJS, Prisma. **No new runtime dependency** for the mock provider; the real provider uses `fetch` (built-in) to an HTTPS email API — no library needed.
**Storage**: PostgreSQL — new `EmailMessage`; extend `IncidentChainEntry` with `ackToken`.
**Testing**: Jest + Supertest e2e — email generated on report, token-ack loop (public, idempotent, audited, no status change), invalid token, mock-inbox role scoping.
**Constraints**: honest — mock inbox by default; "delivered" = provider accepted; real send is config-gated and pointed at test addresses first (network blocks SMTP → HTTPS API).

## Constitution Check

| Principle | Compliance |
|---|---|
| I. Least privilege | Mock inbox = Admin/Member; the only public surface is the token-ack link (acts only via a valid token). |
| III. Immutable audit | Token acknowledgement writes an append-only audit entry. |
| IV. ACK ≠ Close | Token-ack sets acknowledgement only; never changes incident status. |
| VI. Honest limitations | Mock inbox default; provider-accepted = "delivered"; real send is announced/test-first. |
| VII. Walking skeleton | Completes the remote-response loop on the existing chain/ack model. |
| VIII. Configurable | Provider + from-address + base URL are configuration, not hard-coded. |
| IX. Design fidelity | Live-tree mock inbox matches the prototype (email card + green Acknowledge button). |

**Result**: PASS.

## Project Structure (delta)

```text
apps/api/prisma/schema.prisma          # EmailMessage; IncidentChainEntry.ackToken
apps/api/prisma/migrations/…           # migration
apps/api/src/email/
  email.service.ts                     # buildAlert(); send on notify; deliver via provider
  providers/email-provider.ts          # interface + MockEmailProvider + HttpEmailProvider
  email.module.ts
apps/api/src/incidents/
  incidents.service.ts                 # generate ackToken + email on notify (create + override→parallel)
  incidents.controller.ts              # GET /incidents/:ref/emails (Admin/Member)
  public-ack.controller.ts             # GET /public/ack/:token (public, HTML confirmation)
apps/api/src/escalation/escalation.service.ts   # send alert email when escalation notifies next
apps/web/src/pages/LiveTreePage.tsx    # delivered-emails inbox panel
apps/api/test/email.e2e-spec.ts        # generation + token-ack + role tests
```

**Structure Decision**: a dedicated `email` module owns generation + provider; `incidents`/`escalation` call it at notify points; a small public controller serves the token-ack link.

## Phase 0 — Decisions

- **Token**: `ackToken` on the chain entry (one per person per incident), 32+ hex chars from `crypto.randomBytes`; the Acknowledge link is `${PUBLIC_BASE_URL}/api/public/ack/<token>`.
- **Public ack**: `GET /public/ack/:token` (so a tapped link works) → find entry by token → acknowledge (idempotent) → return a small HTML confirmation page. `@Public()`.
- **Provider interface**: `deliver(msg): Promise<{deliveredAt} | {failedReason}>`. `MockEmailProvider` marks delivered immediately; `HttpEmailProvider` POSTs to a configurable HTTPS API (`EMAIL_PROVIDER=http`, `EMAIL_API_URL`, `EMAIL_API_KEY`, `EMAIL_FROM`). Default `mock`.
- **Send points**: on report (each notified entry), on override→parallel (newly notified), and on escalation (next notified). Failures are recorded on the `EmailMessage`, never thrown into the incident flow.
- **Mock inbox**: `GET /incidents/:ref/emails` (Admin/Member) returns the incident's emails for the live-tree panel.

## Phase 1 — contracts

- `GET /public/ack/:token` (public) → HTML confirmation.
- `GET /incidents/:reference/emails` (Admin/Member) → the mock inbox list.

## Complexity Tracking

No constitution violations.
