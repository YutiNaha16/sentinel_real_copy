import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/http-exception.filter';

/**
 * Feature 001 authorization + behaviour suite — the automated form of the
 * manual checks. Runs against the seeded local database. The constitution
 * requires that every in-scope role restriction is proven at the API layer.
 */
describe('SENTINEL API (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;
  const t: Record<string, string> = {};
  const password = process.env.SEED_PASSWORD || 'Passw0rd!';
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
    server = app.getHttpServer();

    const roles: Record<string, string> = {
      admin: 'admin@sentinel.local',
      member: 'prashant@sentinel.local',
      reporter: 'reporter@sentinel.local',
      auditor: 'auditor@sentinel.local',
    };
    for (const [role, email] of Object.entries(roles)) {
      const res = await request(server).post('/api/auth/login').send({ email, password });
      t[role] = res.body.accessToken;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('logs in and issues tokens for all roles', () => {
    expect(t.admin && t.member && t.reporter && t.auditor).toBeTruthy();
  });

  it('GET /health is public', async () => {
    await request(server).get('/api/health').expect(200);
  });

  it('GET /me returns the role; rejects a bad token', async () => {
    const me = await request(server).get('/api/me').set(auth(t.admin)).expect(200);
    expect(me.body.role).toBe('ADMIN');
    await request(server).get('/api/me').set(auth('bad.token')).expect(401);
  });

  describe('US1 call tree — role scoping', () => {
    it('Admin sees the full ordered chain of 3', async () => {
      const res = await request(server).get('/api/trees/it-cyber').set(auth(t.admin)).expect(200);
      expect(res.body.scope).toBe('full');
      expect(res.body.nodes).toHaveLength(3);
    });
    it('Member sees only their scoped slice', async () => {
      const res = await request(server).get('/api/trees/it-cyber').set(auth(t.member)).expect(200);
      expect(res.body.scope).toBe('member');
      expect(res.body.view.self.displayName).toBe('Prashant Kamble');
    });
    it('Reporter and Auditor are forbidden (403)', async () => {
      await request(server).get('/api/trees/it-cyber').set(auth(t.reporter)).expect(403);
      await request(server).get('/api/trees/it-cyber').set(auth(t.auditor)).expect(403);
    });
  });

  describe('US2 report incident', () => {
    let outageId: string;
    beforeAll(async () => {
      const res = await request(server).get('/api/incident-types').set(auth(t.reporter));
      outageId = res.body.find((x: { key: string }) => x.key === 'outage').id;
    });

    it('lists 6 types for non-auditors; Auditor forbidden', async () => {
      const res = await request(server).get('/api/incident-types').set(auth(t.reporter)).expect(200);
      expect(res.body).toHaveLength(6);
      await request(server).get('/api/incident-types').set(auth(t.auditor)).expect(403);
    });

    it('L2 without confirmation is rejected (409)', async () => {
      await request(server)
        .post('/api/incidents')
        .set(auth(t.reporter))
        .send({ typeId: outageId, description: 'down' })
        .expect(409);
    });

    it('missing description is rejected (400)', async () => {
      await request(server)
        .post('/api/incidents')
        .set(auth(t.reporter))
        .send({ typeId: outageId, confirmedHighSeverity: true })
        .expect(400);
    });

    it('Auditor cannot report (403)', async () => {
      await request(server)
        .post('/api/incidents')
        .set(auth(t.auditor))
        .send({ typeId: outageId, description: 'x', confirmedHighSeverity: true })
        .expect(403);
    });

    it('Reporter creates an L2 incident with a reference', async () => {
      const res = await request(server)
        .post('/api/incidents')
        .set(auth(t.reporter))
        .send({
          typeId: outageId,
          description: 'Core switch unresponsive (e2e)',
          location: 'DC-2',
          confirmedHighSeverity: true,
        })
        .expect(201);
      expect(res.body.severity).toBe('L2');
      expect(res.body.reference).toMatch(/^INC-\d{6}$/);
    });
  });

  describe('US3 incident log — role scoping', () => {
    it('Admin and Auditor see the log', async () => {
      await request(server).get('/api/incidents').set(auth(t.admin)).expect(200);
      const aud = await request(server).get('/api/incidents').set(auth(t.auditor)).expect(200);
      expect(Array.isArray(aud.body)).toBe(true);
    });
    it('Reporter sees only their own incidents', async () => {
      const res = await request(server).get('/api/incidents').set(auth(t.reporter)).expect(200);
      expect(res.body.every((i: { reporterLabel: string }) => i.reporterLabel !== 'Anonymous')).toBe(true);
    });
  });
});
