import { embed, meanVector } from './embed';

/**
 * The developer-interest profile. Edit these statements to retune what the
 * pipeline considers "high signal" — the centroid of their embeddings is the
 * vector every article is scored against.
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

let profilePromise: Promise<number[]> | undefined;

/** Centroid of the interest-statement embeddings, unit length. Cached per process. */
export function getProfileVector(): Promise<number[]> {
  profilePromise ??= (async () => {
    const vectors = await Promise.all(INTEREST_STATEMENTS.map((s) => embed(s)));
    return meanVector(vectors);
  })();
  return profilePromise;
}
