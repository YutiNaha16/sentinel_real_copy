---
description: "Task list — Feature 001 Foundation & First Incident-Report Slice"
---

# Tasks: Foundation & First Incident-Report Slice

**Input**: `specs/001-foundation-report/` (spec.md, plan.md, data-model.md, contracts/api.md)
**Tests**: INCLUDED — the constitution requires a server-side authorization test suite (Principle I).
**Organization**: grouped by phase, then by user story (US1, US2, US3). Commit after each logical group.

## Format: `[ID] [P?] [Story] Description`
- **[P]** = can run in parallel (different files, no dependency)

---

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 Install & initialize portable PostgreSQL (user-scoped, no admin); create `sentinel_dev` DB; record connection string in `apps/api/.env` (git-ignored) and `.env.example`.
- [ ] T002 Scaffold npm-workspaces monorepo root (`package.json`, `tsconfig.base.json`, `.editorconfig`, workspaces: `apps/*`, `packages/*`).
- [ ] T003 [P] Create `packages/shared` with shared enums/types (Role, Severity, IncidentStatus) + DTO types.
- [ ] T004 [P] Configure ESLint + Prettier at root; scripts (`lint`, `format`, `build`, `test`).
- [ ] T005 Scaffold `apps/api` NestJS app (main.ts, AppModule, global validation pipe, global exception filter for the shared error contract, correlation-id middleware, `/health`).

## Phase 2: Foundational (Blocking — must finish before any story)

- [ ] T006 Add Prisma to `apps/api`; author `schema.prisma` from data-model.md (User, CallTree, Node, IncidentType, Incident, AuditUserAction, AuditConfigChange placeholder; enums).
- [ ] T007 Generate the first migration and apply it to `sentinel_dev`.
- [ ] T008 Write `prisma/seed.ts`: IT/Cyber tree + 3 nodes (order/parent/backup), 6 incident types→severity, 4 test users (one per role; Member linked to Prashant node); run seed and verify rows.
- [ ] T009 [P] AuthModule: local login (email+password, argon2id), JWT issue/verify, `JwtAuthGuard`, `CurrentUser` decorator.
- [ ] T010 [P] RBAC: `RolesGuard` + `@Roles()` decorator, deny-by-default; `AuditService` (append-only writer, transaction-aware).
- [ ] T011 PrismaModule/PrismaService wired into Nest; env config via `@nestjs/config` with schema validation.

**Checkpoint**: DB + auth + audit foundation ready.

---

## Phase 3: User Story 1 — See the escalation chain (P1) 🎯 MVP

**Independent test**: Admin sees full ordered chain; Member sees only their scoped slice; Reporter/Auditor → 403.

- [ ] T012 [US1] e2e authorization test: `GET /trees/it-cyber` — Admin 200 full; Member 200 scoped (no out-of-scope contacts); Reporter/Auditor 403. (Write first, expect fail.)
- [ ] T013 [US1] TreesModule: service computes role-scoped DTO (Admin full; Member {parent,self,backup,reports}); controller `GET /trees/it-cyber` with guards.
- [ ] T014 [US1] Frontend: port prototype design tokens into `apps/web/src/design`; build shared primitives (sidebar, card, avatar, tags).
- [ ] T015 [US1] Frontend: Login page + auth context; CallTree page rendering Admin vs Member views matching the prototype.

**Checkpoint**: US1 works end-to-end and is independently testable.

---

## Phase 4: User Story 2 — Report an incident (P1)

**Independent test**: report Network outage → severity pre-fills L2 → override + anonymous + mandatory description → persisted + audited; L2/L3 need confirmation; Auditor 403.

- [ ] T016 [US2] e2e tests: `POST /incidents` — happy path; missing description → 400; L2 without confirm → 409/422; anonymous stores no reporter; override writes audit; Auditor → 403.
- [ ] T017 [US2] IncidentTypesModule: `GET /incident-types` (active only; non-Auditor).
- [ ] T018 [US2] IncidentsModule: reference generator, create service (severity default + override→audit, anonymous handling, high-sev confirmation), transactional audit write; controller `POST /incidents`.
- [ ] T019 [US2] Frontend: Report page (two-step tiles → detail; auto-severity + override; anonymous toggle; mandatory description validation; L2/L3 confirm modal) matching the prototype.

**Checkpoint**: US1 + US2 both work independently.

---

## Phase 5: User Story 3 — See the incident log (P2)

**Independent test**: report two incidents as different users → Admin sees all; Reporter sees only own; anonymous shows "Anonymous".

- [ ] T020 [US3] e2e tests: `GET /incidents` — Admin/Auditor all; Reporter only own; anonymous label.
- [ ] T021 [US3] IncidentsModule: role-scoped list service + controller `GET /incidents`.
- [ ] T022 [US3] Frontend: Incident log page (role-scoped; "My reports" title for Reporter) matching the prototype.

**Checkpoint**: all three stories independently functional.

---

## Phase 6: Polish & Cross-Cutting

- [ ] T023 [P] README quickstart: install → DB → migrate → seed → run api+web → log in → report → see log, with "what you should see" per step.
- [ ] T024 [P] Frontend: role switcher (dev convenience) + wire real login; error/toast handling matching prototype.
- [ ] T025 Full authorization test pass (all role rules) green; `lint` + `build` + `test` clean.
- [ ] T026 Honest-limitations note in README (sanctioned pilot, not production-hardened).

---

## Dependencies
- Phase 1 → Phase 2 → (US1, US2, US3) → Polish.
- Within a story: tests first (expect fail) → backend model/service/endpoint → frontend.
- Commit after each task or logical group; each story is an independently demoable increment.
