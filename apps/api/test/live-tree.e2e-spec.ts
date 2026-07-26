import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/http-exception.filter';

/** Feature 002 — live escalation tree + acknowledgement. */
describe('Live tree & acknowledgement (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;
  const t: Record<string, string> = {};
  const password = process.env.SEED_PASSWORD || 'Passw0rd!';
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
  let ref: string;
  let firstNodeId: string;

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

    for (const [role, email] of Object.entries({
      admin: 'admin@sentinel.local',
      member: 'prashant@sentinel.local',
      reporter: 'reporter@sentinel.local',
      auditor: 'auditor@sentinel.local',
    })) {
      const res = await request(server).post('/api/auth/login').send({ email, password });
      t[role] = res.body.accessToken;
    }

    const types = await request(server).get('/api/incident-types').set(auth(t.reporter));
    const outage = types.body.find((x: { key: string }) => x.key === 'outage').id;
    const made = await request(server)
      .post('/api/incidents')
      .set(auth(t.reporter))
      .send({ typeId: outage, description: 'Live-tree e2e', location: 'DC-2', confirmedHighSeverity: true });
    ref = made.body.reference;

    const tree = await request(server).get(`/api/incidents/${ref}/tree`).set(auth(t.admin));
    firstNodeId = tree.body.entries[0].nodeId;
  });

  afterAll(async () => {
    await app.close();
  });

  it('initialises chain state on report (L2 parallel → all notified)', async () => {
    const res = await request(server).get(`/api/incidents/${ref}/tree`).set(auth(t.admin)).expect(200);
    expect(res.body.entries).toHaveLength(3);
    expect(res.body.entries.every((e: { state: string }) => e.state === 'NOTIFIED')).toBe(true);
    expect(res.body.ackCount).toBe(0);
  });

  it('live tree + active list are Admin/Member only (Reporter/Auditor 403)', async () => {
    await request(server).get('/api/incidents/active').set(auth(t.admin)).expect(200);
    await request(server).get('/api/incidents/active').set(auth(t.reporter)).expect(403);
    await request(server).get(`/api/incidents/${ref}/tree`).set(auth(t.reporter)).expect(403);
    await request(server).get(`/api/incidents/${ref}/tree`).set(auth(t.auditor)).expect(403);
  });

  it('Reporter and Auditor cannot acknowledge (403)', async () => {
    await request(server).post(`/api/incidents/${ref}/ack`).set(auth(t.reporter)).send({ nodeId: firstNodeId }).expect(403);
    await request(server).post(`/api/incidents/${ref}/ack`).set(auth(t.auditor)).send({ nodeId: firstNodeId }).expect(403);
  });

  it('Member acknowledges; count increments and is idempotent', async () => {
    const a1 = await request(server)
      .post(`/api/incidents/${ref}/ack`)
      .set(auth(t.member))
      .send({ nodeId: firstNodeId })
      .expect(200);
    expect(a1.body.ackCount).toBe(1);
    const a2 = await request(server)
      .post(`/api/incidents/${ref}/ack`)
      .set(auth(t.member))
      .send({ nodeId: firstNodeId })
      .expect(200);
    expect(a2.body.ackCount).toBe(1); // idempotent — no double count
  });

  it('acknowledgement does not close the incident (ACK ≠ Close)', async () => {
    const res = await request(server).get(`/api/incidents/${ref}/tree`).set(auth(t.admin)).expect(200);
    const entry = res.body.entries.find((e: { nodeId: string }) => e.nodeId === firstNodeId);
    expect(entry.state).toBe('ACKNOWLEDGED');
    expect(entry.ackAt).toBeTruthy();
    expect(res.body.status).toBe('ACTIVE');
  });
});
