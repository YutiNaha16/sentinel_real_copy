# SENTINEL Crisis — Questions to Ask the Company (Discovery Checklist)

*Take this to your stakeholder / IT / Cyber meeting. Grouped by area. ★ = blocks the pilot if unanswered. The goal of Phase 1 is a small, sanctioned IT/Cyber pilot — most answers should be lightweight.*

## 1. Sponsorship & sign-off
- ★ Who is the executive sponsor for this pilot?
- ★ Who signs off on going live with **real contact data** (not just a demo)?
- Who owns the IT/Cyber escalation *policy* (the person who decides who is 1st/2nd/3rd contact)?
- Who will be the system **Admin(s)** and **Auditor(s)** in the real pilot?

## 2. The pilot call tree (the people)
- ★ Exactly **who** is in the IT/Cyber escalation chain? (names, roles/titles)
- ★ What is the **escalation order** — who is contacted 1st, 2nd, 3rd?
- ★ Who is each person's **backup**, and who reports to whom (parent)?
- ★ Do we have **permission** to store each person's email and phone for crisis alerts?
- How big is the pilot group (3? 10? 20?) — sets expectations, not scope.

## 3. Incident taxonomy & severity  *(domain-owned — only they can define this)*
- ★ The real list of **IT/Cyber incident types** for the pilot.
- ★ The **default severity** (L0–L3) for each type.
- ★ The **definition** of each severity level (what genuinely makes something L3 vs L2?).
- Any incident types that should always be anonymous-capable?

## 4. Escalation policy & timing
- ★ Actual **escalation timeout** per level (how long before we jump to the next person?).
- ★ **Reminder interval** and **retry count** per level.
- ★ Who receives the **"nobody responded" admin alarm**?
- Confirm Phase 1 runs on **clock time** (business-hours chains = Phase 2). Is that acceptable?
- On **re-open**: should escalation restart from the top, or just flip status back to active? *(affects S9.3)*

## 5. Data protection, legal & compliance  *(EU/GDPR is likely — Sodexo is French-HQ)*
- ★ Confirmed **lawful basis** for storing employee contact data (consent? legitimate interest?).
- ★ Is a **DPIA** (Data Protection Impact Assessment) required before real data?
- ★ Is **works-council / employee-representative** approval needed (common in France/EU)?
- ★ Who is the **data controller**, and is there a **DPO** to loop in?
- ★ **Data residency**: which country/region can the data be hosted in?
- ★ **Retention**: confirm the 18-month audit-retention figure meets their policy (or longer?).
- Right-to-erasure vs audit retention — how do they want to reconcile (anonymise vs retain)?
- ★ Is running the pilot on **external free services with real data** actually approved in writing?

## 6. Security & hosting
- ★ Is there a **security review** gate before real employee data goes in?
- ★ Where must it be **hosted** — external pilot (with permission) or Sodexo infrastructure?
- InfoSec requirements: encryption at rest/in transit, MFA, audit logging expectations.
- Any restrictions on the tech stack, cloud provider, or open-source usage?

## 7. Authentication / identity
- ★ For the pilot: **standalone logins** or company **SSO** (Azure AD / Okta / Google Workspace)?
- For Phase 2 LDAP/AD sync: what's the path to **directory read access** (service account + security review)?

## 8. Email & channels
- ★ What **sender address / domain** should alerts come from?
- ★ Can we use their **SMTP relay** for the pilot, or a third-party sender (e.g. SendGrid) with a demo sender?
- Can IT set **SPF/DKIM** so alert emails aren't spam-filtered? (critical for a crisis tool)
- Confirm **SMS/WhatsApp are future** (Phase 2) — email only now.

## 9. Branding & UX
- Product name for the pilot — keep **SENTINEL**, or Sodexo-brand it?
- Logo, colors, any brand guidelines to apply.
- Confirm the approved prototype look is the target (it is, per your direction).

## 10. Pilot success & logistics
- ★ What does a **successful pilot** look like (e.g. target MTTA, % acknowledged)?
- ★ Pilot **duration** and **go/no-go criteria** for Phase 2.
- How many **test incidents** will we run, and with whom?
- Who **owns and supports** the tool during and after the pilot? (Note: no formal SLA/DR in Phase 1 — is that understood?)

---

### Two decisions you can also settle in that meeting (they're open in the backlog)
1. **Re-open behaviour** (§4 above / story S9.3).
2. **Auditor download rights** — spec §9 says reports are Admin-only, but the demo guide shows Auditors exporting. Which is correct? (story S2.4)

---

## 11. Production / Go-Live requirements (what we need to move from pilot → real use)

*Sections 1–10 are the pilot discovery. These are the infrastructure and sign-offs needed to run it for real. Most are IT/Security items, not code.*

**Email / notifications**
- ★ **Sodexo's central mail relay / SMTP or a sanctioned email service** to send alerts (production should use Sodexo's own mail system, not a personal Gmail sender).
- ★ A **sending domain + SPF/DKIM/DMARC** records so crisis emails are trusted and don't land in spam or get flagged as phishing.
- Future channels: **SMS / WhatsApp** (Phase 2) — confirm if wanted and who provides the gateway.

**Hosting & availability**
- ★ **Where it runs** — Sodexo cloud (Azure?) or on-prem; server/database sizing; who provisions and manages it.
- ★ **A crisis tool must be highly available** — it fails exactly when a real crisis hits if it's down. Need: redundancy/HA, uptime target, and a **documented manual fallback** if the system is unavailable.
- ★ **Managed PostgreSQL** with automated **backups + tested restore**; data residency/region.
- ★ **Disaster recovery** plan (RPO/RTO) — acceptable data-loss and recovery time.

**Access & network**
- ★ **App domain + DNS** (e.g. sentinel.sodexo.com) and **TLS/SSL certificates**.
- ★ **SSO** (Azure AD / Okta) for logins; **directory/LDAP read access** for Phase-2 auto-population of the tree.
- Network/firewall rules; secrets management (API keys, DB creds).

**Security & compliance**
- ★ **Security review / penetration test** before real employee data goes in.
- ★ **DPIA, GDPR lawful basis, works-council approval, data controller/DPO** sign-off; consent + retention policy (≥18 months).
- Logging/monitoring & alerting on the tool itself (is it up? are emails sending?).

**People & process**
- ★ **Owner** and **support model** post-pilot (who runs it, who's on-call for the *tool*).
- ★ **Formal SLA / DR** expectations (Phase 1 has none — production needs them agreed).
- **Training / change management** so staff know how to report and acknowledge.
- **UAT / acceptance sign-off** criteria before go-live.

**Commercials**
- **Budget / licensing** at scale: email provider volume, hosting, any per-user costs.

> **How to frame it:** "The pilot proves the design and the experience. Going live needs Sodexo's **mail relay, hosting, SSO, a security review, and legal sign-off** — standard enterprise gates. The application itself is built; this is the infrastructure and approvals around it."
