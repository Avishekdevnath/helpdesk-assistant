import { KnowledgeDocsService } from './knowledge-docs.service';

function makeService() {
  const prisma = {
    knowledgeDocChunk: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: `row-${data.chunkIndex}`, ...data })),
      findMany: jest.fn(),
    },
    $executeRaw: jest.fn().mockResolvedValue(1),
    $queryRaw: jest.fn(),
  };
  const embedding = { embed: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]) };
  const service = new KnowledgeDocsService(prisma as any, embedding as any);
  return { service, prisma, embedding };
}

describe('KnowledgeDocsService', () => {
  it('embedDoc chunks, embeds, replaces rows, and writes a vector per chunk', async () => {
    const { service, prisma, embedding } = makeService();
    const doc = '## Intro\nhello\n## Duration\nThe course takes 10-12 months.';

    const res = await service.embedDoc('cs-fundamentals', doc);

    expect(res).toEqual({ status: 'embedded', chunks: 2 });
    expect(embedding.embed).toHaveBeenCalledTimes(2);
    expect(prisma.knowledgeDocChunk.deleteMany).toHaveBeenCalledWith({ where: { docSlug: 'cs-fundamentals' } });
    expect(prisma.knowledgeDocChunk.create).toHaveBeenCalledTimes(2);
    // one raw UPDATE ... ::vector per chunk
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(2);
  });

  it('embedDoc returns failed without touching rows when embedding throws', async () => {
    const { service, prisma, embedding } = makeService();
    embedding.embed.mockRejectedValueOnce(new Error('openai down'));

    const res = await service.embedDoc('x', 'some content');

    expect(res).toEqual({ status: 'failed', chunks: 0 });
    expect(prisma.knowledgeDocChunk.deleteMany).not.toHaveBeenCalled();
    expect(prisma.knowledgeDocChunk.create).not.toHaveBeenCalled();
  });

  it('statusFor reports none / embedded / stale by content hash', async () => {
    const { service, prisma } = makeService();
    const doc = 'hello world';

    prisma.knowledgeDocChunk.findMany.mockResolvedValueOnce([]);
    expect(await service.statusFor('s', doc)).toBe('none');

    // Embed once to learn the real hash this doc produces.
    await service.embedDoc('s', doc);
    const storedHash = (prisma.knowledgeDocChunk.create as jest.Mock).mock.calls[0][0].data.contentHash;

    prisma.knowledgeDocChunk.findMany.mockResolvedValueOnce([{ contentHash: storedHash }]);
    expect(await service.statusFor('s', doc)).toBe('embedded');

    prisma.knowledgeDocChunk.findMany.mockResolvedValueOnce([{ contentHash: 'different' }]);
    expect(await service.statusFor('s', doc)).toBe('stale');
  });

  it('searchDocs returns hits above the similarity threshold only', async () => {
    const { service, prisma } = makeService();
    prisma.$queryRaw.mockResolvedValueOnce([
      { docSlug: 'a', content: 'relevant', similarity: 0.8 },
      { docSlug: 'b', content: 'weak', similarity: 0.2 },
    ]);

    const hits = await service.searchDocs('q', 6);

    expect(hits).toEqual([{ slug: 'a', content: 'relevant', similarity: 0.8 }]);
  });
});
