export interface RawItem {
  title: string;
  url: string;
  sourceName: string;
  publishedAt: Date;
  /** RSS snippet, used as extraction fallback when the page fetch fails. */
  snippet?: string;
}
