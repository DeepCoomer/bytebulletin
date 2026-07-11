import { describe, expect, it } from 'vitest';
import { isNoiseTitle } from './noise';

describe('isNoiseTitle', () => {
  it.each([
    'Moss (YC F25) Is Hiring',
    'Ask HN: Who is hiring? (July 2026)',
    'Ask HN: Who wants to be hired?',
    'What are you doing this weekend?',
    'What are you doing this week?',
    'Tell HN: Something happened',
    'Poll: Tabs or spaces?',
    'Weekly discussion thread',
  ])('flags %s', (title) => {
    expect(isNoiseTitle(title)).toBe(true);
  });

  it.each([
    'How we sharded Postgres',
    'Hiring practices at scale — an engineering retrospective',
    'The weekly build was broken by a compiler upgrade',
    'Asking the right questions in system design',
  ])('passes %s', (title) => {
    expect(isNoiseTitle(title)).toBe(false);
  });
});
