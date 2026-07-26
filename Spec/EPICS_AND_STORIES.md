# SENTINEL Crisis — Epics & User Stories (Phase 1)

**Project / Repo:** `Sodexo_Crisis_notif_project`
**Scope:** Phase 1 — IT/Cyber pilot (one escalation matrix; data model supports many).
**Source of truth:** [`SENTINEL_Crisis_Phase1_Spec.md`](./SENTINEL_Crisis_Phase1_Spec.md) · reference: demo guide + interactive prototype.
**Trace column:** each story cites the spec section (`§`) it implements, so nothing is invented and nothing is lost.

### Confirmed technology stack
| Layer | Choice | Notes |
|---|---|---|
| Backend | **NestJS + TypeScript** | Modular structure for RBAC / incidents / escalation / audit. Prisma (or TypeORM) for schema + migrations; BullMQ for durable escalation timers. |
| Frontend | **React + TypeScript** | **Must visually match the existing `SENTINEL_Interactive_Prototype.html` exactly** — port its design tokens (`--brand`, severity colors), dark sidebar, cards, escalation tree, modals, and toasts into reusable components. Structured so a later React Native mobile app can reuse skills/types. |
| Database | **PostgreSQL** | Relational integrity for chain + audit; 18-month retention; metrics queries. |
| Spec process | **GitHub Spec Kit** (`uvx specify`) | One feature per story; constitution encodes the non-negotiables. |
| Repo | **`Sodexo_Crisis_notif_project`** → GitHub `YutiNaha16` | |

> **How to read priorities**
> - **P0** — walking skeleton; the end-to-end path the spec insists on first (report → route → alert → acknowledge → live status → metrics → report).
> - **P1** — core Phase 1 feature; required for pilot sign-off.
> - **P2** — refinement / polish; can trail without blocking the pilot.

---

## Glossary (shared language for every story)

| Term | Meaning |
|---|---|
| **Severity** | L0 Hazard, L1 Minor (sequential) · L2 Major, L3 Critical (parallel). Set by incident type, overridable. |
| **Node** | A person in a call tree: name, role, email, phone, parent, backup, order. |
| **Chain** | The ordered set of nodes an incident escalates through. |
| **ACK** | "I've seen this" — timestamped, drives MTTA. Distinct from Close. |
| **Close** | "This is handled" — timestamped, drives MTTR. |
| **Person state** | `idle` (waiting) → `notified` → `escalated` → `ackd`. |
| **Incident status** | `active` / `resolved`. |
| **Admin alarm** | Final alert to admin when nobody in the whole chain ACKs. |
| **Roles** | Admin, Member, Reporter, Auditor. |

---

## Epic map

| # | Epic | Spec § | Priority |
|---|---|---|---|
| E1 | Foundation & Platform | §2, §13 | P0 |
| E2 | Identity, Login & Role-Based Access | §9, §13 | P0 |
| E3 | Call-Tree Management | §8 | P0/P1 |
| E4 | Configuration | §3, §5, §7, §12 | P0/P1 |
| E5 | Incident Reporting | §3, §4 | P0 |
| E6 | Escalation Engine (timers, reminders, alarm) | §5 | P0/P1 |
| E7 | Acknowledgement & Live Status | §6 | P0 |
| E8 | Notifications & Email Delivery | §6, §7, §14 | P0/P1 |
| E9 | Incident Lifecycle (override / close / re-open) | §3, §7 | P1 |
| E10 | Incident Log & Records | §7, §12 | P1 |
| E11 | Metrics | §10 | P1 |
| E12 | Reporting & Export (PDF / CSV) | §11 | P1 |
| E13 | Audit Trail & Retention | §12 | P0/P1 |
| E14 | Non-Functional & Pilot Hardening | §16 | P1/P2 |
| E15 | Phase 2 Roadmap (captured, out of scope) | §15 | — |

---

# E1 — Foundation & Platform  *(P0)*
*Spec §2, §13. The scaffolding every other epic stands on. Build the data model to support multiple trees; pilot only IT/Cyber.*

