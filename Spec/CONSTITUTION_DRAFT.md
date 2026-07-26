# SENTINEL Crisis — Project Constitution (draft for Spec Kit `/constitution`)

*Paste this into Spec Kit's `/constitution` command after `specify init`. These are the non-negotiable principles every feature spec, plan, and implementation must honour. They are derived from `SENTINEL_Crisis_Phase1_Spec.md` and are binding across all epics/stories.*

## Core principles

1. **Server-enforced least privilege.** Every role permission (Admin / Member / Reporter / Auditor) is enforced on the server for every endpoint. The UI hiding an action is never the only guard. A forbidden call returns 403 even when invoked directly. *(spec §9)*

2. **Contact privacy by design.** A Member's API responses never expose nodes outside {parent, self, backup, direct reports}. Full-tree data is Admin-only. *(spec §9)*

3. **Everything is audited, immutably.** Every user action (report, ACK, close, re-open, override, chain edit) and every configuration change is written append-only, transactionally with the action, timestamped in UTC. User-action and config-change logs are kept separate. Retention ≥ 18 months. *(spec §12)*

4. **ACK and Close are distinct, separately-timestamped events.** ACK ("seen", drives MTTA) never implies Close ("handled", drives MTTR). Metrics derive only from real recorded events. *(spec §6, §10)*

5. **LDAP-ready data model.** Node fields map to standard directory attributes (name→displayName, email→mail, role→title, parent→manager). The schema supports multiple call trees from day one, even though only IT/Cyber is populated in Phase 1. *(spec §2, §8)*

6. **Honest limitations.** This is a sanctioned pilot on real contact data, not production-hardened infrastructure. "Delivered" means the mail provider accepted the message. Do not overclaim; state constraints plainly in-app and in docs. *(spec §14, §16)*

7. **Walking skeleton first.** Deliver the end-to-end path — report → route → alert → acknowledge → live status → metrics → downloadable report — before broadening features. Build in small, testable chunks. *(spec §2)*

8. **Configurable, not hard-coded.** Per-level timeouts, reminder intervals, retry counts, severity mapping, and re-open window are Admin-editable configuration, audit-logged on change. *(spec §3, §5, §7)*

9. **Design fidelity.** The web UI reproduces the approved prototype's look and behaviour (design tokens, layout, components). Visual changes require explicit sign-off.

10. **Beginner-friendly to run.** Every deliverable ships with clear, step-by-step run instructions and a description of what the user should see at each stage. *(spec §17 closing)*

## Engineering standards
- TypeScript everywhere (NestJS backend, React frontend); shared domain types.
- Each story ships with automated tests, including an authorization test proving role enforcement.
- Reproducible database migrations; no destructive schema changes without a migration.
- Secrets only via environment/config; never committed.
- The escalation engine (timers/reminders/alarm) is built and tested in isolation and survives process restarts.

## Guardrails / out of scope (Phase 1)
LDAP sync, scheduled matrix export, business-hours chains, additional trees, SMS/WhatsApp, mobile app — all Phase 2. Keep the model ready but do not build them now. *(spec §15)*
