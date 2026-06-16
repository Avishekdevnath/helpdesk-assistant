import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { API_KEY, bootTestApp, resetDb } from './helpers';
import { PrismaService } from '../src/prisma/prisma.service';

const describeIfDb = process.env.DATABASE_URL_TEST ? describe : describe.skip;

describeIfDb('Questions (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await bootTestApp());
  });

  beforeEach(() => resetDb(prisma));
  afterAll(() => app.close());

  it('creates and searches question entries', async () => {
    await request(app.getHttpServer())
      .post('/questions')
      .set('x-api-key', API_KEY)
      .send({
        type: 'assignment',
        sourceDoc: 'A1.pdf',
        batch: '2026-spring',
        course: 'CS101',
        questionText: 'Implement binary search.',
        hint1: 'Think midpoint.',
        topicTags: ['binary-search'],
        difficulty: 'medium',
      })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get('/questions/search?q=binary-search')
      .set('x-api-key', API_KEY)
      .expect(200);

    expect(res.body).toHaveLength(1);
  });
});
