import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { AiService } from './ai.service';
import { KbService } from '../kb/kb.service';
import { QuestionsService } from '../questions/questions.service';
import { AppConfigService } from '../app-config/app-config.service';

describe('AiService', () => {
  const kb = { search: jest.fn() };
  const questions = { search: jest.fn(), searchForPost: jest.fn() };
  const appConfig = { get: jest.fn() };
  const config = { get: (key: string) => (key === 'OPENAI_API_KEY' ? 'sk-test' : undefined) };

  let service: AiService;
  let chatCreate: jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();
    appConfig.get.mockResolvedValue('');
    const moduleRef = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: KbService, useValue: kb },
        { provide: QuestionsService, useValue: questions },
        { provide: AppConfigService, useValue: appConfig },
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
