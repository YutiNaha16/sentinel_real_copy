# 05 — Workflows: What Actually Happens, Step by Step

Waves 3 shows you the system *in motion*. If you can narrate these flows, you can walk a stakeholder through a live demo with total confidence.

We'll follow one incident from birth to death, then cover the branches (escalation, the email ack, closing, override, re-open).

---

## The whole lifecycle at a glance

```mermaid
flowchart LR
    A["📣 Reported"] --> B["📧 First contact(s)<br/>notified"]
    B --> C{Acknowledged<br/>in time?}
    C -- Yes --> D["✅ Live board<br/>shows response"]
    C -- No --> E["⏫ Escalated to<br/>next person"]
    E --> C
    C -- "Nobody, ever" --> F["🔴 Admin alarm"]
    D --> G["🏁 Closed<br/>+ stand-down sent"]
    F --> G
    G -.->|"within window"| H["↩️ Re-opened"]
    H --> C
```

Keep this shape in your head; everything below is a zoom-in on one arrow.

---

## Workflow 1 — Reporting an incident

The reporter does two simple steps; the system does a lot behind the scenes.

```mermaid
sequenceDiagram
    participant R as Reporter (browser)
    participant API as Backend
    participant DB as Database
    participant ENG as Escalation engine
    participant MAIL as Email

    R->>API: 1. Pick type → severity auto-fills
    R->>API: 2. Add location + description → Send
    API->>API: Check role (may this user report?)
    API->>DB: Create Incident (unique ref, e.g. INC-893733)
    API->>DB: Build the chain (one entry per person)
    Note over API,DB: Sequential (L0/L1): only 1st contact set to NOTIFIED<br/>Parallel (L2/L3): everyone set to NOTIFIED at once
    API->>MAIL: Send alert email(s) with a unique ack link
    API->>DB: Write audit record ("Reporter reported INC-893733")
    API-->>R: ✅ Incident created
    ENG-->>DB: (from now on, watches this incident's clock)
```

**The one rule that matters here — severity decides the alerting shape:**

```mermaid
flowchart TB
    S{Severity?}
    S -- "L0 Hazard / L1 Minor" --> Seq["SEQUENTIAL<br/>Alert 1st contact only.<br/>Move down one at a time<br/>if no answer."]
    S -- "L2 Major / L3 Critical" --> Par["PARALLEL<br/>Alert EVERYONE at once.<br/>A serious crisis can't<br/>wait its turn."]
```

That's why **L2/L3 shows a confirmation dialog** before sending — you're about to alert everybody simultaneously, so the system makes you confirm on purpose.

---

## Workflow 2 — The escalation timeline (the safety net)

This is the flow that runs **by itself**, with no human involved. Say an L1 incident was reported and the first contact isn't responding. Using demo timers (escalate after 30s, remind every 20s):

```mermaid
sequenceDiagram
    participant ENG as Engine (wakes every few sec)
    participant DB as Database
    participant MAIL as Email
    participant ADMIN as Admin

    Note over ENG: t=0 — 1st contact NOTIFIED
    ENG->>DB: 20s passed, still no ack?
    ENG->>MAIL: 🔔 Reminder to 1st contact
    Note over ENG: t=30s — timeout reached
    ENG->>DB: Mark 1st contact ESCALATED
    ENG->>DB: Mark 2nd contact NOTIFIED
    ENG->>MAIL: 📧 Alert 2nd contact
    Note over ENG: keeps reminding, keeps escalating…
    Note over ENG: chain exhausted, nobody acknowledged
    ENG->>DB: Set adminAlarmedAt
    ENG->>ADMIN: 🔴 ADMIN ALARM (pulsing banner + notification)
```

Three things to point out when demoing:
1. **The first person keeps getting reminders even after we escalate past them** — maybe they'll still respond.
2. **Reminders stop** the moment someone acknowledges, or the incident is closed, or the retry cap is hit — no infinite spam.
3. **The admin alarm fires exactly once** — a fully-silent incident can never slip through unnoticed. That's the whole point of the tool.

---

## Workflow 3 — Acknowledging (the two ways)

**Way A — from inside the app** (a logged-in Member/Admin clicks Acknowledge on the live tree):

```mermaid
sequenceDiagram
    participant U as Responder (logged in)
    participant API as Backend
    participant DB as Database
    U->>API: Click "Acknowledge" (with login token)
    API->>API: Check identity + role
    API->>DB: Set that person's entry → ACKNOWLEDGED, stamp ackAt
    API->>DB: Audit ("… acknowledged INC-893733")
    API-->>U: ✅ Live board turns them green, "1 of N"
```

**Way B — straight from the email, no login** (the clever bit for phones):

```mermaid
sequenceDiagram
    participant P as Responder's phone
    participant API as Backend (public endpoint)
    participant DB as Database
    P->>API: Open the email → click the ack link (…/public/ack/TOKEN)
    API->>DB: Look up the unique token
    alt Token valid & not used
        API->>DB: Set THAT person's entry → ACKNOWLEDGED
        API-->>P: ✅ "Thanks, acknowledged" page
    else Token unknown/expired
        API-->>P: ❌ Invalid or expired link
    end
```

