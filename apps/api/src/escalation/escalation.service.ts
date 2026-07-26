import { Injectable, Logger } from '@nestjs/common';
import {
  ChainState,
  EscalationConfig,
  EscalationEventKind,
  Prisma,
  Severity,
} from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { EmailService } from '../email/email.service';

const PARALLEL = new Set<Severity>([Severity.L2, Severity.L3]);

/**
 * The escalation engine. `processDue(now)` is a pure function of persisted
 * state + the supplied time, so it is deterministic and testable (no real
 * waiting) and safe to re-run / restart. It never changes incident status.
 */
@Injectable()
export class EscalationService {
  private readonly logger = new Logger('Escalation');

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  /** Process every ACTIVE incident against `now`. Returns the number of events emitted. */
  async processDue(now: Date = new Date()): Promise<number> {
    const incidents = await this.prisma.incident.findMany({
      where: { status: 'ACTIVE' },
      include: { chain: { orderBy: { order: 'asc' }, include: { node: true } } },
    });
    const configs = await this.prisma.escalationConfig.findMany();
    const cfgBySev = new Map(configs.map((c) => [c.severity, c]));

    let events = 0;
    for (const inc of incidents) {
      const cfg = cfgBySev.get(inc.severity);
      if (cfg) events += await this.processIncident(inc, cfg, now);
    }
    return events;
  }

  private async processIncident(
    inc: Prisma.IncidentGetPayload<{
      include: { chain: { include: { node: true } } };
    }>,
    cfg: EscalationConfig,
    now: Date,
  ): Promise<number> {
    const entries = inc.chain;
    const anyAcked = entries.some((e) => e.state === ChainState.ACKNOWLEDGED);
    const parallel = PARALLEL.has(inc.severity);
    let count = 0;

    // 1. Escalation — sequential severities only, one hop per run.
    if (!parallel) {
      const frontier = entries.find((e) => e.state === ChainState.NOTIFIED);
      if (frontier?.notifiedAt && this.due(frontier.notifiedAt, cfg.escalateAfterSec, now)) {
        const next = entries.find((e) => e.state === ChainState.WAITING);
        await this.prisma.$transaction(async (tx) => {
          await tx.incidentChainEntry.update({
            where: { id: frontier.id },
            data: { state: ChainState.ESCALATED },
          });
          if (next) {
            await tx.incidentChainEntry.update({
              where: { id: next.id },
              data: { state: ChainState.NOTIFIED, notifiedAt: now },
            });
          }
          await this.event(
            tx,
            inc.id,
            EscalationEventKind.ESCALATION,
            next
              ? `Escalated: ${frontier.node.displayName} → ${next.node.displayName}`
              : `No further contacts after ${frontier.node.displayName}`,
            now,
          );
        });
        frontier.state = ChainState.ESCALATED;
        if (next) {
          next.state = ChainState.NOTIFIED;
          next.notifiedAt = now;
        }
        count++;
        if (next) await this.email.notify(inc.id, [next.nodeId]);
      }
    }

    // 2. Reminders — notified-or-escalated, unacknowledged, under the cap.
    for (const e of entries) {
      if (e.state !== ChainState.NOTIFIED && e.state !== ChainState.ESCALATED) continue;
      if (e.reminderCount >= cfg.maxReminders) continue;
      const base = e.lastRemindedAt ?? e.notifiedAt;
      if (!base || !this.due(base, cfg.remindEverySec, now)) continue;
      const n = e.reminderCount + 1;
      await this.prisma.$transaction(async (tx) => {
        await tx.incidentChainEntry.update({
          where: { id: e.id },
          data: { reminderCount: n, lastRemindedAt: now },
        });
        await this.event(
          tx,
          inc.id,
          EscalationEventKind.REMINDER,
          `Reminder ${n}/${cfg.maxReminders} to ${e.node.displayName}`,
          now,
        );
      });
      e.reminderCount = n;
      e.lastRemindedAt = now;
      count++;
    }

    // 3. Admin alarm — nobody acknowledged by the alarm time; fire once.
    if (!anyAcked && !inc.adminAlarmedAt && this.due(inc.createdAt, cfg.adminAlarmAfterSec, now)) {
      await this.prisma.$transaction(async (tx) => {
        await tx.incident.update({ where: { id: inc.id }, data: { adminAlarmedAt: now } });
        await this.event(
          tx,
          inc.id,
          EscalationEventKind.ALARM,
          `ADMIN ALARM — nobody in the chain has acknowledged ${inc.reference}`,
          now,
        );
      });
      count++;
    }

    return count;
  }

  private due(from: Date, seconds: number, now: Date): boolean {
    return now.getTime() - new Date(from).getTime() >= seconds * 1000;
  }

  private event(
    tx: Prisma.TransactionClient,
    incidentId: string,
    kind: EscalationEventKind,
    message: string,
    at: Date,
  ) {
    return tx.escalationEvent.create({ data: { incidentId, kind, message, at } });
  }
}
