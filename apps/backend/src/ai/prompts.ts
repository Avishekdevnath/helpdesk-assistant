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

export function buildCondensePrompt(
  messages: { role: string; content: string }[],
): string {
  const history = messages
    .map((m) => `${m.role === 'assistant' ? 'Assistant' : 'Moderator'}: ${m.content}`)
    .join('\n');
  return [
    'Given the conversation below, rewrite the LAST moderator message into a single',
    'standalone search question that captures any context from earlier turns.',
    'Fix spelling mistakes and obvious typos (e.g. "knowledge cocs" -> "knowledge docs",',
    '"codeforce" -> "codeforces"). Keep the original intent and language — do NOT answer,',
    'translate, or add information. Return ONLY the rewritten question, nothing else.',
    '',
    history,
  ].join('\n');
}

// System prompt for the grounded (internal-sources) Ask path. Hard rules go in
// the system role so the model actually obeys them — and it is explicitly told
// NOT to use any prior knowledge about Phitron, since the model recognises the
// org name and will otherwise fabricate fees/dates/policies from training data.
export function buildAskSystem(replyLanguage?: 'en' | 'bn' | 'original'): string {
  const languageLine =
    replyLanguage === 'bn'
      ? 'Answer in Bengali (বাংলা).'
      : replyLanguage === 'original'
        ? "Answer in the moderator's language."
        : 'Answer in English.';
  return [
    'You are a retrieval assistant for a helpdesk moderator.',
    languageLine,
    'STRICT RULES — follow exactly:',
    '- Use ONLY the facts in the "Internal context" provided in the user message.',
    '- You have NO prior knowledge. Ignore anything you may know about Phitron, its courses, fees, schedule, location, or staff. If a fact (fee, duration, dates, office hours, location, syllabus) is not written in the context, you do NOT know it.',
    '- Never guess, infer, or fill gaps. Do not generalise from a job title or a name into a course or feature.',
    `- If the context does not contain the answer, reply with exactly this token and nothing else: ${NO_ANSWER_SENTINEL}`,
    '- EXCEPTION — catalog questions: if asked what you know, what topics/documents/knowledge you have, or to list your sources, answer by listing the titles in the "Available internal sources" block. This is allowed even though it is not a content fact.',
    '- FORMATTING: write a clean, direct answer. Do NOT print raw citation markers such as [doc:slug], [doc:...], or bracketed source tags — the interface shows the sources separately. Do NOT prefix the answer with a language name (e.g. "বাংলায়:" / "In English:").',
    '- CONTACT: whenever you tell someone to email or contact Phitron for any reason, always include the email address support@phitron.io.',
  ].join('\n');
}

// Untranslated sentinel the grounded model returns when internal context cannot
// answer. The service detects it to decide web fallback vs. a localized refusal.
export const NO_ANSWER_SENTINEL = '__NO_INTERNAL_ANSWER__';

// Localized user-facing refusal shown when neither internal context nor web can
// answer (or web is not attempted).
export function refusalText(replyLanguage?: 'en' | 'bn' | 'original'): string {
  if (replyLanguage === 'bn') return 'অভ্যন্তরীণ উৎসে নিশ্চিত করা যায়নি।';
  return 'Not confirmed in internal sources.';
}

// Turns an image-only question into a text search query so KB/doc retrieval works.
export const VISION_DESCRIBE_PROMPT =
  'Look at the attached image and write a short search query (keywords) describing what the ' +
  'user is likely asking about, to find relevant help-desk knowledge. Return only the query text.';

// System prompt for the web-search fallback path (used only when KB is empty).
export const ASK_WEB_SYSTEM = [
  'You are a research assistant for a helpdesk moderator.',
  'Answer using the web search results available to you, plus any internal context provided.',
  'Cite the web pages you used. If nothing reliable is found, say so plainly. Do not fabricate.',
].join('\n');

// Builds the USER message: internal context + conversation + the question.
// Rules live in the system prompt (buildAskSystem / ASK_WEB_SYSTEM), not here.
export function buildAskPrompt(input: {
  query: string;
  history: { role: string; content: string }[];
  kb: { title: string; body: string; moderatorAnswer?: string | null }[];
  coreInfo?: string;
  docs: { slug: string; value: string }[];
  docCatalog?: { slug: string; summary?: string }[];
  replyLanguage?: 'en' | 'bn' | 'original';
}): string {
  const kbBlock = input.kb.length
    ? input.kb
        .map((e) => `### ${e.title}\n${e.body}${e.moderatorAnswer ? `\nAnswer: ${e.moderatorAnswer}` : ''}`)
        .join('\n\n')
    : null;
  const coreBlock = input.coreInfo?.trim() ? `Core info:\n${input.coreInfo.trim()}` : null;
  const docsBlock = input.docs.length
    ? input.docs.map((d) => `[doc:${d.slug}]\n${d.value}`).join('\n\n')
    : null;
  // Always advertise every available knowledge doc (with a one-line summary) + the
  // retrieved KB titles so the model can answer catalog questions ("what do you
  // know / what docs exist") even when retrieval pulled only a subset of content.
  const catalog: { slug: string; summary?: string }[] =
    input.docCatalog ?? input.docs.map((d) => ({ slug: d.slug }));
  const catalogEntries = [
    ...catalog.map((d) => (d.summary ? `${d.slug} — ${d.summary}` : d.slug)),
    ...input.kb.map((e) => e.title),
  ];
  const catalogBlock = catalogEntries.length
    ? `Available internal sources:\n${[...new Set(catalogEntries)].map((n) => `- ${n}`).join('\n')}`
    : null;
  const internal =
    [catalogBlock, kbBlock, coreBlock, docsBlock].filter(Boolean).join('\n\n') || '(no internal context)';

  const history = input.history
    .map((m) => `${m.role === 'assistant' ? 'Assistant' : 'Moderator'}: ${m.content}`)
    .join('\n');

  return [
    `Internal context:\n${internal}`,
    '',
    `Conversation:\n${history}`,
    '',
    `Answer this question using only the internal context above: ${input.query}`,
  ].join('\n');
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
