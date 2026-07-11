import { describe, expect, it } from 'vitest';
import { extractExternalUrl, stripHtml } from './reddit';

const LINK_POST =
  '<!-- SC_OFF --><div class="md"><p>submitted by <a href="https://www.reddit.com/user/x">/u/x</a></p></div><!-- SC_ON --> &#32; <span><a href="https://example.com/great-article">[link]</a></span> &#32; <span><a href="https://www.reddit.com/r/programming/comments/abc/x/">[comments]</a></span>';

const SELF_POST =
  '<!-- SC_OFF --><div class="md"><p>Long discussion text about API versioning strategies and what worked for us.</p></div><!-- SC_ON --> &#32; <span><a href="https://www.reddit.com/r/ExperiencedDevs/comments/xyz/q/">[link]</a></span>';

describe('extractExternalUrl', () => {
  it('finds the external article link', () => {
    expect(extractExternalUrl(LINK_POST)).toBe('https://example.com/great-article');
  });

  it('returns undefined when [link] points back to reddit (self-post)', () => {
    expect(extractExternalUrl(SELF_POST)).toBeUndefined();
  });

  it('returns undefined when no [link] anchor exists', () => {
    expect(extractExternalUrl('<p>just text</p>')).toBeUndefined();
  });
});

describe('stripHtml', () => {
  it('flattens markup and entities to plain text', () => {
    expect(stripHtml(SELF_POST)).toContain('API versioning strategies');
    expect(stripHtml(SELF_POST)).not.toMatch(/<|>|&#/);
  });
});
