import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { AiService } from '../src/ai/ai.service';
import { API_KEY, bootTestApp, resetDb } from './helpers';
import { PrismaService } from '../src/prisma/prisma.service';

const describeIfDb = process.env.DATABASE_URL_TEST ? describe : describe.skip;

describeIfDb('AI (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await bootTestApp());
    const ai = app.get(AiService);
    // generateReply calls client.chat.completions.create twice (draft + refine),
    // each reading choices[0].message.content.
    (ai as unknown as { client: unknown }).client = {
      chat: {
        completions: {
          create: jest
            .fn()
            .mockResolvedValue({ choices: [{ message: { content: 'mocked reply' } }] }),
        },
      },
    };
  });

  beforeEach(() => resetDb(prisma));
  afterAll(() => app.close());

  it('returns full_answer mode and reply', async () => {
    const res = await request(app.getHttpServer())
      .post('/ai/generate-reply')
      .set('x-api-key', API_KEY)
      .send({ postTitle: 'How do promises work?', postBody: 'I am confused.' })
      .expect(201);

    expect(res.body.mode).toBe('full_answer');
    expect(res.body.reply).toBe('mocked reply');
  });

  it('returns hint_assignment when a matching assignment exists', async () => {
    await prisma.questionEntry.create({
      data: {
        type: 'assignment',
        sourceDoc: 'A1',
        batch: 'b1',
        course: 'c1',
        questionText: 'Promises chaining homework',
        hint1: 'Start with then().',
        topicTags: ['promises'],
        difficulty: 'medium',
      },
    });

    const res = await request(app.getHttpServer())
      .post('/ai/generate-reply')
      .set('x-api-key', API_KEY)
      .send({ postTitle: 'promises chaining', postBody: 'help' })
      .expect(201);

    expect(res.body.mode).toBe('hint_assignment');
  });
});
