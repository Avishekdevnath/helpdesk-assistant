import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { Prisma } from '.prisma/helpdesk-client';
import { PrismaService } from '../prisma/prisma.service';
import { EmbeddingService } from './embedding.service';

interface ScrapData {
  title: string;
  body: string;
  discussion: any[];
  url: string;
  course?: string;
  batch?: string;
  fullContent?: string;
}

interface ExtractInput {
  title: string;
  body: string;
  url: string;
  status?: string;
  course?: string;
  batch?: string;
  discussion: any[]; // { author, role, text, timestamp? }
  attributes?: Record<string, any>;
  fullContent?: string;
  screenshots?: string[]; // dataURLs (vision, Phase 3)
}

interface Extraction {
  savable: boolean;
  question: string;
  answer: string;
  summary: string;
  tags: string[];
  category: string;
  confidence: 'high' | 'medium' | 'low';
  moderatorVoice: string;
}

export interface KbSearchHit {
  id: string;
  title: string;
  body: string;
  moderatorAnswer: string | null;
  moderatorVoice?: string | null;
  summary?: string | null;
  category?: string | null;
  confidence?: number | null;
  similarity?: number;
}

// Drop vector hits below this cosine similarity — keeps irrelevant KB context
// out of the prompt so the model says "not confirmed" instead of hallucinating.
// Kept moderate (not 0.5) because Banglish↔Bengali cross-script pairs score lower.
const SIMILARITY_THRESHOLD = 0.35;

