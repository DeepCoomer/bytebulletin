import { createHash } from 'node:crypto';

/** Lowercase, collapse every non-alphanumeric run to one space, trim. */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** MD5 of the normalized title — the collection's unique key. */
export function dedupHash(title: string): string {
  return createHash('md5').update(normalizeTitle(title)).digest('hex');
}
