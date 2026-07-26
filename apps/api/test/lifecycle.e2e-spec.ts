import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/http-exception.filter';
import { PrismaService } from '../src/common/prisma.service';
import { EscalationService } from '../src/escalation/escalation.service';

/** Feature 004 — close / override / re-open. */
describe('Incident lifecycle (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;
  let prisma: PrismaService;
  let engine: EscalationService;
  const password = process.env.SEED_PASSWORD || 'Passw0rd!';
  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
  const tok: Record<string, string> = {};

  beforeAll(async () => {
    process.env.ESCALATION_DISABLED = '1';
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
    server = app.getHttpServer();
    prisma = moduleRef.get(PrismaService);
    engine = moduleRef.get(EscalationService);
    for (const [k, email] of Object.entries({
      admin: 'admin@sentinel.local',
      member: 'prashant@sentinel.local',
      reporter: 'reporter@sentinel.local',
      auditor: 'auditor@sentinel.local',
    })) {
      tok[k] = (await request(server).post('/api/auth/login').send({ email, password })).body.accessToken;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  async function report(token: string, typeKey: string, extra: Record<string, unknown> = {}) {
    const types = await request(server).get('/api/incident-types').set(auth(token));
    const id = types.body.find((x: { key: string; id: string }) => x.key === typeKey).id;
    const body: Record<string, unknown> = { typeId: id, description: 'lifecycle test', ...extra };
    if (typeKey === 'outage') body.confirmedHighSeverity = true; // L2 needs confirmation
    const r = await request(server).post('/api/incidents').set(auth(token)).send(body);
    return r.body.reference as string;
  }

  describe('close', () => {
    it('chain member closes with a reason; drops off active; engine leaves it alone', async () => {
      const ref = await report(tok.reporter, 'outage');
      await request(server).post(`/api/incidents/${ref}/close`).set(auth(tok.reporter)).send({ reason: 'x' }).expect(403); // reporter not in chain
      await request(server).post(`/api/incidents/${ref}/close`).set(auth(tok.auditor)).send({ reason: 'x' }).expect(403);
      await request(server).post(`/api/incidents/${ref}/close`).set(auth(tok.member)).send({ reason: '' }).expect(400); // reason required
      const closed = await request(server).post(`/api/incidents/${ref}/close`).set(auth(tok.member)).send({ reason: 'Resolved — service restored' }).expect(200);
      expect(closed.body.status).toBe('RESOLVED');
      await request(server).post(`/api/incidents/${ref}/close`).set(auth(tok.member)).send({ reason: 'again' }).expect(409); // already resolved

      const active = await request(server).get('/api/incidents/active').set(auth(tok.admin));
      expect(active.body.some((i: { reference: string }) => i.reference === ref)).toBe(false);

      await engine.processDue(new Date());
      const inc = await prisma.incident.findUniqueOrThrow({ where: { reference: ref } });
      expect(inc.status).toBe('RESOLVED'); // engine never touches resolved incidents
    });
  });

  describe('override', () => {
    it('override to parallel notifies waiting members; requires a reason; role-gated', async () => {
      const ref = await report(tok.reporter, 'degraded'); // L1 sequential → first notified, rest waiting
      await request(server).post(`/api/incidents/${ref}/override`).set(auth(tok.reporter)).send({ severity: 'L3', reason: 'worse' }).expect(403);
      await request(server).post(`/api/incidents/${ref}/override`).set(auth(tok.member)).send({ severity: 'L3', reason: '' }).expect(400);
      await request(server).post(`/api/incidents/${ref}/override`).set(auth(tok.member)).send({ severity: 'L3', reason: 'Impact greater than first assessed' }).expect(200);

      const tree = await request(server).get(`/api/incidents/${ref}/tree`).set(auth(tok.admin));
      expect(tree.body.severity).toBe('L3');
      expect(tree.body.entries.every((e: { state: string }) => e.state === 'NOTIFIED')).toBe(true); // waiting promoted
    });
  });

  describe('re-open', () => {
    it('reporter re-opens their own within the window; auditor cannot', async () => {
      const ref = await report(tok.reporter, 'outage');
      await request(server).post(`/api/incidents/${ref}/close`).set(auth(tok.member)).send({ reason: 'false positive' }).expect(200);
      await request(server).post(`/api/incidents/${ref}/reopen`).set(auth(tok.auditor)).expect(403);
      const re = await request(server).post(`/api/incidents/${ref}/reopen`).set(auth(tok.reporter)).expect(200);
      expect(re.body.status).toBe('ACTIVE');
    });

    it('re-open is refused after the window', async () => {
      const ref = await report(tok.reporter, 'outage');
      await request(server).post(`/api/incidents/${ref}/close`).set(auth(tok.member)).send({ reason: 'done' }).expect(200);
      await prisma.incident.update({ where: { reference: ref }, data: { closedAt: new Date(Date.now() - 100 * 24 * 3600 * 1000) } });
      await request(server).post(`/api/incidents/${ref}/reopen`).set(auth(tok.reporter)).expect(422);
    });

    it('anonymous incidents are admin-only to re-open', async () => {
      const ref = await report(tok.reporter, 'outage', { anonymous: true });
      await request(server).post(`/api/incidents/${ref}/close`).set(auth(tok.member)).send({ reason: 'done' }).expect(200);
      await request(server).post(`/api/incidents/${ref}/reopen`).set(auth(tok.reporter)).expect(403); // reporter identity not stored
      await request(server).post(`/api/incidents/${ref}/reopen`).set(auth(tok.admin)).expect(200);
    });
  });
});
