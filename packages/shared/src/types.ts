import type { z } from 'zod';
import type {
  CategorySchema,
  PushSubscriptionSchema,
  DigestApiSchema,
  DigestSchema,
  InteractionSchema,
  LlmOutputSchema,
  PipelineConfigSchema,
  RunSummarySchema,
  SummarySchema,
} from './schemas';

export type Category = z.infer<typeof CategorySchema>;
export type Interaction = z.infer<typeof InteractionSchema>;
export type Summary = z.infer<typeof SummarySchema>;
export type LlmOutput = z.infer<typeof LlmOutputSchema>;
export type Digest = z.infer<typeof DigestSchema>;
export type DigestApi = z.infer<typeof DigestApiSchema>;
export type PipelineConfig = z.infer<typeof PipelineConfigSchema>;
export type RunSummary = z.infer<typeof RunSummarySchema>;
export type PushSubscriptionDoc = z.infer<typeof PushSubscriptionSchema> & { createdAt: Date };
