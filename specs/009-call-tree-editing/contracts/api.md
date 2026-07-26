# API Contracts — Feature 009

Base `/api`. All **Admin only** (Member/Reporter/Auditor → 403). Reads (`GET /trees/it-cyber`) remain as in Feature 001.

## POST /trees/it-cyber/nodes
- Body: `{ displayName, title, email, phone, backupId? }`.
- Validation: displayName non-empty; email well-formed; backupId (if given) exists and ≠ new node.
- Effect: append to chain (next order), resequence; audit "Added node to tree". 201 → the created node.

## PATCH /trees/it-cyber/nodes/:id
- Body (any subset): `{ displayName?, title?, email?, phone?, backupId? }`.
- Validation as above; backupId ≠ this node.
- Effect: update; audit "Edited node". 200 → updated node.

## DELETE /trees/it-cyber/nodes/:id
- Effect: clear backups pointing to it, delete, resequence (order 1..N, parents fixed); audit "Removed node". 200 → `{ removed: id }`.

## POST /trees/it-cyber/nodes/:id/move
- Body: `{ direction: "up" | "down" }`.
- First-up / last-down → 400. Else swap order with neighbour, resequence; audit "Reordered tree". 200 → updated ordered list.

## GET /trees/it-cyber/export.csv
- 200 → `text/csv`: `order,name,role,email,phone,backup`.

## GET /trees/it-cyber/template.csv
- 200 → `text/csv`: header columns + one example row (sample template).

## Notes
- Order is kept contiguous (1..N) and `parentId` = the node directly above (resequence after every change).
- The escalation engine and new incidents read the tree live, so edits take effect immediately.
