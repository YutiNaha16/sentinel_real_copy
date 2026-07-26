# SENTINEL Crisis — What We Need From You (Quick Brief)

**In one line:** the crisis-alert app is **built and working on test data**. To make it real we need some **info**, a few **decisions**, and some **sign-offs**. Nothing here is development work.

---

## 🔴 A. To START the pilot — info we need

**1. The people (the call chain)**
- Who's in the IT/Cyber chain — names + roles
- Order — who's contacted 1st, 2nd, 3rd…
- Each person's backup + who they report to
- How big is the group (3? 10? 20?)

**2. Incident types & severity**
- The list of incident types
- Default level (L0–L3) for each
- What makes something L3 vs L2
- Which types can be reported anonymously

**3. Escalation timing (per level)**
- How long before moving to the next person
- How often to remind + how many times
- Who gets the final "nobody answered" alarm
- OK that Phase 1 runs on clock-time (business-hours = later)?

**4. Quick decisions**
- Re-open: restart escalation from the top, or just reactivate?
- Auditors: can download reports, or view-only?
- Confirm 18-month record retention is fine
- Logins: standalone (ready now) or your SSO?

---

## 🔴 B. Approvals we need (sign-offs)

**Ownership**
- Who owns the escalation policy (sets the order + timings)
- Who are the named Admin + Auditor

**Permission to use real data**
- OK to store people's name / email / phone for alerts
- OK to send real alert emails to them

**Legal / GDPR**
- Is a DPIA needed? (complete it if yes)
- Works-council + data-controller / DPO sign-off
- Erasure vs audit-keep — anonymise or retain?
- Confirm 18-month retention meets policy

**Security**
- Security review / pen-test before real data — who + when
- Encryption / MFA / audit-logging expectations
- Tech stack + cloud + open-source approved?

---

## 🟡 C. To GO LIVE later (production) — NOT needed for the pilot

**Email**
- Sodexo's own mail relay/server (not a personal sender)
- Sending domain + SPF/DKIM/DMARC (so alerts aren't spam-flagged)
- SMS / WhatsApp = future — confirm if wanted + who provides it

**Hosting**
- Where it runs (Sodexo cloud / on-prem) + who manages it
- High availability + a manual fallback if it's down
- Managed database + automated backups + tested restore
- Disaster-recovery plan + data region

**Access**
- Web address (e.g. sentinel.sodexo.com) + SSL certificate
- SSO login (Azure AD / Okta)
- Directory / LDAP access (to auto-fill the tree later)
- Firewall rules + secure storage of keys/passwords

**Running it**
- Owner + support after the pilot
- Monitoring (is it up? are emails sending?)
- Staff training on report + acknowledge

---

## Bottom line
- **To start a real pilot:** just **A (1–4)** + the **B** sign-offs.
- **Everything in C (🟡)** is for full production go-live — later, and mostly IT/Security work.
- *The app itself is done — this is information, decisions, and approvals.*
