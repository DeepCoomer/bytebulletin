/**
 * Recurring community meta-threads and job posts that slip through source-level
 * filters. They carry no article body, so they reach scoring as title-only
 * (degraded) items and score erratically — cheaper to drop them by title.
 */
const NOISE_PATTERNS: readonly RegExp[] = [
  /\bis hiring\b/i,
  /who(?:'|’)?s hiring/i,
  /who wants to be hired/i,
  /seeking freelancer/i,
  /what are you doing this week(?:end)?/i,
  /^(?:ask|tell) hn\b/i,
  /^poll:/i,
  /weekly (?:thread|discussion|chat)/i,
];

export function isNoiseTitle(title: string): boolean {
  return NOISE_PATTERNS.some((p) => p.test(title));
}
