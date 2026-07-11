export const CATEGORIES = [
  'Architecture',
  'Frontend-Performance',
  'AI-Infrastructure',
  'DevOps-Cloud',
  'Databases-Storage',
  'Security',
  'Languages-Runtimes',
  'Backend-Engineering',
  'Open-Source-Tools',
  'Trending-Discussions',
  'India-Tech',
  'General-Tech',
] as const;

export const INTERACTIONS = ['LIKED', 'DISLIKED', 'NONE'] as const;

export const EMBEDDING_DIM = 384;
export const EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2';
export const LLM_MODEL = 'llama-3.3-70b-versatile';

export const DB_NAME = 'bytebulletin';
export const DIGESTS_COLLECTION = 'digests';
export const RUNS_COLLECTION = 'runs';
export const PUSH_SUBSCRIPTIONS_COLLECTION = 'push_subscriptions';
export const CONFIG_COLLECTION = 'config';
export const CONFIG_KEY = 'global';

/** Unliked digests older than this are pruned at the end of each run. */
export const PRUNE_AFTER_DAYS = 90;

/**
 * Default developer-interest profile — the centroid of these embeddings is the
 * base scoring vector. Owner overrides live in the config collection
 * (dashboard → Interest statements) and take precedence at run time.
 */
export const DEFAULT_INTEREST_STATEMENTS: readonly string[] = [
  'distributed systems trade-offs, consistency models, and consensus protocols',
  'database internals, indexing strategies, and query optimization',
  'Next.js, React, and frontend performance optimization case studies',
  'Node.js and TypeScript backend architecture patterns',
  'cloud infrastructure scaling, cost engineering, and postmortems',
  'LLM inference infrastructure, embeddings, and AI system design',
  'API design, caching strategies, and service reliability engineering',
  'CI/CD pipelines, containerization, and deployment architecture',
  'backend engineering: server-side frameworks, message queues, and runtime performance',
  'Indian technology industry, startup ecosystem, and developer community news',
];

/** Default cosine-similarity keep-threshold (overridable via MIN_SCORE env). */
export const DEFAULT_MIN_SCORE = 0.35;
/** Max scored items per run that proceed to LLM synthesis. */
export const MAX_SYNTHESIZED_PER_RUN = 30;
/** Article text is truncated to this length before LLM synthesis. */
export const MAX_ARTICLE_CHARS = 8000;
/** Items older than this are dropped at ingestion. */
export const MAX_ITEM_AGE_HOURS = 48;
/** HTTP fetch timeout for article/feed retrieval. */
export const FETCH_TIMEOUT_MS = 5000;
