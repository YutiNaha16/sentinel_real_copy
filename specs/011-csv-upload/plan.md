# Implementation Plan: Bulk Call-Tree Upload (CSV)

**Branch**: `011-csv-upload` | **Date**: 2026-07-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification. Builds on Feature 009. **No schema change.**

## Summary

Admin `POST /trees/it-cyber/upload { csv }` parses + strictly validates the CSV, and only if fully valid replaces the active chain atomically (reuse by email, soft-remove the rest, resolve backups by name, resequence). Rejections return per-row errors and change nothing. Audited. A web upload control on the Full call tree.

## Technical Context

**Language/Version**: TypeScript / Node 24. **No new dependencies** — a small hand-rolled CSV line parser (handles quoted fields). **No migration.**
**Storage**: rewrites `Node` (upsert by email, soft-remove rest); writes `AuditConfigChange`.
**Testing**: Jest + Supertest e2e — valid upload replaces + audits; invalid (bad email, unresolved backup, non-contiguous order) rejected with no change; role scoping. Self-restoring.
**Constraints**: atomic (one transaction); Admin-only.

## Constitution Check

| Principle | Compliance |
|---|---|
| I. Least privilege | Admin-only; others 403. |
| III. Immutable audit | Successful upload writes a config-change entry. |
| V. LDAP-ready | Node fields unchanged (name/title/mail); soft-remove preserves history. |
| VIII. Configurable | The chain is data, loadable in bulk. |
| IX. Design fidelity | Upload dialog with validation matches the prototype. |

**Result**: PASS.

## Project Structure (delta)

```text
apps/api/src/trees/
  trees.service.ts     # parseCsv(), validateRows(), uploadCsv()
  trees.controller.ts  # POST it-cyber/upload (Admin)
  dto/upload.dto.ts    # { csv: string }
apps/web/src/pages/CallTreePage.tsx   # upload control (file -> text -> POST) + error display
apps/api/test/csv-upload.e2e-spec.ts
```

## Phase 0 — Decisions

- **Transport**: JSON `{ csv: string }` (web reads the file's text) — no multipart.
- **Parse**: split lines; map columns by header (order,name,role,email,phone,backup); a small quoted-field-aware splitter.
- **Validate** (collect all errors): ≥1 row; name required; email regex; order positive ints forming contiguous 1..N; unique names + emails; backup resolves to a listed name and ≠ self.
- **Apply** (transaction): upsert by email (reuse id/links), soft-remove active nodes not present (negative order, clear user/backups), resolve backups by name, then `resequence` → order 1..N + parents.
- **Reject**: throw 400 with `{ message, errors: string[] }`; no writes.

## Phase 1 — contracts

- `POST /trees/it-cyber/upload` (Admin) → 200 updated list | 400 `{ errors }`.

## Complexity Tracking

No constitution violations.
