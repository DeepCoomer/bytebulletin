import { describe, expect, it } from 'vitest';
import { cosineSimilarity } from './embed';
import { applyFeedback } from './profile';

const base = [1, 0, 0];
const likedDir = [0, 1, 0];
const dislikedDir = [0, 0, 1];

describe('applyFeedback', () => {
  it('returns the base unchanged (normalized) with no feedback', () => {
    expect(applyFeedback(base, [], [])).toEqual([1, 0, 0]);
  });

  it('pulls the profile toward liked embeddings', () => {
    const adjusted = applyFeedback(base, [likedDir], []);
    expect(cosineSimilarity(adjusted, likedDir)).toBeGreaterThan(cosineSimilarity(base, likedDir));
    // still mostly the base profile — feedback nudges, it doesn't replace
    expect(cosineSimilarity(adjusted, base)).toBeGreaterThan(0.8);
  });

  it('pushes the profile away from disliked embeddings', () => {
    const adjusted = applyFeedback(base, [], [dislikedDir]);
    expect(cosineSimilarity(adjusted, dislikedDir)).toBeLessThan(
      cosineSimilarity(base, dislikedDir),
    );
  });

  it('stays unit length after adjustment', () => {
    const adjusted = applyFeedback(base, [likedDir], [dislikedDir]);
    expect(Math.hypot(...adjusted)).toBeCloseTo(1);
  });

  it('likes weigh heavier than dislikes', () => {
    const towardLiked = applyFeedback(base, [likedDir], []);
    const awayDisliked = applyFeedback(base, [], [likedDir]);
    const pull = cosineSimilarity(towardLiked, likedDir) - cosineSimilarity(base, likedDir);
    const push = cosineSimilarity(base, likedDir) - cosineSimilarity(awayDisliked, likedDir);
    expect(pull).toBeGreaterThan(push);
  });
});
