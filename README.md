# SENTINEL Crisis — Sodexo Crisis Notification (Phase 1 pilot)

A crisis **call-tree escalation & acknowledgement** system. When an incident is
reported, it routes an alert to the right people through a defined chain, tracks
who has acknowledged, and makes "who has responded" a visible, auditable fact.

This repo is the **Phase 1 IT/Cyber pilot**. It is built spec-first (see
[`Spec/`](Spec/) and [`specs/`](specs/)) and delivered feature by feature.

> **Honest limitations:** this is a sanctioned pilot, **not** production-hardened.
> It runs locally on portable tooling with test data. No enterprise security
> review, not on Sodexo infrastructure, email/real contacts not yet wired.
> See [`Spec/STAKEHOLDER_DISCOVERY.md`](Spec/STAKEHOLDER_DISCOVERY.md).

## What works today (Feature 001 — foundation slice)

- Secure **login** + **four roles** (Admin, Member, Reporter, Auditor), enforced on the server.
- **Call tree** view — Admin sees the full chain; a Member sees only their privacy-scoped slice.
- **Report an incident** — type → auto-severity (overridable), mandatory description, anonymous option, L2/L3 confirmation.
- **Incident log** — role-scoped (a Reporter sees only their own).
- **Append-only audit** of every action.

Not yet built (next features): live acknowledgement tree, escalation timers/reminders/alarm,
email alerts, close/re-open, metrics, configuration & tree-editing screens.

## Stack

| Layer | Tech |
|---|---|
| Backend | NestJS + TypeScript (`apps/api`) |
| Database | PostgreSQL via Prisma |
| Frontend | React + Vite + TypeScript (`apps/web`) |
| Shared | TypeScript types (`packages/shared`) |

## Prerequisites

- **Node.js 20+** and **npm**
- A **PostgreSQL** database
- (This pilot machine already has portable Node, Git, and PostgreSQL installed
  under `~/tools` — no admin required.)

## Quick start

```bash
# 1. install dependencies (from repo root)
npm install

# 2. make sure PostgreSQL is running and a database exists (see below)

# 3. configure the API
cp apps/api/.env.example apps/api/.env      # then edit DATABASE_URL if needed

# 4. create tables + seed the IT/Cyber pilot data
cd apps/api
npx prisma migrate dev
npx prisma db seed
cd ../..

# 5. run the backend (terminal 1)
npm run api:dev            # http://localhost:3000/api

# 6. run the frontend (terminal 2)
npm run web:dev            # http://localhost:5180
```

Open **http://localhost:5180** and use the **quick sign-in** buttons.

### Test logins (seed data — dev only)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@sentinel.local` | `Passw0rd!` |
| Member | `prashant@sentinel.local` | `Passw0rd!` |
| Reporter | `reporter@sentinel.local` | `Passw0rd!` |
| Auditor | `auditor@sentinel.local` | `Passw0rd!` |

### Starting PostgreSQL on this pilot machine (Windows, portable)

```powershell
& "$env:USERPROFILE\tools\pgsql\bin\pg_ctl.exe" -D "$env:USERPROFILE\tools\pgdata" -o "-p 5433" -l "$env:USERPROFILE\tools\pg.log" start
```
The dev `DATABASE_URL` is `postgresql://postgres:sentinel_dev_pw@localhost:5433/sentinel_dev?schema=public`.

## Tests

```bash
cd apps/api
npx jest --config ./test/jest-e2e.json --runInBand --forceExit
```
The e2e suite proves every in-scope role restriction at the API layer (13 checks).

## Project layout

```
apps/api          NestJS API (auth, RBAC, audit, trees, incidents)
apps/web          React UI (login, call tree, report, incident log)
packages/shared   shared TypeScript types
Spec/             authoritative spec, epics/stories, constitution, stakeholder checklist
specs/001-*       Spec Kit feature docs (spec, plan, data-model, contracts, tasks)
```

## Governance

Development follows the project **constitution**
([`.specify/memory/constitution.md`](.specify/memory/constitution.md)): server-enforced
least privilege, contact privacy, immutable audit, ACK ≠ Close, LDAP-ready model,
honest limitations, walking-skeleton-first, configurable-not-hard-coded.
