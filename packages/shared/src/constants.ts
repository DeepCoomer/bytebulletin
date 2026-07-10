export const CATEGORIES = [
  'Architecture',
  'Frontend-Performance',
  'AI-Infrastructure',
  'DevOps-Cloud',
  'General-Tech',
] as const;

export const INTERACTIONS = ['LIKED', 'DISLIKED', 'NONE'] as const;

export const EMBEDDING_DIM = 384;
export const EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2';
export const LLM_MODEL = 'llama-3.3-70b-versatile';

export const DB_NAME = 'bytebulletin';
export const DIGESTS_COLLECTION = 'digests';

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
