import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/http-exception.filter';

/** Feature 008 — email alerts + one-click token acknowledge (mock provider). */
describe('Email alerts (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;
  const password = process.env.SEED_PASSWORD || 'Passw0rd!';
  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
  const tok: Record<string, string> = {};
  let ref: string;
  let token: string;

  beforeAll(async () => {
    process.env.ESCALATION_DISABLED = '1';
    process.env.EMAIL_PROVIDER = 'mock';
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
    const types = await request(server).get('/api/incident-types').set(auth(tok.reporter));
    const outage = types.body.find((x: { key: string; id: string }) => x.key === 'outage').id;
    ref = (
      await request(server)
        .post('/api/incidents')
        .set(auth(tok.reporter))
        .send({ typeId: outage, description: 'email test', location: 'DC-2', confirmedHighSeverity: true })
    ).body.reference;
  });

  afterAll(async () => {
    await app.close();
  });

  it('generates an alert email per notified contact (L2 parallel → 3), delivered', async () => {
    const res = await request(server).get(`/api/incidents/${ref}/emails`).set(auth(tok.admin)).expect(200);
    expect(res.body).toHaveLength(3);
    for (const m of res.body) {
      expect(m.subject).toContain('[SENTINEL]');
      expect(m.ackLink).toContain('/api/public/ack/');
      expect(m.deliveredAt).toBeTruthy(); // mock provider marks delivered
    }
    token = res.body[0].ackLink.split('/').pop();
  });

  it('mock inbox is Admin/Member only (Reporter/Auditor 403)', async () => {
    await request(server).get(`/api/incidents/${ref}/emails`).set(auth(tok.member)).expect(200);
    await request(server).get(`/api/incidents/${ref}/emails`).set(auth(tok.reporter)).expect(403);
    await request(server).get(`/api/incidents/${ref}/emails`).set(auth(tok.auditor)).expect(403);
  });

  it('tapping the token link (no auth) acknowledges; idempotent; never closes', async () => {
    const r1 = await request(server).get(`/api/public/ack/${token}`).expect(200);
    expect(r1.text.toLowerCase()).toContain('acknowledged');

    const tree = await request(server).get(`/api/incidents/${ref}/tree`).set(auth(tok.admin)).expect(200);
    const acked = tree.body.entries.filter((e: { state: string }) => e.state === 'ACKNOWLEDGED');
    expect(acked.length).toBe(1);
    expect(tree.body.status).toBe('ACTIVE'); // ACK != Close

    // idempotent
    await request(server).get(`/api/public/ack/${token}`).expect(200);
    const tree2 = await request(server).get(`/api/incidents/${ref}/tree`).set(auth(tok.admin));
    expect(tree2.body.ackCount).toBe(1);
  });

  it('an invalid token returns a clear message, not an error', async () => {
    const r = await request(server).get('/api/public/ack/not-a-real-token').expect(200);
    expect(r.text.toLowerCase()).toContain('invalid');
  });
});
