import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/http-exception.filter';

/**
 * Feature 009 — call-tree editing. Only ever touches an added TEST person and
 * moves it, so the 3 seeded people are left intact for other suites.
 */
describe('Call-tree editing (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;
  const password = process.env.SEED_PASSWORD || 'Passw0rd!';
  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
  const tok: Record<string, string> = {};
  let testId = '';

  const list = async () =>
    (await request(server).get('/api/trees/it-cyber').set(auth(tok.admin))).body;

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
    if (testId) await request(server).delete(`/api/trees/it-cyber/nodes/${testId}`).set(auth(tok.admin));
    await app.close();
  });

  it('adds a person at the end; validates input; non-admins blocked', async () => {
    const before = (await list()).nodes.length;
    await request(server).post('/api/trees/it-cyber/nodes').set(auth(tok.member)).send({ displayName: 'X', email: 'x@y.com' }).expect(403);
    await request(server).post('/api/trees/it-cyber/nodes').set(auth(tok.admin)).send({ displayName: 'Bad', email: 'not-an-email' }).expect(400);

    const res = await request(server)
      .post('/api/trees/it-cyber/nodes')
      .set(auth(tok.admin))
      .send({ displayName: 'Test Person', title: 'QA', email: 'test.person@example.com', phone: '+91 90000 09999' })
      .expect(201);
    expect(res.body.nodes).toHaveLength(before + 1);
    const added = res.body.nodes[res.body.nodes.length - 1];
    expect(added.displayName).toBe('Test Person');
    expect(added.order).toBe(before + 1);
    testId = added.id;
  });

  it('edits the person; rejects self-backup', async () => {
    await request(server).patch(`/api/trees/it-cyber/nodes/${testId}`).set(auth(tok.admin)).send({ backupId: testId }).expect(400);
    const res = await request(server).patch(`/api/trees/it-cyber/nodes/${testId}`).set(auth(tok.admin)).send({ title: 'Updated Title' }).expect(200);
    expect(res.body.nodes.find((n: { id: string }) => n.id === testId).title).toBe('Updated Title');
  });

  it('moves the person up then down; order stays contiguous with correct parents', async () => {
    const up = await request(server).post(`/api/trees/it-cyber/nodes/${testId}/move`).set(auth(tok.admin)).send({ direction: 'up' }).expect(200);
    const nodes = up.body.nodes as { id: string; order: number; displayName: string; parentName: string | null }[];
    // contiguous 1..N
    nodes.forEach((n, i) => expect(n.order).toBe(i + 1));
    // parents follow order (first has none)
    expect(nodes[0].parentName).toBeNull();
    for (let i = 1; i < nodes.length; i++) expect(nodes[i].parentName).toBe(nodes[i - 1].displayName);
    // move back down
    await request(server).post(`/api/trees/it-cyber/nodes/${testId}/move`).set(auth(tok.admin)).send({ direction: 'down' }).expect(200);
  });

  it('exports CSV and a sample template (Admin only)', async () => {
    const csv = await request(server).get('/api/trees/it-cyber/export.csv').set(auth(tok.admin)).expect(200);
    expect(csv.headers['content-type']).toContain('text/csv');
    expect(csv.text.split('\n')[0]).toContain('order,name,role,email,phone,backup');
    await request(server).get('/api/trees/it-cyber/template.csv').set(auth(tok.admin)).expect(200);
    await request(server).get('/api/trees/it-cyber/export.csv').set(auth(tok.member)).expect(403);
  });

  it('removes the person; the chain closes up to the original 3', async () => {
    const res = await request(server).delete(`/api/trees/it-cyber/nodes/${testId}`).set(auth(tok.admin)).expect(200);
    expect(res.body.nodes.find((n: { id: string }) => n.id === testId)).toBeUndefined();
    res.body.nodes.forEach((n: { order: number }, i: number) => expect(n.order).toBe(i + 1));
    testId = ''; // removed; afterAll no-op
    expect(res.body.nodes.length).toBe(3);
  });
});
