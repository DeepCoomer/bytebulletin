import type { Collection } from 'mongodb';
import type { Digest } from '@bytebulletin/shared';

/** Hashes from `hashes` that already exist in the collection. */
export async function findExistingHashes(
  digests: Collection<Digest>,
  hashes: readonly string[],
): Promise<Set<string>> {
  if (hashes.length === 0) return new Set();
  const docs = await digests
    .find({ dedupHash: { $in: [...hashes] } }, { projection: { dedupHash: 1 } })
    .toArray();
  return new Set(docs.map((d) => d.dedupHash));
}

/** Idempotent insert keyed on dedupHash. Returns true only when a new doc was created. */
export async function storeDigest(digests: Collection<Digest>, digest: Digest): Promise<boolean> {
  const res = await digests.updateOne(
    { dedupHash: digest.dedupHash },
    { $setOnInsert: digest },
    { upsert: true },
  );
  return res.upsertedCount === 1;
}
