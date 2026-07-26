import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/http-exception.filter';
import { PrismaService } from '../src/common/prisma.service';
import { EscalationService } from '../src/escalation/escalation.service';

/**
 * Feature 003 — escalation engine. Deterministic: we back-date persisted
 * timestamps and invoke processDue(now) directly (no real waiting). The
 * interval scheduler is disabled so it never interferes.
 */
describe('Escalation engine (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;
  let prisma: PrismaService;
  let engine: EscalationService;
  const password = process.env.SEED_PASSWORD || 'Passw0rd!';
  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
  let reporter: string;

  beforeAll(async () => {
    process.env.ESCALATION_DISABLED = '1';
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
    server = app.getHttpServer();
    prisma = moduleRef.get(PrismaService);
    engine = moduleRef.get(EscalationService);
    reporter = (
      await request(server).post('/api/auth/login').send({ email: 'reporter@sentinel.local', password })
    ).body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  const cfgL1 = () => prisma.escalationConfig.findUniqueOrThrow({ where: { severity: 'L1' } });
  const ago = (sec: number) => new Date(Date.now() - sec * 1000);

  async function createL1(): Promise<string> {
    const types = await request(server).get('/api/incident-types').set(auth(reporter));
    const degraded = types.body.find((x: { key: string; id: string }) => x.key === 'degraded').id; // L1 sequential
    const made = await request(server)
      .post('/api/incidents')
      .set(auth(reporter))
      .send({ typeId: degraded, description: 'engine test' });
    return made.body.reference as string;
  }

  it('escalates a timed-out sequential contact to the next (status unchanged)', async () => {
    const ref = await createL1();
    const inc = await prisma.incident.findUniqueOrThrow({
      where: { reference: ref },
      include: { chain: { orderBy: { order: 'asc' } } },
    });
    const cfg = await cfgL1();
    await prisma.incidentChainEntry.update({
      where: { id: inc.chain[0].id },
      data: { notifiedAt: ago(cfg.escalateAfterSec + 5) },
    });

    await engine.processDue(new Date());

    const after = await prisma.incidentChainEntry.findMany({
      where: { incidentId: inc.id },
      orderBy: { order: 'asc' },
    });
    expect(after[0].state).toBe('ESCALATED');
    expect(after[1].state).toBe('NOTIFIED');
    const escEvents = await prisma.escalationEvent.count({
      where: { incidentId: inc.id, kind: 'ESCALATION' },
    });
    expect(escEvents).toBeGreaterThanOrEqual(1);
    const status = (await prisma.incident.findUniqueOrThrow({ where: { id: inc.id } })).status;
    expect(status).toBe('ACTIVE'); // engine never closes
  });

  it('sends reminders up to the cap, then stops', async () => {
    const ref = await createL1();
    const inc = await prisma.incident.findUniqueOrThrow({
      where: { reference: ref },
      include: { chain: { orderBy: { order: 'asc' } } },
    });
    const cfg = await cfgL1();
    const firstId = inc.chain[0].id;
    // Back-date below the escalate threshold but beyond the reminder interval, each run.
    for (let i = 0; i < cfg.maxReminders + 2; i++) {
      await prisma.incidentChainEntry.update({
        where: { id: firstId },
        data: { notifiedAt: ago(cfg.remindEverySec + 5), lastRemindedAt: ago(cfg.remindEverySec + 5) },
      });
      await engine.processDue(new Date());
    }
    const e = await prisma.incidentChainEntry.findUniqueOrThrow({ where: { id: firstId } });
    expect(e.reminderCount).toBe(cfg.maxReminders);
  });

  it('raises the admin alarm exactly once when nobody acknowledges', async () => {
    const ref = await createL1();
    const inc = await prisma.incident.findUniqueOrThrow({ where: { reference: ref } });
    const cfg = await cfgL1();
    await prisma.incident.update({
      where: { id: inc.id },
      data: { createdAt: ago(cfg.adminAlarmAfterSec + 5) },
    });

    await engine.processDue(new Date());
    const a1 = await prisma.incident.findUniqueOrThrow({ where: { id: inc.id } });
    expect(a1.adminAlarmedAt).toBeTruthy();
    const alarms1 = await prisma.escalationEvent.count({ where: { incidentId: inc.id, kind: 'ALARM' } });

    await engine.processDue(new Date()); // run again — must not duplicate
    const alarms2 = await prisma.escalationEvent.count({ where: { incidentId: inc.id, kind: 'ALARM' } });
    expect(alarms1).toBe(1);
    expect(alarms2).toBe(1);
  });

  it('never alarms or escalates once someone has acknowledged', async () => {
    const ref = await createL1();
    const inc = await prisma.incident.findUniqueOrThrow({
      where: { reference: ref },
      include: { chain: { orderBy: { order: 'asc' } } },
    });
    const cfg = await cfgL1();
    await prisma.incidentChainEntry.update({
      where: { id: inc.chain[0].id },
      data: { state: 'ACKNOWLEDGED', ackAt: new Date() },
    });
    await prisma.incident.update({
      where: { id: inc.id },
      data: { createdAt: ago(cfg.adminAlarmAfterSec + 5) },
    });

    await engine.processDue(new Date());

    const a = await prisma.incident.findUniqueOrThrow({ where: { id: inc.id } });
    expect(a.adminAlarmedAt).toBeNull();
    const first = await prisma.incidentChainEntry.findUniqueOrThrow({ where: { id: inc.chain[0].id } });
    expect(first.state).toBe('ACKNOWLEDGED');
  });
});
