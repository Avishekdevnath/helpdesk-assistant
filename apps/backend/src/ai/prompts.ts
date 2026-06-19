import type { QuestionEntry, ReplyMode } from '@helpdesk/shared-types';

export function buildRefinePrompt(draft: string, studentPost: string, taste?: string): string {
  return [
    'You are an editor and semantic checker for a student helpdesk.',
    'You will receive a student post and a moderator reply draft. Your job:',
    '1. Check that the reply actually addresses what the student asked. If it does not, rewrite it so it does — but only use facts already present in the draft (do not invent new information).',
    '2. Fix grammar mistakes, especially verb-subject inversions that change who is doing what.',
    '3. Remove any phrase referencing a knowledge base, KB, internal source, or how you know something.',
    '4. Keep length 2–4 sentences. Do not expand or add new facts.',
    '5. Return plain text only. No markdown, bullets, or headings.',
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
): string {
  const replyStyle = [
    'Reply style:',
    '- Write in English.',
    '- Match the Phitron helpdesk tone: warm, concise, simple student-friendly, and practical.',
    '- Keep it SHORT: 2-4 sentences. No long explanations, no repetition, no padding.',
    '- For simple conceptual posts, answer directly with a small example when it helps.',
    '- Only state facts present in the KB context. Do NOT guess or invent specifics (dates, schedules, deadlines, results).',
    '- NEVER reference the knowledge base, KB, internal source, context, or how you know something to the student. Do not write "KB অনুযায়ী", "according to KB", "জানা মতে from KB", etc. Speak as a moderator who simply knows.',
    '- When stating something from the KB that may have changed (e.g. a planned date), attribute it softly to available info instead, e.g. "এখনো পর্যন্ত পাওয়া তথ্য অনুসারে...".',
    '- If the asked info (e.g. an exact date) is NOT in the KB context, do not make one up. Reply briefly in Bengali that it is not confirmed yet and to watch official announcements, and recommend practicing/revising previous lessons in the meantime.',
    '- Give the complete answer directly in the draft. Do not end with an offer like "চাইলে আমি..." or "let me know". Do not ask follow-up questions.',
    '- Return plain text only. Do not use Markdown, bold markers, headings, bullets, code fences, or decorative formatting.',
  ].join('\n');

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
        'You are an expert edutech moderator.',
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
        'You are an expert edutech moderator.',
        coreInfoBlock,
        tasteBlock,
        'This is a GRADED assignment question. Do NOT solve it.',
        replyStyle,
        exemplarBlock,
        `Question context:\n${questionBlock}`,
        `Post:\n${postBlock}`,
        replyToBlock,
        'Use the Socratic method. Give a hint that points toward the next step. Never reveal the final answer.',
      ]
        .filter(Boolean)
        .join('\n\n');
    case 'hint_practice':
      return [
        'You are an expert edutech moderator.',
        coreInfoBlock,
        tasteBlock,
        'This is a practice question. Encourage exploration.',
        replyStyle,
        exemplarBlock,
        `Question context:\n${questionBlock}`,
        `Post:\n${postBlock}`,
        replyToBlock,
        'Give a hint and point to the relevant concept. Do not solve it fully.',
      ]
        .filter(Boolean)
        .join('\n\n');
  }
}
