import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/http-exception.filter';

/** Feature 010 — notifications feed. */
describe('Notifications (e2e)', () => {
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
      reporter: 'reporter@sentinel.local',
    })) {
      tok[k] = (await request(server).post('/api/auth/login').send({ email, password })).body.accessToken;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns a merged feed, newest first, with categories', async () => {
    const res = await request(server).get('/api/notifications').set(auth(tok.admin)).expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    for (const it of res.body) {
      expect(it).toHaveProperty('at');
      expect(it).toHaveProperty('category');
      expect(it).toHaveProperty('message');
    }
    // sorted newest-first
    for (let i = 1; i < res.body.length; i++) {
      expect(new Date(res.body[i - 1].at).getTime()).toBeGreaterThanOrEqual(new Date(res.body[i].at).getTime());
    }
    expect(res.body.length).toBeLessThanOrEqual(40);
  });

  it('a Reporter sees a (scoped) feed; unauthenticated is refused', async () => {
    await request(server).get('/api/notifications').set(auth(tok.reporter)).expect(200);
    await request(server).get('/api/notifications').set(auth('bad.token')).expect(401);
  });
});
