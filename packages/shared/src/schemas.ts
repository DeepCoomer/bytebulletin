import { z } from 'zod';
import { CATEGORIES, EMBEDDING_DIM, INTERACTIONS } from './constants';

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

/** Owner-tunable pipeline knobs, stored as a singleton doc; every field optional (fallback: code defaults). */
export const PipelineConfigSchema = z.object({
  minScore: z.number().min(-1).max(1).optional(),
  maxSynthesizedPerRun: z.number().int().min(1).max(100).optional(),
  interestStatements: z.array(z.string().min(3)).min(1).max(20).optional(),
});

/** A browser PushSubscription, stored per owner device. */
export const PushSubscriptionSchema = z.object({
  endpoint: z.url(),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

/** One pipeline run's outcome, recorded for the owner dashboard. */
export const RunSummarySchema = z.object({
  startedAt: z.coerce.date(),
  durationMs: z.number().int().min(0),
  fetched: z.number().int(),
  deduped: z.number().int(),
  extracted: z.number().int(),
  kept: z.number().int(),
  synthesized: z.number().int(),
  stored: z.number().int(),
  failures: z.number().int(),
  pruned: z.number().int().default(0),
  likedSignals: z.number().int().default(0),
  dislikedSignals: z.number().int().default(0),
  success: z.boolean(),
});
