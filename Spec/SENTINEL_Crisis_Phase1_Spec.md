# SENTINEL Crisis — Phase 1 Specification & Build Prompt
### Call-Tree Escalation & Acknowledgement System (Sodexo)

---

## 1. Overview

Build a web application called **SENTINEL Crisis**: a crisis call-tree escalation and acknowledgement system. When an incident occurs, the system routes a pre-written alert to the correct people through a defined escalation chain, tracks who has acknowledged in real time, and reports on how the chain performed.

The goal is to reach the right person fast, remove reliance on ad-hoc phone calls, and eliminate rumour by making "who has responded" a visible, auditable fact.

---

## 2. Scope (Phase 1)

- **One escalation matrix / call tree: IT / Cyber.**
- Build the data model to *support multiple trees*, but populate and pilot only IT/Cyber.
- Pilot size: the IT/Cyber group (the real, permitted contacts — expandable).
- Prioritise a complete, working end-to-end path over breadth of features.
- Build in small, testable chunks. Get report → route → alert → acknowledge → live status → metrics → downloadable report working first, then refine.

---

## 3. Severity Levels

Four levels: **L0 (hazard / near-miss) → L1 (minor) → L2 (major) → L3 (critical).**

- Severity is **pre-defined by incident type** (a configurable mapping of IT/Cyber incident types → default severity).
- The mapping is **admin-editable**.
- **Override:** the reporter, or anyone in the escalation chain, can override the auto-assigned severity. Every override is **logged** (who, from/to, when, reason).

---

## 4. Incident Reporting

- Any user can raise an incident: choose incident type (which sets default severity), location, and description.
- **Anonymous reporting** is available as a toggle. When chosen, no reporter identity is recorded.
  - Because identity isn't stored, **anonymous incidents can only be re-opened by an admin** — the reporter cannot re-open. The UI must clearly warn the user of this (tooltip/notice) at the moment they choose anonymous, so it's an informed choice.
- Every alert notification carries the **incident ID and a direct link**, so a person handling multiple incidents acknowledges the correct one.

---

## 5. Escalation Logic

- **L0 / L1 — sequential:** alert the 1st contact only; if they don't acknowledge within that level's timeout, escalate to the next person, then the next. Minor incidents must not disturb senior people unless earlier contacts fail to respond.
- **L2 / L3 — parallel:** alert everyone in the chain at once, immediately.

