import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import pLimit from 'p-limit';
import { pino } from 'pino';
import {
  DigestSchema,
  MAX_SYNTHESIZED_PER_RUN,
  ensureIndexes,
  getDigestsCollection,
  closeMongoClient,
  workerEnv,
  type Digest,
} from '@bytebulletin/shared';
import { dedupHash } from './dedup.js';
import { cosineSimilarity, embed } from './embed.js';
import { extractArticle } from './extract.js';
import { getProfileVector } from './profile.js';
import { fetchAllSources } from './sources/registry.js';
import type { RawItem } from './sources/types.js';
import { createGroqClient, synthesize } from './synthesize.js';
import { findExistingHashes, storeDigest } from './store.js';

// Works from both the package dir (pnpm --filter) and the repo root.
loadEnv({ path: [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../../.env')], quiet: true });

const log = pino({ level: process.env.LOG_LEVEL ?? 'info' });

interface ScoredItem {
  item: RawItem;
  hash: string;
  text: string;
  degraded: boolean;
  embedding: number[];
  score: number;
}

async function run(): Promise<void> {
  const startedAt = Date.now();
  const env = workerEnv();
  const groq = createGroqClient(env.GROQ_API_KEY);
  const digests = await getDigestsCollection(env.MONGODB_URI);
  await ensureIndexes(env.MONGODB_URI);

  const counters = {
    fetched: 0,
    deduped: 0,
    extracted: 0,
    kept: 0,
    synthesized: 0,
    stored: 0,
    failures: 0,
  };

  // 1. Ingest
  const rawItems = await fetchAllSources(log);
  counters.fetched = rawItems.length;
  log.info({ fetched: counters.fetched }, 'ingestion complete');

  // 2. Pre-dedup: within-batch first, then against Mongo — before any expensive work.
  const byHash = new Map<string, RawItem>();
  for (const item of rawItems) {
    const hash = dedupHash(item.title);
    if (!byHash.has(hash)) byHash.set(hash, item);
  }
  const existing = await findExistingHashes(digests, [...byHash.keys()]);
  const fresh = [...byHash.entries()].filter(([hash]) => !existing.has(hash));
  counters.deduped = counters.fetched - fresh.length;
  log.info({ fresh: fresh.length, deduped: counters.deduped }, 'dedup complete');

  // 3+4. Extract and score (embedding model is a process singleton; fetches are limited).
  const profile = await getProfileVector();
  const extractLimit = pLimit(5);
  const scored: ScoredItem[] = [];
  await Promise.all(
    fresh.map(([hash, item]) =>
      extractLimit(async () => {
        try {
          const { text, degraded } = await extractArticle(item);
          counters.extracted++;
          const embedding = await embed(text);
          // Degraded items were scored on snippet/title only — penalize slightly.
          const score = cosineSimilarity(embedding, profile) - (degraded ? 0.05 : 0);
          scored.push({ item, hash, text, degraded, embedding, score });
        } catch (err) {
          counters.failures++;
          log.warn({ url: item.url, err: String(err) }, 'extract/score failed');
        }
      }),
    ),
  );

  const kept = scored
    .filter((s) => s.score >= env.MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_SYNTHESIZED_PER_RUN);
  counters.kept = kept.length;
  log.info({ scored: scored.length, kept: kept.length, minScore: env.MIN_SCORE }, 'scoring complete');

  // 5+6. Synthesize and store.
  const llmLimit = pLimit(2);
  await Promise.all(
    kept.map((s) =>
      llmLimit(async () => {
        try {
          const llmOutput = await synthesize(groq, s.text);
          counters.synthesized++;
          const digest: Digest = DigestSchema.parse({
            title: s.item.title,
            sourceUrl: s.item.url,
            sourceName: s.item.sourceName,
            dedupHash: s.hash,
            score: Math.max(-1, Math.min(1, s.score)),
            category: llmOutput.category,
            summary: llmOutput.summary,
            embedding: s.embedding,
            userInteraction: 'NONE',
            createdAt: new Date(),
          });
          if (await storeDigest(digests, digest)) counters.stored++;
        } catch (err) {
          counters.failures++;
          log.warn({ url: s.item.url, err: String(err) }, 'synthesize/store failed');
        }
      }),
    ),
  );

  const durationMs = Date.now() - startedAt;
  log.info({ ...counters, durationMs }, 'run summary');

  // A run that fetched items but stored nothing (and wasn't 100% duplicates) is a failure.
  if (counters.fetched > 0 && counters.stored === 0 && counters.deduped < counters.fetched) {
    process.exitCode = 1;
    log.error('run stored nothing despite fresh items — check upstream failures');
  }
}

run()
  .catch((err) => {
    log.fatal({ err: String(err) }, 'pipeline crashed');
    process.exitCode = 1;
  })
  .finally(() => closeMongoClient());
