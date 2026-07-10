import type { z } from 'zod';
import type {
  CategorySchema,
  DigestApiSchema,
  DigestSchema,
  InteractionSchema,
  LlmOutputSchema,
  SummarySchema,
} from './schemas.js';

export type Category = z.infer<typeof CategorySchema>;
export type Interaction = z.infer<typeof InteractionSchema>;
export type Summary = z.infer<typeof SummarySchema>;
export type LlmOutput = z.infer<typeof LlmOutputSchema>;
export type Digest = z.infer<typeof DigestSchema>;
export type DigestApi = z.infer<typeof DigestApiSchema>;
