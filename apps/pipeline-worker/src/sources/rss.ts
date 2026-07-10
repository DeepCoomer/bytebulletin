import Parser from 'rss-parser';
import { http } from '../http';
import type { RawItem } from './types';

const parser = new Parser();

export async function fetchRssFeed(feedUrl: string, sourceName: string): Promise<RawItem[]> {
  const res = await http.get<string>(feedUrl, { responseType: 'text' });
  const feed = await parser.parseString(res.data);
  const items: RawItem[] = [];
  for (const item of feed.items) {
    const publishedAt = item.isoDate ?? item.pubDate;
    if (!item.title || !item.link || !publishedAt) continue;
    items.push({
      title: item.title,
      url: item.link,
      sourceName,
      publishedAt: new Date(publishedAt),
      snippet: item.contentSnippet?.slice(0, 2000),
    });
  }
  return items;
}
