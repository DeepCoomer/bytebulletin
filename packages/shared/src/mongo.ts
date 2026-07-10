import { MongoClient, type Collection } from 'mongodb';
import { DB_NAME, DIGESTS_COLLECTION } from './constants.js';
import type { Digest } from './types.js';

// Cached on globalThis so Next.js dev-server hot reloads reuse one connection
// instead of leaking a client per recompile. Harmless in the worker (single process).
const globalWithMongo = globalThis as typeof globalThis & {
  _bytebulletinMongo?: Promise<MongoClient>;
};

export function getMongoClient(uri: string): Promise<MongoClient> {
  globalWithMongo._bytebulletinMongo ??= new MongoClient(uri).connect();
  return globalWithMongo._bytebulletinMongo;
}

export async function getDigestsCollection(uri: string): Promise<Collection<Digest>> {
  const client = await getMongoClient(uri);
  return client.db(DB_NAME).collection<Digest>(DIGESTS_COLLECTION);
}

/** Idempotent — createIndex is a no-op when the index already exists. */
export async function ensureIndexes(uri: string): Promise<void> {
  const digests = await getDigestsCollection(uri);
  await digests.createIndex({ dedupHash: 1 }, { unique: true });
  await digests.createIndex({ createdAt: -1, score: -1 });
}

export async function closeMongoClient(): Promise<void> {
  if (globalWithMongo._bytebulletinMongo) {
    const client = await globalWithMongo._bytebulletinMongo;
    await client.close();
    globalWithMongo._bytebulletinMongo = undefined;
  }
}
