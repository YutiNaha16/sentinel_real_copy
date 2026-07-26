import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/http-exception.filter';

/** Feature 007 — admin configuration. Saves + restores original config so other suites are unaffected. */
describe('Configuration (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;
  const password = process.env.SEED_PASSWORD || 'Passw0rd!';
  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
  const tok: Record<string, string> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let original: any;

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
    original = (await request(server).get('/api/config').set(auth(tok.admin))).body;
  });

  afterAll(async () => {
    // restore original config so other suites see seed values
    await request(server).put('/api/config/escalation').set(auth(tok.admin)).send({ levels: original.levels });
    await request(server)
      .put('/api/config/severity-mapping')
      .set(auth(tok.admin))
      .send({ mapping: original.severityMapping.map((m: { id: string; defaultSeverity: string }) => ({ id: m.id, defaultSeverity: m.defaultSeverity })) });
    await request(server).put('/api/config/general').set(auth(tok.admin)).send(original.general);
    await app.close();
  });

  it('Admin reads config; non-admins are blocked (403)', async () => {
    const res = await request(server).get('/api/config').set(auth(tok.admin)).expect(200);
    expect(res.body.levels).toHaveLength(4);
    expect(res.body.severityMapping.length).toBeGreaterThanOrEqual(6);
    expect(res.body.general).toHaveProperty('reopenWindowHours');
    await request(server).get('/api/config').set(auth(tok.member)).expect(403);
    await request(server).get('/api/config').set(auth(tok.reporter)).expect(403);
    await request(server).get('/api/config').set(auth(tok.auditor)).expect(403);
  });

  it('updates escalation timers, validates, and audits', async () => {
    const l0 = original.levels.find((l: { severity: string }) => l.severity === 'L0');
    const changed = { ...l0, escalateAfterSec: l0.escalateAfterSec + 7 };
    const before = (await request(server).get('/api/audit').set(auth(tok.admin))).body.configChanges.length;
    await request(server).put('/api/config/escalation').set(auth(tok.admin)).send({ levels: [changed] }).expect(200);
    const after = (await request(server).get('/api/config').set(auth(tok.admin))).body;
    expect(after.levels.find((l: { severity: string }) => l.severity === 'L0').escalateAfterSec).toBe(l0.escalateAfterSec + 7);
    const auditAfter = (await request(server).get('/api/audit').set(auth(tok.admin))).body.configChanges.length;
    expect(auditAfter).toBeGreaterThan(before); // config change recorded

    // invalid value rejected
    await request(server)
      .put('/api/config/escalation')
      .set(auth(tok.admin))
      .send({ levels: [{ ...l0, escalateAfterSec: 0 }] })
      .expect(400);
  });

  it('updates severity mapping', async () => {
    const single = original.severityMapping.find((m: { key: string }) => m.key === 'single');
    const target = single.defaultSeverity === 'L2' ? 'L1' : 'L2';
    await request(server)
      .put('/api/config/severity-mapping')
      .set(auth(tok.admin))
      .send({ mapping: [{ id: single.id, defaultSeverity: target }] })
      .expect(200);
    const after = (await request(server).get('/api/config').set(auth(tok.admin))).body;
    expect(after.severityMapping.find((m: { key: string }) => m.key === 'single').defaultSeverity).toBe(target);
  });

  it('updates general with a retention floor', async () => {
    await request(server).put('/api/config/general').set(auth(tok.admin)).send({ reopenWindowHours: 48, retentionMonths: 17 }).expect(400); // below floor
    await request(server).put('/api/config/general').set(auth(tok.admin)).send({ reopenWindowHours: 48, retentionMonths: 18 }).expect(200);
    const after = (await request(server).get('/api/config').set(auth(tok.admin))).body;
    expect(after.general.reopenWindowHours).toBe(48);
  });

  it('non-admin writes are blocked (403)', async () => {
    await request(server).put('/api/config/general').set(auth(tok.member)).send({ reopenWindowHours: 10, retentionMonths: 18 }).expect(403);
  });
});
