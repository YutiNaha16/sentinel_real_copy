# 08 — Stakeholder Q&A: Every Likely Question, With a Ready Answer

This is your **meeting cheat-sheet**. It pulls together every 🎤 answer from the guide and adds the questions a non-technical, security, legal, or budget stakeholder is most likely to ask. Skim it before any meeting.

**Golden rules when you're put on the spot:**
1. **Lead with the honest headline**, then one sentence of "why."
2. If you don't know, say *"good question — I'll confirm the exact detail,"* and note it. (Honesty is Principle VI — it's a strength, not a weakness.)
3. Almost every "can it do X?" for the future has the same shape of answer: *"Not in Phase 1 — it's designed to add that without a rewrite."*

---

## A. The basics ("explain it to me simply")

**Q: What is this, in one sentence?**
> "An automated crisis call-tree: it alerts the right IT responders in the right order, escalates automatically if someone doesn't answer, shows live who has acknowledged, and logs everything for audit."

**Q: What problem does it solve?**
> "In a real incident, response is often chaos — who do we call, did anyone actually see the alert, how long did we take? SENTINEL turns that into an automatic, recorded, measurable process."

**Q: Who uses it?**
> "Four roles: Admins run it, Members are in the call chain, Reporters raise incidents, Auditors have read-only oversight. Each sees only what their role needs."

**Q: Is it actually working, or is it a mockup?**
> "It's a real, working full-stack application — real database, real logins, real automatic escalation, and it sends real emails you can acknowledge. We've tested that loop end-to-end. It runs on a pilot setup today and is built to move onto Sodexo's servers."

---

## B. Technology ("why these choices?")

**Q: What's it built with?**
> "Standard, mainstream web technology: React for the interface, NestJS for the backend, PostgreSQL for the database — all TypeScript, all open-source. Nothing exotic."

**Q: Why should we trust this stack for years?**
> "Every layer is an industry standard with a huge community and no licence cost — easy to hire for, no vendor lock-in, and a clean path to run on Sodexo's own infrastructure."

**Q: Why not [Python/FastAPI / websockets / GraphQL / the newer thing]?**
> "We deliberately chose the simpler, most widely-understood option at each point. A crisis tool's priorities are reliability and maintainability, not cutting-edge complexity — and each choice has a clear upgrade path if a real need appears."

**Q: If the person who built it leaves, can others maintain it?**
> "Yes — that was a design goal. Mainstream technologies, a clean modular structure, documentation, and automated tests mean any competent web team can pick it up."

**Q: Is the frontend tied to the backend? Can we change one without breaking the other?**
> "They're separate programs talking over a standard REST API. You can redesign the interface without touching the backend, and vice versa."

---

## C. Security ("is it safe?")

**Q: How are permissions enforced?**
> "On the server, on every request — not just by hiding buttons. A forbidden action is refused even if someone calls it directly. It's deny-by-default: nothing is allowed unless a role is explicitly permitted."

**Q: How are passwords stored?**
> "Never in plain text — they're run through a one-way hash (bcrypt), so even someone who saw the database couldn't read them."

**Q: Isn't the no-login email acknowledge link a security hole?**
> "No — each link carries a unique code tied to one incident and one person. It can *only* acknowledge that one person for that one incident; it can't log in, read data, or act for anyone else. And we can add rate-limiting and expiry."

**Q: Where does the personal contact data go, and who can see it?**
> "It's in the database, and access is minimised by design — a Member only sees their slice of the tree; full contact details are Admin-only. Nothing personal is exposed beyond what a role needs."

**Q: Has it had a security review / pen-test?**
> "Not yet — that's a required gate *before* real company-wide data goes in, and it's listed in our production checklist. The pilot is built to responsible standards, but a formal review is a deliberate go-live step."

---

## D. Data protection & compliance ("what about GDPR?")

**Q: What's the lawful basis for storing people's contact details?**
> "That's confirmed with Sodexo before real data goes in — consent is captured at onboarding, versioned and timestamped. It's on the stakeholder checklist along with DPIA and works-council sign-off."

**Q: Can we prove who did what, for an audit?**
> "Yes — every action and every settings change is written to an immutable, timestamped log that can't be edited or deleted through the app, kept at least 18 months."

**Q: What about the right to be forgotten vs keeping audit records?**
> "That's one of the legal points we flag for Sodexo — reconciling erasure with audit retention. We don't guess it; it's a documented question for the data-protection owner."

