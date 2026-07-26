// Shared domain types/enums reused by the API, the web app, and (later) mobile.
// Kept as string-literal unions so both Prisma (backend) and React (frontend) align.

export const Role = {
  ADMIN: 'ADMIN',
  MEMBER: 'MEMBER',
  REPORTER: 'REPORTER',
  AUDITOR: 'AUDITOR',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const Severity = {
  L0: 'L0',
  L1: 'L1',
  L2: 'L2',
  L3: 'L3',
} as const;
export type Severity = (typeof Severity)[keyof typeof Severity];

export const IncidentStatus = {
  ACTIVE: 'ACTIVE',
  RESOLVED: 'RESOLVED',
} as const;
export type IncidentStatus = (typeof IncidentStatus)[keyof typeof IncidentStatus];

/** Severity presentation + escalation mode (L0/L1 sequential, L2/L3 parallel). */
export const SEVERITY_META: Record<
  Severity,
  { label: string; mode: 'Sequential' | 'Parallel' }
> = {
  L0: { label: 'Hazard', mode: 'Sequential' },
  L1: { label: 'Minor', mode: 'Sequential' },
  L2: { label: 'Major', mode: 'Parallel' },
  L3: { label: 'Critical', mode: 'Parallel' },
};

export function isParallel(sev: Severity): boolean {
  return SEVERITY_META[sev].mode === 'Parallel';
}

// ---- API DTO shapes (shared contract, see specs/001-foundation-report/contracts/api.md) ----

export interface AuthUser {
  id: string;
  displayName: string;
  role: Role;
  nodeId?: string | null;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export interface TreeNodeView {
  id: string;
  order: number;
  displayName: string;
  title: string;
  email: string;
  phone: string;
  parentName?: string | null;
  backupName?: string | null;
}

export interface MemberTreeView {
  parent: TreeNodeView | null;
  self: TreeNodeView;
  backup: TreeNodeView | null;
  reports: TreeNodeView[];
}

export interface IncidentTypeView {
  id: string;
  key: string;
  name: string;
  description: string;
  defaultSeverity: Severity;
}

export interface CreateIncidentRequest {
  typeId: string;
  severity?: Severity;
  location?: string;
  description: string;
  anonymous?: boolean;
  confirmedHighSeverity?: boolean;
}

export interface IncidentListItem {
  reference: string;
  createdAt: string;
  severity: Severity;
  typeName: string;
  location: string;
  reporterLabel: string;
  status: IncidentStatus;
  ackCount: number;
  chainSize: number;
}

// ---- Feature 002: live tree + acknowledgement ----

export const ChainState = {
  WAITING: 'WAITING',
  NOTIFIED: 'NOTIFIED',
  ACKNOWLEDGED: 'ACKNOWLEDGED',
} as const;
export type ChainState = (typeof ChainState)[keyof typeof ChainState];

export interface ActiveIncidentSummary {
  reference: string;
  severity: Severity;
  status: IncidentStatus;
  typeName: string;
  ackCount: number;
  chainSize: number;
}

export interface LiveTreeEntry {
  nodeId: string;
  order: number;
  displayName: string;
  title: string;
  state: ChainState;
  notifiedAt: string | null;
  ackAt: string | null;
}

export interface LiveTree {
  reference: string;
  severity: Severity;
  status: IncidentStatus;
  description: string;
  location: string;
  reporterLabel: string;
  createdAt: string;
  ackCount: number;
  chainSize: number;
  entries: LiveTreeEntry[];
}