**Timeouts & reminders (both configurable, per escalation level):**
- **Escalation timeout** — no acknowledgement within X → escalate to the next person. Configurable in hours/min/sec, and may differ per level.
- **Reminder interval** — after escalation, the original (still-unacknowledged) person keeps being reminded every Y. Configurable per level.
- **Reminder stop condition** — reminders stop after a **configurable number of retries** (also stop on that person's acknowledgement or incident closure).
- **Admin alarm** — if **nobody** in the entire chain acknowledges, a final alert goes to the admin.

*(Business-hours vs. non-business-hours chains are a Phase 2 configuration. Phase 1 timeouts run on clock time.)*

---

## 6. Acknowledgement

- Each notified person receives an email with a one-click **Acknowledge** button.
- Clicking records their acknowledgement (timestamped).
- The live view shows each person's status independently (e.g. "2 of 3 acknowledged"). Full acknowledgement by all is **not** required — the value is seeing who has and hasn't responded.
- **Acknowledge and Close are distinct, separately-timestamped events.** ACK = "I've seen this" (drives MTTA). Close = "this is handled" (drives MTTR). A person may ACK without being the one who closes.

---

## 7. Incident Closure & Re-open

- **Anyone in the escalation chain can close** an incident.
- Closing **requires a reason**: pre-defined reasons + an "Other" free-text option.
- On close, **everyone alerted plus the reporter is notified** ("resolved, stand down").
- Full history retained with all details and timings.
- **Re-open** allowed within a **configurable window** (e.g. 3 days), by the **reporter** (if not anonymous) or an **admin**. Re-open is logged.

---

## 8. Call-Tree Structure & Editing

**Node fields (per person):** name, role, email, phone, parent (person directly above), backup.
Align fields to standard LDAP attributes (name→displayName, email→mail, role→title, parent→manager) so Phase 2 LDAP sync integrates cleanly.

**Building / editing the tree (Phase 1 = manual + template):**
- Create/edit in the app, or **upload via CSV/Excel template**.
- The template carries **all configurable parameters** (per-level timeouts, reminder intervals, retry counts, severity mapping, re-open window), pre-filled with **default values** that can be modified.
- **Upload validation:** reject broken data with clear errors — every person has a valid parent, no circular reporting, timeouts are positive, required fields present.

**Editing permissions — hierarchy-scoped (universal rule):**
- A person can only add / remove / replace / reorder people **below them** in the chain. An L0 person cannot modify anyone higher up. Admin can edit anywhere.
- **Leave/vacation cover:** admin or anyone in the chain (within their scope) can temporarily replace a person. Temporary replacement **stays until manually undone** (no auto-expiry in Phase 1).
- **Notifications for chain changes:** the person removed and the new stand-in are both notified.

**Export:** the escalation matrix can be **exported for periodic review**. *(Scheduled export/distribution → Phase 2.)*

---

## 9. Views & Roles

- **Members** see only their own slice of the tree — the person above them, their backup, and anyone reporting to them — never the full organisation (protects contact privacy).
- **Admins** see the entire tree, all incidents, and all metrics.
- **Metrics & report generation are admin-only.** Admin generates and shares metric reports.

---

## 10. Metrics

Track and display, for compliance and improvement analysis:
- **MTTA** — mean time to first acknowledgement / first response.
- **MTTR** — mean time to resolution (first alert → close).
- **Total completion time** per incident (first alert → last acknowledgement).
- **Latency between each escalation hop.**
- **Delivery rate** and **acknowledgement rate.**
- **Breaking-node detection** — flag the node where a chain stalls.

*(In Phase 1, "delivered" = the email service accepted the message. This is honest but limited until production infrastructure.)*

---

## 11. Reporting

- Any incident's timeline and metrics can be **downloaded as a report in both PDF and CSV** (PDF for leadership, CSV for filtering/analysis).

---

## 12. Audit & Retention

- **All user actions are logged** (report, acknowledge, close, re-open, override, chain edit).
- **All configuration changes are logged** (timeouts, reminder intervals, severity mapping, etc.).
- **Separate audit logs** for admin/config changes vs. user actions (for clarity and visibility).
- **Data retention: minimum 18 months** (audit period), or longer if compliance standards require.

---

## 13. Login & Persistence

- Users log in; the system distinguishes admin from member/node-owner and enforces the correct view and permissions.
- All contacts, trees, incidents, acknowledgements, and audit logs are stored permanently, with full timestamps.

---

## 14. Channels

- **Email** in Phase 1. SMS/WhatsApp are future additions.
- Emails currently send via a third-party service with a demo sender; **production will use Sodexo's own mail system.**

---

## 15. Explicitly OUT OF SCOPE for Phase 1 (Future Roadmap)

- **LDAP / Active Directory sync** to auto-generate the escalation matrix (Phase 2; depends on IT-provisioned directory access after a security review).
- **Scheduled export/distribution** of the escalation matrix (Phase 2).
- **Business-hours vs. non-business-hours** escalation chains (Phase 2).
- Additional call trees beyond IT/Cyber.
- SMS / WhatsApp channels.
- Knowledge base / runbooks / CMDB; RCA templates; orchestration/auto-remediation; alert dedup/correlation; ServiceNow/Jira/Datadog/Prometheus integrations; AI-assisted resolution; war rooms; formal SLA/uptime/DR guarantees; SOC 2 / ISO 27001 / HIPAA certification.

---

## 16. Dependencies & Honest Constraints

- Phase 2 **LDAP/AD sync depends on IT-provisioned directory access** (service account + read permission, typically after security review). Phase 1 runs on manual/CSV creation, with the data model built LDAP-ready.
- This is a **sanctioned pilot on external free services** (email/hosting) using real contact data with permission. It is **not yet production-hardened** — no enterprise security review, not on Sodexo infrastructure. State these limitations plainly; do not overclaim.

---

## 17. To Confirm / Tune During Build (deliberately not over-specified)

- Exact **default values**: per-level timeouts, reminder intervals, retry counts, re-open window.
- The **starter list of IT/Cyber incident types → default severity** (to be provided by you / IT — only domain experts can define this).
- Precise **UI layouts and wording**.
- Whether re-opening **restarts the escalation from the top** or simply flips status back to active.

---

*End of Phase 1 specification. Build in small, testable chunks; keep it beginner-friendly to run, with clear step-by-step instructions and a description of what the user should see at each stage.*