**S1.1 — Project scaffold & environments**
As a developer, I want a repo scaffold with local/dev/prod config separation, so the team builds on a consistent base.
- Acceptance: repo runs locally with a single documented command; secrets via env vars, never committed; README with beginner-friendly run steps (spec's "keep it beginner-friendly").

**S1.2 — Persistent data model & migrations**
As the system, I want a versioned relational schema for trees, nodes, incidents, chain-state, acknowledgements, notifications, audit, and config, so all data is stored permanently with full timestamps.
- Acceptance: migrations are reproducible; `tree_id` foreign key present on nodes/incidents from day one (multi-tree ready); every record carries created/updated timestamps (UTC).
- Trace: §2 (multi-tree data model), §13 (permanent storage, timestamps).

**S1.3 — API conventions & error contract**
As a developer, I want consistent REST endpoints, validation, and a uniform error shape, so the frontend and future mobile client integrate predictably.
- Acceptance: documented error format; input validation on every write endpoint; 4xx for user error vs 5xx for system error.

**S1.4 — Structured logging & health check**
As an operator, I want structured request logs and a `/health` endpoint, so the pilot is observable.
- Acceptance: correlation id per request; health check returns build + DB connectivity.

**S1.5 — Seed data for IT/Cyber pilot**
As a demoer, I want the IT/Cyber tree, incident types, and default config seeded, so the app is usable immediately (mirrors prototype seed).
- Acceptance: seed creates the 3 pilot nodes, 6 incident types, and 4-level config from the spec/prototype defaults.

---

# E2 — Identity, Login & Role-Based Access  *(P0)*
*Spec §9, §13. Server-side least-privilege is the security backbone — the prototype's role switch becomes real logins.*

**S2.1 — Authentication & sessions**
As a user, I want to log in, so the system knows who I am and enforces my permissions.
- Acceptance: secure login; session/token with expiry; logout; passwords/credentials stored per security best practice.

**S2.2 — Four roles with server-enforced permissions**
As the system, I want Admin / Member / Reporter / Auditor roles enforced on the server, so UI is never the only guard.
- Acceptance matrix (server-checked on every endpoint):
  - Admin: everything.
  - Member: report, ACK, close, view own tree slice + all active incidents in tree, team metrics, edit only below self.
  - Reporter: report + view own reports only. No tree, no org metrics.
  - Auditor: read-only — incident log, metrics, audit trail. No actions.
- Acceptance: a forbidden action returns 403 even if called directly (not just hidden in UI).
- Trace: §9.

**S2.3 — Contact-privacy scoping**
As a Member, I want to see only my slice of the tree, so colleagues' contact details stay private.
- Acceptance: API responses for a Member exclude nodes outside {parent, self, backup, direct reports}.
- Trace: §9.

**S2.4 — Metrics/report access restriction**
As the system, I want metric report generation gated to Admin (view scoped for Member/Auditor per role), so sensitive reporting stays controlled.
- Acceptance: report download endpoints reject non-Admin (Auditor read/download per §11 note — confirm), Member sees team-scoped metrics without download.
- Trace: §9, §10.

---

### Onboarding, self-service profile & consent  *(added — invitation-based data collection)*
*The call tree's **structure and order** stay Admin-curated (S3.1–S3.4). Onboarding only lets each person enrich and maintain **their own contact details**. A crisis system must not depend on voluntary self-registration for chain completeness.*

**S2.5 — Invitation-based onboarding & first login**
As an Admin, I want to add a person by email and have the system invite them to set up their login, so I don't need a bulk employee database up front.
- Acceptance: Admin creates the node (name, role, email, chain position, backup); system emails a secure, expiring invite; on first login the person verifies identity and sets credentials; account is linked to their node. **Chain position/order is set by the Admin, not the invitee.**
- Trace: §8, §13; extends S3.1.

**S2.6 — Self-service profile completion & maintenance**
As an invited person, I want to complete and later update my own contact details (phone, alternate contact, preferred channel), so my crisis contact info stays current without the Admin chasing me.
- Acceptance: person edits only their own contact fields; cannot change chain position, parent, or others' data; contact-field changes audit-logged; Admin sees per-node completion status.
- Trace: §8, §9, §12.

**S2.7 — Consent & data-protection capture**
As the data controller, I want each person to give explicit, versioned consent to store their contact details and receive crisis alerts, so the pilot has a lawful basis and a record.
- Acceptance: consent captured at onboarding with timestamp + notice version; person can view what personal data is stored about them; consent state visible to Admin; withdrawal path defined (with the caveat that audit records persist ≥18 months — legal to confirm).
- Trace: §12, §16; needs company-side confirmation (see stakeholder checklist).

**S2.8 — Pluggable authentication (pilot-local, SSO-ready)**
As the system, I want authentication behind an interface, so the pilot can use standalone logins while staying ready for company SSO (Azure AD / Okta) later.
- Acceptance: local login works for the pilot; auth abstracted so SSO drops in without rearchitecting; chosen approach recorded with the company.
- Trace: §13; aligns with Phase 2 §15.

---

# E3 — Call-Tree Management  *(P0 core, P1 upload/cover)*
*Spec §8. LDAP-ready fields; hierarchy-scoped editing; template upload with validation.*

**S3.1 — Node CRUD with LDAP-ready fields**
As an Admin, I want to add/edit/remove people with name, role, email, phone, parent, backup, so the chain reflects reality.
- Acceptance: fields map name→displayName, email→mail, role→title, parent→manager; order recomputed on change; every edit audit-logged.
- Trace: §8.

**S3.2 — Full call tree view (Admin)**
As an Admin, I want the complete ordered chain with edit/remove/add, so I manage the whole matrix.
- Acceptance: shows position, role, email, phone, backup; add/edit/remove; first contact cannot be removed while it's the only root (guard).

**S3.3 — My call tree (Member slice)**
As a Member, I want to see the person above me, my backup, and who reports to me, so I know my part without seeing everyone.
- Acceptance: exactly the privacy-scoped slice from S2.3; states the edit-below-self rule.
- Trace: §8, §9.

**S3.4 — Hierarchy-scoped editing**
As a Member, I want to add/remove/replace/reorder only people below me, so authority follows the chain.
- Acceptance: server rejects edits at or above the actor's position; Admin unrestricted; all changes logged.
- Trace: §8.

**S3.5 — Leave / vacation cover**
As a Member or Admin, I want to temporarily swap in a stand-in for someone, so coverage holds during leave.
- Acceptance: replacement stays until manually undone (no auto-expiry); person removed + stand-in both notified; "Undo cover" restores original; logged.
- Trace: §8.

**S3.6 — CSV/Excel template upload with validation**
As an Admin, I want to upload the matrix as a template carrying people + all config params, so I can build the tree in bulk.
- Acceptance: real CSV/Excel parsing; validation rejects with clear errors — every person has a valid parent, no circular reporting, positive timeouts, required fields present; nothing applied unless the whole file is valid.
- Trace: §8.

**S3.7 — Sample template download**
As an Admin, I want a pre-filled sample template with editable defaults, so I know the exact format.
- Acceptance: generated file includes people columns + per-level timeouts/reminders/retries/severity mapping/re-open window, pre-filled with current defaults.
- Trace: §8.

**S3.8 — Export escalation matrix**
As an Admin, I want to export the matrix for periodic review.
- Acceptance: on-demand export (CSV). *(Scheduled distribution = Phase 2.)*
- Trace: §8.

---

# E4 — Configuration  *(P0 mapping/timers, P1 rest)*
*Spec §3, §5, §7, §12. Admin-only; every change audit-logged.*

**S4.1 — Incident-type → default-severity mapping (editable)**
As an Admin, I want to edit which severity each incident type defaults to, so reporting reflects our policy.
- Acceptance: editable per type; change logged; new reports use current mapping.
- Trace: §3.

**S4.2 — Per-level escalation config**
As an Admin, I want to set, per severity level, the escalation timeout, reminder interval, and retry count (with units sec/min/hr), so timing fits operations.
- Acceptance: values persisted per level; applied by the engine; changes logged; validation forces positive values.
- Trace: §5.

**S4.3 — General config (re-open window, retention)**
As an Admin, I want to set the re-open window and audit retention (min 18 months), so lifecycle and compliance rules are configurable.
- Acceptance: re-open window in hours/days; retention ≥ 18 months enforced as floor; changes logged.
- Trace: §7, §12.

**S4.4 — Demo / short-timer profile**
As a demoer, I want a way to run escalation on very short timers, so live demos show escalation and alarm in seconds.
- Acceptance: short-timer values configurable and clearly separated; production values unaffected.
- Trace: demo guide §1, §6.

---

# E5 — Incident Reporting  *(P0)*
*Spec §3, §4. Two-step report; anonymous; per-incident direct link.*

**S5.1 — Report an incident (type → detail → send)**
As any non-Auditor user, I want to pick an incident type (auto-severity), add location + description, and send, so I raise a crisis fast.
- Acceptance: two-step flow; severity pre-filled from type; location + description captured; incident created with unique ID.
- Trace: §4, §3.

**S5.2 — Severity override at report time**
As a reporter, I want to change the auto severity before sending, so the alert matches reality.
- Acceptance: override captured; logged with who/from→to/when/reason.
- Trace: §3.

**S5.3 — Anonymous reporting with informed warning**
As a reporter, I want to report anonymously, so I can raise sensitive issues.
- Acceptance: no reporter identity stored when chosen; clear at-the-moment warning that only an Admin can re-open anonymous incidents.
- Trace: §4, §7.

**S5.4 — High-severity confirmation (L2/L3)**
As a reporter, I want a confirmation step for major/critical alerts, so I don't fire a parallel alert by accident.
- Acceptance: L0/L1 send immediately; L2/L3 show a confirm dialog naming recipients + parallel behaviour before sending.
- Trace: §5 (parallel), demo guide §7.

**S5.5 — Per-incident direct link in every alert**
As a responder handling several incidents, I want each alert to carry its incident ID + a direct link, so I ACK the right one.
- Acceptance: every notification includes incident ID and a link that resolves to that incident's ACK.
- Trace: §4.

---

# E6 — Escalation Engine  *(P0 dispatch, P1 reminders/alarm)*
*Spec §5. The automatic safety net. This is the highest-risk backend component — build and test it in isolation.*

**S6.1 — Sequential vs parallel dispatch**
As the system, I want L0/L1 to alert the first contact only and L2/L3 to alert everyone at once, so notification matches severity.
- Acceptance: on report, chain-state initialised correctly (sequential → only first `notified`; parallel → all `notified`).
- Trace: §5.

**S6.2 — Escalation on timeout**
As the system, I want to escalate to the next contact when the current one doesn't ACK within the level timeout, so no incident stalls silently.
- Acceptance: background scheduler fires at timeout; prior contact → `escalated`, next → `notified`; event logged + surfaced in notifications.
- Trace: §5.

**S6.3 — Reminders with retry cap**
As the system, I want to keep reminding still-unacknowledged people every interval until the retry cap, so responders are nudged without spamming.
- Acceptance: reminders sent per interval; original person keeps being reminded even after escalation; stop on ACK, close, or retry cap.
- Trace: §5.

**S6.4 — Admin "nobody responded" alarm**
As an Admin, I want a final alarm when no one in the whole chain ACKs, so a fully-silent incident never goes unnoticed.
- Acceptance: alarm fires once when the chain is exhausted with zero ACKs; pulsing banner on incident + admin notification.
- Trace: §5.

**S6.5 — Timer durability**
As the system, I want escalation timers to survive process restarts, so a crash doesn't drop an active incident's schedule.
- Acceptance: due-timers reconstructed from persisted incident state on startup; no double-fire.
- Trace: §5, §13 (persistence).

---

# E7 — Acknowledgement & Live Status  *(P0)*
*Spec §6. The anti-rumour view.*

**S7.1 — Acknowledge action (independent, timestamped)**
As a notified person, I want to acknowledge, so the team sees I've responded.
- Acceptance: ACK timestamped; person → `ackd`; count increments; each person ACKs independently; full ACK not required.
- Trace: §6.

**S7.2 — Live escalation tree view**
As an Admin/Member, I want a real-time tree of who's alerted vs acknowledged, so rumour is replaced by fact.
- Acceptance: per-person coloured state + position + timestamp; header shows "X of N acknowledged"; updates in near real time (websocket/SSE/short-poll — decide in plan).
- Trace: §6.

**S7.3 — ACK vs Close as distinct events**
As the system, I want ACK and Close recorded as separate timestamped events, so MTTA and MTTR are measured correctly.
- Acceptance: a person can ACK without closing; both events stored separately.
- Trace: §6.

**S7.4 — Multiple active incidents**
As an Admin/Member, I want to switch between active incidents, so I can track several at once.
- Acceptance: incident switcher; live badge counts active incidents.
- Trace: §6, demo guide §4.

---

# E8 — Notifications & Email Delivery  *(P0 email path, P1 in-app feed)*
*Spec §6, §7, §14. Email is the Phase 1 channel; production swaps to Sodexo mail.*

**S8.1 — Email delivery via mail service**
As the system, I want to send alert emails through a configurable mail provider, so responders are reached.
- Acceptance: provider behind an interface (swap demo sender → Sodexo mail without code churn); subject/body carry severity, incident ID, description, ACK link; "delivered" = provider accepted (honest per §10 note).
- Trace: §14.

**S8.2 — Secure one-click Acknowledge link**
As a responder, I want to acknowledge from the email without logging in, so I respond fast from my phone.
- Acceptance: tokenised link tied to (incident, person); single-purpose; expiry; can't ACK on behalf of others; ACK updates live tree.
- Trace: §6.

**S8.3 — Stand-down notification on close**
As everyone alerted + the reporter, I want a "resolved, stand down" notice when an incident closes, so nobody keeps chasing.
- Acceptance: on close, all alerted nodes + reporter notified.
- Trace: §7.

**S8.4 — In-app notifications feed**
As any user, I want a running feed (bell) of alerts, ACKs, escalations, reminders, alarms, stand-downs, so I can see the whole story.
- Acceptance: chronological events; unread indicator; role-scoped visibility.
- Trace: demo guide §15.

**S8.5 — Chain-change notifications**
As a person added/removed/covered, I want to be notified of the change, so I know my responsibilities.
- Acceptance: removed person + stand-in both notified on cover/edit.
- Trace: §8.

---

# E9 — Incident Lifecycle: Override / Close / Re-open  *(P1)*
*Spec §3, §7.*

**S9.1 — Override severity on an active incident**
As an Admin or anyone in the chain, I want to re-classify severity on a live incident, so it reflects new information.
- Acceptance: new severity applied; if it crosses into parallel (L2/L3), waiting people are alerted; logged (who, from→to, reason from predefined + Other).
- Trace: §3.

**S9.2 — Close with required reason**
As anyone in the chain, I want to close with a reason, so the record is complete and timers stop.
- Acceptance: reason required (predefined + Other); status → resolved; timers/reminders stop; stand-down sent; logged.
- Trace: §7.

**S9.3 — Re-open within window**
As a reporter (non-anonymous) or Admin, I want to re-open a resolved incident within the configured window, so premature closes are recoverable.
- Acceptance: allowed only within window; anonymous → Admin-only with on-screen reason; every re-open logged.
- Open question (spec §17): re-open restarts escalation from top **or** just flips status → **confirm before building**.
- Trace: §7.

---

# E10 — Incident Log & Records  *(P1)*
*Spec §7, §12. Role-scoped, retained.*

**S10.1 — Incident log (Admin/Auditor)**
As an Admin/Auditor, I want a list of every incident with key fields + status, so I have the full record.
- Acceptance: ID, time, severity, type, location, reporter, ACK count, status; row opens live tree (Admin/Member) or read-only timeline (Auditor).
- Trace: §12.

**S10.2 — "My reports" (Reporter)**
As a Reporter, I want to see only incidents I raised + status, so I can track them.
- Acceptance: filtered to actor's reports; resolution notification received.
- Trace: §9.

**S10.3 — Read-only incident timeline (Auditor)**
As an Auditor, I want a read-only timeline per incident, so I can review without acting.
- Acceptance: no action buttons; full chain timeline with timestamps.
- Trace: §9, §12.

**S10.4 — 18-month retention**
As a compliance owner, I want incidents retained ≥ 18 months, so audits are satisfiable.
- Acceptance: retention floor enforced; purge only beyond configured window.
- Trace: §12.

---

# E11 — Metrics  *(P1)*
*Spec §10. Computed from real incidents.*

**S11.1 — MTTA / MTTR / total completion time**
As an Admin, I want mean time to acknowledge, mean time to resolution, and total completion per incident, so I can measure performance.
- Acceptance: MTTA = first alert → first ACK; MTTR = first alert → close; total = first alert → last ACK; all from real event timestamps.
- Trace: §10.

**S11.2 — Delivery & acknowledgement rates**
As an Admin, I want delivery rate and ACK rate, so I know how well alerts land and get answered.
- Acceptance: computed across incidents; "delivered" = provider-accepted (honest limitation stated).
- Trace: §10.

**S11.3 — Per-hop latency & breaking-node detection**
As an Admin, I want latency between each escalation hop with the stalling node flagged, so I can find where chains break.
- Acceptance: per-hop times shown; the node where the chain stalls is flagged.
- Trace: §10.

**S11.4 — Team-scoped metrics (Member)**
As a Member, I want my team's metrics (no download), so I see performance without org-wide access.
- Acceptance: same metrics scoped to team; download hidden.
- Trace: §9, §10.

---

# E12 — Reporting & Export (PDF / CSV)  *(P1)*
*Spec §11.*

**S12.1 — Download incident report as PDF**
As an Admin, I want an incident's timeline + metrics as a PDF, so I can share with leadership.
- Acceptance: real generated PDF; includes timeline, ACKs, metrics.
- Trace: §11.

**S12.2 — Download as CSV**
As an Admin/Auditor, I want CSV export, so I can filter/analyse.
- Acceptance: real CSV of incident + event data.
- Trace: §11.

---

# E13 — Audit Trail & Retention  *(P0 write-path, P1 views)*
*Spec §12. Separate logs; immutable; ≥18-month retention.*

**S13.1 — Log all user actions**
As a compliance owner, I want every report/ACK/close/re-open/override/chain-edit logged, so user activity is fully traceable.
- Acceptance: append-only; who/what/target/timestamp; written transactionally with the action.
- Trace: §12.

**S13.2 — Log all configuration changes (separate log)**
As an Auditor, I want config changes (timeouts, mapping, tree edits, uploads) in a distinct log, so "who changed the timeout?" is answerable at a glance.
- Acceptance: separate config-change log; who/from→to/timestamp.
- Trace: §12.

**S13.3 — Audit views + export**
As an Admin/Auditor, I want to view both logs and export them, so I can produce evidence.
- Acceptance: two clearly separated logs; export; Auditor read-only.
- Trace: §12.

**S13.4 — Immutability & retention**
As a compliance owner, I want audit records tamper-evident and retained ≥18 months, so the trail is trustworthy.
- Acceptance: no edit/delete via app; retention floor enforced.
- Trace: §12.

---

# E14 — Non-Functional & Pilot Hardening  *(P1/P2)*
*Spec §16 — honest constraints. Not full production hardening, but responsible for a sanctioned pilot on real contact data.*

**S14.1 — Authorization coverage tests** — every endpoint has an automated test proving role enforcement (P1).
**S14.2 — Input validation & rate limiting** on public endpoints, especially the email ACK link (P1).
**S14.3 — Secrets & config hygiene** — no secrets in repo; documented env config (P1).
**S14.4 — Backup & restore** of the pilot database (P2).
**S14.5 — Accessibility & responsive base** — keyboard/contrast basics; layout that won't need a rewrite for mobile later (P2).
**S14.6 — Honest limitations notice** — in-app/README statement that this is a sanctioned pilot, not production-hardened (P1).
- Trace: §16.

---

# E15 — Phase 2 Roadmap  *(captured, OUT OF SCOPE for Phase 1)*
*Spec §15. Do not build now; keep the data model ready.*

- LDAP/AD sync to auto-build the matrix (needs IT-provisioned directory access + security review).
- Scheduled export/distribution of the matrix.
- Business-hours vs non-business-hours chains.
- Additional call trees beyond IT/Cyber.
- SMS / WhatsApp channels.
- **Mobile app / push notifications** (your stated future goal — S14.5 keeps the door open).

---

## Suggested delivery sequence (walking skeleton first — spec §2)

1. **Skeleton:** E1 (S1.1–1.2, 1.5) → E2 (S2.1–2.2) → E5 (S5.1) → E6 (S6.1) → E8 (S8.1–8.2) → E7 (S7.1–7.2) → E13 (S13.1). *End-to-end: report → route → email → acknowledge → live status → audited.*
2. **Automation:** E6 (S6.2–6.5) escalation/reminders/alarm.
3. **Lifecycle:** E9 close/override/re-open + E8 (S8.3) stand-down.
4. **Trees & config depth:** E3 (S3.3–3.7), E4 full.
5. **Insight:** E11 metrics → E12 PDF/CSV → E10 log views → E13 views.
6. **Hardening:** E14.

---

## Mapping this backlog into Spec Kit

Each **story** is a good size for one Spec Kit feature. Recommended flow:
1. `specify init` in the repo → establish the toolchain.
2. `/constitution` — encode the non-negotiables: server-side RBAC, contact privacy, full audit, ACK≠Close, honest-limitations, LDAP-ready model.
3. Per story (start with the skeleton sequence): `/specify` (paste the story + acceptance criteria) → `/clarify` → `/plan` → `/tasks` → `/implement`.
4. Keep the spec `§` trace in each feature so implementation stays anchored to `SENTINEL_Crisis_Phase1_Spec.md`.

## Open questions to confirm before those features are built (spec §17)
- Default values: per-level timeouts, reminder intervals, retry counts, re-open window (prototype defaults are a starting point).
- Starter list of IT/Cyber incident types → default severity (domain-owned).
- Re-open behaviour: restart escalation from top, or just flip status to active? *(affects S9.3)*
- Auditor report **download** vs view-only (spec §9 says metrics/reports admin-only; demo guide implies Auditor can export — reconcile). *(affects S2.4)*
