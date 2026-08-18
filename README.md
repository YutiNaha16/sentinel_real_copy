# SENTINEL — Crisis Call-Tree & Escalation System

A crisis notification system for IT/Cyber incidents. When an incident is reported, SENTINEL automatically **alerts the right people in the right order** (over WhatsApp), **escalates** to the next person if no one responds, shows a **live picture** of who has acknowledged, **measures** the response, and keeps a **permanent audit trail**.

> **Status:** the application is fully built and working, and real WhatsApp alerts have been proven end-to-end on a live phone. It runs as a pilot today and is ready to deploy on company infrastructure. What remains for a company-wide rollout is standard groundwork — permissions, a security review, and hosting.

---

## 📚 Start here — key documents

| Document | What it is |
|---|---|
| **[Project Report](Report_Generation_Call_Tree.md)** | Full end-of-project report — every feature and technical detail, in plain language |
| **[Deployment Guide](DEPLOYMENT.md)** | How the IT team hosts it on a server (Docker, step-by-step) |
| **[Demo Script](DEMO_SCRIPT.md)** | A 10-minute click-by-click demo walkthrough |
| **[Full Runthrough](FULL_RUNTHROUGH.md)** | Beginner's tour of every feature |
| **[Project Status](PROJECT_STATUS.md)** | What's done, and what's left (by who) |
| **[Understand-the-project guide](docs/)** | 8-part deep dive (overview → architecture → data → design) |
| **[What we need from Sodexo](Spec/TEAM_BRIEF.md)** | The permissions & inputs required to go live |

---

## 🚀 Run it on a server (Docker — recommended)

The whole stack (database + backend + frontend) comes up together. Full detail in **[DEPLOYMENT.md](DEPLOYMENT.md)**.

```bash
# 1. Configure
cp .env.deploy.example .env      # then set a DB password, JWT secret, and PUBLIC_BASE_URL

# 2. Build & start everything
docker compose up -d --build

# 3. Seed the starter data (once)
docker compose exec api npm run seed
```
Then open the app and change the default passwords. To send real alerts, set `EMAIL_PROVIDER=whatsapp` plus your Twilio credentials in `.env` and restart — **no code changes.**

---

## 💻 Run it locally (for development / exploring)

Requires **Node.js 20+**, **npm**, and a **PostgreSQL** database.

```bash
npm install                                   # from repo root
cp apps/api/.env.example apps/api/.env         # set DATABASE_URL
cd apps/api && npx prisma migrate deploy && npx prisma db seed && cd ../..
npm run api:dev            # backend  → http://localhost:3000/api   (terminal 1)
npm run web:dev            # frontend → http://localhost:5180        (terminal 2)
```
Open **http://localhost:5180**.

### Test logins (seed data — development only)
| Role | Email | Password |
|---|---|---|
| Admin | `admin@sentinel.local` | `Passw0rd!` |
| Member | `prashant@sentinel.local` | `Passw0rd!` |
| Reporter | `reporter@sentinel.local` | `Passw0rd!` |
| Auditor | `auditor@sentinel.local` | `Passw0rd!` |

---

## ✅ What's built

- Full **incident lifecycle** — report → escalate → acknowledge → override → close → re-open
- **Automatic escalation engine** — reminders, escalation, and an admin alarm if nobody responds
- **Live dashboard** showing who's been alerted vs who's acknowledged
- **Four roles** (Admin / Member / Reporter / Auditor), enforced on the server
- **Call-tree management** (add/edit/reorder/CSV upload) and **configuration** (timers, severities)
- **Real WhatsApp alerts** via Twilio (proven), plus the **Initiate Call Tree** broadcast feature
- **Metrics** (MTTA / MTTR / rates) with CSV export, and a complete **immutable audit trail**
- Automated tests, and a **Docker deployment package**

**Phase 2 (roadmap, not built):** SMS/voice at scale, a mobile app, directory (LDAP) auto-sync, and per-department incident routing.

---

## 🧱 Tech stack

| Layer | Technology |
|---|---|
| Backend | NestJS + TypeScript (`apps/api`) |
| Frontend | React + Vite + TypeScript (`apps/web`) |
| Database | PostgreSQL via Prisma |
| Shared | TypeScript types (`packages/shared`) |
| Messaging | Twilio (WhatsApp; SMS/voice-ready) |

## 📁 Project layout
```
apps/api          Backend — auth, roles, incidents, escalation engine, audit, notifications
apps/web          Frontend — login, call tree, report, live tree, metrics, config
packages/shared   Shared TypeScript types
Spec/             Specification, stakeholder documents, project constitution
docs/             The understand-the-project guide (01–08)
Dockerfile.* / docker-compose.yml / DEPLOYMENT.md   Deployment package
```

## 🔒 Built to principle
Development followed a written **constitution** ([`.specify/memory/constitution.md`](.specify/memory/constitution.md)): server-enforced least privilege, contact privacy, immutable audit, acknowledge ≠ close, a directory-ready data model, honest limitations, and configurable-not-hard-coded behaviour.
