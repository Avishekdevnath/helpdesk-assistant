import type { QuestionEntry, ReplyMode } from '@helpdesk/shared-types';

export interface KbHit {
  title: string;
  content: string;
  moderatorAnswer?: string | null;
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
): string {
  const replyStyle = [
    'Reply style:',
    '- Write in Bangla/Bengali with natural student-friendly English technical terms when useful.',
    '- Match the Phitron helpdesk tone: warm, concise, simple student-friendly, and practical.',
    '- For simple conceptual posts, answer directly with a small example when it helps.',
    '- Give the complete answer directly in the draft. Do not end with an offer like "চাইলে আমি..." or "let me know". Do not ask follow-up questions.',
    '- Return plain text only. Do not use Markdown, bold markers, headings, bullets, code fences, or decorative formatting.',
  ].join('\n');

  const exemplars = kb.filter((e) => e.moderatorAnswer);
  const exemplarBlock = exemplars.length
    ? 'Exemplar replies from real moderators (copy this style and grounding):\n' +
      exemplars.map((e) => `Q: ${e.title}\nModerator answer: ${e.moderatorAnswer}`).join('\n\n')
    : null;

  const kbBlock = kb.length
    ? kb.map((entry) => `### ${entry.title}\n${entry.content}`).join('\n\n')
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

  switch (mode) {
    case 'full_answer':
      return [
        'You are an expert edutech moderator.',
        replyStyle,
        exemplarBlock,
        `KB context:\n${kbBlock}`,
        `Post:\n${postBlock}`,
        'Write a clear, helpful, encouraging reply. Cite KB when relevant.',
      ]
        .filter(Boolean)
        .join('\n\n');
    case 'hint_assignment':
      return [
        'You are an expert edutech moderator.',
        'This is a GRADED assignment question. Do NOT solve it.',
        replyStyle,
        exemplarBlock,
        `Question context:\n${questionBlock}`,
        `Post:\n${postBlock}`,
        'Use the Socratic method. Give a hint that points toward the next step. Never reveal the final answer.',
      ]
        .filter(Boolean)
        .join('\n\n');
    case 'hint_practice':
      return [
        'You are an expert edutech moderator.',
        'This is a practice question. Encourage exploration.',
        replyStyle,
        exemplarBlock,
        `Question context:\n${questionBlock}`,
        `Post:\n${postBlock}`,
        'Give a hint and point to the relevant concept. Do not solve it fully.',
      ]
        .filter(Boolean)
        .join('\n\n');
  }
}
