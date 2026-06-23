import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { API_KEY, bootTestApp, resetDb } from './helpers';
import { PrismaService } from '../src/prisma/prisma.service';

const describeIfDb = process.env.DATABASE_URL_TEST ? describe : describe.skip;

describeIfDb('KB (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await bootTestApp());
  });

  beforeEach(() => resetDb(prisma));
  afterAll(() => app.close());

  it('rejects requests without api key', () => {
    return request(app.getHttpServer()).get('/kb/search?q=x').expect(401);
  });

  it('creates and searches KB posts', async () => {
    await request(app.getHttpServer())
      .post('/kb/scrape')
      .set('x-api-key', API_KEY)
      .send({
        title: 'Promises',
        body: 'Promises represent future values.',
        url: 'https://example.com/promises',
        discussion: [],
        tags: ['javascript'],
        category: 'concept',
      })
      .expect(201);

    // Embedding fails on the test key, so search falls back to text search.
    const res = await request(app.getHttpServer())
      .get('/kb/search?q=Promises')
      .set('x-api-key', API_KEY)
      .expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Promises');
  });

  it('persists moderatorAnswer and tags on manual create', async () => {
    await request(app.getHttpServer())
      .post('/kb/scrape')
      .set('x-api-key', API_KEY)
      .send({
        title: 'Recursion',
        body: 'A function calling itself.',
        url: 'https://example.com/recursion',
        discussion: [],
        moderatorAnswer: 'Base case stops the recursion.',
        tags: ['algorithms', 'recursion'],
        category: 'concept',
        summary: 'Recursion basics.',
      })
      .expect(201);

    const row = await prisma.kbPost.findUnique({
      where: { url: 'https://example.com/recursion' },
    });
    expect(row?.moderatorAnswer).toBe('Base case stops the recursion.');
    expect(row?.tags).toEqual(['algorithms', 'recursion']);
    expect(row?.category).toBe('concept');
    expect(row?.summary).toBe('Recursion basics.');
  });
});
