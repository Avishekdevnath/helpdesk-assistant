-- KB curation: rich fields + unique url for upsert-by-url

ALTER TABLE kb_posts
  ADD COLUMN IF NOT EXISTS moderator_voice TEXT,
  ADD COLUMN IF NOT EXISTS summary TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS confidence DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS status TEXT;

-- Dedup before adding the unique index: keep the newest row per url.
-- (Upsert-by-url is the new model, so one row per url is intended.)
DELETE FROM kb_posts a
USING kb_posts b
WHERE a.url = b.url
  AND (a.created_at < b.created_at
       OR (a.created_at = b.created_at AND a.id < b.id));

-- Unique url enables prisma upsert({ where: { url } }).
CREATE UNIQUE INDEX IF NOT EXISTS kb_posts_url_key ON kb_posts (url);
