import { Injectable } from '@nestjs/common';
import { ChainState, Role, Severity } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { AuthenticatedUser } from '../auth/current-user.decorator';

const DAY_MS = 24 * 3600 * 1000;

/** Read-only response metrics computed from stored timestamps. No persistence. */
@Injectable()
export class MetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(user: AuthenticatedUser) {
    const incidents = await this.prisma.incident.findMany({
      include: { chain: { include: { node: true }, orderBy: { order: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });

    const mtta: number[] = [];
    const mttr: number[] = [];
    const totalComp: number[] = [];
    let deliveredEntries = 0;
    let ackedEntries = 0;
    let totalEntries = 0;
    let acknowledgedIncidents = 0;
    let resolvedIncidents = 0;

    for (const inc of incidents) {
      const created = inc.createdAt.getTime();
      const acks = inc.chain.filter((c) => c.ackAt).map((c) => c.ackAt!.getTime());
      totalEntries += inc.chain.length;
      deliveredEntries += inc.chain.filter((c) => c.notifiedAt).length;
      ackedEntries += inc.chain.filter((c) => c.state === ChainState.ACKNOWLEDGED).length;
      if (acks.length) {
        acknowledgedIncidents++;
        mtta.push(Math.max(0, Math.min(...acks) - created));
        totalComp.push(Math.max(0, Math.max(...acks) - created));
      }
      if (inc.status === 'RESOLVED' && inc.closedAt) {
        resolvedIncidents++;
        mttr.push(Math.max(0, inc.closedAt.getTime() - created));
      }
    }

    const meanMinutes = (arr: number[]): number | null =>
      arr.length ? +(arr.reduce((a, b) => a + b, 0) / arr.length / 60000).toFixed(1) : null;
    const clampPct = (num: number, den: number): number =>
      den ? Math.max(0, Math.min(100, Math.round((num / den) * 100))) : 0;

    const since = Date.now() - 30 * DAY_MS;
    const mix: Record<Severity, number> = { L0: 0, L1: 0, L2: 0, L3: 0 };
    for (const inc of incidents) {
      if (inc.createdAt.getTime() >= since) mix[inc.severity]++;
    }

    let perHop: {
      reference: string;
      hops: { displayName: string; state: ChainState; latencySeconds: number | null }[];
      breakingNode: string | null;
    } | null = null;
    const recent = incidents.find((i) => i.chain.length > 0);
    if (recent) {
      const hops = recent.chain.map((c) => ({
        displayName: c.node.displayName,
        state: c.state,
        latencySeconds:
          c.ackAt && c.notifiedAt
            ? Math.max(0, Math.round((c.ackAt.getTime() - c.notifiedAt.getTime()) / 1000))
            : null,
      }));
      const breaking = recent.chain.find(
        (c) => c.state === ChainState.NOTIFIED || c.state === ChainState.ESCALATED,
      );
      perHop = { reference: recent.reference, hops, breakingNode: breaking?.node.displayName ?? null };
    }

    return {
      scope: user.role === Role.MEMBER ? 'team' : 'org',
      totals: {
        incidents: incidents.length,
        acknowledged: acknowledgedIncidents,
        resolved: resolvedIncidents,
      },
      mttaMinutes: meanMinutes(mtta),
      mttrMinutes: meanMinutes(mttr),
      totalCompletionMinutes: meanMinutes(totalComp),
      ackRatePct: clampPct(ackedEntries, deliveredEntries),
      deliveryRatePct: clampPct(deliveredEntries, totalEntries),
      resolutionMix: (['L0', 'L1', 'L2', 'L3'] as Severity[]).map((s) => ({ severity: s, count: mix[s] })),
      perHop,
      canExport: user.role === Role.ADMIN || user.role === Role.AUDITOR,
    };
  }

  async exportCsv(): Promise<string> {
    const incidents = await this.prisma.incident.findMany({
      include: { chain: true },
      orderBy: { createdAt: 'desc' },
    });
    const rows: string[][] = [
      ['reference', 'severity', 'status', 'createdAt', 'firstAckAt', 'closedAt', 'mttaSeconds', 'mttrSeconds', 'ackCount', 'chainSize'],
    ];
    for (const inc of incidents) {
      const created = inc.createdAt.getTime();
      const acks = inc.chain.filter((c) => c.ackAt).map((c) => c.ackAt!.getTime());
      const firstAck = acks.length ? Math.min(...acks) : null;
      const mttaSec = firstAck != null ? String(Math.max(0, Math.round((firstAck - created) / 1000))) : '';
      const mttrSec =
        inc.status === 'RESOLVED' && inc.closedAt
          ? String(Math.max(0, Math.round((inc.closedAt.getTime() - created) / 1000)))
          : '';
      rows.push([
        inc.reference,
        inc.severity,
        inc.status,
        inc.createdAt.toISOString(),
        firstAck != null ? new Date(firstAck).toISOString() : '',
        inc.closedAt ? inc.closedAt.toISOString() : '',
        mttaSec,
        mttrSec,
        String(inc.chain.filter((c) => c.state === ChainState.ACKNOWLEDGED).length),
        String(inc.chain.length),
      ]);
    }
    return rows
      .map((r) => r.map((cell) => (/[",\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell)).join(','))
      .join('\n');
  }
}
