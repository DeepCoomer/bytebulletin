import { describe, expect, it } from 'vitest';
import { dedupHash, normalizeTitle } from './dedup.js';

describe('normalizeTitle', () => {
  it('lowercases and collapses punctuation/whitespace', () => {
    expect(normalizeTitle('  Show HN: FooDB — a *fast* K/V store!! ')).toBe(
      'show hn foodb a fast k v store',
    );
  });

  it('equates stylistic variants of the same headline', () => {
    expect(normalizeTitle('PostgreSQL 18: What’s New?')).toBe(
      normalizeTitle("PostgreSQL 18 – what's new"),
    );
  });
});

describe('dedupHash', () => {
  it('is a 32-char hex MD5', () => {
    expect(dedupHash('Hello World')).toMatch(/^[a-f0-9]{32}$/);
  });

  it('is identical for normalized-equal titles', () => {
    expect(dedupHash('Kafka vs. Pulsar: A Comparison')).toBe(dedupHash('kafka VS pulsar — a comparison'));
  });

  it('differs for different titles', () => {
    expect(dedupHash('title one')).not.toBe(dedupHash('title two'));
  });
});
