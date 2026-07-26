# SENTINEL — Permissions & Approvals to Obtain

**Purpose:** the explicit **"yes, you may"** sign-offs we need from Sodexo before the pilot can use real people and real data. These are *approvals/decisions* — not data or infrastructure (that's in [WHAT_WE_NEED_FROM_SODEXO.md](WHAT_WE_NEED_FROM_SODEXO.md)).

**How to use:** take this to your sponsor / IT / Security / Legal. Get each item explicitly agreed — ideally in writing (email is fine). 🔴 = **blocks the pilot** until granted.

> **One-line framing:** *"The application is built. Before it touches real employee data and sends real alerts, I need these approvals signed off — they're standard governance gates, not development work."*

---

## A. Sponsorship & ownership
- [ ] 🔴 **Executive sponsor** for the pilot is named and agrees to proceed.
- [ ] 🔴 **Sign-off authority** identified — who formally approves going live with **real contact data** (not just a demo).
- [ ] **Escalation-policy owner** named — the person who decides who is 1st/2nd/3rd contact and the timings.
- [ ] **Named Admin(s) and Auditor(s)** for the real pilot approved.

## B. Permission to use real people's data
- [ ] 🔴 **Permission to store** each pilot person's contact details (name, email, phone) for crisis alerts.
- [ ] 🔴 **Lawful basis confirmed** for holding that data (consent / legitimate interest) — Legal/DPO to state which.
- [ ] 🔴 **Permission to send real alert emails** to those real people during the pilot.
- [ ] **Consent model approved** — each person gives explicit, versioned consent at onboarding (the app supports this).

## C. Data protection & legal (EU/GDPR — Sodexo is French-HQ)
- [ ] 🔴 **DPIA** (Data Protection Impact Assessment) — confirm whether one is required, and get it done if so.
- [ ] 🔴 **Works-council / employee-representative approval** — confirm if needed (common in France/EU) and obtain it.
- [ ] 🔴 **Data controller** identified and **DPO** looped in and approving.
- [ ] 🔴 **Data residency approved** — which country/region the data may be hosted in.
- [ ] **Retention period approved** — confirm the ≥18-month audit-retention figure meets policy.
- [ ] **Right-to-erasure vs audit-retention** reconciliation agreed (anonymise vs retain).

## D. Security approvals
- [ ] 🔴 **Security review / penetration test** — agreed as a gate **before** real employee data goes in; reviewer/date set.
- [ ] 🔴 **Approval to run the pilot on the current external services** (e.g. the test email provider) with real data — **OR** a decision that it must move to Sodexo-internal services first.
- [ ] **InfoSec requirements confirmed** — encryption, MFA/SSO expectations, audit-logging expectations acknowledged.
- [ ] **Tech-stack / cloud / open-source usage** approved (no restrictions we're breaching).

## E. Go-live authority
- [ ] 🔴 **Who signs the final go/no-go** for production (may differ from the pilot sponsor).
- [ ] **Acceptance / UAT sign-off** criteria agreed before go-live.
- [ ] **Understanding acknowledged** that Phase 1 has **no formal SLA/DR** — production-grade availability is a separate, agreed step.

---

## Quick status tracker

| Area | Blocker items | Granted? | Notes / owner |
|---|---|---|---|
| A. Sponsorship | 2 🔴 | ☐ | |
| B. Real-data permission | 3 🔴 | ☐ | |
| C. Data protection/legal | 4 🔴 | ☐ | |
| D. Security | 2 🔴 | ☐ | |
| E. Go-live authority | 1 🔴 | ☐ | |

**Until every 🔴 above is granted, the pilot stays on test data only.** The full context for each item is in [STAKEHOLDER_DISCOVERY.md](STAKEHOLDER_DISCOVERY.md).
