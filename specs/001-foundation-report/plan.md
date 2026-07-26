# Implementation Plan: Foundation & First Incident-Report Slice

**Branch**: `001-foundation-report` | **Date**: 2026-07-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-foundation-report/spec.md`

## Summary

Stand up the SENTINEL Crisis platform and deliver the first vertical slice: a seeded, role-scoped IT/Cyber call tree; reporting an incident (type→auto-severity, override, anonymous, mandatory description, L2/L3 confirmation); and a role-scoped incident log — all persisted and audit-logged, with server-enforced RBAC. Technical approach: a TypeScript monorepo with a NestJS API, PostgreSQL via Prisma, and a React (Vite) frontend whose components port the approved prototype's design system. Routing/escalation/acknowledgement/notifications are out of scope for this feature.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 24 LTS.

**Primary Dependencies**: Backend — NestJS 11, Prisma ORM, Passport (local strategy) + JWT for sessions, class-validator/class-transformer, argon2 for password hashing. Frontend — React 18 + Vite, React Router, TanStack Query, plain CSS ported from the prototype's tokens.

**Storage**: PostgreSQL 16 (Prisma migrations). Local dev via a `docker-compose` Postgres, or a hosted free-tier Postgres where Docker is unavailable (no admin on the dev laptop — decide in research).

**Testing**: Backend — Jest (unit) + Supertest (e2e/integration, incl. an authorization test per role). Frontend — Vitest + React Testing Library. A dedicated **authorization test suite** proves every in-scope role restriction at the API layer (Constitution I).

**Target Platform**: Linux server (API) + modern browsers (SPA). Mobile is Phase 2 but the component/type split is chosen to ease a later React Native app.

**Project Type**: Web application (backend + frontend monorepo).

**Performance Goals**: Pilot scale — comfortably serve the IT/Cyber group; report round-trip < 500ms p95 locally. No high-concurrency target in Phase 1.

**Constraints**: Corporate no-admin dev environment (portable toolchain); TLS-inspection proxy (CA bundle already configured); honest-limitations posture — no production hardening claims.

**Scale/Scope**: 3 seeded people (expandable), 6 incident types, 4 severity levels, 4 roles; ~3 screens in this slice (call tree, report, incident log) + login.

## Constitution Check

*GATE: must pass before and after design.*

| Principle | How this plan complies |
|---|---|
| I. Server-enforced least privilege | RBAC guard + policy checks on every controller; e2e authorization test suite asserts 403s for direct calls. |
| II. Contact privacy by design | Tree queries are role-scoped server-side; Member responses computed from {parent, self, backup, reports} — DTOs never include out-of-scope contacts. |
| III. Immutable, complete audit | `AuditUserAction` table is append-only (no update/delete in code); report + override write an entry in the same DB transaction as the action. |
| IV. ACK ≠ Close | N/A in this slice (no ack/close yet); Incident model reserves distinct fields/events so later features add them without rework. |
| V. LDAP-ready, multi-tree model | `Node` fields map to displayName/mail/title/manager; `treeId` FK present now; only IT/Cyber seeded. |
| VI. Honest limitations | Auth is real but local-only; "delivered" semantics N/A here; README states pilot limitations. |
| VII. Walking skeleton first | This IS the skeleton — thin end-to-end slice, independently testable stories. |
| VIII. Configurable, not hard-coded | Incident types + severity mapping + people are DB rows (add/remove/edit), not constants (FR-017). |
| IX. Design fidelity | Frontend ports prototype tokens/layout; screens visually match. |

**Result**: PASS. No violations to justify in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/001-foundation-report/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 — key technical decisions (see below)
├── data-model.md        # Phase 1 — entities, relationships, seed
├── contracts/           # Phase 1 — API endpoint contracts
└── tasks.md             # Phase 2 — created by /speckit-tasks (not here)
```

### Source Code (repository root)

```text
sodexo-crisis/                 # (repo root = current dir)
├── apps/
│   ├── api/                   # NestJS backend
│   │   ├── src/
│   │   │   ├── auth/          # login, JWT, guards, RBAC policy
│   │   │   ├── users/         # user + role
│   │   │   ├── trees/         # call trees, nodes, role-scoped views
│   │   │   ├── incidents/     # incident types, reporting, log
│   │   │   ├── audit/         # append-only user-action log
│   │   │   ├── common/        # DTOs, filters, error contract
│   │   │   └── main.ts
│   │   ├── prisma/            # schema.prisma, migrations, seed.ts
│   │   └── test/              # jest unit + supertest e2e (authz suite)
│   └── web/                   # React + Vite frontend
│       ├── src/
│       │   ├── design/        # ported prototype tokens + primitives
│       │   ├── components/    # sidebar, cards, tree, tiles, modal, toast
│       │   ├── pages/         # Login, CallTree, ReportIncident, IncidentLog
│       │   ├── api/           # typed API client + TanStack Query hooks
│       │   └── main.tsx
│       └── test/              # vitest + RTL
├── packages/
│   └── shared/                # shared TS types/enums (severity, roles, DTOs)
├── docker-compose.yml         # local Postgres (fallback: hosted free tier)
├── package.json               # workspaces (npm) root
└── README.md                  # beginner-friendly run steps
```

**Structure Decision**: npm-workspaces monorepo — `apps/api` (NestJS), `apps/web` (React), `packages/shared` (types reused by both, and later by mobile). This satisfies the "web application" shape and keeps one language end-to-end per the constitution.

## Phase 0 — Research decisions

- **ORM**: Prisma (type-safe, first-class migrations, clean seed) over TypeORM — faster for a small team, matches shared-types goal.
- **Auth**: Passport local + JWT (access token) for the pilot; wrapped behind an `AuthModule` interface so SSO (OIDC/Azure AD) is a later drop-in (Constitution VI / spec §13). Passwords hashed with argon2id.
- **DB for dev without admin**: prefer `docker-compose` Postgres; if Docker can't be installed (no admin), fall back to a free hosted Postgres (e.g. Neon) over the proxy, or a local user-scoped Postgres binary. Resolve at first setup task; the CA bundle already lets us reach hosted services.
- **RBAC**: a `RolesGuard` + method-level policy checks; deny-by-default. Authorization proven by an e2e suite, not assumed.
- **Real-time (later)**: not needed in this slice; when the live tree arrives, choose SSE/WebSocket — noted, not built.

## Phase 1 — Design outputs

- **data-model.md**: User, Role, CallTree, Node, IncidentType, Incident, AuditUserAction — fields, relationships, constraints, and the IT/Cyber seed. Prisma schema derives directly from it.
- **contracts/**: REST endpoints for this slice — `POST /auth/login`, `GET /me`, `GET /trees/it-cyber` (role-scoped), `GET /incident-types`, `POST /incidents`, `GET /incidents` (role-scoped). Each with request/response DTOs and the role rule enforced.
- **quickstart.md** (folded into README for this slice): install → configure DB → migrate → seed → run api + web → log in → report an incident → see it in the log; with "what you should see" at each step (constitution X).

## Complexity Tracking

No constitution violations — none required.
