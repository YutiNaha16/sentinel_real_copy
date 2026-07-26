# SENTINEL — What We Need From Sodexo (Inputs & Resources)

**Purpose:** the concrete **things** we need handed over to finish the pilot and take it live — data, decisions, and infrastructure. (For the *"you may"* approvals, see [PERMISSIONS_TO_OBTAIN.md](PERMISSIONS_TO_OBTAIN.md).)

**How to use:** collect each item below. 🔴 = **blocks the pilot** (we can't run realistically without it). 🟡 = **needed for go-live** (production), not for a test pilot.

> **One-line framing:** *"The app is built and working on test data. To make it real, I need this specific information and access from your teams."*

---

## PART 1 — To run the pilot (data & decisions)

### 1. The call-tree people 🔴
The actual IT/Cyber escalation chain. For **each person**:
- [ ] Full name
- [ ] Role / job title
- [ ] Email address
- [ ] Phone number
- [ ] **Escalation order** (who is 1st, 2nd, 3rd…)
- [ ] **Backup** (their stand-in)
- [ ] **Reports to** (the person above them)

> *We do NOT need the whole employee database — just the pilot chain. Each person can fill in their own contact details via invitation.*

### 2. Incident taxonomy 🔴  *(only Sodexo can define this)*
- [ ] The real list of **IT/Cyber incident types**.
- [ ] The **default severity (L0–L3)** for each type.
- [ ] The **definition** of each severity level (what truly makes something L3 vs L2).
- [ ] Any incident types that must always allow **anonymous** reporting.

### 3. Escalation timing 🔴
Per severity level:
- [ ] **Escalation timeout** (how long before jumping to the next person).
- [ ] **Reminder interval** (how often to nudge).
- [ ] **Retry count** (how many reminders before giving up).
- [ ] Who receives the **"nobody responded" admin alarm**.

### 4. Policy decisions we can't guess 🔴
- [ ] **Re-open behaviour:** when a closed incident is re-opened, should escalation **restart from the top**, or just **flip the status** back to active?
- [ ] **Auditor rights:** may Auditors **download** reports, or **view only**? (Spec says admin-only download; demo implies auditors can export — we need one answer.)
- [ ] **Re-open window** length (default 72h) and **retention** (default 18 months) — confirm or change.

### 5. Branding 🟡
- [ ] Keep the name **SENTINEL**, or Sodexo-brand it? Logo, colours, brand guidelines if any.

### 6. Pilot success criteria
- [ ] What a **successful pilot** looks like (target response time, % acknowledged).
- [ ] Pilot **duration** and **go/no-go** criteria for Phase 2.
- [ ] Who **owns and supports** the tool during the pilot.

---

## PART 2 — To go live (infrastructure & access) 🟡

*All standard IT/Security items — the application itself doesn't change.*

### 7. Email / notifications 🟡
- [ ] **Sodexo's mail relay / SMTP or a sanctioned email service** to send alerts from (production shouldn't use a personal/test sender).
- [ ] A **sending domain + SPF/DKIM/DMARC** records so alert emails are trusted and don't hit spam.
- [ ] Confirm **SMS/WhatsApp** are Phase 2 (and if wanted, who provides the gateway).

### 8. Hosting & availability 🟡
- [ ] **Where it runs** — Sodexo cloud (Azure?) or on-prem; who provisions and manages it.
- [ ] **High-availability** target + a documented **manual fallback** if the system is down (a crisis tool must not fail during a crisis).
- [ ] **Managed PostgreSQL** with automated **backups + tested restore**.
- [ ] **Disaster-recovery** plan (acceptable data-loss / recovery-time targets).

### 9. Access & network 🟡
- [ ] **App domain + DNS** (e.g. sentinel.sodexo.com) and **TLS/SSL certificate**.
- [ ] **SSO** details (Azure AD / Okta) for logins — or a decision to keep standalone logins for the pilot.
- [ ] **Directory / LDAP read access** for Phase-2 auto-population (service account + security review).
- [ ] **Network/firewall rules** and a **secrets-management** approach (API keys, DB credentials).

### 10. People & process 🟡
- [ ] **Owner** and **support model** after the pilot (who runs it, who's on-call for the *tool*).
- [ ] **SLA / DR expectations** agreed (Phase 1 has none).
- [ ] **Training / change-management** so staff know how to report and acknowledge.

### 11. Commercials 🟡
- [ ] **Budget / licensing** at scale — email volume, hosting, any per-user costs.

---

## Quick status tracker

| # | Item | Priority | Received? | Owner |
|---|---|---|---|---|
| 1 | Call-tree people | 🔴 pilot | ☐ | |
| 2 | Incident types + severities | 🔴 pilot | ☐ | |
| 3 | Escalation timings | 🔴 pilot | ☐ | |
| 4 | Policy decisions | 🔴 pilot | ☐ | |
| 5 | Branding | 🟡 | ☐ | |
| 6 | Success criteria | pilot | ☐ | |
| 7 | Mail relay + domain/SPF | 🟡 go-live | ☐ | |
| 8 | Hosting + DB + DR | 🟡 go-live | ☐ | |
| 9 | Domain/SSL + SSO + LDAP | 🟡 go-live | ☐ | |
| 10 | Owner + SLA + training | 🟡 go-live | ☐ | |
| 11 | Budget | 🟡 go-live | ☐ | |

**Minimum to start a real pilot:** items **1–4** (🔴). Everything 🟡 is for production go-live. Full background: [STAKEHOLDER_DISCOVERY.md](STAKEHOLDER_DISCOVERY.md).
