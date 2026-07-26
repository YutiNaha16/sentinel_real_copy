# SENTINEL — Demo Script (~10 minutes)

A click-by-click guide to demoing the pilot. **[SAY]** = what to say · **[CLICK]** = what to do.

---

## Before the demo (prep — do this ~10 min ahead)
1. Tell the assistant: **"make it demo-ready."** I'll:
   - Switch to **WhatsApp mode** (so a real alert hits your phone live — the wow moment).
   - Set **fast demo timers (~20 sec)** so escalation happens *during* the demo, not after a 2-min wait.
   - **Tidy the data** so metrics/dashboard look clean.
2. Open **http://localhost:5180**, log in as **Admin** (`admin@sentinel.local` / `Passw0rd!`).
3. Have **Yuti's phone** visible (screen-share or on the table) — the WhatsApp lands there.
4. Keep this script open on your phone or a second screen.

> ⚠️ Reminder: real WhatsApp currently reaches **Yuti's phone only** (Nurul/Anupam haven't joined the sandbox). That's fine — the demo centres on your phone.

---

## Act 1 — The problem (30 sec, no clicking)
**[SAY]** *"When a serious IT or cyber incident hits, the response is chaos — who do we call, did anyone actually see the alert, how long did we take? There's no record. SENTINEL turns that into an automatic, tracked process. Let me show you."*

## Act 2 — Report an incident → real WhatsApp (1 min) ⭐
**[CLICK]** Left menu → **Report incident** → pick **"Service degraded"** → type a location + description → **Send.**
**[SAY]** *"That's all it takes — two clicks and a sentence. The system just alerted the first responder…"*
**[POINT AT PHONE]** Yuti's phone buzzes with the WhatsApp alert.
**[SAY]** *"…and here's the actual alert on my phone. Real message, not a mock-up."*

## Act 3 — Live dashboard + acknowledge (2 min)
**[CLICK]** Left menu → **Live tree** → open the incident.
**[SAY]** *"This is the live picture — who's been alerted, who's responded. Right now it says 0 acknowledged."*
**[CLICK]** On the phone, tap **Acknowledge** in the WhatsApp *(or click Acknowledge in the app if the tap-link isn't public yet)*.
**[SAY]** *"The moment they respond…"* — the person turns **green**, count ticks up.
**[SAY]** *"No more 'I thought someone else had it' — everyone sees the truth, live."*

## Act 4 — It escalates by itself (2 min)
**[CLICK]** Report another incident → **don't touch it.**
**[SAY]** *"Now watch what happens if nobody responds."*
**[CLICK]** Live tree → watch the **Recent activity** feed.
**[SAY]** *"After the timeout it automatically moves to the next person… sends reminders… and if the whole chain stays silent, it fires an alarm to an administrator. Nothing is ever silently missed — that's the whole point."*

## Act 5 — Initiate call tree (1 min)
**[CLICK]** Left menu → **Call tree** → **🚨 Initiate call tree** → **"Whole tree"** → type *"Major incident — activate crisis response"* → **Send alert.**
**[SAY]** *"For a big crisis, one click blasts the whole team at once — plus their backups, so a missing person is still covered."*

## Act 6 — The proof: metrics + audit (2 min)
**[CLICK]** Left menu → **Metrics.**
**[SAY]** *"It measures how fast we respond — time to acknowledge, time to resolve, where chains stall. You can show leadership the team improving."*
**[CLICK]** Left menu → **Audit trail.**
**[SAY]** *"And every action is logged, timestamped, and can't be edited — so when an auditor or regulator asks 'who did what, when', there's a trustworthy answer."*

## Act 7 — Security by role (1 min)
**[CLICK]** Log out → log in as **Auditor** (`auditor@sentinel.local`).
**[SAY]** *"Different people see only what they should. An auditor can review everything but change nothing — no report or edit buttons. The menu itself shrinks. That's enforced on the server, not just hidden."*

## Act 8 — Close: what you need from them (1 min)
**[SAY]** *"So — the app is built and working, and real WhatsApp alerts are proven. To make it real for our team, I need three things from you:"*
1. *"**Permission** to use real contact data and send real alerts — the standard legal/security sign-offs."*
2. *"The **people and their numbers** for our IT/Cyber chain."*
3. *"Eventually, **hosting + a security review** to go fully live."*

**[SAY]** *"I've got all of that written up in one-page checklists. The build is done — this last part is approvals and infrastructure."*
→ Hand them **[TEAM_BRIEF.md](Spec/TEAM_BRIEF.md)**.

---

## Tips
- **Keep it to the story**, not the tech. They care that it *works* and is *trustworthy*, not which framework.
- **If a live WhatsApp is slow** (network), don't wait — carry on and acknowledge from the app; the message will arrive.
- **If asked "is it finished?"** → *"The application is finished and tested. What's left is permissions, a security review, and hosting — standard company steps, not development."*
- **If asked about cost** → *"The software is open-source, no licence fees. Costs are hosting and messaging — modest at pilot scale."*
- **Don't over-promise.** If you don't know, say *"good question, I'll confirm"* — there's a full Q&A cheat-sheet in [docs/08_STAKEHOLDER_QA.md](docs/08_STAKEHOLDER_QA.md).

## One-line close
> *"It's built, it works, real alerts are proven. Give me the permissions and the people, and we run a real pilot."*
