import { describe, expect, it } from 'vitest';
import { EMBEDDING_DIM } from './constants.js';
import {
  DigestSchema,
  InteractionRequestSchema,
  LlmOutputSchema,
} from './schemas.js';

const validSummary = {
  impactAnalysis: 'Moves consistency checks to the storage layer, trading write latency for safety.',
  bulletPoints: ['Uses Raft for log replication', 'P99 write latency up 12%'],
};

const validDigest = {
  title: 'How FooDB replicates writes',
  sourceUrl: 'https://example.com/foodb-replication',
  sourceName: 'Example Engineering',
  dedupHash: 'a'.repeat(32),
  score: 0.62,
  category: 'Architecture',
  summary: validSummary,
  embedding: Array.from({ length: EMBEDDING_DIM }, () => 0.01),
  userInteraction: 'NONE',
  createdAt: new Date(),
};

describe('DigestSchema', () => {
  it('accepts a valid digest', () => {
    expect(DigestSchema.parse(validDigest)).toMatchObject({ score: 0.62 });
  });

  it('defaults userInteraction to NONE', () => {
    const { userInteraction: _omitted, ...rest } = validDigest;
    expect(DigestSchema.parse(rest).userInteraction).toBe('NONE');
  });

  it('rejects wrong embedding dimension', () => {
    expect(() => DigestSchema.parse({ ...validDigest, embedding: [0.1, 0.2] })).toThrow();
  });

  it('rejects unknown category', () => {
    expect(() => DigestSchema.parse({ ...validDigest, category: 'Gaming' })).toThrow();
  });

  it('rejects non-URL sourceUrl', () => {
    expect(() => DigestSchema.parse({ ...validDigest, sourceUrl: 'not a url' })).toThrow();
  });

  it('rejects out-of-range score', () => {
    expect(() => DigestSchema.parse({ ...validDigest, score: 1.5 })).toThrow();
  });
});

describe('LlmOutputSchema', () => {
  it('accepts exactly category + summary', () => {
    expect(LlmOutputSchema.parse({ category: 'DevOps-Cloud', summary: validSummary })).toBeTruthy();
  });

  it('rejects empty bulletPoints', () => {
    expect(() =>
      LlmOutputSchema.parse({
        category: 'DevOps-Cloud',
        summary: { ...validSummary, bulletPoints: [] },
      }),
    ).toThrow();
  });

  it('rejects more than 5 bulletPoints', () => {
    expect(() =>
      LlmOutputSchema.parse({
        category: 'DevOps-Cloud',
        summary: { ...validSummary, bulletPoints: Array(6).fill('x') },
      }),
    ).toThrow();
  });
});

describe('InteractionRequestSchema', () => {
  it('accepts a valid request', () => {
    expect(
      InteractionRequestSchema.parse({ dedupHash: 'b'.repeat(32), interaction: 'LIKED' }),
    ).toBeTruthy();
  });

  it('rejects a malformed hash', () => {
    expect(() =>
      InteractionRequestSchema.parse({ dedupHash: 'short', interaction: 'LIKED' }),
    ).toThrow();
  });
});
