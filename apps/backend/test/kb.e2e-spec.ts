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
    return request(app.getHttpServer()).get('/kb').expect(401);
  });

  it('creates and searches KB entries', async () => {
    await request(app.getHttpServer())
      .post('/kb')
      .set('x-api-key', API_KEY)
      .send({
        title: 'Promises',
        content: 'Promises represent future values.',
        tags: ['javascript'],
        source: 'manual',
        createdBy: 'mod',
      })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get('/kb/search?q=Promises')
      .set('x-api-key', API_KEY)
      .expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Promises');
  });
});
