# SENTINEL — Full Runthrough (start here if you're new)

A complete, beginner-friendly tour of the whole system, from starting it up to seeing **every** feature. Follow it top to bottom.

---

## PART 0 — Start the app

The app has 3 parts: a **database**, the **backend** (API), and the **website** (frontend).

- **If the website already loads** at **http://localhost:5180** → skip to Part 1.
- **If nothing loads** → tell the assistant **"start the app"** (it starts all 3 for you). It runs in **mock email mode** by default — meaning alerts appear in an in-app inbox and **no real emails are sent** (safe for touring).

> Ports (FYI): website `:5180`, backend `:3000`, database `:5433`. *(The website uses 5180, not Vite's usual 5173, so it doesn't clash with another project.)*

---

## PART 1 — Log in

1. Open **http://localhost:5180**.
2. **Logins are fixed — you cannot use any email/password.** Use one of these 4 (or the one-click role buttons on the login page). Password for all: **`Passw0rd!`**

| Role | Email | One line |
|---|---|---|
| **Admin** | `admin@sentinel.local` | Runs everything |
| **Member** | `prashant@sentinel.local` | In the call chain |
| **Reporter** | `reporter@sentinel.local` | Only raises incidents |
| **Auditor** | `auditor@sentinel.local` | Read-only oversight |

**Tip:** the menu on the left **changes with the role** — that's the security model in action. Start as **Admin** to see everything.

---

## PART 2 — The main story (do this as Admin, in order)

This is the core loop the whole product is built around. Doing it once teaches you 80% of the system.

### Step 1 — Look at the call tree
- Left menu → **Call tree**.
- This is the ordered list of who gets alerted: **1st contact, 2nd, 3rd…**, each with a **backup** and who they **report to**.
- Try: **Add person**, **Edit** someone, **↑/↓ reorder**, **Export matrix**, **Sample template**, **Upload CSV**. *(All safe — it's test data.)*

### Step 2 — Report an incident
- Left menu → **Report incident**.
- **Pick a type** (e.g. "Single-user issue") — notice the **severity auto-fills**.
- Add a **location** + **description** → **Send**.
- Try the variations: the **"Report anonymously"** toggle, and pick a **Major/Critical (L2/L3)** type to see the **confirmation dialog** (because those alert everyone at once).

### Step 3 — Watch it live
- Left menu → **Live tree** → open the incident you just made.
- You'll see each person's status: **Notified** (amber) and a count like **"0 of 3 acknowledged."**
- Open the **Delivered emails** panel — this is the **mock inbox**: the alert email that "went out," including the **Acknowledge link**.

### Step 4 — Acknowledge (two ways — both testable now)
- **Way A (in-app):** click **Acknowledge** on a person → they turn **green**, count goes up.
- **Way B (the email link):** in the **Delivered emails** panel, click the **Acknowledge** link in a message → it opens a "✓ acknowledged" page → the live tree updates. *(This is the same loop that works with real email later — you're testing it locally.)*

### Step 5 — Let it escalate by itself (the safety net)
- Report a new incident and **do nothing**.
- Within about **30–60 seconds**, watch the **Recent activity** feed: the system sends **reminders**, then **escalates** to the next person, and finally — if nobody acknowledges — raises the red **ADMIN ALARM**. *All automatic.*

### Step 6 — Change and close
- On a live incident: **Override severity** (bump it to L3 with a reason — waiting people get alerted).
- Then **Close incident** with a reason → it leaves the active list and a **"stand down"** notice goes to everyone.

### Step 7 — See the numbers
- Left menu → **Metrics**: **MTTA** (how fast noticed), **MTTR** (how fast resolved), delivery/ack rates, **per-hop latency + the "breaking node"** (where chains stall). **Download CSV** too.

### Step 8 — See the record
- Left menu → **Audit trail**: two logs — **user actions** (report/ack/close…) and **config changes** (settings edits). Everything you just did is here, timestamped. Export it.
- Left menu → **Notifications**: the whole story as a running feed.

### Step 9 — Change settings
- Left menu → **Configuration** (3 tabs): **escalation timers**, **severity mapping** (which type = which level), **general** (re-open window, retention). Change something → check it appears in **Audit → config changes**.

✅ **You've now seen every core feature.**

---

## PART 3 — See how each role differs

Log out, log in as each role, and notice the **menu shrinks**. That's least-privilege — proof the security is real.

- **Reporter** (`reporter@sentinel.local`) → can **Report** + see **My reports** + **Notifications**. No call tree, no live tree, no metrics.
- **Member** (`prashant@sentinel.local`) → **My call tree** shows only *their slice* (privacy), plus Live tree, Report, team Metrics (no download), Notifications. No config, no audit, no full-tree editing.
- **Auditor** (`auditor@sentinel.local`) → **Incident log**, **Metrics** (+export), **Audit trail** (+export), **Notifications**. **No** report/edit/acknowledge buttons — everything read-only.

---

## PART 4 — What you can test NOW ✅ (all local, all safe)

- ✅ All 4 logins + the changing menus (least-privilege).
- ✅ Building/editing the **call tree** (add/edit/remove/reorder, CSV upload/export/template).
- ✅ **Reporting** incidents (all severities, anonymous, L2/L3 confirmation).
- ✅ The **live tree**, **acknowledge** (both in-app AND via the email link in the mock inbox).
- ✅ **Automatic** escalation, reminders, and the admin alarm.
- ✅ **Override**, **close**, **stand-down**, **re-open**.
- ✅ **Metrics** (+CSV), **Audit trail** (+export), **Notifications**, **Configuration**.

**In short: the entire application is testable right now on this laptop** — the only thing "simulated" is that emails land in the in-app inbox instead of a real mailbox.

---

## PART 5 — What you can test LATER 🕒 (short points)

- 🕒 **Real email to another person** (your boss / Anupam on *their* device) — needs real-email mode + a public web address. *(On this laptop, a real email to yourself already works.)*
- 🕒 **The "Initiate call tree" feature** (broadcast up/down/whole tree with backups) — **not built yet**; it's the next feature.
- 🕒 **SSO login** (Azure AD / Okta) — Phase 2 / go-live.
- 🕒 **Auto-filling the tree from Sodexo's directory (LDAP)** — Phase 2.
- 🕒 **SMS / WhatsApp alerts** and a **mobile app** — Phase 2.
- 🕒 **Production behaviour** (high availability, backups/restore, monitoring, disaster recovery) — go-live, on Sodexo's infrastructure.
- 🕒 **Security pen-test** — run once deployed on real infrastructure, before real data.

---

## Handy reference
- **Logins:** the 4 above, password `Passw0rd!`
- **Reset the busy data:** there are ~124 test incidents, so Metrics/Notifications look crowded — ask for a **clean reset** for a tidy demo.
- **Live email demo steps:** see [TESTING_WALKTHROUGH.md](TESTING_WALKTHROUGH.md).
- **Understand *why* it's built this way:** see the [docs/](docs/) guide (01→08).
