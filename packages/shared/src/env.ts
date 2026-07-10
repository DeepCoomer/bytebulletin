import { z } from 'zod';
import { DEFAULT_MIN_SCORE } from './constants';

const WorkerEnvSchema = z.object({
  MONGODB_URI: z.string().startsWith('mongodb'),
  GROQ_API_KEY: z.string().min(1),
  MIN_SCORE: z.coerce.number().min(-1).max(1).default(DEFAULT_MIN_SCORE),
});

const WebEnvSchema = z.object({
  MONGODB_URI: z.string().startsWith('mongodb'),
  ACTION_TOKEN: z.string().min(16),
});

export type WorkerEnv = z.infer<typeof WorkerEnvSchema>;
export type WebEnv = z.infer<typeof WebEnvSchema>;

let workerEnvCache: WorkerEnv | undefined;
let webEnvCache: WebEnv | undefined;

/** Parse once, fail fast with a readable message. Worker-side vars. */
export function workerEnv(): WorkerEnv {
  workerEnvCache ??= WorkerEnvSchema.parse(process.env);
  return workerEnvCache;
}

/** Web-side vars (Next.js route handlers). */
export function webEnv(): WebEnv {
  webEnvCache ??= WebEnvSchema.parse(process.env);
  return webEnvCache;
}
