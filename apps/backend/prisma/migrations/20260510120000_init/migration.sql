-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "KbSource" AS ENUM ('manual', 'post_save', 'markdown', 'docx', 'xlsx');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('assignment', 'practice');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('easy', 'medium', 'hard');

-- CreateTable
CREATE TABLE "kb_entries" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tags" TEXT[],
    "source" "KbSource" NOT NULL,
    "source_url" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kb_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_saves" (
    "id" TEXT NOT NULL,
    "post_title" TEXT NOT NULL,
    "post_body" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "saved_by" TEXT NOT NULL,
    "saved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kb_entry_id" TEXT,

    CONSTRAINT "post_saves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_entries" (
    "id" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL,
    "source_doc" TEXT NOT NULL,
    "batch" TEXT NOT NULL,
    "course" TEXT NOT NULL,
    "question_no" TEXT,
    "question_text" TEXT NOT NULL,
    "hint1" TEXT NOT NULL,
    "hint2" TEXT,
    "topic_tags" TEXT[],
    "difficulty" "Difficulty" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "kb_entries_title_idx" ON "kb_entries"("title");

-- CreateIndex
CREATE UNIQUE INDEX "post_saves_kb_entry_id_key" ON "post_saves"("kb_entry_id");

-- CreateIndex
CREATE INDEX "question_entries_type_idx" ON "question_entries"("type");

-- AddForeignKey
ALTER TABLE "post_saves" ADD CONSTRAINT "post_saves_kb_entry_id_fkey" FOREIGN KEY ("kb_entry_id") REFERENCES "kb_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
