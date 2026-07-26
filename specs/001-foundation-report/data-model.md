# Data Model — Feature 001 (Foundation & First Incident-Report Slice)

Derived from [spec.md](./spec.md); the Prisma schema in `apps/api/prisma/schema.prisma` implements this directly. Designed multi-tree and LDAP-ready from the start (Constitution V), and add/remove-friendly (FR-017).

## Enums

- **Role**: `ADMIN` · `MEMBER` · `REPORTER` · `AUDITOR`
- **Severity**: `L0` · `L1` · `L2` · `L3`  *(L0/L1 sequential, L2/L3 parallel — behaviour used by later features)*
- **IncidentStatus**: `ACTIVE` · `RESOLVED`  *(only ACTIVE is produced in this slice)*

## Entities

### User
The login identity.
| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| email | string, unique | login id |
| passwordHash | string | argon2id; never returned by API |
| displayName | string | |
| role | Role | exactly one |
| nodeId | uuid, FK→Node, nullable | links a Member to their tree node |
| createdAt / updatedAt | timestamptz (UTC) | |

### CallTree
A named escalation matrix. Only `it-cyber` is seeded; the table supports many.
| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| key | string, unique | e.g. `it-cyber` |
| name | string | "IT / Cyber" |
| createdAt / updatedAt | timestamptz | |

### Node
A person in a tree. Fields map to LDAP attributes.
| Field | Type | LDAP | Notes |
|---|---|---|---|
| id | uuid (PK) | | |
| treeId | uuid, FK→CallTree | | multi-tree ready |
| displayName | string | displayName | |
| title | string | title | role/title |
| email | string | mail | |
| phone | string | | |
| order | int | | 1=first contact; unique within tree |
| parentId | uuid, FK→Node, nullable | manager | person directly above |
| backupId | uuid, FK→Node, nullable | | covers if no ACK |
| createdAt / updatedAt | timestamptz | | |

*Constraints:* `order` unique per `treeId`; `parentId`/`backupId` must reference nodes in the same tree; no node may be its own parent; the seed forms a non-circular chain (validation enforced when editing arrives in E3).

### IncidentType
Admin-editable catalogue; drives default severity (add/remove per FR-017).
| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| key | string, unique | e.g. `outage` |
| name | string | "Network outage" |
| description | string | shown on the tile |
| defaultSeverity | Severity | pre-fills at report time |
| active | boolean | soft-remove without losing history |
| createdAt / updatedAt | timestamptz | |

### Incident
A reported event.
| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | internal |
| reference | string, unique | human ID, e.g. `INC-142307` |
| treeId | uuid, FK→CallTree | |
| typeId | uuid, FK→IncidentType | |
| severity | Severity | may differ from type default (override) |
| location | string | defaults to "(not specified)" |
| description | string, **required** | FR-016 |
| status | IncidentStatus | `ACTIVE` on create |
| anonymous | boolean | |
| reporterUserId | uuid, FK→User, nullable | null when anonymous |
| reporterLabel | string | "Anonymous" or display name (denormalised for the log) |
| createdAt | timestamptz | drives later MTTA/MTTR |

*Reserved for later features (nullable/absent now, no rework): chain-state entries, ackAt/closeAt events, closeReason, reopen window.*

### AuditUserAction  (append-only)
Separate from configuration-change logs (Constitution III).
| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| at | timestamptz (UTC) | |
| actorLabel | string | who (or "Anonymous"/"System") |
| actorUserId | uuid, FK→User, nullable | |
| action | string | e.g. "Reported incident", "Overrode severity" |
| target | string | e.g. "INC-142307 · severity L2 (auto)" or "L2 → L3" |

*Immutability:* no update/delete paths in code; written in the same transaction as the action it records. (A separate `AuditConfigChange` table exists in the model for E4/E13 but is not written in this slice.)

## Relationships (summary)

- CallTree 1—* Node · CallTree 1—* Incident
- Node *—1 CallTree · Node 0..1—1 parent (self) · Node 0..1—1 backup (self)
- User 0..1—1 Node · User 1—* Incident (as reporter, unless anonymous)
- IncidentType 1—* Incident
- AuditUserAction *—0..1 User

## Seed (IT/Cyber pilot)

**Tree:** `it-cyber` — "IT / Cyber".

**Nodes (order → parent → backup):**
1. Prashant Kamble — Technical Administrator, Network — prashant.kamble@… — backup: Nurul
2. Nurul Qureshi — Lead, Infrastructure Security & Compliance — parent: Prashant — backup: Anupam
3. Anupam Singh — Tech Data Digital & Innovation Director — parent: Nurul — backup: none

*(Real emails/phones swapped in at the "send real alerts" stage; test values used during build.)*

**Incident types → default severity:** Suspected breach→L3 · Network outage→L2 · Malware/ransomware→L3 · Service degraded→L1 · Single-user issue→L1 · Suspicious email→L0.

**Users (dev/test logins, one per role):** an Admin, a Member linked to the Prashant node, a Reporter, an Auditor. Passwords set via env for the seed; documented in the README as test credentials only.
