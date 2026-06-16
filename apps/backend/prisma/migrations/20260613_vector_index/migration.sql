CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE kb_posts
  ADD COLUMN IF NOT EXISTS moderator_answer TEXT;

CREATE INDEX IF NOT EXISTS kb_posts_embedding_hnsw
  ON kb_posts
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
