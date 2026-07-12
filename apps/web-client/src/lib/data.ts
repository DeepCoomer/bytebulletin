import { getDigestsCollection, webEnv, type Digest } from '@bytebulletin/shared';

/** Digest as passed to client components / returned by the API: no embedding, ISO date. */
export type DigestJson = Omit<Digest, 'embedding' | 'createdAt'> & { createdAt: string };

export const FEED_LIMIT = 100;

export async function getDigests(before?: Date): Promise<DigestJson[]> {
  const env = webEnv();
  const digests = await getDigestsCollection(env.MONGODB_URI);
  const docs = await digests
    .find(before ? { createdAt: { $lt: before } } : {}, { projection: { _id: 0, embedding: 0 } })
    .sort({ createdAt: -1, score: -1 })
    .limit(FEED_LIMIT)
    .toArray();
  return docs.map((d) => ({ ...d, createdAt: d.createdAt.toISOString() }));
}

/** Single-digest lookup for notification deep links that outrun the page's ISR cache. */
export async function getDigestByHash(dedupHash: string): Promise<DigestJson | null> {
  const env = webEnv();
  const digests = await getDigestsCollection(env.MONGODB_URI);
  const doc = await digests.findOne({ dedupHash }, { projection: { _id: 0, embedding: 0 } });
  return doc ? { ...doc, createdAt: doc.createdAt.toISOString() } : null;
}
