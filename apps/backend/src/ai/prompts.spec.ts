import { buildPrompt, decideMode } from './prompts';

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

  it('asks for replies in a Bangla support style for simple posts', () => {
    const prompt = buildPrompt(
      'full_answer',
      { title: 'C++ Problem', body: 'getchar() ar cin.ignore() er difference ki?' },
      [],
      [],
    );

    expect(prompt).toContain('Bangla');
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
