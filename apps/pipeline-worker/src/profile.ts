import type { Collection } from 'mongodb';
import type { Digest } from '@bytebulletin/shared';
import { embed, meanVector } from './embed';

/**
 * The developer-interest profile. Edit these statements to retune what the
 * pipeline considers "high signal" — the centroid of their embeddings is the
 * base vector every article is scored against, before feedback adjustment.
 */
export const INTEREST_STATEMENTS: readonly string[] = [
  'distributed systems trade-offs, consistency models, and consensus protocols',
  'database internals, indexing strategies, and query optimization',
  'Next.js, React, and frontend performance optimization case studies',
  'Node.js and TypeScript backend architecture patterns',
  'cloud infrastructure scaling, cost engineering, and postmortems',
  'LLM inference infrastructure, embeddings, and AI system design',
  'API design, caching strategies, and service reliability engineering',
  'CI/CD pipelines, containerization, and deployment architecture',
];

/** Only interactions this recent influence the profile. */
const FEEDBACK_WINDOW_DAYS = 60;
const LIKE_WEIGHT = 0.4;
const DISLIKE_WEIGHT = 0.2;

/**
 * Rocchio-style adjustment: pull the profile toward liked embeddings, push it
 * away from disliked ones, re-normalize. Pure — unit tested.
 */
export function applyFeedback(
  base: readonly number[],
  liked: ReadonlyArray<readonly number[]>,
  disliked: ReadonlyArray<readonly number[]>,
): number[] {
  const v = [...base];
  if (liked.length > 0) {
    const mean = meanVector(liked);
    for (let i = 0; i < v.length; i++) v[i]! += LIKE_WEIGHT * mean[i]!;
  }
  if (disliked.length > 0) {
    const mean = meanVector(disliked);
    for (let i = 0; i < v.length; i++) v[i]! -= DISLIKE_WEIGHT * mean[i]!;
  }
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / norm);
}

export interface ProfileResult {
  vector: number[];
  likedSignals: number;
  dislikedSignals: number;
}

/**
 * Base centroid from the interest statements, adjusted by recent like/dislike
 * feedback when a collection is provided (embeddings were stored per digest at
 * ingestion time — no re-vectorization happens here).
 */
export async function getProfileVector(digests?: Collection<Digest>): Promise<ProfileResult> {
  const statementVectors = await Promise.all(INTEREST_STATEMENTS.map((s) => embed(s)));
  const base = meanVector(statementVectors);
  if (!digests) return { vector: base, likedSignals: 0, dislikedSignals: 0 };

  const since = new Date(Date.now() - FEEDBACK_WINDOW_DAYS * 86400 * 1000);
  const docs = await digests
    .find(
      { userInteraction: { $ne: 'NONE' }, createdAt: { $gte: since } },
      { projection: { embedding: 1, userInteraction: 1 } },
    )
    .toArray();
  const liked = docs.filter((d) => d.userInteraction === 'LIKED').map((d) => d.embedding);
  const disliked = docs.filter((d) => d.userInteraction === 'DISLIKED').map((d) => d.embedding);

  return {
    vector: applyFeedback(base, liked, disliked),
    likedSignals: liked.length,
    dislikedSignals: disliked.length,
  };
}
