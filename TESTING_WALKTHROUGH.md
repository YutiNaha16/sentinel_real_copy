# SENTINEL — Testing Walkthrough (all 4 roles + real email)

## Before you start
- App URL: **http://localhost:5180** · API on :3000 · Postgres on :5433 (all running).
- If nothing loads (after a reboot / new session), tell the assistant **"start the app"**.
- **Logins are fixed — NOT any username/password.** Use these 4 (or the one-click role buttons on the login page). Password for all: **`Passw0rd!`**

| Role | Email | Sees |
|---|---|---|
| Admin | `admin@sentinel.local` | Everything |
| Member | `prashant@sentinel.local` | In-chain: report, ack, own tree slice, team metrics |
| Reporter | `reporter@sentinel.local` | Raise + track own reports only |
| Auditor | `auditor@sentinel.local` | Read-only: log, metrics, audit |

---

## ⭐ The headline test — real email → acknowledge → dashboard updates
*(Contact #1's email is set to `Yuti.Naha.ext@sodexo.com`, so alerts reach you.)*

1. Log in as **Admin**.
2. **Report incident** → click **"Single-user issue"** (L1 = only the first contact is alerted = **you**) → add a location + description → **Send**.
3. Open **Live tree** → open that incident → the first contact shows **Notified**, count **0 of 3**.
4. Check your inbox **`Yuti.Naha.ext@sodexo.com`** (**and Spam**) **on this laptop** → open the **`[TEST]`** email → click **"Acknowledge this alert."** You'll see a ✓ confirmation page.
5. Back on **Live tree** (it refreshes every few seconds) → that contact turns **green**, count becomes **1 of 3**. ✅ Also visible in **Notifications** ("… via email link").

*(The link works because you open it on this laptop. For Anupam on his own device, we need the public URL — the in-office step.)*

---

## Role-by-role feature tour

### 1) Reporter — `reporter@sentinel.local`
- **Report incident** — 2 steps: pick a type (severity auto-fills) → add detail. Try the **"Report anonymously"** toggle, and a **Network outage (L2)** to see the **confirmation dialog**.
- **My reports** — only incidents you raised.
- **Notifications** — your own activity.
- *(No call tree / live tree / metrics — least privilege.)*

### 2) Admin — `admin@sentinel.local` (the full tour)
- **Report incident** — try each severity.
- **Live tree** —
  - **Acknowledge** a person (button, or the email link).
  - **Wait ~30–60 sec** without acknowledging → watch **Escalated**, **reminders**, and the red **ADMIN ALARM** banner appear on their own (see the **Recent activity** feed).
  - **Override severity** (change to L3 + reason).
  - **Close incident** (reason) → it leaves the active list.
  - **Delivered emails** panel — the mock inbox (in real mode it also actually sends).
- **Incident log** — every incident; Export CSV.
- **Call tree** — **Add person**, **Edit**, **Remove**, **↑/↓ reorder**, **Export matrix**, **Sample template**, **Upload CSV**.
- **Configuration** — edit escalation **timers**, **severity mapping**, **re-open window** (each save shows in Audit → Config changes).
- **Metrics** — MTTA, MTTR, ack/delivery rates, per-hop latency + **breaking node**, resolution mix, **Download CSV**.
- **Audit trail** — two logs (user actions + config changes), Export.
- **Notifications** — the whole running story.

### 3) Member — `prashant@sentinel.local`
- **My call tree** — only your slice (person above, your backup, your reports) — **contact privacy**.
- **Live tree** — acknowledge, close.
- **Metrics** — same numbers, team-scoped, **no download** (admin-only).
- **Report** + **Notifications**.
- *(No configuration, no full-tree editing, no audit — the menu is smaller.)*

### 4) Auditor — `auditor@sentinel.local`
- **Incident log** (read-only), **Metrics** (+ export), **Audit trail** (+ export), **Notifications**.
- *(No report button, no edit, no acknowledge — everything read-only. This is the compliance role.)*

---

## What proves it's a real system (not a mock)
- Escalation / reminders / alarm fire **on their own** (Live tree activity + Notifications).
- Your **email click** updates the dashboard live.
- **Metrics** change as you acknowledge/close.
- Every action lands in the **Audit trail**.
- Switching roles **changes the menu** (least privilege).

## Notes
- There are ~124 leftover test incidents, so Metrics/Notifications look busy. Ask for a **clean reset** if you want a tidy stakeholder demo.
- Email is currently in **real (Brevo)** mode. Ask to switch back to **mock** when done testing, so no accidental sends.
- Reminder: **rotate the Brevo API key** (it was shared in chat) before real use, and we'll set strong passwords before any public exposure.
