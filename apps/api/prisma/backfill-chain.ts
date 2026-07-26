/**
 * One-time backfill (Feature 002): give any ACTIVE incident that predates
 * chain state a set of IncidentChainEntry rows, initialised from its severity.
 * Idempotent — incidents that already have chain entries are skipped.
 */
import { PrismaClient, ChainState, Severity } from '@prisma/client';

const prisma = new PrismaClient();
const PARALLEL = new Set<Severity>([Severity.L2, Severity.L3]);

async function main() {
  const actives = await prisma.incident.findMany({
    where: { status: 'ACTIVE' },
    include: { chain: true, tree: { include: { nodes: { orderBy: { order: 'asc' } } } } },
  });
  let created = 0;
  for (const inc of actives) {
    if (inc.chain.length > 0) continue;
    const parallel = PARALLEL.has(inc.severity);
    await prisma.incidentChainEntry.createMany({
      data: inc.tree.nodes.map((n, i) => ({
        incidentId: inc.id,
        nodeId: n.id,
        order: n.order,
        state: parallel || i === 0 ? ChainState.NOTIFIED : ChainState.WAITING,
        notifiedAt: parallel || i === 0 ? new Date() : null,
      })),
    });
    created++;
  }
  console.log(`Backfill complete: chain state added to ${created} incident(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
