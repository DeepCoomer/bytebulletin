import { z } from 'zod';
import { http } from '../http';
import type { RawItem } from './types';

const HnResponseSchema = z.object({
  hits: z.array(
    z.object({
      title: z.string().nullish(),
      url: z.string().nullish(),
      created_at: z.string(),
    }),
  ),
});

const ENDPOINTS = [
  'https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=50',
  'https://hn.algolia.com/api/v1/search_by_date?tags=story&numericFilters=points%3E100&hitsPerPage=50',
];

export async function fetchHackerNews(): Promise<RawItem[]> {
  const items: RawItem[] = [];
  for (const endpoint of ENDPOINTS) {
    const res = await http.get(endpoint);
    const { hits } = HnResponseSchema.parse(res.data);
    for (const hit of hits) {
      // Ask HN / text posts have no external URL — skip them.
      if (!hit.title || !hit.url) continue;
      items.push({
        title: hit.title,
        url: hit.url,
        sourceName: 'Hacker News',
        publishedAt: new Date(hit.created_at),
      });
    }
  }
  return items;
}