Why this is safe even without a login: the **token is unique to one incident + one person**. It can only acknowledge *that* person for *that* incident — it can't be used to log in, see data, or acknowledge for anybody else. (This is the `ackToken` from the data model in Wave 2.)

> 💡 **This is the exact loop you tested:** you got the real email → clicked the link on this laptop → the live board updated. That was Way B end-to-end.

---

## Workflow 4 — Closing an incident (+ stand-down)

Acknowledging says *"I've seen it."* Closing says *"it's handled."* They're deliberately different (this drives two different metrics — see below).

```mermaid
sequenceDiagram
    participant U as Responder
    participant API as Backend
    participant DB as Database
    participant ENG as Engine
    participant MAIL as Email
    U->>API: Close incident + pick a reason (required)
    API->>DB: status → RESOLVED, stamp closedAt + reason
    API->>ENG: Stop all timers/reminders for this incident
    API->>MAIL: 📢 "Stand down" notice to everyone alerted + the reporter
    API->>DB: Audit ("… closed INC-893733: <reason>")
    API-->>U: ✅ Incident leaves the active board
```

The **stand-down** message matters: without it, people who were alerted keep chasing a problem that's already solved. The system explicitly tells everyone "you can stop now."

---

## Workflow 5 — Override severity (mid-incident re-classification)

Sometimes a "minor" incident turns out to be serious. Anyone in the chain (or an Admin) can re-classify a *live* incident:

```mermaid
flowchart TB
    O["Override L1 → L3<br/>(+ reason)"] --> C{Crosses into<br/>parallel (L2/L3)?}
    C -- Yes --> A["Everyone still WAITING<br/>gets alerted now"]
    C -- No --> N["Just record the change"]
    A --> L["Log who / from→to / reason"]
    N --> L
```

The neat part: if you bump something up to L2/L3, the people who were *waiting their turn* in the sequential chain are **immediately alerted**, because the incident is now "everyone at once."

---

## Workflow 6 — Re-open (recovering a premature close)

If an incident was closed too soon, it can be re-opened — but only within a configured **window** (default 72h), and with rules:

```mermaid
flowchart TB
    R["Request re-open"] --> W{Within the<br/>re-open window?}
    W -- No --> X["❌ Too late — stays closed"]
    W -- Yes --> An{Was it reported<br/>anonymously?}
    An -- "No" --> OK["Reporter or Admin may re-open"]
    An -- "Yes" --> Adm["🔒 Admin only<br/>(no reporter identity exists)"]
    OK --> Log["Re-open logged"]
    Adm --> Log
```

*(One open policy question remains here — whether re-opening restarts escalation from the top or just flips the status back to active. That's flagged for Sodexo to decide; noted in the stakeholder doc.)*

---

## The two state machines underneath it all

Everything above is really just two things changing state. Knowing these two pictures means you understand the entire behaviour.

**A) The incident's status** (simple):
```mermaid
stateDiagram-v2
    [*] --> ACTIVE : reported
    ACTIVE --> RESOLVED : closed
    RESOLVED --> ACTIVE : re-opened (within window)
    RESOLVED --> [*]
```

**B) Each person's state within an incident** (the live-board colours):
```mermaid
stateDiagram-v2
    [*] --> WAITING : chain built (their turn hasn't come)
    WAITING --> NOTIFIED : alerted (sequentially or all-at-once)
    NOTIFIED --> ACKNOWLEDGED : they respond ✅
    NOTIFIED --> ESCALATED : timed out, moved past them
    ESCALATED --> ACKNOWLEDGED : they respond late (still counts)
```

---

## How the workflows produce the metrics

The two different "done" events are why we can measure two different things honestly:

```mermaid
flowchart LR
    T0["Alert sent<br/>(notifiedAt)"] -->|"first person acknowledges"| T1["First ACK<br/>(ackAt)"]
    T0 -->|"someone closes it"| T2["Closed<br/>(closedAt)"]
    T1 -. "MTTA = T1 − T0<br/>(how fast we NOTICE)" .-> M1[" "]
    T2 -. "MTTR = T2 − T0<br/>(how fast we FIX)" .-> M2[" "]
```

- **MTTA** (Mean Time To Acknowledge) = alert → first acknowledgement = *how quickly the team notices.*
- **MTTR** (Mean Time To Resolve) = alert → close = *how quickly the team fixes it.*

Both are computed from the **real timestamps** the workflows above stamp into the database — never estimated.

🎤 **If a stakeholder asks "why separate Acknowledge from Close?"**
> "Because they answer two different questions: acknowledging tells us how fast someone *noticed* the alert (MTTA), and closing tells us how fast it was *resolved* (MTTR). Merging them would hide half the performance picture."

---
➡️ Next wave: [06 — Design Decisions & Rationale](06_DESIGN_DECISIONS.md) (the *why* behind the rules — including the 9 non-negotiable principles).
