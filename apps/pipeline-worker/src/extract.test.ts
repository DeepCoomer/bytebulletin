import { describe, expect, it } from 'vitest';
import { ARTICLE_HTML, EMPTY_HTML } from './__fixtures__/article';
import { extractFromHtml } from './extract';

describe('extractFromHtml', () => {
  it('extracts main article text and drops chrome', () => {
    const text = extractFromHtml(ARTICLE_HTML, 'https://example.com/post');
    expect(text).toContain('choosing a shard key');
    expect(text).toContain('eleven seconds');
    expect(text).not.toContain('Home');
  });

  it('collapses whitespace', () => {
    const text = extractFromHtml(ARTICLE_HTML, 'https://example.com/post');
    expect(text).not.toMatch(/\s{2,}/);
  });

  it('returns undefined when no article is found', () => {
    expect(extractFromHtml(EMPTY_HTML, 'https://example.com/empty')).toBeUndefined();
  });
});
