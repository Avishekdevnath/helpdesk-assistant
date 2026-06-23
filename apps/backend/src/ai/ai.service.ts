import { Injectable, InternalServerErrorException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type { GenerateReplyResponse, AskRequest, AskResponse } from '@helpdesk/shared-types';
import { AppConfigService } from '../app-config/app-config.service';
import { KbService } from '../kb/kb.service';
import { QuestionsService } from '../questions/questions.service';
import { GenerateReplyDto } from './dto/generate-reply.dto';
import {
  buildPrompt,
  buildRefinePrompt,
  buildAskPrompt,
  buildCondensePrompt,
  decideMode,
  DEFAULT_IDENTITY,
  DEFAULT_REPLY_STYLE,
  DEFAULT_ASSIGNMENT_INSTRUCTION,
  DEFAULT_PRACTICE_INSTRUCTION,
  DEFAULT_REFINE_INSTRUCTIONS,
} from './prompts';

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

function buildDraftContent(prompt: string, screenshots: string[]) {
  if (!screenshots.length) return prompt;
  return [
    { type: 'text', text: prompt },
    ...screenshots.map((url) => ({ type: 'image_url', image_url: { url, detail: 'high' } })),
  ];
}

const PROMPT_DEFAULTS: Record<string, string> = {
  core_prompt: DEFAULT_IDENTITY,
  reply_style: DEFAULT_REPLY_STYLE,
  'prompt:assignment': DEFAULT_ASSIGNMENT_INSTRUCTION,
  'prompt:practice': DEFAULT_PRACTICE_INSTRUCTION,
  refine_prompt: DEFAULT_REFINE_INSTRUCTIONS,
};

const DOCS_CHAR_CAP = 6000;

@Injectable()
export class AiService implements OnModuleInit {
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

  async onModuleInit() {
    for (const [key, defaultValue] of Object.entries(PROMPT_DEFAULTS)) {
      const existing = await this.appConfig.get(key);
      if (!existing) {
        await this.appConfig.set(key, defaultValue);
      }
    }
  }

  async generateReply(dto: GenerateReplyDto): Promise<GenerateReplyResponse> {
    const query = `${dto.postTitle}\n${dto.postBody}`;
    const [
      kbHits,
      questionHits,
      identity,
      coreInfo,
      replyStyle,
      taste,
      refineInstructions,
      assignmentInstruction,
      practiceInstruction,
    ] = await Promise.all([
      this.kb.search(query, 5),
      this.questions.searchForPost(query, 3),
      this.appConfig.get('core_prompt'),
      this.appConfig.get('core_info'),
      this.appConfig.get('reply_style'),
      this.appConfig.get('taste'),
      this.appConfig.get('refine_prompt'),
      this.appConfig.get('prompt:assignment'),
      this.appConfig.get('prompt:practice'),
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
      {
        identity: identity || undefined,
        replyStyle: replyStyle || undefined,
        assignmentInstruction: assignmentInstruction || undefined,
        practiceInstruction: practiceInstruction || undefined,
        replyLanguage: dto.replyLanguage ?? 'en',
      },
    );

    const screenshots = (dto.screenshots ?? []).filter((url) => typeof url === 'string' && url.trim());
    const draftResponse = await this.client.chat.completions.create({
      model: screenshots.length ? 'gpt-4o' : 'gpt-4o-mini',
      max_tokens: 1024,
      messages: [{ role: 'user', content: buildDraftContent(prompt, screenshots) as any }],
    });
    const draft = draftResponse.choices?.[0]?.message?.content;
    if (!draft) {
      throw new InternalServerErrorException('OpenAI returned no text');
    }

    const studentPost = `${dto.postTitle}\n${dto.postBody}`;
    const refinePrompt = buildRefinePrompt(draft, studentPost, taste || undefined, refineInstructions || undefined, dto.replyLanguage ?? 'en');
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

  private rankDocs(
    docs: { slug: string; value: string }[],
    query: string,
  ): { slug: string; value: string }[] {
    const total = docs.reduce((n, d) => n + d.value.length, 0);
    if (total <= DOCS_CHAR_CAP) return docs;
    const terms = query.toLowerCase().match(/[a-z0-9]+/g) ?? [];
    const scored = docs
      .map((d) => {
        const text = d.value.toLowerCase();
        const score = terms.reduce((n, t) => (text.includes(t) ? n + 1 : n), 0);
        return { d, score };
      })
      .sort((a, b) => b.score - a.score);
    const picked: { slug: string; value: string }[] = [];
    let used = 0;
    for (const { d } of scored) {
      if (used + d.value.length > DOCS_CHAR_CAP) continue;
      picked.push(d);
      used += d.value.length;
    }
    return picked;
  }

  async ask(req: AskRequest): Promise<AskResponse> {
    const messages = req.messages ?? [];
    const last = [...messages].reverse().find((m) => m.role === 'user');
    const latest = last?.content ?? '';

    // 1. Condense multi-turn history into a standalone retrieval query.
    let query = latest;
    if (messages.length > 1) {
      const condensed = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 128,
        messages: [{ role: 'user', content: buildCondensePrompt(messages) }],
      });
      query = condensed.choices?.[0]?.message?.content?.trim() || latest;
    }

    // 2. Retrieve internal sources in parallel.
    const [kbHits, coreInfo, docRows] = await Promise.all([
      this.kb.search(query, 6),
      this.appConfig.get('core_info'),
      this.appConfig.listByPrefix('knowledge:'),
    ]);
    const docs = this.rankDocs(
      docRows.map((r) => ({ slug: r.key.replace('knowledge:', ''), value: r.value })),
      query,
    );

    const baseSources = {
      kb: kbHits.map((h) => ({ id: h.id, title: h.title })),
      docs: docs.map((d) => d.slug),
      usedCoreInfo: !!(coreInfo && coreInfo.trim()),
      web: [] as { title: string; url: string }[],
    };

    // 3. Web fallback ONLY when KB has zero hits.
    if (kbHits.length === 0) {
      const webRes = await this.client.chat.completions.create({
        model: 'gpt-4o-mini-search-preview',
        web_search_options: {},
        messages: [
          {
            role: 'user',
            content: buildAskPrompt({
              query,
              history: messages,
              kb: [],
              coreInfo: coreInfo || undefined,
              docs,
              replyLanguage: req.replyLanguage,
            }),
          },
        ],
      } as any);
      const msg = webRes.choices?.[0]?.message as any;
      const web = (msg?.annotations ?? [])
        .filter((a: any) => a.type === 'url_citation' && a.url_citation)
        .map((a: any) => ({ title: a.url_citation.title ?? a.url_citation.url, url: a.url_citation.url }));
      return {
        answer: msg?.content ?? 'No information found.',
        usedWeb: true,
        sources: { ...baseSources, web },
      };
    }

    // 4. Compose grounded answer from internal context.
    const compose = await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: buildAskPrompt({
            query,
            history: messages,
            kb: kbHits.map((h) => ({ title: h.title, body: h.body, moderatorAnswer: h.moderatorAnswer })),
            coreInfo: coreInfo || undefined,
            docs,
            replyLanguage: req.replyLanguage,
          }),
        },
      ],
    });

    return {
      answer: compose.choices?.[0]?.message?.content ?? 'No information found.',
      usedWeb: false,
      sources: baseSources,
    };
  }
}
