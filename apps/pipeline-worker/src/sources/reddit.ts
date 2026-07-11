import { isAxiosError } from 'axios';
import Parser from 'rss-parser';
import { http } from '../http';
import type { RawItem } from './types';

const parser = new Parser();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Reddit entries link to the comments page; the entry body contains the
 * external article as `<a href="…">[link]</a>`. Prefer that (real article to
 * extract); self-posts fall back to the comments URL + selftext snippet.
 */
export function extractExternalUrl(contentHtml: string): string | undefined {
  const match = contentHtml.match(/<a href="([^"]+)">\s*\[link\]\s*<\/a>/);
  const url = match?.[1];
  // Media/self links back into reddit aren't articles — keep the comments URL then.
  if (!url || /(?:^|\.)(reddit\.com|redd\.it)\//.test(url)) return undefined;
  return url;
}

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#?\w+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchFeedXml(subreddit: string): Promise<string> {
  const url = `https://www.reddit.com/r/${subreddit}/top/.rss?t=day&limit=25`;
  try {
    return (await http.get<string>(url, { responseType: 'text' })).data;
  } catch (err) {
    // Reddit's per-IP limiter recovers in seconds — one patient retry usually lands.
    if (isAxiosError(err) && err.response?.status === 429) {
      await sleep(15_000);
      return (await http.get<string>(url, { responseType: 'text' })).data;
    }
    throw err;
  }
}

export async function fetchReddit(subreddit: string): Promise<RawItem[]> {
  const res = { data: await fetchFeedXml(subreddit) };
  const feed = await parser.parseString(res.data);
  const items: RawItem[] = [];
  for (const item of feed.items) {
    const publishedAt = item.isoDate ?? item.pubDate;
    if (!item.title || !item.link || !publishedAt) continue;
    const content = item.content ?? '';
    items.push({
      title: item.title,
      url: extractExternalUrl(content) ?? item.link,
      sourceName: `r/${subreddit}`,
      publishedAt: new Date(publishedAt),
      snippet: stripHtml(content).slice(0, 2000),
    });
  }
  return items;
}
