# 03 — Architecture: How the Pieces Fit Together

Wave 1 told you *what* the technologies are. This tells you *how they're wired together* — and, importantly, **where the rules are enforced** and **how the automatic escalation runs by itself**.

## The whole system on one page

```mermaid
flowchart TB
    subgraph Browser["🖥️ User's Browser"]
    Web["React App (apps/web)<br/>Screens, buttons, the live tree"]
    end

    subgraph Server["⚙️ Server (apps/api — NestJS)"]
    Guard["🛡️ Security Guards<br/>Who are you? What's your role?"]
    Ctrl["Controllers<br/>The 31 REST endpoints"]
    Svc["Services<br/>The actual business logic"]
    Engine["⏰ Escalation Engine<br/>A clock that runs every few seconds"]
    Email["📧 Email Provider<br/>mock OR real (Brevo)"]
    end

    subgraph Store["🗄️ PostgreSQL Database"]
    DB[("All data:<br/>people, incidents,<br/>acknowledgements, audit")]
    end

    Person["📮 Responder's inbox"]

    Web -- "REST API calls (/api/...)" --> Guard
    Guard --> Ctrl --> Svc
    Svc <--> DB
    Engine -- "checks the clock" --> DB
    Engine -- "time to escalate!" --> Email
    Svc -- "send alert" --> Email
    Email -- "alert email + ack link" --> Person
    Person -- "clicks Acknowledge" --> Ctrl
```

Read it top to bottom: the **browser** sends requests, a **guard** checks them, a **controller** receives them, a **service** does the work against the **database**, and a separate **engine** watches the clock in the background to escalate automatically.

## The three-layer separation (why it lasts)

```mermaid
flowchart LR
    F["FRONTEND<br/>apps/web<br/>(React)"]
    S["SHARED<br/>packages/shared<br/>(common definitions)"]
    B["BACKEND<br/>apps/api<br/>(NestJS)"]
    D["DATABASE<br/>(PostgreSQL)"]
    F <-->|REST API| B
    F -.uses.-> S
    B -.uses.-> S
    B <-->|Prisma| D
```

- **Frontend and backend are separate programs.** They only talk through the REST API. You can rebuild one without breaking the other (this is what we discussed earlier).
- **`packages/shared`** holds the definitions both sides agree on (what an "incident" or a "severity" is), so they can never disagree.
- **The backend is the only thing that touches the database.** The browser can *never* reach the data directly — it must go through the guarded backend. That's a security cornerstone.

## What happens on a single request (the lifecycle)

Here's exactly what happens when a logged-in Member opens the live escalation tree:

```mermaid
sequenceDiagram
    participant U as Browser (React)
    participant G as 🛡️ Guard
    participant C as Controller
    participant S as Service
    participant DB as PostgreSQL

    U->>G: GET /api/incidents (with login token)
    G->>G: Valid token? What role?
    alt Not logged in or wrong role
        G-->>U: ❌ 401 / 403 Forbidden
    else Allowed
        G->>C: pass through
        C->>S: getActiveIncidents(user)
        S->>DB: fetch incidents (scoped to this user's role)
        DB-->>S: rows
        S-->>C: results
        C-->>U: ✅ JSON response
    end
```

The key idea: **the guard runs first, on every single request.** Security isn't a screen we hide in the frontend — it's enforced on the server before any work happens. Even if someone bypassed the UI and called the API directly, the guard would still stop them. This is called **"deny-by-default"** — nothing is allowed unless a role is explicitly permitted.

## Inside the backend: modules (one per feature)

NestJS organises the backend into **modules** — each feature is its own self-contained box. They don't tangle together:

```mermaid
flowchart TB
    App["App (wires everything together)"]
    App --> Auth["🔑 Auth<br/>login, tokens, roles"]
    App --> Trees["🌳 Trees<br/>the call tree"]
    App --> Inc["🚨 Incidents<br/>report, ack, close, override"]
    App --> Esc["⏰ Escalation<br/>the background engine"]
    App --> Email2["📧 Email<br/>sending alerts"]
    App --> Metrics["📊 Metrics<br/>MTTA / MTTR / rates"]
    App --> Audit["📜 Audit<br/>immutable logs"]
    App --> Settings["⚙️ Settings<br/>timers, mappings, config"]
    App --> Notif["🔔 Notifications<br/>activity feed"]
```

