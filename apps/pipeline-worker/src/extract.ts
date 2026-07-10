import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import { MAX_ARTICLE_CHARS } from '@bytebulletin/shared';
import { http } from './http.js';
import type { RawItem } from './sources/types.js';

export interface ExtractedArticle {
  text: string;
  /** True when we fell back to the RSS snippet/title instead of full article text. */
  degraded: boolean;
}

/** Pure HTML → readable text. Exported for offline tests. */
export function extractFromHtml(html: string, url: string): string | undefined {
  const dom = new JSDOM(html, { url });
  const article = new Readability(dom.window.document).parse();
  const text = article?.textContent?.replace(/\s+/g, ' ').trim();
  return text || undefined;
}

export async function extractArticle(item: RawItem): Promise<ExtractedArticle> {
  try {
    const res = await http.get<string>(item.url, { responseType: 'text' });
    const text = extractFromHtml(res.data, item.url);
    if (text) return { text: text.slice(0, MAX_ARTICLE_CHARS), degraded: false };
  } catch {
    // fall through to snippet fallback
  }
  const fallback = `${item.title}. ${item.snippet ?? ''}`.trim();
  return { text: fallback.slice(0, MAX_ARTICLE_CHARS), degraded: true };
}
