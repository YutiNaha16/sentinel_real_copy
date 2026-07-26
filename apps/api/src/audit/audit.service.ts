import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';

type Db = PrismaService | Prisma.TransactionClient;

export interface UserActionEntry {
  actorLabel: string;
  actorUserId?: string | null;
  action: string;
  target: string;
}

/** Append-only writer for the user-action audit log (Constitution III). */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Record a user action. Pass a transaction client (`db`) to write it in the
   * same transaction as the action it audits; otherwise it uses the base client.
   */
  async logUserAction(entry: UserActionEntry, db: Db = this.prisma): Promise<void> {
    await db.auditUserAction.create({
      data: {
        actorLabel: entry.actorLabel,
        actorUserId: entry.actorUserId ?? null,
        action: entry.action,
        target: entry.target,
      },
    });
  }

  /** Append-only writer for configuration changes (used by the future config feature). */
  async logConfigChange(
    entry: { actorLabel: string; action: string; target: string },
    db: Db = this.prisma,
  ): Promise<void> {
    await db.auditConfigChange.create({ data: entry });
  }

  /** The two logs, newest first (capped), for the read-only audit view (Feature 006). */
  async getTrail() {
    const [userActions, configChanges] = await Promise.all([
      this.prisma.auditUserAction.findMany({ orderBy: { at: 'desc' }, take: 200 }),
      this.prisma.auditConfigChange.findMany({ orderBy: { at: 'desc' }, take: 200 }),
    ]);
    const map = (r: { at: Date; actorLabel: string; action: string; target: string }) => ({
      at: r.at.toISOString(),
      actorLabel: r.actorLabel,
      action: r.action,
      target: r.target,
    });
    return { userActions: userActions.map(map), configChanges: configChanges.map(map) };
  }

  async toCsv(): Promise<string> {
    const { userActions, configChanges } = await this.getTrail();
    const rows: string[][] = [['log', 'at', 'actor', 'action', 'target']];
    for (const r of userActions) rows.push(['user', r.at, r.actorLabel, r.action, r.target]);
    for (const r of configChanges) rows.push(['config', r.at, r.actorLabel, r.action, r.target]);
    return rows
      .map((r) => r.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(','))
      .join('\n');
  }
}
