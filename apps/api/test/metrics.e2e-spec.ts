import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/http-exception.filter';

/** Feature 005 — response metrics: values, safety, and role scoping. */
describe('Metrics (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;
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

  it('Admin sees org metrics with sane values', async () => {
    const res = await request(server).get('/api/metrics').set(auth(tok.admin)).expect(200);
    const m = res.body;
    expect(m.scope).toBe('org');
    expect(m.resolutionMix).toHaveLength(4);
    expect(m.ackRatePct).toBeGreaterThanOrEqual(0);
    expect(m.ackRatePct).toBeLessThanOrEqual(100);
    expect(m.deliveryRatePct).toBeGreaterThanOrEqual(0);
    expect(m.deliveryRatePct).toBeLessThanOrEqual(100);
    // MTTA is a non-negative number or null
    expect(m.mttaMinutes === null || m.mttaMinutes >= 0).toBe(true);
    // no negative per-hop latency
    if (m.perHop) {
      for (const h of m.perHop.hops) {
        expect(h.latencySeconds === null || h.latencySeconds >= 0).toBe(true);
      }
    }
    expect(m.canExport).toBe(true);
  });

  it('Member sees team-scoped metrics without export', async () => {
    const res = await request(server).get('/api/metrics').set(auth(tok.member)).expect(200);
    expect(res.body.scope).toBe('team');
    expect(res.body.canExport).toBe(false);
  });

  it('Auditor sees metrics and can export; Reporter is blocked', async () => {
    const aud = await request(server).get('/api/metrics').set(auth(tok.auditor)).expect(200);
    expect(aud.body.canExport).toBe(true);
    await request(server).get('/api/metrics').set(auth(tok.reporter)).expect(403);
  });

  it('CSV export: Admin and Auditor allowed; Member and Reporter blocked', async () => {
    const csv = await request(server).get('/api/metrics/export.csv').set(auth(tok.admin)).expect(200);
    expect(csv.headers['content-type']).toContain('text/csv');
    expect(csv.text.split('\n')[0]).toContain('reference,severity,status');
    await request(server).get('/api/metrics/export.csv').set(auth(tok.auditor)).expect(200);
    await request(server).get('/api/metrics/export.csv').set(auth(tok.member)).expect(403);
    await request(server).get('/api/metrics/export.csv').set(auth(tok.reporter)).expect(403);
  });
});