**Q: Where will the data physically live?**
> "Wherever Sodexo requires — data residency is a go-live decision. The pilot is portable; production runs on Sodexo-approved hosting."

---

## E. Reliability ("what if it breaks?")

**Q: What if the server restarts during a live incident?**
> "The escalation schedule is stored in the database, not in memory. On restart it reads the active incidents back and keeps escalating — nothing is dropped."

**Q: How do we know the live board and metrics are accurate?**
> "They're read straight from the database records and their real timestamps — there's no separate copy that can drift. Every acknowledgement is a linked, timestamped record."

**Q: What does 'delivered' actually mean?**
> "That the mail provider accepted the message — we don't claim the person read it. That honesty is exactly why escalation and the admin alarm exist: the safety net doesn't depend on trusting delivery."

**Q: A crisis tool is useless if it's down during a crisis — what about that?**
> "Completely agree, and we state it openly. High availability, redundancy, and a documented manual fallback are go-live requirements in our production checklist — not something we pretend the pilot already has."

---

## F. Scope, cost & timeline ("what's done, what's next, what's it cost?")

**Q: What's finished?**
> "The full Phase-1 scope — reporting, automatic escalation, live acknowledgement, email with one-click ack, call-tree management, configuration, metrics, exports, and a complete audit trail. Around 54 of 55 stories, all backed by automated tests."

**Q: What's *not* in Phase 1?**
> "SMS/WhatsApp, a mobile app, LDAP auto-sync from Active Directory, business-hours-aware chains, and multiple departments' trees. All are captured as Phase 2 and the data model already supports them."

**Q: What do you need from us to go live?**
> "Standard enterprise gates, all listed in our stakeholder document: Sodexo's mail relay, managed hosting with backups and disaster recovery, SSO, a security review, and legal/GDPR sign-off. The application itself is built — this is infrastructure and approvals."

**Q: What does it cost to run?**
> "The software is open-source, so no licence fees. Costs are hosting, the email volume, and support — modest at pilot scale. Exact figures depend on Sodexo's infrastructure choices."

**Q: How long to go live after approvals?**
> "The build is done; the timeline is driven by *your* gates — provisioning hosting, the security review, and sign-offs — not by remaining development."

---

## G. The tricky/pointed ones (be ready)

**Q: Did you build this responsibly, or is it a hack?**
> "There's a written constitution of nine binding principles — server-enforced security, contact privacy, and immutable audit are non-negotiable and were never waived. Every feature was checked against it, it's all version-controlled, and it ships with automated tests including ones that prove the permission rules."

**Q: What's the biggest risk?**
> "Honestly, it's the go-live infrastructure and approvals, not the code — a crisis tool must be highly available and legally cleared. We've listed every one of those gates rather than glossing over them."

**Q: Why should we believe your metrics/claims?**
> "Because we're deliberately conservative — 'delivered' means accepted, not read; it's a 'pilot, not production'; and every number comes from real recorded timestamps. We under-claim on purpose so what we *do* claim is solid."

**Q: Can it scale beyond IT/Cyber to the whole company?**
> "Yes by design — multiple call trees and directory sync were built into the data model from day one. Growing is adding features on the same foundation, not rebuilding."

---

## H. The 60-second verbal summary (memorise this)

> "SENTINEL is a crisis call-tree tool for IT/Cyber. Someone reports an incident in two clicks; the system emails the right people in the right order and, if no one responds in time, automatically escalates and finally alarms an admin — so nothing is ever silently missed. A live board shows who's acknowledged, it measures how fast the team responds, and it logs everything immutably for audit. It's a real, working application built on mainstream open-source technology — React, NestJS, PostgreSQL — with a written constitution of security and privacy principles. It runs as a pilot today and is designed to move onto Sodexo's own infrastructure. Going fully live needs standard enterprise gates — SSO, hosting, a security review, and legal sign-off — all of which we've documented openly."

---

## Where to point people
- **Non-technical overview:** [01 — Overview](01_OVERVIEW.md)
- **"Why this tech":** [02 — Tech Stack](02_TECH_STACK_WHY.md)
- **Security/architecture audience:** [03 — Architecture](03_ARCHITECTURE.md) + [06 — Design Decisions](06_DESIGN_DECISIONS.md)
- **What we need from Sodexo:** [Spec/STAKEHOLDER_DISCOVERY.md](../Spec/STAKEHOLDER_DISCOVERY.md)
- **Live demo script:** [TESTING_WALKTHROUGH.md](../TESTING_WALKTHROUGH.md)

*You now have the whole picture. Go answer anything.* 🎯
