# Implementation Plan: Call-Tree Editing

**Branch**: `009-call-tree-editing` | **Date**: 2026-07-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification. Builds on Features 001–008. **No schema change** — edits the existing Node model.

## Summary

Admin CRUD + reorder over the IT/Cyber chain, keeping `order` contiguous (1..N) and `parentId` = the node directly above via a resequence step after every change. Validation (name required, email format, backup ≠ self), audited to the config-change log. Plus CSV export of the matrix and a sample-template download. The escalation engine already reads the tree live, so changes take effect immediately.

## Technical Context

**Language/Version**: TypeScript / Node 24. **No new dependencies, no migration.**
**Storage**: reads/writes `Node`; writes `AuditConfigChange`.
**Testing**: Jest + Supertest e2e — add/edit/remove/reorder integrity (order 1..N, parents), validation, role scoping, export.
**Constraints**: linear chain; parent derived from order; Admin-only.

## Constitution Check

| Principle | Compliance |
|---|---|
| I. Least privilege | All editing = Admin only; others 403 (e2e-proven). |
| III. Immutable audit | Every add/edit/remove/reorder writes a config-change entry. |
| V. LDAP-ready | Node fields stay mapped to displayName/title/mail/manager. |
| VIII. Configurable | The chain is data managed in-app, not a fixed seed. |
| IX. Design fidelity | Full call tree with Add/Edit/Remove/move + export/template matches the prototype. |

**Result**: PASS.

## Project Structure (delta)

```text
apps/api/src/trees/
  trees.service.ts        # addNode/editNode/removeNode/moveNode; resequence(); exportCsv(); sampleTemplate()
  trees.controller.ts     # POST/PATCH/DELETE nodes; POST :id/move; GET export.csv, template.csv (Admin)
  trees.module.ts         # imports AuditModule
  dto/*.ts                # add/edit node DTOs
apps/web/src/pages/CallTreePage.tsx   # admin editable full tree (modals, move, export, template)
apps/api/test/tree-editing.e2e-spec.ts
```

**Structure Decision**: extend the existing `trees` module; import AuditModule to log changes.

## Phase 0 — Decisions

- **Resequence invariant**: after any change, load nodes by `order`, reassign `order = 1..N`, set `parentId` = previous node's id (null for first). One helper keeps integrity.
- **Add**: create node (temp order = N+1, backupId optional), then resequence.
- **Remove**: null out any `backupId` referencing the removed node, delete it, resequence.
- **Move up/down**: swap the target's order with its neighbour, then resequence; first-up / last-down are no-ops (400).
- **Validation**: name non-empty; email matches a simple RFC-ish pattern; backup ≠ self and must exist.
- **CSV**: export = `order,name,role,email,phone,backup`; template = same header + one example row (people + the note that config params live in Configuration).

## Phase 1 — contracts

- `POST /trees/it-cyber/nodes`, `PATCH /trees/it-cyber/nodes/:id`, `DELETE /trees/it-cyber/nodes/:id`, `POST /trees/it-cyber/nodes/:id/move`, `GET /trees/it-cyber/export.csv`, `GET /trees/it-cyber/template.csv` (all Admin).

## Complexity Tracking

No constitution violations.
