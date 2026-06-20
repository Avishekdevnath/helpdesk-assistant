import type { QuestionEntry, ReplyMode } from '@helpdesk/shared-types';

export const DEFAULT_IDENTITY =
  'You are an expert edutech moderator.';

export const DEFAULT_REPLY_STYLE = [
  'Reply style:',
  '- CRITICAL: Write ONLY in English. This overrides everything else. Even if the student post, KB context, or example replies are in Bengali or Banglish — your reply MUST be in English.',
  '- Match the Phitron helpdesk tone: warm, concise, simple student-friendly, and practical.',
  '- Keep it SHORT: 2-4 sentences. No long explanations, no repetition, no padding.',
  '- For simple conceptual posts, answer directly with a small example when it helps.',
  '- Only state facts present in the KB context. Do NOT guess or invent specifics (dates, schedules, deadlines, results).',
  '- NEVER reference the knowledge base, KB, internal source, or how you know something. Speak as a moderator who simply knows.',
  '- When stating something that may have changed (e.g. a planned date), say "based on available information" rather than stating it as certain.',
  '- If the asked info is NOT in the KB context, do not make one up. Say briefly that it is not confirmed yet and to watch official announcements.',
  '- Give the complete answer directly. Do not end with an offer like "let me know". Do not ask follow-up questions.',
  '- Return plain text only. Do not use Markdown, bold markers, headings, bullets, code fences, or decorative formatting.',
].join('\n');

export const DEFAULT_ASSIGNMENT_INSTRUCTION =
  'This is a GRADED assignment question. Do NOT solve it.\n\nUse the Socratic method. Give a hint that points toward the next step. Never reveal the final answer.';

export const DEFAULT_PRACTICE_INSTRUCTION =
  'This is a practice question. Encourage exploration.\n\nGive a hint and point to the relevant concept. Do not solve it fully.';

export const DEFAULT_REFINE_INSTRUCTIONS = [
  'You are an editor and semantic checker for a student helpdesk.',
  'CRITICAL: The reply MUST be in English only. If the draft is in Bengali or Banglish, translate it to English first, then apply the rules below.',
  'Your job:',
  '1. Check that the reply actually addresses what the student asked. If it does not, rewrite it so it does — but only use facts already present in the draft (do not invent new information).',
  '2. Fix grammar mistakes, especially verb-subject inversions that change who is doing what.',
  '3. Remove any phrase referencing a knowledge base, KB, internal source, or how you know something.',
  '4. Keep length 2–4 sentences. Do not expand or add new facts.',
  '5. Return plain text only. No markdown, bullets, or headings.',
].join('\n');

export interface PromptOverrides {
  identity?: string;
  replyStyle?: string;
  assignmentInstruction?: string;
  practiceInstruction?: string;
  replyLanguage?: 'en' | 'bn' | 'original';
}

export function buildRefinePrompt(
  draft: string,
  studentPost: string,
  taste?: string,
  refineInstructions?: string,
  replyLanguage?: 'en' | 'bn' | 'original',
): string {
  const languageBlock =
    replyLanguage === 'original'
      ? "LANGUAGE RULE (highest priority): Keep the reply in the SAME LANGUAGE as the student's post. Do NOT translate to English."
      : replyLanguage === 'bn'
        ? 'LANGUAGE RULE (highest priority): Write the reply in Bengali (বাংলা). Do NOT translate to English.'
        : null;
  return [
    languageBlock,
    refineInstructions?.trim() || DEFAULT_REFINE_INSTRUCTIONS,
    taste?.trim() ? `Tone guide:\n${taste.trim()}` : null,
    `Student post:\n${studentPost}`,
    `Draft to refine:\n${draft}`,
    'Return only the corrected reply — nothing else.',
  ]
    .filter(Boolean)
    .join('\n\n');
}

export interface KbHit {
  title: string;
  content: string;
  moderatorAnswer?: string | null;
  moderatorVoice?: string | null;
  summary?: string | null;
}

export function decideMode(questionHits: Pick<QuestionEntry, 'type'>[]): ReplyMode {
  if (questionHits.length === 0) return 'full_answer';
  return questionHits[0].type === 'assignment' ? 'hint_assignment' : 'hint_practice';
}

