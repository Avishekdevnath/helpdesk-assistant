CREATE TABLE IF NOT EXISTS "configs" (
  "key"        TEXT NOT NULL,
  "value"      TEXT NOT NULL DEFAULT '',
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "configs_pkey" PRIMARY KEY ("key")
);

CREATE UNIQUE INDEX IF NOT EXISTS "configs_key_key" ON "configs"("key");

INSERT INTO "configs" ("key", "value", "updated_at")
VALUES
  ('core_info',   '', NOW()),
  ('reply_taste', '', NOW())
ON CONFLICT ("key") DO NOTHING;