@Injectable()
export class KbService {
  private readonly openaiClient: OpenAI;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
    private readonly embedding: EmbeddingService,
  ) {
    const apiKey = config.get<string>('OPENAI_API_KEY');
    if (!apiKey) throw new Error('OPENAI_API_KEY missing');
    this.openaiClient = new OpenAI({ apiKey });
  }

  private extractModeratorAnswer(discussion: any[]): string | null {
    const entry = discussion.find((d) => d.role === 'moderator' || d.role === 'admin');
    return entry?.text?.trim() || null;
  }

  async scrapPost(data: ScrapData) {
    const moderatorAnswer = this.extractModeratorAnswer(data.discussion ?? []);
    const embedText = `${data.title}\n${data.body}`;

    // Embed in parallel with DB write — DB write never blocked by OpenAI
    const fields = {
      title: data.title,
      body: data.body,
      discussion: data.discussion as Prisma.InputJsonValue,
      course: data.course,
      batch: data.batch,
      rawContent: data.fullContent,
      moderatorAnswer,
      metadata: {} as Prisma.InputJsonValue,
    };
    const [post, vec] = await Promise.allSettled([
      this.prisma.kbPost.upsert({
        where: { url: data.url },
        create: { url: data.url, ...fields },
        update: fields,
      }),
      this.embedding.embed(embedText),
    ]);

    if (post.status === 'rejected') throw post.reason;
    const saved = (post as PromiseFulfilledResult<any>).value;

    // Write embedding if available — silently skip on error
    if (vec.status === 'fulfilled') {
      const vector = `[${(vec as PromiseFulfilledResult<number[]>).value.join(',')}]`;
      await this.prisma.$executeRaw`
        UPDATE kb_posts SET embedding = ${vector}::vector WHERE id = ${saved.id}
      `;
    }

    return { id: saved.id, message: 'Post saved to KB', post: saved };
  }

  private confidenceToNumber(c: string): number {
    return c === 'high' ? 0.9 : c === 'medium' ? 0.6 : 0.3;
  }

  private hasModerator(discussion: any[]): boolean {
    return (discussion ?? []).some((d) => d?.role === 'moderator' || d?.role === 'admin');
  }

  // AI reads the full thread (+ optional screenshots) and extracts one reusable Q&A.
  private async aiExtract(data: ExtractInput): Promise<Extraction> {
    const thread = (data.discussion ?? [])
      .map((d) => `[${d.role ?? 'user'}] ${d.author ?? ''}: ${d.text ?? ''}`)
      .join('\n');
    const attrs = data.attributes ? JSON.stringify(data.attributes) : '{}';

    const system = [
      'You curate a helpdesk knowledge base for Phitron (a Bangladeshi edutech).',
      'Read the full post thread and extract ONE reusable Q&A.',
      'Rules:',
      '- answer: write in Bengali using Bangla script (বাংলা হরফ), NOT romanized Banglish. English only for technical terms.',
      '- answer must come ONLY from the thread (especially the moderator/admin reply). Never invent facts, dates, or schedules.',
      '- moderatorVoice: the moderator/admin reply text VERBATIM (keep their exact phrasing and tone, even if Banglish).',
      '- savable=false if there is no real confirmed answer from a moderator/admin.',
      '- summary: one short line. category: one of assignment | concept | logistics | tooling | account | other.',
      '- confidence: high if a moderator gave a clear final answer; medium if partial; low if unsure.',
      'Return ONLY JSON: { savable, question, answer, summary, tags (string[]), category, confidence (high|medium|low), moderatorVoice }.',
    ].join('\n');

    const user = [
      `Title: ${data.title}`,
      `Body: ${data.body}`,
      `Attributes: ${attrs}`,
      `Status: ${data.status ?? ''}`,
      `Thread:\n${thread || '(no comments)'}`,
    ].join('\n\n');

    const content: any[] = [{ type: 'text', text: user }];
    for (const url of data.screenshots ?? []) {
      content.push({ type: 'image_url', image_url: { url, detail: 'high' } });
    }

    const res = await this.openaiClient.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.2,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: content as any },
      ],
    });

    const text = res.choices?.[0]?.message?.content;
    if (!text) throw new InternalServerErrorException('AI extract returned no content');
    const parsed = JSON.parse(text);
    return {
      savable: !!parsed.savable,
      question: String(parsed.question ?? data.title ?? '').trim(),
      answer: String(parsed.answer ?? '').trim(),
      summary: String(parsed.summary ?? '').trim(),
      tags: Array.isArray(parsed.tags) ? parsed.tags.map((t: any) => String(t)).slice(0, 12) : [],
      category: String(parsed.category ?? 'other').trim(),
      confidence: ['high', 'medium', 'low'].includes(parsed.confidence) ? parsed.confidence : 'low',
      moderatorVoice: String(parsed.moderatorVoice ?? '').trim(),
    };
  }

  // Gate -> AI extract -> upsert by url -> embed.
  async extractAndSave(data: ExtractInput) {
    const resolved = (data.status ?? '').trim().toLowerCase() === 'resolved';
    if (!resolved) return { saved: false, reason: 'gate: status is not Resolved' };
    if (!this.hasModerator(data.discussion)) return { saved: false, reason: 'gate: no moderator/admin reply' };

    const ex = await this.aiExtract(data);
    if (!ex.savable || !ex.answer) return { saved: false, reason: 'ai: no confirmed answer' };

    const confidence = this.confidenceToNumber(ex.confidence);
    // Include the raw (often Banglish) student title+body so Banglish queries
    // match — the AI fields are Bengali script and miss cross-script otherwise.
    const embedText = `${data.title}\n${data.body}\n${ex.question}\n${ex.answer}\n${ex.summary}`;

    const fields = {
      title: data.title,
      body: data.body,
      course: data.course,
      batch: data.batch,
      discussion: (data.discussion ?? []) as Prisma.InputJsonValue,
      rawContent: data.fullContent,
      status: data.status,
      moderatorAnswer: ex.answer,
      moderatorVoice: ex.moderatorVoice,
      summary: ex.summary,
      category: ex.category,
      tags: ex.tags,
      confidence,
      metadata: (data.attributes ?? {}) as Prisma.InputJsonValue,
    };

    const [saved, vec] = await Promise.allSettled([
      this.prisma.kbPost.upsert({
        where: { url: data.url },
        create: { url: data.url, ...fields },
        update: fields,
      }),
      this.embedding.embed(embedText),
    ]);

    if (saved.status === 'rejected') throw saved.reason;
    const row = (saved as PromiseFulfilledResult<any>).value;

    if (vec.status === 'fulfilled') {
      const vector = `[${(vec as PromiseFulfilledResult<number[]>).value.join(',')}]`;
      await this.prisma.$executeRaw`
        UPDATE kb_posts SET embedding = ${vector}::vector WHERE id = ${row.id}
      `;
    }

    return {
      saved: true,
      id: row.id,
      extraction: {
        question: ex.question,
        summary: ex.summary,
        category: ex.category,
        tags: ex.tags,
        confidence: ex.confidence,
      },
    };
  }

  async vectorSearch(query: string, limit: number): Promise<KbSearchHit[]> {
    const vec = await this.embedding.embed(query);
    const vector = `[${vec.join(',')}]`;
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT id, title, body, moderator_answer AS "moderatorAnswer",
             moderator_voice AS "moderatorVoice", summary, category, confidence,
             1 - (embedding <=> ${vector}::vector) AS similarity
      FROM kb_posts
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> ${vector}::vector
      LIMIT ${limit}
    `;
    return rows
      .map((r) => ({
        id: r.id,
        title: r.title,
        body: r.body,
        moderatorAnswer: r.moderatorAnswer ?? null,
        moderatorVoice: r.moderatorVoice ?? null,
        summary: r.summary ?? null,
        category: r.category ?? null,
        confidence: r.confidence ?? null,
        similarity: typeof r.similarity === 'number' ? r.similarity : Number(r.similarity),
      }))
      .filter((r) => (r.similarity ?? 0) >= SIMILARITY_THRESHOLD);
  }

  // Falls back to text search when pgvector unavailable
  async search(query: string, limit: number): Promise<KbSearchHit[]> {
    try {
      return await this.vectorSearch(query, limit);
    } catch {
      const rows = await this.prisma.kbPost.findMany({
        where: {
          OR: [
            { title: { contains: query.slice(0, 200), mode: 'insensitive' } },
            { body: { contains: query.slice(0, 200), mode: 'insensitive' } },
          ],
        },
        take: limit,
        select: {
          id: true,
          title: true,
          body: true,
          moderatorAnswer: true,
          moderatorVoice: true,
          summary: true,
          category: true,
          confidence: true,
        },
      });
      return rows;
    }
  }

  async getAllPosts(limit = 50, offset = 0) {
    return this.prisma.kbPost.findMany({
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
    });
  }

  // Slim list of every saved url — batch agent's skip-set source.
  async getAllUrls(): Promise<string[]> {
    const rows = await this.prisma.kbPost.findMany({ select: { url: true } });
    return rows.map((r) => r.url);
  }

  async getPostById(id: string) {
    return this.prisma.kbPost.findUnique({ where: { id } });
  }

  async updatePost(
    id: string,
    data: Partial<{
      moderatorAnswer: string;
      moderatorVoice: string;
      summary: string;
      category: string;
      tags: string[];
      status: string;
    }>,
  ) {
    const row = await this.prisma.kbPost.update({ where: { id }, data });

    // Re-embed if answer/summary changed (they feed the embedding text).
    if (data.moderatorAnswer !== undefined || data.summary !== undefined) {
      try {
        const embedText = `${row.title}\n${row.body}\n${row.moderatorAnswer ?? ''}\n${row.summary ?? ''}`;
        const vec = await this.embedding.embed(embedText);
        const vector = `[${vec.join(',')}]`;
        await this.prisma.$executeRaw`
          UPDATE kb_posts SET embedding = ${vector}::vector WHERE id = ${row.id}
        `;
      } catch {
        // best-effort re-embed; row already updated
      }
    }
    return row;
  }

  async deletePost(id: string) {
    return this.prisma.kbPost.delete({ where: { id } });
  }

  async getStats() {
    const total = await this.prisma.kbPost.count();
    const byCourse = await this.prisma.kbPost.groupBy({ by: ['course'], _count: true });
    return { total, byCourse: byCourse.filter((c) => c.course) };
  }

  // Parse markdown into sections (split on ## headings) and upsert each as a KB entry.
  // Each section becomes: title = heading text, body = section content.
  // URL is auto-generated as internal://<slug>-<hash> so re-imports update rather than duplicate.
  async importMarkdown(markdown: string, category?: string): Promise<{ imported: number; entries: string[] }> {
    const sections = this.parseMarkdownSections(markdown);
    if (!sections.length) return { imported: 0, entries: [] };

    const titles: string[] = [];
    for (const section of sections) {
      const slug = section.title
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .slice(0, 60);
      // Stable hash from slug so re-import of same title = same URL = upsert
      const hash = this.simpleHash(slug);
      const url = `internal://${slug}-${hash}`;

      const fields = {
        title: section.title,
        body: section.body,
        discussion: [] as Prisma.InputJsonValue,
        category: category ?? null,
        metadata: {} as Prisma.InputJsonValue,
      };

      const row = await this.prisma.kbPost.upsert({
        where: { url },
        create: { url, ...fields },
        update: fields,
      });

      try {
        const vec = await this.embedding.embed(`${section.title}\n${section.body}`);
        const vector = `[${vec.join(',')}]`;
        await this.prisma.$executeRaw`
          UPDATE kb_posts SET embedding = ${vector}::vector WHERE id = ${row.id}
        `;
      } catch {
        // best-effort embed
      }

      titles.push(section.title);
    }

    return { imported: titles.length, entries: titles };
  }

  private parseMarkdownSections(md: string): { title: string; body: string }[] {
    const lines = md.split('\n');
    const sections: { title: string; body: string }[] = [];
    let current: { title: string; lines: string[] } | null = null;

    for (const line of lines) {
      const headingMatch = /^#{1,3}\s+(.+)/.exec(line);
      if (headingMatch) {
        if (current) {
          const body = current.lines.join('\n').trim();
          if (body) sections.push({ title: current.title, body });
        }
        current = { title: headingMatch[1].trim(), lines: [] };
      } else if (current) {
        current.lines.push(line);
      }
    }
    if (current) {
      const body = current.lines.join('\n').trim();
      if (body) sections.push({ title: current.title, body });
    }

    return sections;
  }

  private simpleHash(str: string): string {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    }
    return Math.abs(h).toString(36).slice(0, 6);
  }
}
