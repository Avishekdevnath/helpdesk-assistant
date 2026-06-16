import { EmbeddingService } from './embedding.service';

const mockClient = {
  embeddings: {
    create: jest.fn().mockResolvedValue({
      data: [{ embedding: new Array(1536).fill(0.1) }],
    }),
  },
};

describe('EmbeddingService', () => {
  let svc: EmbeddingService;

  beforeEach(() => {
    jest.clearAllMocks();
    svc = new EmbeddingService({ get: (k: string) => (k === 'OPENAI_API_KEY' ? 'sk-test' : undefined) } as any);
    (svc as any).client = mockClient;
  });

  it('returns 1536-length vector', async () => {
    const vec = await svc.embed('hello world');
    expect(vec).toHaveLength(1536);
    expect(mockClient.embeddings.create).toHaveBeenCalledWith({
      model: 'text-embedding-3-small',
      input: 'hello world',
    });
  });

  it('truncates input to 8000 chars', async () => {
    const long = 'a'.repeat(10000);
    await svc.embed(long);
    const call = mockClient.embeddings.create.mock.calls[0][0];
    expect(call.input.length).toBeLessThanOrEqual(8000);
  });
});