Each module has the same internal shape: a **Controller** (receives the web request) → a **Service** (does the logic) → **Prisma** (talks to the database). This sameness is why a new developer can find their way around quickly.

## The Escalation Engine — the part that runs by itself

This is the cleverest and most safety-critical piece, so it's worth understanding well.

Most of the system only does something when a user clicks. But escalation must happen **even when nobody is looking** — if the first responder ignores the alert at 3am, the system itself must move on to the next person. So there's a background **engine**:

```mermaid
flowchart TD
    Start["⏰ Every few seconds, the engine wakes up"] --> Q["Look at every ACTIVE incident"]
    Q --> Check{"For each: has the current<br/>person run out of time<br/>without acknowledging?"}
    Check -- "No" --> Wait["Do nothing, wait"]
    Check -- "Time to remind" --> Remind["Send a reminder email"]
    Check -- "Time to escalate" --> Esc["Mark them 'escalated',<br/>alert the next person"]
    Check -- "Whole chain exhausted,<br/>nobody acknowledged" --> Alarm["🔴 Fire the ADMIN ALARM"]
    Remind --> Wait
    Esc --> Wait
    Alarm --> Wait
    Wait --> Start
```

Two design details worth knowing:
1. **The decision logic is a pure function** called `processDue(now)` — you give it the current time, it decides what's due. This makes it **testable**: we can feed it "pretend it's 10 minutes later" and check it does the right thing, without waiting 10 real minutes. That's how we prove the safety-critical logic works.
2. **The schedule lives in the database, not in memory.** If the server restarts mid-incident, it reads the incident state back from PostgreSQL and carries on — a crash doesn't drop an active crisis.

🎤 **If a stakeholder asks "what if the server restarts during an incident?"**
> "The escalation schedule is stored in the database, not in the server's memory. On restart it reads the active incidents back and continues escalating — nothing is lost."

## The Email Provider — swappable by design

Notice in the diagrams that "Email" is one box. Behind it are **two interchangeable versions**, chosen by a single setting (`EMAIL_PROVIDER`):

```mermaid
flowchart LR
    Svc["The system says:<br/>'send this alert'"] --> If{EMAIL_PROVIDER setting}
    If -- "mock (default, safe)" --> Mock["📥 In-app inbox<br/>Nothing actually sent"]
    If -- "http" --> Real["🌐 Real email API (Brevo now,<br/>Sodexo's mail relay later)"]
```

The rest of the system doesn't know or care which one is active — it just says "send." This is why switching from the test provider to **Sodexo's real mail server** at go-live is a **configuration change, not a code change**.

## Where it runs: pilot vs production

```mermaid
flowchart TB
    subgraph Now["TODAY — Pilot (your laptop)"]
    A1["React dev server :5180"]
    A2["NestJS :3000"]
    A3["Portable PostgreSQL :5433"]
    A4["Brevo test email"]
    end
    subgraph Later["GO-LIVE — Sodexo infrastructure"]
    B1["React (built) served over HTTPS"]
    B2["NestJS on Sodexo server/cloud"]
    B3["Managed PostgreSQL + backups"]
    B4["Sodexo mail relay + SSO"]
    end
    Now ==>|"same code, different config"| Later
```

**The critical point: the boxes on the right run the *exact same application code* as the boxes on the left.** Only the surroundings (where it's hosted, which database, which mail server, how you log in) change — and all of those are already read from configuration, not hard-coded.

---
🎤 **If a stakeholder asks "is this architecture solid enough to build on?"**
> "Yes — it's the standard layered web architecture: a separate frontend and backend talking over a REST API, all security enforced server-side on every request, features cleanly separated into modules, and the automatic escalation built as a testable, crash-resilient background engine. Nothing about it needs re-architecting to go to production."

➡️ Next: [04 — Data Model](04_DATA_MODEL.md)
