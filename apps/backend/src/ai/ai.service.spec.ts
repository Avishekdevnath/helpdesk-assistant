import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { AiService } from './ai.service';
import { KbService } from '../kb/kb.service';
import { KnowledgeDocsService } from '../kb/knowledge-docs.service';
import { QuestionsService } from '../questions/questions.service';
import { AppConfigService } from '../app-config/app-config.service';
import { NO_ANSWER_SENTINEL } from './prompts';

describe('AiService', () => {
  const kb = { search: jest.fn() };
  const questions = { search: jest.fn(), searchForPost: jest.fn() };
  const appConfig = { get: jest.fn(), listByPrefix: jest.fn() };
  const knowledgeDocs = { searchDocs: jest.fn(), embeddedSlugs: jest.fn() };
  const config = { get: (key: string) => (key === 'OPENAI_API_KEY' ? 'sk-test' : undefined) };

  let service: AiService;
  let chatCreate: jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();
    appConfig.get.mockResolvedValue('');
    appConfig.listByPrefix.mockResolvedValue([]);
    knowledgeDocs.searchDocs.mockResolvedValue([]);
    knowledgeDocs.embeddedSlugs.mockResolvedValue([]);
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
  const knowledgeDocs = { searchDocs: jest.fn(), embeddedSlugs: jest.fn() };
  const config = { get: (key: string) => (key === 'OPENAI_API_KEY' ? 'sk-test' : undefined) };

  let service: AiService;
  let chatCreate: jest.Mock;
  // Configurable per-test results for the two answer paths. The refine call
  // (gpt-4o-mini) echoes the latest question so retrieval keeps the real query.
  let composeResult: { choices: [{ message: Record<string, unknown> }] };
  let webResult: { choices: [{ message: Record<string, unknown> }] };
  // Text the streaming compose (gpt-4o stream:true) emits, one chunk per token.
  let composeStreamText: string;

  async function* streamChunks(text: string) {
    for (const piece of text.match(/\S+\s*|\s+/g) ?? []) {
      yield { choices: [{ delta: { content: piece } }] };
    }
    yield { choices: [{ delta: {} }], usage: { total_tokens: 5 } };
  }

  const reply = (content: unknown, extra: Record<string, unknown> = {}) => ({
    choices: [{ message: { content, ...extra } }] as [{ message: Record<string, unknown> }],
  });

  // Echo the last "Moderator:" line from a condense/refine prompt — simulates a
  // typo-corrected query that, in these tests, equals the original question.
  const echoRefine = (args: any) => {
    const text: string = args.messages[0].content;
    const lines = text.split('\n').filter((l) => l.startsWith('Moderator:'));
    const last = lines.length ? lines[lines.length - 1].replace('Moderator: ', '') : '';
    return reply(last);
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    appConfig.get.mockResolvedValue('');
    appConfig.listByPrefix.mockResolvedValue([]);
    knowledgeDocs.searchDocs.mockResolvedValue([]);
    composeResult = reply('answer');
    webResult = reply('web answer');
    composeStreamText = 'streamed answer';
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
    chatCreate = jest.fn().mockImplementation((args: any) => {
      if (args.model === 'gpt-4o-mini-search-preview') return Promise.resolve(webResult);
      if (args.model === 'gpt-4o' && args.stream) return Promise.resolve(streamChunks(composeStreamText));
      if (args.model === 'gpt-4o') return Promise.resolve(composeResult);
      return Promise.resolve(echoRefine(args)); // gpt-4o-mini refine/condense
    });
    (service as unknown as { client: unknown }).client = {
      chat: { completions: { create: chatCreate } },
    };
  });

  // The grounded compose call (gpt-4o) — the one carrying internal context.
  const composeCall = () =>
    chatCreate.mock.calls.find((c) => c[0].model === 'gpt-4o')?.[0];

  it('answers from internal KB without web when KB has hits', async () => {
    kb.search.mockResolvedValue([{ id: 'k1', title: 'Refunds', body: 'No refund after 7 days.' }]);
    composeResult = reply('No refund after 7 days.');

    const res = await service.ask({ messages: [{ role: 'user', content: 'refund policy?' }] });

    expect(res.usedWeb).toBe(false);
    expect(res.answer).toBe('No refund after 7 days.');
    expect(res.sources.kb).toEqual([{ id: 'k1', title: 'Refunds' }]);
    // grounded compose used, no web model
    expect(chatCreate).toHaveBeenCalledWith(expect.objectContaining({ model: 'gpt-4o' }));
    expect(chatCreate).not.toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gpt-4o-mini-search-preview' }),
    );
  });

  it('falls back to web search when KB is empty and internal context cannot answer', async () => {
    kb.search.mockResolvedValue([]);
    composeResult = reply(NO_ANSWER_SENTINEL); // grounded path gives up
    webResult = reply('According to the web, ...', {
      annotations: [{ type: 'url_citation', url_citation: { url: 'https://x.test', title: 'X' } }],
    });

    const res = await service.ask({ messages: [{ role: 'user', content: 'obscure thing?' }] });

    expect(res.usedWeb).toBe(true);
    expect(res.answer).toBe('According to the web, ...');
    expect(res.sources.web).toEqual([{ title: 'X', url: 'https://x.test' }]);
    expect(chatCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gpt-4o-mini-search-preview', web_search_options: {} }),
    );
  });

  it('does NOT leak to web for catalog questions when docs exist (KB empty)', async () => {
    kb.search.mockResolvedValue([]);
    appConfig.listByPrefix.mockResolvedValue([{ key: 'knowledge:policies', value: 'Refund window 7 days.' }]);
    composeResult = reply('We have: policies'); // grounded answers from the catalog block

    const res = await service.ask({ messages: [{ role: 'user', content: 'what docs do you have?' }] });

    expect(res.usedWeb).toBe(false);
    expect(res.answer).toBe('We have: policies');
    expect(chatCreate).not.toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gpt-4o-mini-search-preview' }),
    );
    // catalog of all docs surfaced to the grounded model
    expect(composeCall().messages.find((m: any) => m.role === 'user').content).toContain('policies');
  });

  it('returns localized refusal (no web) when KB had hits but none sufficed', async () => {
    kb.search.mockResolvedValue([{ id: 'k1', title: 'T', body: 'b' }]);
    composeResult = reply(NO_ANSWER_SENTINEL);

    const res = await service.ask({ messages: [{ role: 'user', content: 'unanswerable?' }] });

    expect(res.usedWeb).toBe(false);
    expect(res.answer).toBe('Not confirmed in internal sources.');
    expect(chatCreate).not.toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gpt-4o-mini-search-preview' }),
    );
  });

  it('refines/condenses multi-turn history before retrieval', async () => {
    kb.search.mockResolvedValue([{ id: 'k1', title: 'Exam', body: 'June 30.' }]);
    chatCreate.mockImplementation((args: any) => {
      if (args.model === 'gpt-4o') return Promise.resolve(reply('June 30.'));
      return Promise.resolve(reply('When is the C exam for batch 2026?')); // refine
    });

    await service.ask({
      messages: [
        { role: 'user', content: 'When is the C exam?' },
        { role: 'assistant', content: 'June 30.' },
        { role: 'user', content: 'what about batch 2026?' },
      ],
    });

    expect(kb.search).toHaveBeenCalledWith('When is the C exam for batch 2026?', 6);
  });

  it('refines a single misspelled question before retrieval', async () => {
    kb.search.mockResolvedValue([{ id: 'k1', title: 'Docs', body: 'b' }]);
    chatCreate.mockImplementation((args: any) => {
      if (args.model === 'gpt-4o') return Promise.resolve(reply('answer'));
      return Promise.resolve(reply('what knowledge docs do you have')); // typo-corrected
    });

    await service.ask({ messages: [{ role: 'user', content: 'what knowledge cocs has?' }] });

    expect(kb.search).toHaveBeenCalledWith('what knowledge docs do you have', 6);
  });

  it('marks usedCoreInfo and includes doc slugs in sources', async () => {
    kb.search.mockResolvedValue([{ id: 'k1', title: 'T', body: 'b' }]);
    appConfig.get.mockImplementation((k: string) => Promise.resolve(k === 'core_info' ? 'org facts' : ''));
    appConfig.listByPrefix.mockResolvedValue([{ key: 'knowledge:policies', value: 'Refund window 7 days.' }]);

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

    await service.ask({ messages: [{ role: 'user', content: 'how long is the course duration?' }] });

    const userMsg = composeCall().messages.find((m: any) => m.role === 'user').content;
    expect(userMsg).toContain('10-12 months');
    expect(userMsg).toContain('[doc:cs-fundamentals]');
  });

  it('uses vector doc search results as docs when chunks are embedded', async () => {
    kb.search.mockResolvedValue([{ id: 'k1', title: 'T', body: 'b' }]);
    knowledgeDocs.searchDocs.mockResolvedValue([
      { slug: 'cs-fundamentals', content: 'The course takes 10-12 months.', similarity: 0.7 },
    ]);

    const res = await service.ask({ messages: [{ role: 'user', content: 'how long is the course?' }] });

    expect(res.sources.docs).toEqual(['cs-fundamentals']);
    const userMsg = composeCall().messages.find((m: any) => m.role === 'user').content;
    expect(userMsg).toContain('10-12 months');
    expect(userMsg).toContain('[doc:cs-fundamentals]');
    // text fallback (listByPrefix) not consulted when vector hits exist
    expect(appConfig.listByPrefix).toHaveBeenCalled(); // still fetched in parallel, but not used for ranking
  });

  it('falls back to text ranking when vector doc search returns nothing', async () => {
    kb.search.mockResolvedValue([{ id: 'k1', title: 'T', body: 'b' }]);
    knowledgeDocs.searchDocs.mockResolvedValue([]);
    appConfig.listByPrefix.mockResolvedValue([{ key: 'knowledge:policies', value: 'Refund window 7 days.' }]);

    const res = await service.ask({ messages: [{ role: 'user', content: 'refund?' }] });

    expect(res.sources.docs).toEqual(['policies']);
  });

  it('surfaces an un-embedded doc alongside vector hits (no blind spot)', async () => {
    kb.search.mockResolvedValue([{ id: 'k1', title: 'T', body: 'b' }]);
    // one doc embedded + matched by vector, a second doc NOT embedded at all
    knowledgeDocs.searchDocs.mockResolvedValue([
      { slug: 'cs-fundamentals', content: 'Course runs 10-12 months.', similarity: 0.7 },
    ]);
    knowledgeDocs.embeddedSlugs.mockResolvedValue(['cs-fundamentals']);
    appConfig.listByPrefix.mockResolvedValue([
      { key: 'knowledge:cs-fundamentals', value: '# CS\nCourse runs 10-12 months.' },
      { key: 'knowledge:refund-policy', value: '# Refunds\nRefund window is 7 days.' },
    ]);

    const res = await service.ask({ messages: [{ role: 'user', content: 'refund window?' }] });

    // vector doc + the un-embedded doc both present
    expect(res.sources.docs).toEqual(expect.arrayContaining(['cs-fundamentals', 'refund-policy']));
    const userMsg = composeCall().messages.find((m: any) => m.role === 'user').content;
    expect(userMsg).toContain('[doc:refund-policy]');
  });

  it('includes per-doc summaries in the catalog block', async () => {
    kb.search.mockResolvedValue([{ id: 'k1', title: 'T', body: 'b' }]);
    appConfig.listByPrefix.mockResolvedValue([
      { key: 'knowledge:cs-fundamentals', value: '# CSE Fundamentals with Phitron\nbody...' },
    ]);

    await service.ask({ messages: [{ role: 'user', content: 'hi' }] });

    const userMsg = composeCall().messages.find((m: any) => m.role === 'user').content;
    expect(userMsg).toContain('cs-fundamentals — CSE Fundamentals with Phitron');
  });

  it('askStream emits grounded tokens then done', async () => {
    kb.search.mockResolvedValue([{ id: 'k1', title: 'Refunds', body: 'No refund after 7 days.' }]);
    composeStreamText = 'No refund after 7 days.';

    const events: any[] = [];
    await service.askStream({ messages: [{ role: 'user', content: 'refund?' }] }, (e) => events.push(e));

    const text = events.filter((e) => e.type === 'token').map((e) => e.text).join('');
    expect(text).toBe('No refund after 7 days.');
    expect(events.at(-1)).toMatchObject({ type: 'done', usedWeb: false });
    expect(events.some((e) => e.type === 'stage' && e.stage === 'answering')).toBe(true);
  });

  it('askStream suppresses the sentinel and falls back to web when KB empty', async () => {
    kb.search.mockResolvedValue([]);
    composeStreamText = NO_ANSWER_SENTINEL; // model gives up on internal context
    webResult = reply('From the web', { annotations: [] });

    const events: any[] = [];
    await service.askStream({ messages: [{ role: 'user', content: 'weather today?' }] }, (e) => events.push(e));

    const text = events.filter((e) => e.type === 'token').map((e) => e.text).join('');
    expect(text).not.toContain(NO_ANSWER_SENTINEL);
    expect(text).toBe('From the web');
    expect(events.some((e) => e.type === 'stage' && e.stage === 'searching_web')).toBe(true);
    expect(events.at(-1)).toMatchObject({ type: 'done', usedWeb: true });
  });
});
