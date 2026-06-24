-- Knowledge doc chunks: per-chunk pgvector embeddings for Layer 2 docs.
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS "knowledge_doc_chunks" (
  "id"           TEXT NOT NULL,
  "doc_slug"     TEXT NOT NULL,
  "chunk_index"  INTEGER NOT NULL,
  "content"      TEXT NOT NULL,
  "embedding"    vector(1536),
  "content_hash" TEXT NOT NULL,
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "knowledge_doc_chunks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "knowledge_doc_chunks_doc_slug_chunk_index_key"
  ON "knowledge_doc_chunks" ("doc_slug", "chunk_index");

CREATE INDEX IF NOT EXISTS "knowledge_doc_chunks_doc_slug_idx"
  ON "knowledge_doc_chunks" ("doc_slug");

CREATE INDEX IF NOT EXISTS "knowledge_doc_chunks_embedding_hnsw"
  ON "knowledge_doc_chunks"
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
