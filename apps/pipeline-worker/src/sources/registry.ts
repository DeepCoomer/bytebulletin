import pLimit from 'p-limit';
import { MAX_ITEM_AGE_HOURS } from '@bytebulletin/shared';
import type { Logger } from 'pino';
import { fetchHackerNews } from './hackernews';
import { isNoiseTitle } from './noise';
import { fetchReddit } from './reddit';
import { fetchRssFeed } from './rss';
import type { RawItem } from './types';

export const RSS_FEEDS: ReadonlyArray<{ name: string; url: string }> = [
  { name: 'Cloudflare Blog', url: 'https://blog.cloudflare.com/rss/' },
  { name: 'Netflix TechBlog', url: 'https://netflixtechblog.com/feed' },
  { name: 'Meta Engineering', url: 'https://engineering.fb.com/feed/' },
  { name: 'Stripe Blog', url: 'https://stripe.com/blog/feed.rss' },
  { name: 'GitHub Engineering', url: 'https://github.blog/engineering/feed/' },
  { name: 'Vercel Blog', url: 'https://vercel.com/atom' },
  { name: 'AWS Architecture', url: 'https://aws.amazon.com/blogs/architecture/feed/' },
  { name: 'Lobsters', url: 'https://lobste.rs/rss' },
  // Trial (2026-07-12): dev.to tag feeds — cherry-picked tags spanning
  // several categories (not the full firehose) to keep signal-to-noise in
  // line with the curated blog list. Note: unlike HN (points>100) and Reddit
  // (top/day), these feeds are chronological, not popularity-sorted, so a
  // lower hit rate through MIN_SCORE is expected — that's fine, it's the
  // filter doing its job. The tag is only the ingestion source; the LLM
  // still assigns the final category from the article content. Remove this
  // block if it doesn't earn its keep after a couple weeks.
  { name: 'DEV Community (architecture)', url: 'https://dev.to/feed/tag/architecture' },
  { name: 'DEV Community (backend)', url: 'https://dev.to/feed/tag/backend' },
  { name: 'DEV Community (security)', url: 'https://dev.to/feed/tag/security' },
  { name: 'DEV Community (devops)', url: 'https://dev.to/feed/tag/devops' },
  { name: 'DEV Community (ai)', url: 'https://dev.to/feed/tag/ai' },
];

/** Daily top posts; discussions and links both flow through scoring like any item. */
export const REDDIT_SUBS: readonly string[] = ['programming', 'ExperiencedDevs', 'developersIndia'];

/**
 * Fetch every source with per-source fault isolation: a dead feed logs a warning
 * and contributes nothing. Items older than MAX_ITEM_AGE_HOURS are dropped.
 */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function fetchAllSources(log: Logger): Promise<RawItem[]> {
  const limit = pLimit(5);
  // Reddit rate-limits parallel hits from one IP — serialize its subs with a stagger.
  const redditLimit = pLimit(1);
  const tasks: Array<Promise<RawItem[]>> = [
    limit(() => fetchHackerNews()),
    ...RSS_FEEDS.map((feed) => limit(() => fetchRssFeed(feed.url, feed.name))),
    ...REDDIT_SUBS.map((sub) =>
      redditLimit(async () => {
        await sleep(5000);
        return fetchReddit(sub);
      }),
    ),
  ];
  const names = [
    'Hacker News',
    ...RSS_FEEDS.map((f) => f.name),
    ...REDDIT_SUBS.map((s) => `r/${s}`),
  ];

  const results = await Promise.allSettled(tasks);
  const cutoff = Date.now() - MAX_ITEM_AGE_HOURS * 3600 * 1000;
  const items: RawItem[] = [];
  let noiseDropped = 0;
  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      log.warn({ source: names[i], err: String(result.reason) }, 'source failed');
      return;
    }
    for (const item of result.value) {
      if (item.publishedAt.getTime() < cutoff) continue;
      if (isNoiseTitle(item.title)) {
        noiseDropped++;
        continue;
      }
      items.push(item);
    }
  });
  if (noiseDropped > 0) log.info({ noiseDropped }, 'noise titles filtered');
  return items;
}
