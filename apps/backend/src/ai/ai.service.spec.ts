import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { AiService } from './ai.service';
import { KbService } from '../kb/kb.service';
import { KnowledgeDocsService } from '../kb/knowledge-docs.service';
import { QuestionsService } from '../questions/questions.service';
import { AppConfigService } from '../app-config/app-config.service';

describe('AiService', () => {
  const kb = { search: jest.fn() };
  const questions = { search: jest.fn(), searchForPost: jest.fn() };
  const appConfig = { get: jest.fn(), listByPrefix: jest.fn() };
  const knowledgeDocs = { searchDocs: jest.fn() };
  const config = { get: (key: string) => (key === 'OPENAI_API_KEY' ? 'sk-test' : undefined) };

  let service: AiService;
  let chatCreate: jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();
    appConfig.get.mockResolvedValue('');
    appConfig.listByPrefix.mockResolvedValue([]);
    knowledgeDocs.searchDocs.mockResolvedValue([]);
    const moduleRef = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: KbService, useValue: kb },
        { provide: QuestionsService, useValue: questions },
        { provide: AppConfigService, useValue: appConfig },
        { provide: KnowledgeDocsService, useValue: knowledgeDocs },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = moduleRef.get(AiService);
    chatCreate = jest.fn().mockResolvedValue({
      choices: [{ message: { content: 'reply text' } }],
    });
    (service as unknown as { client: unknown }).client = {
      chat: {
        completions: {
          create: chatCreate,
        },
      },
    };
  });

  it('returns full_answer when no question hits exist', async () => {
    kb.search.mockResolvedValue([]);
    questions.searchForPost.mockResolvedValue([]);

    const res = await service.generateReply({ postTitle: 't', postBody: 'b' });

    expect(res.mode).toBe('full_answer');
    expect(res.reply).toBe('reply text');
  });

  it('returns assignment hint mode when an assignment hit exists', async () => {
    kb.search.mockResolvedValue([]);
    questions.searchForPost.mockResolvedValue([{ id: 'q1', type: 'assignment', questionText: 'x', hint1: 'h' }]);

    const res = await service.generateReply({ postTitle: 't', postBody: 'b' });

    expect(res.mode).toBe('hint_assignment');
    expect(res.questionHits).toEqual([{ id: 'q1', questionText: 'x' }]);
  });

  it('returns plain text when the model includes markdown formatting', async () => {
    kb.search.mockResolvedValue([]);
    questions.searchForPost.mockResolvedValue([]);
    chatCreate.mockResolvedValue({
      choices: [{ message: { content: 'Please use Contact with Instructor here, not **Discord**.' } }],
    });

    const res = await service.generateReply({ postTitle: 'Contact', postBody: 'Need mentor contact' });

    expect(res.reply).toBe('Please use Contact with Instructor here, not Discord.');
  });

  it('uses strict post matching for question hits', async () => {
    kb.search.mockResolvedValue([]);
    questions.searchForPost.mockResolvedValue([]);

    await service.generateReply({ postTitle: 'C++ Problem', postBody: 'getchar() cin.ignore() difference ki' });

    expect(questions.searchForPost).toHaveBeenCalledWith('C++ Problem\ngetchar() cin.ignore() difference ki', 3);
    expect(questions.search).not.toHaveBeenCalled();
  });

  it('sends screenshots as vision inputs for the draft step', async () => {
    kb.search.mockResolvedValue([]);
    questions.searchForPost.mockResolvedValue([]);
    const screenshot = 'data:image/jpeg;base64,abc123';

    await service.generateReply({ postTitle: 'Image issue', postBody: 'See attached', screenshots: [screenshot] } as any);

    expect(chatCreate).toHaveBeenNthCalledWith(1, expect.objectContaining({
      model: 'gpt-4o',
      messages: [
        expect.objectContaining({
          role: 'user',
          content: expect.arrayContaining([
            expect.objectContaining({ type: 'text', text: expect.stringContaining('Image issue') }),
            { type: 'image_url', image_url: { url: screenshot, detail: 'high' } },
          ]),
        }),
      ],
    }));
  });
});

