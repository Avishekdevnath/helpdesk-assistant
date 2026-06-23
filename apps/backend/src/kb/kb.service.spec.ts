import { KbService } from './kb.service';
import { EmbeddingService } from './embedding.service';

const mockEmbed = jest.fn().mockResolvedValue(new Array(1536).fill(0.1));
const mockEmbeddingService = { embed: mockEmbed } as unknown as EmbeddingService;

const mockUpsert = jest.fn().mockResolvedValue({ id: 'abc', title: 'test', body: 'body' });
const mockExecuteRaw = jest.fn().mockResolvedValue(1);
const mockQueryRaw = jest.fn().mockResolvedValue([
  { id: 'abc', title: 'test', body: 'body', moderatorAnswer: 'answer', similarity: 0.9 },
]);
const mockPrisma = {
  kbPost: { upsert: mockUpsert, findMany: jest.fn().mockResolvedValue([]) },
  $executeRaw: mockExecuteRaw,
  $queryRaw: mockQueryRaw,
} as any;

describe('KbService', () => {
  let svc: KbService;

  beforeEach(() => {
    jest.clearAllMocks();
    svc = new KbService(
      mockPrisma,
      { get: (k: string) => (k === 'OPENAI_API_KEY' ? 'sk-test' : undefined) } as any,
      mockEmbeddingService,
    );
  });

  it('embeds and saves moderatorAnswer on scrapPost', async () => {
    await svc.scrapPost({
      title: 'C++ question',
      body: 'What is getchar?',
      discussion: [{ author: 'Moderator', role: 'moderator', text: 'getchar reads one char' }],
      url: 'https://example.com',
    });
    expect(mockEmbed).toHaveBeenCalled();
    const upsertArg = mockUpsert.mock.calls[0][0];
    expect(upsertArg.create.moderatorAnswer).toBe('getchar reads one char');
  });

  it('returns empty array without throwing when no rows', async () => {
    mockQueryRaw.mockResolvedValueOnce([]);
    const hits = await svc.vectorSearch('some query', 5);
    expect(hits).toEqual([]);
  });

  it('vectorSearch returns results with moderatorAnswer', async () => {
    const hits = await svc.vectorSearch('getchar', 5);
    expect(hits[0].moderatorAnswer).toBe('answer');
  });
});
