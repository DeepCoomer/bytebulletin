'use client';

import type { Category } from '@bytebulletin/shared/client';
import type { DigestJson } from '@/lib/data';

export const CATEGORY_STYLES: Record<Category, string> = {
  Architecture: 'bg-accent/10 text-accent',
  'Frontend-Performance': 'bg-emerald-400/10 text-emerald-300',
  'AI-Infrastructure': 'bg-fuchsia-400/10 text-fuchsia-300',
  'DevOps-Cloud': 'bg-sky-400/10 text-sky-300',
  'Databases-Storage': 'bg-amber-400/10 text-amber-300',
  Security: 'bg-rose-400/10 text-rose-300',
  'Languages-Runtimes': 'bg-cyan-400/10 text-cyan-300',
  'Open-Source-Tools': 'bg-lime-400/10 text-lime-300',
  'Trending-Discussions': 'bg-orange-400/10 text-orange-300',
  'General-Tech': 'bg-edge-hi/50 text-ink-dim',
};

export function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.round(diffMs / 3_600_000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function DigestCard({
  digest,
  onOpen,
}: {
  digest: DigestJson;
  onOpen: (digest: DigestJson) => void;
}) {
  return (
    <li className="list-none">
      <button
        onClick={() => onOpen(digest)}
        className="flex h-full w-full flex-col gap-2 rounded-lg border border-edge bg-surface p-4 text-left transition-colors hover:border-edge-hi hover:bg-raised"
      >
        <div className="flex items-center gap-2 text-xs text-ink-faint">
          <span
            className={`rounded-full px-2 py-0.5 font-medium ${CATEGORY_STYLES[digest.category]}`}
          >
            {digest.category.replace('-', ' ')}
          </span>
          <time dateTime={digest.createdAt}>{relativeTime(digest.createdAt)}</time>
        </div>

        <h2 className="line-clamp-2 text-sm font-semibold leading-snug text-ink">
          {digest.title}
        </h2>

        <p className="line-clamp-2 text-xs leading-relaxed text-ink-dim">
          {digest.summary.impactAnalysis}
        </p>

        <span className="mt-auto text-xs text-ink-faint">{digest.sourceName}</span>
      </button>
    </li>
  );
}
