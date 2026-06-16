import { QuestionsService } from './questions.service';

describe('QuestionsService', () => {
  const prisma = {
    questionEntry: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(() => jest.clearAllMocks());

  it('creates question entries', async () => {
    const service = new QuestionsService(prisma as never);
    await service.create({
      type: 'assignment',
      sourceDoc: 'A1.pdf',
      batch: '2026-spring',
      course: 'CS101',
      questionText: 'Implement binary search.',
      hint1: 'Think midpoint.',
      topicTags: ['binary-search'],
      difficulty: 'medium',
    });

    expect(prisma.questionEntry.create).toHaveBeenCalledWith({
      data: {
        type: 'assignment',
        sourceDoc: 'A1.pdf',
        batch: '2026-spring',
        course: 'CS101',
        questionNo: undefined,
        questionText: 'Implement binary search.',
        hint1: 'Think midpoint.',
        hint2: undefined,
        topicTags: ['binary-search'],
        difficulty: 'medium',
      },
    });
  });

  it('searches question text, metadata, and tags case-insensitively', async () => {
    const service = new QuestionsService(prisma as never);
    await service.search('recursion', 2);

    expect(prisma.questionEntry.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { questionText: { contains: 'recursion', mode: 'insensitive' } },
          { course: { contains: 'recursion', mode: 'insensitive' } },
          { batch: { contains: 'recursion', mode: 'insensitive' } },
          { topicTags: { has: 'recursion' } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 2,
    });
  });

  it('searches individual terms when the query contains post title and body text', async () => {
    const service = new QuestionsService(prisma as never);
    await service.search('promises chaining\nhelp', 3);

    expect(prisma.questionEntry.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { questionText: { contains: 'promises chaining\nhelp', mode: 'insensitive' } },
          { course: { contains: 'promises chaining\nhelp', mode: 'insensitive' } },
          { batch: { contains: 'promises chaining\nhelp', mode: 'insensitive' } },
          { topicTags: { has: 'promises chaining\nhelp' } },
          { questionText: { contains: 'promises', mode: 'insensitive' } },
          { course: { contains: 'promises', mode: 'insensitive' } },
          { batch: { contains: 'promises', mode: 'insensitive' } },
          { topicTags: { has: 'promises' } },
          { questionText: { contains: 'chaining', mode: 'insensitive' } },
          { course: { contains: 'chaining', mode: 'insensitive' } },
          { batch: { contains: 'chaining', mode: 'insensitive' } },
          { topicTags: { has: 'chaining' } },
          { questionText: { contains: 'help', mode: 'insensitive' } },
          { course: { contains: 'help', mode: 'insensitive' } },
          { batch: { contains: 'help', mode: 'insensitive' } },
          { topicTags: { has: 'help' } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });
  });

  it('searches post text without matching only course or batch metadata', async () => {
    const service = new QuestionsService(prisma as never);
    await service.searchForPost('C++ Problem\ngetchar()\ncin.ignore()\n2 tar moddhe difference ase ki', 3);

    expect(prisma.questionEntry.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { questionText: { contains: 'getchar', mode: 'insensitive' } },
          { topicTags: { has: 'getchar' } },
          { questionText: { contains: 'cin.ignore', mode: 'insensitive' } },
          { topicTags: { has: 'cin.ignore' } },
          { questionText: { contains: 'difference', mode: 'insensitive' } },
          { topicTags: { has: 'difference' } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });
  });
});
