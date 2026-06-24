import { Injectable, InternalServerErrorException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type { GenerateReplyResponse, AskRequest, AskResponse } from '@helpdesk/shared-types';
import { AppConfigService } from '../app-config/app-config.service';
import { KbService } from '../kb/kb.service';
import { KnowledgeDocsService } from '../kb/knowledge-docs.service';
import { QuestionsService } from '../questions/questions.service';
import { GenerateReplyDto } from './dto/generate-reply.dto';
import { chunkDoc } from './chunk.util';
import {
  buildPrompt,
  buildRefinePrompt,
  buildAskPrompt,
  buildAskSystem,
  ASK_WEB_SYSTEM,
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

const DOCS_CHAR_CAP = 12000;

@Injectable()
export class AiService implements OnModuleInit {
  private readonly client: OpenAI;

  constructor(
    private readonly kb: KbService,
    private readonly questions: QuestionsService,
    private readonly appConfig: AppConfigService,
    private readonly knowledgeDocs: KnowledgeDocsService,
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

  // Retrieve knowledge docs by vector top-k over their embedded chunks. Falls
  // back to text ranking over the raw docs when nothing is embedded yet (or
  // pgvector is unavailable), so un-embedded docs are never invisible.
  private async retrieveDocs(
    query: string,
    docRows: { key: string; value: string }[],
  ): Promise<{ slug: string; value: string }[]> {
    try {
      const hits = await this.knowledgeDocs.searchDocs(query, 6);
      if (hits.length) {
        const bySlug = new Map<string, string[]>();
        let used = 0;
        for (const h of hits) {
          if (used >= DOCS_CHAR_CAP) break;
          const slice = h.content.slice(0, DOCS_CHAR_CAP - used);
          if (!slice) break;
          const arr = bySlug.get(h.slug) ?? [];
          arr.push(slice);
          bySlug.set(h.slug, arr);
          used += slice.length;
        }
        return [...bySlug].map(([slug, parts]) => ({ slug, value: parts.join('\n\n') }));
      }
    } catch {
      // pgvector unavailable — fall through to text ranking.
    }
    return this.rankDocs(
      docRows.map((r) => ({ slug: r.key.replace('knowledge:', ''), value: r.value })),
      query,
    );
  }

  private rankDocs(
    docs: { slug: string; value: string }[],
    query: string,
  ): { slug: string; value: string }[] {
    const total = docs.reduce((n, d) => n + d.value.length, 0);
    if (total <= DOCS_CHAR_CAP) return docs;

    const terms = query.toLowerCase().match(/[a-z0-9]+/g) ?? [];
    const scoreOf = (text: string) => {
      const lc = text.toLowerCase();
      return terms.reduce((n, t) => (lc.includes(t) ? n + 1 : n), 0);
    };

    // Rank every chunk across all docs, then fill the budget with the most
    // relevant chunks — truncating the final chunk to fit rather than skipping.
    const chunks = docs
      .flatMap((d) => chunkDoc(d.value).map((text) => ({ slug: d.slug, text })))
      .map((c) => ({ ...c, score: scoreOf(c.text) }))
      .sort((a, b) => b.score - a.score);

    const bySlug = new Map<string, string[]>();
    let used = 0;
    for (const c of chunks) {
      if (used >= DOCS_CHAR_CAP) break;
      const slice = c.text.slice(0, DOCS_CHAR_CAP - used);
      if (!slice) break;
      const arr = bySlug.get(c.slug) ?? [];
      arr.push(slice);
      bySlug.set(c.slug, arr);
      used += slice.length;
    }

    // Nothing matched the query terms — fall back to the head of each doc so the
    // model still has something rather than empty context.
    if (used === 0) {
      const per = Math.floor(DOCS_CHAR_CAP / docs.length);
      return docs.map((d) => ({ slug: d.slug, value: d.value.slice(0, per) }));
    }
    return [...bySlug].map(([slug, parts]) => ({ slug, value: parts.join('\n\n') }));
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
    const docs = await this.retrieveDocs(query, docRows);

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
          { role: 'system', content: ASK_WEB_SYSTEM },
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
      model: 'gpt-4o',
      max_tokens: 1024,
      messages: [
        { role: 'system', content: buildAskSystem(req.replyLanguage) },
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
