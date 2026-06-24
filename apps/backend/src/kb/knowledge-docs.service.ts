import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmbeddingService } from './embedding.service';
import { chunkDoc } from '../ai/chunk.util';

export type DocEmbedStatus = 'embedded' | 'stale' | 'failed' | 'none';

export interface DocSearchHit {
  slug: string;
  content: string;
  similarity: number;
}

// Drop chunk hits below this cosine similarity — mirrors KB vector search.
const SIMILARITY_THRESHOLD = 0.35;

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

@Injectable()
export class KnowledgeDocsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embedding: EmbeddingService,
  ) {}

  // Chunk a doc, embed each chunk, and replace its stored chunk rows. Synchronous
  // by design (the save endpoint awaits this). Embedding failures are surfaced as
  // status 'failed' rather than silently swallowed, and leave prior rows intact.
  async embedDoc(slug: string, value: string): Promise<{ status: DocEmbedStatus; chunks: number }> {
    const hash = sha256(value);
    const chunks = chunkDoc(value);

    try {
      const vectors = await Promise.all(chunks.map((c) => this.embedding.embed(c)));
      await this.prisma.knowledgeDocChunk.deleteMany({ where: { docSlug: slug } });
      for (let i = 0; i < chunks.length; i++) {
        const row = await this.prisma.knowledgeDocChunk.create({
          data: { docSlug: slug, chunkIndex: i, content: chunks[i], contentHash: hash },
        });
        const vector = `[${vectors[i].join(',')}]`;
        await this.prisma.$executeRaw`
          UPDATE knowledge_doc_chunks SET embedding = ${vector}::vector WHERE id = ${row.id}
        `;
      }
      return { status: 'embedded', chunks: chunks.length };
    } catch {
      // Embedding API or missing table (pre-migration) — surface, don't 500.
      return { status: 'failed', chunks: 0 };
    }
  }

  // Cosine top-k over doc chunks. Throws if pgvector is unavailable — callers
  // (ai.service) catch and fall back to text ranking.
  async searchDocs(query: string, limit: number): Promise<DocSearchHit[]> {
    const vec = await this.embedding.embed(query);
    const vector = `[${vec.join(',')}]`;
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT doc_slug AS "docSlug", content,
             1 - (embedding <=> ${vector}::vector) AS similarity
      FROM knowledge_doc_chunks
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> ${vector}::vector
      LIMIT ${limit}
    `;
    return rows
      .map((r) => ({
        slug: r.docSlug,
        content: r.content,
        similarity: typeof r.similarity === 'number' ? r.similarity : Number(r.similarity),
      }))
      .filter((r) => (r.similarity ?? 0) >= SIMILARITY_THRESHOLD);
  }

  // Slugs that have at least one embedded chunk. Lets the retriever tell which
  // docs are reachable by vector search vs. which need a text-rank fallback so a
  // stale/un-embedded doc is never silently invisible. One cheap query.
  async embeddedSlugs(): Promise<string[]> {
    try {
      const rows = await this.prisma.$queryRaw<{ docSlug: string }[]>`
        SELECT DISTINCT doc_slug AS "docSlug"
        FROM knowledge_doc_chunks
        WHERE embedding IS NOT NULL
      `;
      return rows.map((r) => r.docSlug);
    } catch {
      // chunks table missing (pre-migration) / pgvector down — treat as none embedded.
      return [];
    }
  }

  // Derive embed status by comparing the stored content hash to the live doc.
  // Tolerant: if the chunks table is missing (migration not yet run) treat as
  // 'none' rather than failing the whole config listing.
  async statusFor(slug: string, value: string): Promise<DocEmbedStatus> {
    try {
      const rows = await this.prisma.knowledgeDocChunk.findMany({
        where: { docSlug: slug },
        select: { contentHash: true },
        take: 1,
      });
      if (!rows.length) return 'none';
      return rows[0].contentHash === sha256(value) ? 'embedded' : 'stale';
    } catch {
      return 'none';
    }
  }

  async deleteDoc(slug: string): Promise<void> {
    await this.prisma.knowledgeDocChunk.deleteMany({ where: { docSlug: slug } });
  }
}
