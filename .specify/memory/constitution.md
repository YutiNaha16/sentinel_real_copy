# SENTINEL Crisis Constitution

Crisis call-tree escalation & acknowledgement system (Sodexo IT/Cyber pilot, Phase 1).
Authoritative requirements: `Spec/SENTINEL_Crisis_Phase1_Spec.md`. Backlog: `Spec/EPICS_AND_STORIES.md`.
Every principle below is binding on all specs, plans, tasks, and implementations.

## Core Principles

### I. Server-Enforced Least Privilege (NON-NEGOTIABLE)
Every role permission (Admin, Member, Reporter, Auditor) is enforced on the server for every endpoint. A hidden UI control is never the only guard: a forbidden call returns 403 even when invoked directly. Role capabilities follow the spec — Admin (all), Member (report/ack/close/own-tree-slice/team-metrics/edit-below-self), Reporter (report + own reports only), Auditor (read-only oversight). *(spec §9)*

### II. Contact Privacy by Design (NON-NEGOTIABLE)
A Member's API responses never expose nodes outside {parent, self, backup, direct reports}. Full-tree and full-contact data are Admin-only. Self-service onboarding lets a person edit only their own contact details, never their chain position or anyone else's data. *(spec §9, §8)*

### III. Immutable, Complete Audit (NON-NEGOTIABLE)
Every user action (report, acknowledge, close, re-open, override, chain edit) and every configuration change (timeouts, reminders, severity mapping, tree edits, uploads) is written append-only, transactionally with the action, timestamped in UTC. User-action and config-change logs are kept separate. Records are not editable or deletable through the application. Retention ≥ 18 months. *(spec §12)*

### IV. Acknowledge ≠ Close
ACK ("I've seen this", drives MTTA) and Close ("this is handled", drives MTTR) are distinct, separately-timestamped events. A person may ACK without being the one who closes. Metrics derive only from real recorded event timestamps — never estimated. *(spec §6, §10)*

### V. LDAP-Ready, Multi-Tree Data Model
Node fields map to standard directory attributes (name→displayName, email→mail, role→title, parent→manager). The schema supports multiple call trees from day one; Phase 1 populates only IT/Cyber. This keeps Phase 2 LDAP/AD sync a drop-in, not a rewrite. *(spec §2, §8, §15)*

### VI. Honest Limitations
This is a sanctioned pilot on real contact data, not production-hardened infrastructure. "Delivered" means the mail provider accepted the message — nothing stronger is claimed. Limitations are stated plainly in-app and in docs; capabilities are never overstated. *(spec §14, §16)*

### VII. Walking Skeleton First
Deliver the end-to-end path — report → route → alert → acknowledge → live status → metrics → downloadable report — before broadening features. Build in small, independently testable chunks; every deliverable ships with clear run instructions and a description of what the user should see. *(spec §2, §17)*

### VIII. Configurable, Not Hard-Coded
Per-level escalation timeouts, reminder intervals, retry counts, incident-type→severity mapping, and the re-open window are Admin-editable configuration, audit-logged on change and validated (positive values, valid references). No operational timing or policy value is baked into code. *(spec §3, §5, §7)*

### IX. Design Fidelity to the Approved Prototype
The web UI reproduces the approved `SENTINEL_Interactive_Prototype.html` look and behaviour — design tokens, layout, and components — because that design was validated with stakeholders. Visual changes require explicit sign-off.

## Technology & Security Constraints

- **Stack:** NestJS + TypeScript (backend), React + TypeScript (frontend, ported from the prototype), PostgreSQL. TypeScript end-to-end with shared domain types.
- **Escalation engine** (timeouts, reminders, admin alarm) is built and tested in isolation and **survives process restarts** — due timers reconstruct from persisted state; no double-fire.
- **Secrets** only via environment/config; never committed. Database migrations are reproducible; no destructive schema change without a migration.
- **Data protection:** consent captured at onboarding (versioned, timestamped); GDPR posture assumed (EU). Real employee data only enters after the company-side gates in `Spec/STAKEHOLDER_DISCOVERY.md` are cleared.
- **Auth** is pluggable: standalone logins for the pilot, SSO-ready (Azure AD / Okta) without rearchitecting.

## Development Workflow

- Spec-driven via GitHub Spec Kit: `/speckit-constitution` → `/speckit-specify` → (`/speckit-clarify`) → `/speckit-plan` → `/speckit-tasks` → (`/speckit-analyze`) → `/speckit-implement`.
- One backlog **story** ≈ one Spec Kit feature. Each spec carries its `Spec/…§` trace back to the authoritative requirements.
- Every feature ships with automated tests, **including an authorization test proving role enforcement** (Principle I).
- Open questions (spec §17) — re-open behaviour, Auditor download rights, default timer values, incident-type list — are resolved with the stakeholder before the affected feature is implemented, not guessed.

## Governance

This constitution supersedes ad-hoc practice. Any spec, plan, or implementation that conflicts with a principle is amended or the conflict is explicitly justified and recorded. NON-NEGOTIABLE principles (I, II, III) are never waived for convenience. Amendments are documented here with a version bump and date.

**Version**: 1.0.0 | **Ratified**: 2026-07-08 | **Last Amended**: 2026-07-08
