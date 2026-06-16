import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { AiService } from './ai.service';
import { KbService } from '../kb/kb.service';
import { QuestionsService } from '../questions/questions.service';

describe('AiService', () => {
  const kb = { search: jest.fn() };
  const questions = { search: jest.fn(), searchForPost: jest.fn() };
  const config = { get: (key: string) => (key === 'OPENAI_API_KEY' ? 'sk-test' : undefined) };

  let service: AiService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: KbService, useValue: kb },
        { provide: QuestionsService, useValue: questions },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = moduleRef.get(AiService);
    (service as unknown as { client: unknown }).client = {
      responses: {
        create: jest.fn().mockResolvedValue({
          output_text: 'reply text',
        }),
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
    ((service as unknown as { client: { responses: { create: jest.Mock } } }).client.responses.create).mockResolvedValue({
      output_text: 'ভাই, **Contact with Instructor** টাইপ পোস্ট এখানে করবেন না।',
    });

    const res = await service.generateReply({ postTitle: 'Contact', postBody: 'Need mentor contact' });

    expect(res.reply).toBe('ভাই, Contact with Instructor টাইপ পোস্ট এখানে করবেন না।');
  });

  it('uses strict post matching for question hits', async () => {
    kb.search.mockResolvedValue([]);
    questions.searchForPost.mockResolvedValue([]);

    await service.generateReply({ postTitle: 'C++ Problem', postBody: 'getchar() cin.ignore() difference ki' });

    expect(questions.searchForPost).toHaveBeenCalledWith('C++ Problem\ngetchar() cin.ignore() difference ki', 3);
    expect(questions.search).not.toHaveBeenCalled();
  });
});
