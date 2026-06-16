import { Injectable } from '@nestjs/common';
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

export interface KbSearchHit {
  id: string;
  title: string;
  body: string;
  moderatorAnswer: string | null;
}

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
    const [post, vec] = await Promise.allSettled([
      this.prisma.kbPost.create({
        data: {
          title: data.title,
          body: data.body,
          discussion: data.discussion as Prisma.InputJsonValue,
          url: data.url,
          course: data.course,
          batch: data.batch,
          rawContent: data.fullContent,
          moderatorAnswer,
          metadata: {} as Prisma.InputJsonValue,
        },
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

  async vectorSearch(query: string, limit: number): Promise<KbSearchHit[]> {
    const vec = await this.embedding.embed(query);
    const vector = `[${vec.join(',')}]`;
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT id, title, body, moderator_answer AS "moderatorAnswer",
             1 - (embedding <=> ${vector}::vector) AS similarity
      FROM kb_posts
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> ${vector}::vector
      LIMIT ${limit}
    `;
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      body: r.body,
      moderatorAnswer: r.moderatorAnswer ?? null,
    }));
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
        select: { id: true, title: true, body: true, moderatorAnswer: true },
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

  async getPostById(id: string) {
    return this.prisma.kbPost.findUnique({ where: { id } });
  }

  async deletePost(id: string) {
    return this.prisma.kbPost.delete({ where: { id } });
  }

  async getStats() {
    const total = await this.prisma.kbPost.count();
    const byCourse = await this.prisma.kbPost.groupBy({ by: ['course'], _count: true });
    return { total, byCourse: byCourse.filter((c) => c.course) };
  }
}
