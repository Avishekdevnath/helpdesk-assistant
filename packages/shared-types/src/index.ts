export type KbSource = 'manual' | 'post_save' | 'markdown' | 'docx' | 'xlsx';
export type QuestionType = 'assignment' | 'practice';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type ReplyMode = 'full_answer' | 'hint_assignment' | 'hint_practice';

export interface KbEntry {
  id: string;
  title: string;
  content: string;
  tags: string[];
  source: KbSource;
  sourceUrl: string | null;
  createdBy: string;
  createdAt: string;
}

export interface QuestionEntry {
  id: string;
  type: QuestionType;
  sourceDoc: string;
  batch: string;
  course: string;
  questionNo: string | null;
  questionText: string;
  hint1: string;
  hint2: string | null;
  topicTags: string[];
  difficulty: Difficulty;
  createdAt: string;
}

export interface GenerateReplyRequest {
  postTitle: string;
  postBody: string;
  postUrl?: string;
  replyToAuthor?: string;
  replyToText?: string;
  replyLanguage?: 'en' | 'bn' | 'original';
  screenshots?: string[];
}

export interface GenerateReplyResponse {
  mode: ReplyMode;
  reply: string;
  kbHits: { id: string; title: string }[];
  questionHits: { id: string; questionText: string }[];
}

export interface AskMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AskRequest {
  messages: AskMessage[];
  replyLanguage?: 'en' | 'bn' | 'original';
}

export interface AskSources {
  kb: { id: string; title: string }[];
  docs: string[];
  usedCoreInfo: boolean;
  web: { title: string; url: string }[];
}

export interface AskResponse {
  answer: string;
  usedWeb: boolean;
  sources: AskSources;
}

// Server-sent events emitted by POST /ai/ask/stream, one JSON object per SSE line.
export type AskStreamEvent =
  | { type: 'stage'; stage: 'answering' | 'searching_web' }
  | { type: 'token'; text: string }
  | { type: 'done'; usedWeb: boolean; sources: AskSources }
  | { type: 'error'; message: string };
