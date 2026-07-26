export type Role = 'ADMIN' | 'MEMBER' | 'REPORTER' | 'AUDITOR';
export type Severity = 'L0' | 'L1' | 'L2' | 'L3';

export const SEV_LABEL: Record<Severity, string> = {
  L0: 'Hazard',
  L1: 'Minor',
  L2: 'Major',
  L3: 'Critical',
};

/** L2/L3 notify everyone at once (parallel) and need confirmation. */
export const isParallel = (s: Severity) => s === 'L2' || s === 'L3';

export interface AuthUser {
  id: string;
  displayName: string;
  role: Role;
  nodeId: string | null;
}

export interface TreeNodeView {
  id: string;
  order: number;
  displayName: string;
  title: string;
  email: string;
  phone: string;
  parentName: string | null;
  backupName: string | null;
  backupId: string | null;
}

export interface AdminTree {
  scope: 'full';
  nodes: TreeNodeView[];
}
export interface MemberTree {
  scope: 'member';
  view: {
    parent: TreeNodeView | null;
    self: TreeNodeView;
    backup: TreeNodeView | null;
    reports: TreeNodeView[];
  };
}
export type TreeResponse = AdminTree | MemberTree;

export interface IncidentType {
  id: string;
  key: string;
  name: string;
  description: string;
  defaultSeverity: Severity;
}

export interface IncidentItem {
  reference: string;
  createdAt: string;
  severity: Severity;
  typeName: string;
  location: string;
  reporterLabel: string;
  status: 'ACTIVE' | 'RESOLVED';
  ackCount: number;
  chainSize: number;
}

// --- Feature 002/003: live tree, acknowledgement, escalation engine ---
export type ChainState = 'WAITING' | 'NOTIFIED' | 'ESCALATED' | 'ACKNOWLEDGED';
export type EscalationEventKind = 'ESCALATION' | 'REMINDER' | 'ALARM';

export interface ActiveIncidentSummary {
  reference: string;
  severity: Severity;
  status: 'ACTIVE' | 'RESOLVED';
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
  reminderCount: number;
}

export interface EscalationEvent {
  at: string;
  kind: EscalationEventKind;
  message: string;
}

export interface LiveTree {
  reference: string;
  severity: Severity;
  status: 'ACTIVE' | 'RESOLVED';
  description: string;
  location: string;
  reporterLabel: string;
  createdAt: string;
  adminAlarmedAt: string | null;
  ackCount: number;
  chainSize: number;
  entries: LiveTreeEntry[];
  events: EscalationEvent[];
}

// --- Feature 006: audit trail ---
export interface AuditEntry {
  at: string;
  actorLabel: string;
  action: string;
  target: string;
}
export interface AuditTrail {
  userActions: AuditEntry[];
  configChanges: AuditEntry[];
}

// --- Feature 005: metrics ---
export interface MetricsSummary {
  scope: 'org' | 'team';
  totals: { incidents: number; acknowledged: number; resolved: number };
  mttaMinutes: number | null;
  mttrMinutes: number | null;
  totalCompletionMinutes: number | null;
  ackRatePct: number;
  deliveryRatePct: number;
  resolutionMix: { severity: Severity; count: number }[];
  perHop: {
    reference: string;
    hops: { displayName: string; state: ChainState; latencySeconds: number | null }[];
    breakingNode: string | null;
  } | null;
  canExport: boolean;
}

// --- Feature 007: configuration ---
export interface ConfigLevel {
  severity: Severity;
  escalateAfterSec: number;
  remindEverySec: number;
  maxReminders: number;
  adminAlarmAfterSec: number;
}
export interface ConfigMappingItem {
  id: string;
  key: string;
  name: string;
  description: string;
  defaultSeverity: Severity;
}
export interface ConfigGeneral {
  reopenWindowHours: number;
  retentionMonths: number;
}
export interface ConfigState {
  levels: ConfigLevel[];
  severityMapping: ConfigMappingItem[];
  general: ConfigGeneral;
}

// --- Feature 010: notifications ---
export interface NotificationItem {
  at: string;
  category: string;
  message: string;
}

// --- Feature 008: email alerts (mock inbox) ---
export interface InboxEmail {
  toName: string;
  toEmail: string;
  subject: string;
  severity: Severity;
  body: string;
  ackLink: string;
  deliveredAt: string | null;
  failedReason: string | null;
}
