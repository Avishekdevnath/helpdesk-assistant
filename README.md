# Helpdesk AI — Phitron Moderator Assistant

> AI-powered Chrome extension that drafts replies for Phitron helpdesk moderators — automatically, in seconds, in Bengali.

---

## What It Does

Helpdesk AI watches the Phitron helpdesk in real time. When a moderator opens an unanswered post, it:

1. **Reads the question** from the page
2. **Searches the knowledge base** using vector similarity (pgvector)
3. **Finds real moderator answers** to similar past questions
4. **Generates a Bengali draft reply** using GPT — in the exact tone and style of your team
5. **Inserts it directly into the comment box** — ready to review and post

The moderator polishes and hits submit. No copy-paste. No context switching.

---

## Features

| Feature | Details |
|---|---|
| Auto-draft | Fills comment box on unanswered posts automatically |
| Manual generate | ✨ sparkle button inside every post modal |
| Few-shot learning | AI copies real moderator answer style |
| Vector KB | pgvector HNSW index for semantic search |
| Auto-scrape | Answered posts saved to KB silently in background |
| Bangla-first | Replies in natural Bengali with technical English terms |
| Assignment guard | Socratic hints only — never reveals assignment answers |
| Glass UI | Minimal sparkle button, non-intrusive |

---

## Architecture

```
Chrome Extension (content script)
    │
    ├── Detects post on page
    ├── Auto-scrapes answered posts → KB (fire-and-forget)
    └── Requests AI draft for unanswered posts
            │
            ▼
    NestJS Backend (Vercel / localhost)
            │
            ├── Vector search → top-5 similar KB posts
            ├── Injects moderator exemplars as few-shot examples
            └── GPT generates Bengali reply
            │
            ▼
    Neon PostgreSQL + pgvector
    (HNSW cosine similarity index)
```

---

## Tech Stack

- **Extension** — Chrome MV3, TypeScript, React, Vite, `@crxjs/vite-plugin`
- **Backend** — NestJS, Prisma ORM, `@prisma/adapter-neon`
- **Database** — Neon PostgreSQL + `pgvector` (HNSW index, 1536-dim embeddings)
- **AI** — OpenAI `text-embedding-3-small` + GPT
- **Deploy** — Vercel (backend), Chrome unpacked / Web Store (extension)

---

## Quick Start

### Backend

```bash
pnpm install
cp apps/backend/.env.example apps/backend/.env
# fill DATABASE_URL, DIRECT_URL, OPENAI_API_KEY, HELPDESK_API_KEY
pnpm --filter backend prisma:migrate
pnpm --filter backend dev
```

### Extension

```bash
pnpm --filter extension build
```

Load `apps/extension/dist` as an unpacked extension in Chrome (`chrome://extensions` → Load unpacked).

Configure in the side panel:
- **Backend URL** — `http://localhost:3000` for local, or your Vercel URL
- **API Key** — matches `HELPDESK_API_KEY` in backend `.env`

---

## Deploy

### Backend → Vercel

```bash
vercel login
cd apps/backend
vercel link --repo
vercel env add DATABASE_URL
vercel env add DIRECT_URL
vercel env add OPENAI_API_KEY
vercel env add HELPDESK_API_KEY
vercel --prod
```

### Backfill existing KB posts

```bash
cd apps/backend
npx ts-node --require dotenv/config scripts/backfill-embeddings.ts
```

---

## How the AI Learns

Every time a moderator posts an answer on Phitron helpdesk, the extension silently scrapes the post + moderator reply into the knowledge base. The next time a similar question appears, the AI uses that real answer as a few-shot example — learning the team's exact tone, grounding, and style over time.

No manual curation needed.

---

## Tests

```bash
pnpm --filter backend test       # 24 backend tests
pnpm --filter extension test     # 11 extension tests
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string (pooled) |
| `DIRECT_URL` | Neon direct connection (for migrations) |
| `OPENAI_API_KEY` | OpenAI API key |
| `HELPDESK_API_KEY` | Secret key for extension ↔ backend auth |

---

## Project Structure

```
apps/
├── backend/          # NestJS API + Prisma
│   ├── src/ai/       # Prompt building, GPT integration
│   ├── src/kb/       # Knowledge base, embeddings, vector search
│   ├── src/questions/# Assignment/practice question hints
│   └── scripts/      # One-off scripts (backfill embeddings)
└── extension/
    └── dist/         # Built Chrome extension (load this in Chrome)
```

---

Built for [Phitron](https://phitron.io) helpdesk moderators.
