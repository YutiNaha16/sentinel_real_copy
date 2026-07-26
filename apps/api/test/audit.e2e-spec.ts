import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/http-exception.filter';

/** Feature 006 — read-only audit trail: content + role scoping. */
describe('Audit trail (e2e)', () => {
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

  it('Admin and Auditor see the two separate logs', async () => {
    const res = await request(server).get('/api/audit').set(auth(tok.admin)).expect(200);
    expect(Array.isArray(res.body.userActions)).toBe(true);
    expect(Array.isArray(res.body.configChanges)).toBe(true);
    if (res.body.userActions.length) {
      const e = res.body.userActions[0];
      expect(e).toHaveProperty('at');
      expect(e).toHaveProperty('actorLabel');
      expect(e).toHaveProperty('action');
    }
    await request(server).get('/api/audit').set(auth(tok.auditor)).expect(200);
  });

  it('Member and Reporter are blocked (403)', async () => {
    await request(server).get('/api/audit').set(auth(tok.member)).expect(403);
    await request(server).get('/api/audit').set(auth(tok.reporter)).expect(403);
  });

  it('CSV export: Admin/Auditor allowed; Member/Reporter blocked', async () => {
    const csv = await request(server).get('/api/audit/export.csv').set(auth(tok.admin)).expect(200);
    expect(csv.headers['content-type']).toContain('text/csv');
    expect(csv.text.split('\n')[0]).toContain('log,at,actor,action,target');
    await request(server).get('/api/audit/export.csv').set(auth(tok.auditor)).expect(200);
    await request(server).get('/api/audit/export.csv').set(auth(tok.member)).expect(403);
    await request(server).get('/api/audit/export.csv').set(auth(tok.reporter)).expect(403);
  });
});
