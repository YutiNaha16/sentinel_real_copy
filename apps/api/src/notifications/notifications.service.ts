import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { AuthenticatedUser } from '../auth/current-user.decorator';

function auditCategory(action: string): string {
  const a = action.toLowerCase();
  if (a.includes('reported')) return 'ALERT';
  if (a.includes('acknowledged')) return 'ACK';
  if (a.includes('closed')) return 'CLOSE';
  if (a.includes('re-opened') || a.includes('reopened')) return 'REOPEN';
  if (a.includes('overrode') || a.includes('override')) return 'OVERRIDE';
  return 'ACTION';
}
const EVENT_CATEGORY: Record<string, string> = {
  ESCALATION: 'ESCALATION',
  REMINDER: 'REMINDER',
  ALARM: 'ALARM',
  STANDDOWN: 'STAND-DOWN',
};

/** Read-only merged activity feed (audit actions + escalation events). */
@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async feed(user: AuthenticatedUser) {
    const isReporter = user.role === Role.REPORTER;
    const [actions, events] = await Promise.all([
      this.prisma.auditUserAction.findMany({
        where: isReporter ? { actorUserId: user.userId } : {},
        orderBy: { at: 'desc' },
        take: 60,
      }),
      this.prisma.escalationEvent.findMany({
        where: isReporter ? { incident: { reporterUserId: user.userId } } : {},
        orderBy: { at: 'desc' },
        take: 60,
      }),
    ]);

    const items = [
      ...actions.map((a) => ({
        at: a.at,
        category: auditCategory(a.action),
        message: `${a.actorLabel} · ${a.action} · ${a.target}`,
      })),
      ...events.map((e) => ({
        at: e.at,
        category: EVENT_CATEGORY[e.kind] ?? e.kind,
        message: e.message,
      })),
    ];
    items.sort((x, y) => y.at.getTime() - x.at.getTime());
    return items.slice(0, 40).map((i) => ({
      at: i.at.toISOString(),
      category: i.category,
      message: i.message,
    }));
  }
}