describe('ask', () => {
  const kb = { search: jest.fn(), searchForPost: jest.fn() };
  const questions = { search: jest.fn(), searchForPost: jest.fn() };
  const appConfig = { get: jest.fn(), listByPrefix: jest.fn() };
  const knowledgeDocs = { searchDocs: jest.fn() };
  const config = { get: (key: string) => (key === 'OPENAI_API_KEY' ? 'sk-test' : undefined) };

  let service: AiService;
  let chatCreate: jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();
    appConfig.get.mockResolvedValue('');
    appConfig.listByPrefix.mockResolvedValue([]);
    knowledgeDocs.searchDocs.mockResolvedValue([]);
    const moduleRef = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: KbService, useValue: kb },
        { provide: QuestionsService, useValue: questions },
        { provide: AppConfigService, useValue: appConfig },
        { provide: KnowledgeDocsService, useValue: knowledgeDocs },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();
    service = moduleRef.get(AiService);
    chatCreate = jest.fn().mockResolvedValue({ choices: [{ message: { content: 'answer' } }] });
    (service as unknown as { client: unknown }).client = {
      chat: { completions: { create: chatCreate } },
    };
  });

  it('answers from internal KB without web when KB has hits', async () => {
    kb.search.mockResolvedValue([{ id: 'k1', title: 'Refunds', body: 'No refund after 7 days.' }]);
    chatCreate.mockResolvedValue({ choices: [{ message: { content: 'No refund after 7 days.' } }] });

    const res = await service.ask({ messages: [{ role: 'user', content: 'refund policy?' }] });

    expect(res.usedWeb).toBe(false);
    expect(res.answer).toBe('No refund after 7 days.');
    expect(res.sources.kb).toEqual([{ id: 'k1', title: 'Refunds' }]);
    expect(chatCreate).toHaveBeenCalledTimes(1);
    expect(chatCreate).toHaveBeenCalledWith(expect.objectContaining({ model: 'gpt-4o' }));
  });

  it('falls back to web search when KB has zero hits', async () => {
    kb.search.mockResolvedValue([]);
    chatCreate.mockResolvedValue({
      choices: [{
        message: {
          content: 'According to the web, ...',
          annotations: [{ type: 'url_citation', url_citation: { url: 'https://x.test', title: 'X' } }],
        },
      }],
    });

    const res = await service.ask({ messages: [{ role: 'user', content: 'obscure thing?' }] });

    expect(res.usedWeb).toBe(true);
    expect(res.sources.web).toEqual([{ title: 'X', url: 'https://x.test' }]);
    expect(chatCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gpt-4o-mini-search-preview', web_search_options: {} }),
    );
  });

  it('condenses multi-turn history before retrieval', async () => {
    kb.search.mockResolvedValue([{ id: 'k1', title: 'Exam', body: 'June 30.' }]);
    chatCreate
      .mockResolvedValueOnce({ choices: [{ message: { content: 'When is the C exam for batch 2026?' } }] })
      .mockResolvedValueOnce({ choices: [{ message: { content: 'June 30.' } }] });

    await service.ask({
      messages: [
        { role: 'user', content: 'When is the C exam?' },
        { role: 'assistant', content: 'June 30.' },
        { role: 'user', content: 'what about batch 2026?' },
      ],
    });

    expect(kb.search).toHaveBeenCalledWith('When is the C exam for batch 2026?', 6);
    expect(chatCreate).toHaveBeenCalledTimes(2);
  });

  it('marks usedCoreInfo and includes doc slugs in sources', async () => {
    kb.search.mockResolvedValue([{ id: 'k1', title: 'T', body: 'b' }]);
    appConfig.get.mockImplementation((k: string) => Promise.resolve(k === 'core_info' ? 'org facts' : ''));
    appConfig.listByPrefix.mockResolvedValue([{ key: 'knowledge:policies', value: 'Refund window 7 days.' }]);
    chatCreate.mockResolvedValue({ choices: [{ message: { content: 'answer' } }] });

    const res = await service.ask({ messages: [{ role: 'user', content: 'refund?' }] });

    expect(res.sources.usedCoreInfo).toBe(true);
    expect(res.sources.docs).toEqual(['policies']);
  });

  it('still retrieves a knowledge doc larger than the char cap (no silent drop)', async () => {
    kb.search.mockResolvedValue([{ id: 'k1', title: 'T', body: 'b' }]);
    appConfig.get.mockResolvedValue('');
    // ~25k-char doc, well over DOCS_CHAR_CAP, with the answer in one section.
    const bigDoc = [
      '## Intro\n' + 'x'.repeat(12000),
      '## Course duration\nThe CS fundamentals course takes about 10-12 months.',
      '## Contact\n' + 'y'.repeat(12000),
    ].join('\n');
    appConfig.listByPrefix.mockResolvedValue([{ key: 'knowledge:cs-fundamentals', value: bigDoc }]);
    chatCreate.mockResolvedValue({ choices: [{ message: { content: 'answer' } }] });

    await service.ask({ messages: [{ role: 'user', content: 'how long is the course duration?' }] });

    const userMsg = chatCreate.mock.calls[0][0].messages.find((m: any) => m.role === 'user').content;
    expect(userMsg).toContain('10-12 months');
    expect(userMsg).toContain('[doc:cs-fundamentals]');
  });

  it('uses vector doc search results as docs when chunks are embedded', async () => {
    kb.search.mockResolvedValue([{ id: 'k1', title: 'T', body: 'b' }]);
    knowledgeDocs.searchDocs.mockResolvedValue([
      { slug: 'cs-fundamentals', content: 'The course takes 10-12 months.', similarity: 0.7 },
    ]);
    chatCreate.mockResolvedValue({ choices: [{ message: { content: 'answer' } }] });

    const res = await service.ask({ messages: [{ role: 'user', content: 'how long is the course?' }] });

    expect(res.sources.docs).toEqual(['cs-fundamentals']);
    const userMsg = chatCreate.mock.calls[0][0].messages.find((m: any) => m.role === 'user').content;
    expect(userMsg).toContain('10-12 months');
    expect(userMsg).toContain('[doc:cs-fundamentals]');
    // text fallback (listByPrefix) not consulted when vector hits exist
    expect(appConfig.listByPrefix).toHaveBeenCalled(); // still fetched in parallel, but not used for ranking
  });

  it('falls back to text ranking when vector doc search returns nothing', async () => {
    kb.search.mockResolvedValue([{ id: 'k1', title: 'T', body: 'b' }]);
    knowledgeDocs.searchDocs.mockResolvedValue([]);
    appConfig.listByPrefix.mockResolvedValue([{ key: 'knowledge:policies', value: 'Refund window 7 days.' }]);
    chatCreate.mockResolvedValue({ choices: [{ message: { content: 'answer' } }] });

    const res = await service.ask({ messages: [{ role: 'user', content: 'refund?' }] });

    expect(res.sources.docs).toEqual(['policies']);
  });
});
