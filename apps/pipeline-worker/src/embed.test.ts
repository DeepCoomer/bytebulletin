import { describe, expect, it } from 'vitest';
import { cosineSimilarity, meanVector } from './embed.js';

describe('cosineSimilarity', () => {
  it('is 1 for identical unit vectors', () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1);
  });

  it('is 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0, 0], [0, 1, 0])).toBeCloseTo(0);
  });

  it('is -1 for opposite vectors', () => {
    expect(cosineSimilarity([0, 1, 0], [0, -1, 0])).toBeCloseTo(-1);
  });

  it('throws on dimension mismatch', () => {
    expect(() => cosineSimilarity([1, 0], [1, 0, 0])).toThrow(/dimension mismatch/);
  });
});

describe('meanVector', () => {
  it('returns a unit-length mean', () => {
    const mean = meanVector([
      [1, 0],
      [0, 1],
    ]);
    const norm = Math.hypot(...mean);
    expect(norm).toBeCloseTo(1);
    expect(mean[0]).toBeCloseTo(mean[1]!);
  });

  it('throws on empty input', () => {
    expect(() => meanVector([])).toThrow();
  });
});