export function buildPrompt(
  mode: ReplyMode,
  post: { title: string; body: string },
  kb: KbHit[],
  questions: Pick<QuestionEntry, 'questionText' | 'hint1' | 'hint2'>[],
  replyTo?: { author: string; text: string },
  coreInfo?: string,
  taste?: string,
  overrides?: PromptOverrides,
): string {
  const identity = overrides?.identity?.trim() || DEFAULT_IDENTITY;
  const replyStyle = overrides?.replyStyle?.trim() || DEFAULT_REPLY_STYLE;
  const assignmentInstruction = overrides?.assignmentInstruction?.trim() || DEFAULT_ASSIGNMENT_INSTRUCTION;
  const practiceInstruction = overrides?.practiceInstruction?.trim() || DEFAULT_PRACTICE_INSTRUCTION;
  const languageBlock =
    overrides?.replyLanguage === 'original'
      ? "LANGUAGE RULE (highest priority): Reply in the SAME LANGUAGE as the student's post. Do NOT translate. This overrides any other language instruction in this prompt."
      : overrides?.replyLanguage === 'bn'
        ? 'LANGUAGE RULE (highest priority): Write your reply in Bengali (বাংলা). Do NOT write in English. This overrides any other language instruction in this prompt.'
        : null;

  const coreInfoBlock = coreInfo?.trim()
    ? `Core background knowledge (always true — use as ground truth):\n${coreInfo.trim()}`
    : null;

  const tasteBlock = taste?.trim()
    ? `Reply format and tone guide (follow exactly for phrasing and style):\n${taste.trim()}`
    : null;

  const exemplars = kb.filter((e) => e.moderatorVoice || e.moderatorAnswer);
  const exemplarBlock = exemplars.length
    ? 'Exemplar replies from real moderators (copy their tone and grounding style only — do not copy the language):\n' +
      exemplars
        .map((e) => `Q: ${e.title}\nModerator answer: ${e.moderatorVoice || e.moderatorAnswer}`)
        .join('\n\n')
    : null;

  const kbBlock = kb.length
    ? kb
        .map((entry) => {
          let block = `### ${entry.title}\nQ: ${entry.content}`;
          if (entry.moderatorAnswer) block += `\nA: ${entry.moderatorAnswer}`;
          else if (entry.moderatorVoice) block += `\nA: ${entry.moderatorVoice}`;
          if (entry.summary) block += `\nSummary: ${entry.summary}`;
          return block;
        })
        .join('\n\n')
    : '(no KB context)';

  const questionBlock = questions.length
    ? questions
        .map(
          (q) =>
            `Q: ${q.questionText}\nHint 1: ${q.hint1}${q.hint2 ? `\nHint 2: ${q.hint2}` : ''}`,
        )
        .join('\n\n')
    : '(no matching assignment or practice question)';

  const postBlock = `Title: ${post.title}\nBody: ${post.body}`;

  const replyToBlock = replyTo
    ? `You are replying to this specific comment by ${replyTo.author} (address it directly; the post above is only background):\n"${replyTo.text}"`
    : null;
  const replyToInstruction = replyTo
    ? `Write a reply that directly responds to ${replyTo.author}'s comment above. Stay grounded in the KB context; never mention the KB or your source.`
    : 'Write a clear, helpful, encouraging reply grounded in the KB context, but never mention the KB or your source to the student.';

  switch (mode) {
    case 'full_answer':
      return [
        languageBlock,
        identity,
        coreInfoBlock,
        tasteBlock,
        replyStyle,
        exemplarBlock,
        `KB context:\n${kbBlock}`,
        `Post:\n${postBlock}`,
        replyToBlock,
        replyToInstruction,
      ]
        .filter(Boolean)
        .join('\n\n');
    case 'hint_assignment':
      return [
        languageBlock,
        identity,
        coreInfoBlock,
        tasteBlock,
        assignmentInstruction,
        replyStyle,
        exemplarBlock,
        `Question context:\n${questionBlock}`,
        `Post:\n${postBlock}`,
        replyToBlock,
      ]
        .filter(Boolean)
        .join('\n\n');
    case 'hint_practice':
      return [
        languageBlock,
        identity,
        coreInfoBlock,
        tasteBlock,
        practiceInstruction,
        replyStyle,
        exemplarBlock,
        `Question context:\n${questionBlock}`,
        `Post:\n${postBlock}`,
        replyToBlock,
      ]
        .filter(Boolean)
        .join('\n\n');
  }
}
