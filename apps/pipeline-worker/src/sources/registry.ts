import pLimit from 'p-limit';
import { MAX_ITEM_AGE_HOURS } from '@bytebulletin/shared';
import type { Logger } from 'pino';
import { fetchHackerNews } from './hackernews';
import { isNoiseTitle } from './noise';
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
];

/**
 * Fetch every source with per-source fault isolation: a dead feed logs a warning
 * and contributes nothing. Items older than MAX_ITEM_AGE_HOURS are dropped.
 */
export async function fetchAllSources(log: Logger): Promise<RawItem[]> {
  const limit = pLimit(5);
  const tasks: Array<Promise<RawItem[]>> = [
    limit(() => fetchHackerNews()),
    ...RSS_FEEDS.map((feed) => limit(() => fetchRssFeed(feed.url, feed.name))),
  ];
  const names = ['Hacker News', ...RSS_FEEDS.map((f) => f.name)];

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
