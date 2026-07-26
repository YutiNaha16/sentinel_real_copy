# SENTINEL Crisis — Tech Stack

*Crisis call-tree escalation & acknowledgement system — Sodexo IT/Cyber Phase-1 pilot.*
*Last updated: 2026-07-10*

---

## Backend (`apps/api`)
- **NestJS** + **TypeScript** — REST API framework
- **Prisma ORM** — schema, migrations, DB access
- **PostgreSQL** — database (dev: portable, `localhost:5433`)
- **Auth** — JWT (local strategy), passwords hashed with **bcryptjs**
- **RBAC** — global guards, deny-by-default, 4 roles: **Admin / Member / Reporter / Auditor**
- **Escalation engine** — pure `processDue(now)` function + `setInterval` scheduler
- **Email** — pluggable provider:
  - `mock` (default) — in-app inbox, nothing sent
  - `http` — HTTPS email API (**Brevo**); public tokenized acknowledge link (no login)

## Frontend (`apps/web`)
- **React** + **TypeScript**
- **Vite** — build tool + dev server (`localhost:5180`)
- UI built to match the approved HTML prototype exactly

## Shared / Monorepo
- **npm workspaces** — `apps/api`, `apps/web`, `packages/shared`
- `packages/shared` — types shared between API and web

## Testing
- **Jest** + **Supertest** — end-to-end tests (self-restoring destructive tests)

## Process & Tooling
- **GitHub Spec Kit** — spec → plan → data-model → contracts → tasks → implement (`.specify/`)
- **Git** + **GitHub** — private repo `YutiNaha16/Sodexo_Crisis_notif_project`
- **Portable, no-admin toolchain** (user-scoped, no installs): Node 24, PortableGit, GitHub CLI, PostgreSQL 17.5
- Corporate-proxy SSL handled via exported Windows trust store (`NODE_EXTRA_CA_CERTS`)

---

## Key architecture decisions
- **Deny-by-default RBAC** — every route requires an explicit role/`@Public`
- **Contact privacy** — members see only their own call-tree slice
- **Immutable audit** — user actions + config changes logged, never edited
- **ACK ≠ Close** — acknowledgement and resolution are distinct states
- **Pluggable email** — swap providers via `EMAIL_PROVIDER` env, no code change
- **bcryptjs over argon2** — pure-JS, avoids native build tools on locked-down machine

## Environments / ports
| Service | URL / Port |
|---|---|
| Web (Vite) | http://localhost:5180 |
| API (NestJS) | http://localhost:3000 |
| PostgreSQL | localhost:5433 |

## Phase 2 (not built yet)
- SSO / LDAP (Azure AD, directory auto-sync)
- SMS / WhatsApp channels
- Mobile app
- Managed cloud hosting, HA, DR, production mail relay (SPF/DKIM/DMARC)
