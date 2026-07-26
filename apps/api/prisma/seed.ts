/**
 * Seed the IT/Cyber pilot: one call tree, three people (order/parent/backup),
 * six incident types → default severity, and one test user per role.
 * Idempotent (upserts) so it can be re-run safely.
 *
 * NOTE: emails/phones here are placeholders for the build phase. Real contact
 * details are swapped in at the "send real alerts" stage (see STAKEHOLDER_DISCOVERY).
 */
import { PrismaClient, Severity } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const tree = await prisma.callTree.upsert({
    where: { key: 'it-cyber' },
    update: { name: 'IT / Cyber' },
    create: { key: 'it-cyber', name: 'IT / Cyber' },
  });

  // --- nodes (upsert by tree+order, then wire parent/backup) ---
  const prashant = await prisma.node.upsert({
    where: { treeId_order: { treeId: tree.id, order: 1 } },
    update: {},
    create: {
      treeId: tree.id,
      order: 1,
      displayName: 'Prashant Kamble',
      title: 'Technical Administrator — Network',
      email: 'prashant.kamble@example.test',
      phone: '+91 90000 00001',
    },
  });
  const nurul = await prisma.node.upsert({
    where: { treeId_order: { treeId: tree.id, order: 2 } },
    update: {},
    create: {
      treeId: tree.id,
      order: 2,
      displayName: 'Nurul Qureshi',
      title: 'Lead — Infrastructure, Security & Compliance',
      email: 'nurul.qureshi@example.test',
      phone: '+91 90000 00002',
    },
  });
  const anupam = await prisma.node.upsert({
    where: { treeId_order: { treeId: tree.id, order: 3 } },
    update: {},
    create: {
      treeId: tree.id,
      order: 3,
      displayName: 'Anupam Singh',
      title: 'Tech Data Digital & Innovation Director',
      email: 'anupam.singh@example.test',
      phone: '+91 90000 00003',
    },
  });

  await prisma.node.update({ where: { id: prashant.id }, data: { backupId: nurul.id } });
  await prisma.node.update({
    where: { id: nurul.id },
    data: { parentId: prashant.id, backupId: anupam.id },
  });
  await prisma.node.update({ where: { id: anupam.id }, data: { parentId: nurul.id } });

  // --- incident types → default severity (prototype defaults, "to confirm") ---
  const types: Array<{
    key: string;
    name: string;
    description: string;
    defaultSeverity: Severity;
  }> = [
    { key: 'breach', name: 'Suspected breach', description: 'Confirmed or suspected intrusion / data exposure', defaultSeverity: Severity.L3 },
    { key: 'outage', name: 'Network outage', description: 'Multiple users or a site offline', defaultSeverity: Severity.L2 },
    { key: 'malware', name: 'Malware / ransomware', description: 'Malicious code detected on endpoints', defaultSeverity: Severity.L3 },
    { key: 'degraded', name: 'Service degraded', description: 'Slow or partial service, workaround exists', defaultSeverity: Severity.L1 },
    { key: 'single', name: 'Single-user issue', description: 'One person affected', defaultSeverity: Severity.L1 },
    { key: 'phish', name: 'Suspicious email', description: 'Phishing / anomaly reported, no impact yet', defaultSeverity: Severity.L0 },
  ];
  for (const t of types) {
    await prisma.incidentType.upsert({
      where: { key: t.key },
      update: { name: t.name, description: t.description, defaultSeverity: t.defaultSeverity },
      create: t,
    });
  }

  // --- test users (one per role); Member is linked to Prashant's node ---
  const pwHash = await bcrypt.hash(process.env.SEED_PASSWORD || 'Passw0rd!', 10);
  const users: Array<{ email: string; displayName: string; role: any; nodeId?: string }> = [
    { email: 'admin@sentinel.local', displayName: 'Administrator', role: 'ADMIN' },
    { email: 'prashant@sentinel.local', displayName: 'Prashant Kamble', role: 'MEMBER', nodeId: prashant.id },
    { email: 'reporter@sentinel.local', displayName: 'S. Menon', role: 'REPORTER' },
    { email: 'auditor@sentinel.local', displayName: 'Audit & Compliance', role: 'AUDITOR' },
  ];
  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { displayName: u.displayName, role: u.role, nodeId: u.nodeId ?? null },
      create: { ...u, passwordHash: pwHash },
    });
  }

  // --- escalation config per severity (Feature 003; demo-friendly seconds) ---
  const escConfig = [
    { severity: Severity.L0, escalateAfterSec: 45, remindEverySec: 30, maxReminders: 2, adminAlarmAfterSec: 120 },
    { severity: Severity.L1, escalateAfterSec: 30, remindEverySec: 20, maxReminders: 3, adminAlarmAfterSec: 90 },
    { severity: Severity.L2, escalateAfterSec: 30, remindEverySec: 20, maxReminders: 3, adminAlarmAfterSec: 60 },
    { severity: Severity.L3, escalateAfterSec: 20, remindEverySec: 15, maxReminders: 4, adminAlarmAfterSec: 45 },
  ];
  for (const c of escConfig) {
    await prisma.escalationConfig.upsert({ where: { severity: c.severity }, update: c, create: c });
  }

  // --- general app config (single row; Feature 004) ---
  await prisma.appConfig.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, reopenWindowHours: 72, retentionMonths: 18 },
  });

  const counts = {
    trees: await prisma.callTree.count(),
    nodes: await prisma.node.count(),
    types: await prisma.incidentType.count(),
    users: await prisma.user.count(),
    escalationConfigs: await prisma.escalationConfig.count(),
  };
  console.log('Seed complete:', counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
