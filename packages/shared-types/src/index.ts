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
  // When drafting a reply to a specific comment (not the post itself).
  replyToAuthor?: string;
  replyToText?: string;
}

export interface GenerateReplyResponse {
  mode: ReplyMode;
  reply: string;
  kbHits: { id: string; title: string }[];
  questionHits: { id: string; questionText: string }[];
}
