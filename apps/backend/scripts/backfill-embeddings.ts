/**
 * One-off script: embed all kb_posts where embedding IS NULL.
 * Run from apps/backend:
 *   npx ts-node -e "require('dotenv/config')" scripts/backfill-embeddings.ts
 * or:
 *   npx ts-node --require dotenv/config scripts/backfill-embeddings.ts
 */
import 'dotenv/config';

import { PrismaClient } from '.prisma/helpdesk-client';
import { PrismaNeon } from '@prisma/adapter-neon';
import OpenAI from 'openai';

const BATCH_SIZE = 10;

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL missing');

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY missing');

  const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString }) } as any);
  const openai = new OpenAI({ apiKey });

  await prisma.$connect();

  try {
    const rows = await prisma.$queryRaw<Array<{ id: string; title: string; body: string }>>`
      SELECT id, title, body FROM kb_posts WHERE embedding IS NULL ORDER BY created_at ASC
    `;

    console.log(`Found ${rows.length} posts without embeddings.`);
    if (rows.length === 0) return;

    let done = 0;
    let failed = 0;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);

      await Promise.allSettled(
        batch.map(async (row) => {
          try {
            const input = `${row.title}\n${row.body}`.slice(0, 8000);
            const res = await openai.embeddings.create({ model: 'text-embedding-3-small', input });
            const vector = `[${res.data[0].embedding.join(',')}]`;
            await prisma.$executeRaw`
              UPDATE kb_posts SET embedding = ${vector}::vector WHERE id = ${row.id}
            `;
            done++;
          } catch (err) {
            console.error(`Failed to embed post ${row.id}:`, (err as Error).message);
            failed++;
          }
        }),
      );

      console.log(`Progress: ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length} (${failed} failed)`);
    }

    console.log(`Done. Embedded: ${done}, Failed: ${failed}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
