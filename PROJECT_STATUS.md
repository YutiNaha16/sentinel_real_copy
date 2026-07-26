# SENTINEL — Project Status & What's Left

*A plain, shareable snapshot: what's done, what I can still build, and what needs other people. Last updated: 2026-07-26.*

---

## ✅ DONE (built & working)
- Full Phase-1 application (~54 of 55 stories, 11 features): incident **reporting**, automatic **escalation engine**, **live tree**, **acknowledge**, **call-tree management**, **configuration**, **metrics**, **audit trail**, **notifications**, **exports**.
- 4 roles (Admin / Member / Reporter / Auditor), standalone login, 18-month retention.
- **Real WhatsApp alerts proven** via Twilio — a test alert was **delivered *and read*** on a real phone.
- App wired for WhatsApp; call tree set to the 3-person test (**Yuti → Nurul → Anupam**) with minute-based timers.
- Full documentation set (understand-the-project guide, stakeholder ask sheets, runthrough).

## 🔧 I CAN DO NOW (no permissions, no waiting on anyone)
- [x] **"Initiate Call Tree"** feature — ✅ **BUILT** (2026-07-26). Broadcast/cascade alert (down / up / whole tree, always includes backups). Button on the Call tree page; audited + in Notifications.
- [ ] **Re-open restarts from top** + **Auditor download** — small changes agreed.
- [ ] **Add SMS + voice-call channels** (the multi-channel fallback).
- [ ] **Safe hardening** — rate-limit the acknowledge link, security headers.
- [ ] **Clean reset** of the ~124 junk test incidents (tidy demo).
- [ ] **Demo script** for stakeholders.

## 👥 NEEDS THE TEST TRIO (delayed — when Anupam & Nurul are free)
- [ ] Anupam & Nurul **join the WhatsApp sandbox** (one-time, from their own phones) — required only for the *free test* sandbox, NOT for production.
- [ ] Run **cloudflared** (one command, you run it) → makes **tap-to-acknowledge** work from phones.
- [ ] Then: full **multi-person escalation test** over WhatsApp on real phones.
> ⚠️ Note: WhatsApp delivery is **already proven** (to Yuti). This step only demonstrates the multi-person hop. It can be **simulated now with just Yuti's phone** (point all contacts at Yuti's number).

## 🏢 NEEDS SODEXO — Permissions / approvals *(blockers for real data)*
- [ ] Executive sponsor + go-live sign-off
- [ ] Permission to store real contact data + send real alerts
- [ ] DPIA / GDPR lawful basis / works-council / DPO sign-off
- [ ] Security review / **penetration test** before real data
- [ ] (full list → [Spec/PERMISSIONS_TO_OBTAIN.md](Spec/PERMISSIONS_TO_OBTAIN.md))

## 🏢 NEEDS SODEXO — Production infrastructure *(go-live)*
- [ ] Hosting (their cloud) + high-availability + backups + disaster recovery
- [ ] **Email:** their mail relay + sending domain (SPF/DKIM/DMARC)
- [ ] **Messaging:** a paid provider (Twilio or their own) + sender numbers / WhatsApp Business verification (removes the sandbox "join" step)
- [ ] Domain + SSL, SSO (Azure AD/Okta), LDAP directory access
- [ ] Monitoring, owner/support, SLA, staff training, budget
- [ ] (full list → [Spec/WHAT_WE_NEED_FROM_SODEXO.md](Spec/WHAT_WE_NEED_FROM_SODEXO.md) · [Spec/TEAM_BRIEF.md](Spec/TEAM_BRIEF.md))

---

## Testing status at a glance
| What | Status |
|---|---|
| Escalation logic (dashboard) | ✅ testable now |
| WhatsApp delivery (one phone) | ✅ proven — delivered & read |
| Multi-person WhatsApp escalation | ⏳ needs Anupam/Nurul sandbox join *(or self-test with Yuti's number)* |
| Tap-to-acknowledge from phone | ⏳ needs cloudflared (quick, you run it) |
| SMS / voice call | ⏳ not built yet (I can add) |
| Production scale | ⏳ after go-live infrastructure |

## The one-line summary for stakeholders
> *"The app is built and working, and real WhatsApp crisis alerts are proven. What's left is: a few optional features I can finish now, a short multi-phone test once colleagues are free, and then the standard company gates — permissions, a security review, and production hosting — to go live."*
