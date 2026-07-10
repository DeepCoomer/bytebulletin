import { z } from 'zod';
import { CATEGORIES, EMBEDDING_DIM, INTERACTIONS } from './constants.js';

export const CategorySchema = z.enum(CATEGORIES);
export const InteractionSchema = z.enum(INTERACTIONS);

export const SummarySchema = z.object({
  impactAnalysis: z.string().min(1),
  bulletPoints: z.array(z.string().min(1)).min(1).max(5),
});

/** Exactly what the LLM must return — nothing more. */
export const LlmOutputSchema = z.object({
  category: CategorySchema,
  summary: SummarySchema,
});

export const DigestSchema = z.object({
  title: z.string().min(1),
  sourceUrl: z.url(),
  sourceName: z.string().min(1),
  dedupHash: z.string().length(32),
  score: z.number().min(-1).max(1),
  category: CategorySchema,
  summary: SummarySchema,
  embedding: z.array(z.number()).length(EMBEDDING_DIM),
  userInteraction: InteractionSchema.default('NONE'),
  createdAt: z.date(),
});

/** Digest as served by GET /api/digests (no embedding — it's heavy and private to the pipeline). */
export const DigestApiSchema = DigestSchema.omit({ embedding: true }).extend({
  createdAt: z.coerce.date(),
});

export const InteractionRequestSchema = z.object({
  dedupHash: z.string().length(32),
  interaction: InteractionSchema,
});
