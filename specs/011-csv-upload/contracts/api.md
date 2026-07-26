# API Contracts — Feature 011

Base `/api`. **Admin only.**

## POST /trees/it-cyber/upload
- Body: `{ "csv": "order,name,role,email,phone,backup\n1,Priya,...\n2,..." }` (the file's text).
- Validation (all-or-nothing): ≥1 row; name required; email well-formed; order = contiguous 1..N positive ints; unique names + emails; each backup resolves to a listed name and ≠ self.
- **Invalid** → 400 `{ "message": "Upload rejected", "errors": ["Row 2: email is not valid", "Row 3: backup 'X' not found"] }`; **no change made**.
- **Valid** → 200 → the updated ordered chain (same shape as `GET /trees/it-cyber` admin): `{ scope: "full", nodes: [...] }`. Applied atomically; reuse by email; people not in the file are soft-removed; audited "Uploaded escalation matrix".
- Non-admin → 403.

## Notes
- The exported matrix / sample template (Feature 009) are valid inputs.
- New incidents and the escalation engine use the uploaded chain immediately.
