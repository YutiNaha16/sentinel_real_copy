import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/http-exception.filter';
import { PrismaService } from '../src/common/prisma.service';

/**
 * Feature 011 — bulk CSV upload. Destructive by nature, so it captures the
 * current chain, tests uploads, then restores the original chain and re-links
 * the seeded Member user, leaving the DB as other suites expect.
 */
describe('CSV upload (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;
  let prisma: PrismaService;
  const password = process.env.SEED_PASSWORD || 'Passw0rd!';
  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
  const tok: Record<string, string> = {};
  let originalCsv = '';

  const HDR = 'order,name,role,email,phone,backup';
  const upload = (t: string, csv: string) =>
    request(server).post('/api/trees/it-cyber/upload').set(auth(t)).send({ csv });
  const count = async () => (await request(server).get('/api/trees/it-cyber').set(auth(tok.admin))).body.nodes.length;

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
    for (const [k, email] of Object.entries({
      admin: 'admin@sentinel.local',
      member: 'prashant@sentinel.local',
    })) {
      tok[k] = (await request(server).post('/api/auth/login').send({ email, password })).body.accessToken;
    }
    originalCsv = (await request(server).get('/api/trees/it-cyber/export.csv').set(auth(tok.admin))).text;
  });

  afterAll(async () => {
    await upload(tok.admin, originalCsv);
    const prashant = await prisma.node.findFirst({ where: { email: 'prashant.kamble@example.test', active: true } });
    if (prashant) await prisma.user.update({ where: { email: 'prashant@sentinel.local' }, data: { nodeId: prashant.id } });
    await app.close();
  });

  it('rejects invalid CSV with clear errors and changes nothing', async () => {
    const before = await count();
    await upload(tok.admin, `${HDR}\n1,Alice,Lead,not-an-email,,`).expect(400);
    await upload(tok.admin, `${HDR}\n1,Alice,Lead,alice@example.com,,Ghost`).expect(400);
    await upload(tok.admin, `${HDR}\n1,Alice,Lead,alice@example.com,,\n3,Bob,Eng,bob@example.com,,`).expect(400);
    await upload(tok.admin, `${HDR}\n,,,,`).expect(400);
    expect(await count()).toBe(before); // unchanged
  });

  it('is Admin-only', async () => {
    await upload(tok.member, `${HDR}\n1,Alice,Lead,alice@example.com,,`).expect(403);
  });

  it('a valid CSV replaces the chain atomically, resolving backups', async () => {
    const csv = `${HDR}\n1,Alice Test,Lead,alice.test@example.com,+91 1,Bob Test\n2,Bob Test,Engineer,bob.test@example.com,+91 2,`;
    const res = await upload(tok.admin, csv).expect(200);
    expect(res.body.nodes).toHaveLength(2);
    expect(res.body.nodes[0].displayName).toBe('Alice Test');
    expect(res.body.nodes[0].order).toBe(1);
    expect(res.body.nodes[0].backupName).toBe('Bob Test');
    expect(res.body.nodes[1].order).toBe(2);
  });
});
