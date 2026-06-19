import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type { GenerateReplyResponse } from '@helpdesk/shared-types';
import { AppConfigService } from '../app-config/app-config.service';
import { KbService } from '../kb/kb.service';
import { QuestionsService } from '../questions/questions.service';
import { GenerateReplyDto } from './dto/generate-reply.dto';
import { buildPrompt, buildRefinePrompt, decideMode } from './prompts';

function toPlainText(reply: string): string {
  return reply
    .replace(/```[\s\S]*?```/g, (match) => match.replace(/```[a-zA-Z0-9_-]*\n?/g, '').replace(/```/g, ''))
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .trim();
}

@Injectable()
export class AiService {
  private readonly client: OpenAI;

  constructor(
    private readonly kb: KbService,
    private readonly questions: QuestionsService,
    private readonly appConfig: AppConfigService,
    config: ConfigService,
  ) {
    const apiKey = config.get<string>('OPENAI_API_KEY');
    if (!apiKey) throw new Error('OPENAI_API_KEY missing');
    this.client = new OpenAI({ apiKey });
  }

  async generateReply(dto: GenerateReplyDto): Promise<GenerateReplyResponse> {
    const query = `${dto.postTitle}\n${dto.postBody}`;
    const [kbHits, questionHits, coreInfo, taste] = await Promise.all([
      this.kb.search(query, 5),
      this.questions.searchForPost(query, 3),
      this.appConfig.get('core_info'),
      this.appConfig.get('reply_taste'),
    ]);
    const mode = decideMode(questionHits);

    const kbForPrompt = kbHits
      .filter((hit) => hit.confidence == null || hit.confidence >= 0.6)
      .map((hit) => ({
        title: hit.title,
        content: hit.body,
        moderatorAnswer: hit.moderatorAnswer ?? null,
        moderatorVoice: hit.moderatorVoice ?? null,
      }));

    const replyTo =
      dto.replyToText && dto.replyToText.trim()
        ? { author: dto.replyToAuthor ?? 'a user', text: dto.replyToText }
        : undefined;

    const prompt = buildPrompt(
      mode,
      { title: dto.postTitle, body: dto.postBody },
      kbForPrompt,
      questionHits,
      replyTo,
      coreInfo || undefined,
      taste || undefined,
    );

    const draftResponse = await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });
    const draft = draftResponse.choices?.[0]?.message?.content;
    if (!draft) {
      throw new InternalServerErrorException('OpenAI returned no text');
    }

    const studentPost = `${dto.postTitle}\n${dto.postBody}`;
    const refinePrompt = buildRefinePrompt(draft, studentPost, taste || undefined);
    const refineResponse = await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 1024,
      messages: [{ role: 'user', content: refinePrompt }],
    });
    const refined = refineResponse.choices?.[0]?.message?.content ?? draft;

    return {
      mode,
      reply: toPlainText(refined),
      kbHits: kbHits.map((entry) => ({ id: entry.id, title: entry.title })),
      questionHits: questionHits.map((entry) => ({ id: entry.id, questionText: entry.questionText })),
    };
  }
}
