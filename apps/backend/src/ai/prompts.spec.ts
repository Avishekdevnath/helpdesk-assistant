import { buildPrompt, decideMode, buildCondensePrompt, buildAskPrompt, buildAskSystem } from './prompts';

describe('AI prompts', () => {
  it('uses full_answer when no question hits exist', () => {
    expect(decideMode([])).toBe('full_answer');
  });

  it('uses assignment hint mode for assignment hits', () => {
    expect(decideMode([{ type: 'assignment' }] as never)).toBe('hint_assignment');
  });

  it('builds assignment prompts that forbid direct answers', () => {
    const prompt = buildPrompt(
      'hint_assignment',
      { title: 'Help', body: 'Solve Q1' },
      [],
      [{ questionText: 'Q1', hint1: 'Start with a loop' }] as never,
    );

    expect(prompt).toContain('GRADED assignment');
    expect(prompt).toContain('Do NOT solve it');
  });

  it('asks for replies in the Phitron English support style for simple posts', () => {
    const prompt = buildPrompt(
      'full_answer',
      { title: 'C++ Problem', body: 'getchar() ar cin.ignore() er difference ki?' },
      [],
      [],
    );

    expect(prompt).toContain('ONLY in English');
    expect(prompt).toContain('Phitron');
    expect(prompt).toContain('simple student-friendly');
  });

  it('asks for plain text replies without markdown formatting', () => {
    const prompt = buildPrompt('full_answer', { title: 'Contact', body: 'Need mentor contact' }, [], []);

    expect(prompt).toContain('plain text only');
    expect(prompt).toContain('Do not use Markdown');
  });

  it('asks for complete direct replies without closing offers or questions', () => {
    const prompt = buildPrompt(
      'full_answer',
      { title: 'C++ Problem', body: 'getchar() ar cin.ignore() er difference ki?' },
      [],
      [],
    );

    expect(prompt).toContain('Give the complete answer directly');
    expect(prompt).toContain('Do not end with an offer');
    expect(prompt).toContain('Do not ask follow-up questions');
  });
});

describe('buildPrompt exemplars', () => {
  it('includes moderator exemplar block when kbHits have moderatorAnswer', () => {
    const prompt = buildPrompt(
      'full_answer',
      { title: 'getchar question', body: 'what is getchar?' },
      [{ title: 'getchar', content: 'reads one char', moderatorAnswer: 'getchar() ইনপুট থেকে ১টি char পড়ে।' }],
      [],
    );
    expect(prompt).toContain('getchar() ইনপুট থেকে ১টি char পড়ে।');
    expect(prompt).toContain('Exemplar');
  });

  it('skips exemplar block when no moderatorAnswer present', () => {
    const prompt = buildPrompt(
      'full_answer',
      { title: 'test', body: 'body' },
      [{ title: 'test', content: 'content', moderatorAnswer: null }],
      [],
    );
    expect(prompt).not.toContain('Exemplar');
  });
});

describe('buildCondensePrompt', () => {
  it('includes prior turns and asks for a standalone question', () => {
    const out = buildCondensePrompt([
      { role: 'user', content: 'When is the C exam?' },
      { role: 'assistant', content: 'June 30.' },
      { role: 'user', content: 'what about batch 2026?' },
    ]);
    expect(out).toContain('standalone');
    expect(out).toContain('what about batch 2026?');
    expect(out).toContain('When is the C exam?');
  });
});

describe('buildAskPrompt', () => {
  it('embeds KB, core info and docs, and forbids fabrication', () => {
    const out = buildAskPrompt({
      query: 'refund policy?',
      history: [{ role: 'user', content: 'refund policy?' }],
      kb: [{ title: 'Refunds', body: 'No refund after 7 days.', moderatorAnswer: 'No refund after 7 days.' }],
      coreInfo: 'Phitron is a Bangladeshi edutech.',
      docs: [{ slug: 'policies', value: 'Refund window is 7 days.' }],
      replyLanguage: 'en',
    });
    expect(out).toContain('Refunds');
    expect(out).toContain('No refund after 7 days.');
    expect(out).toContain('Phitron is a Bangladeshi edutech.');
    expect(out).toContain('Refund window is 7 days.');
    expect(out.toLowerCase()).toContain('only the internal context');
  });

  it('system prompt forbids prior knowledge and sets a refusal string', () => {
    const sys = buildAskSystem('en');
    expect(sys.toLowerCase()).toContain('no prior knowledge');
    expect(sys).toContain('Not confirmed in internal sources.');
  });

  it('says no internal context when nothing retrieved', () => {
    const out = buildAskPrompt({ query: 'x', history: [{ role: 'user', content: 'x' }], kb: [], docs: [] });
    expect(out).toContain('(no internal context)');
  });
});
