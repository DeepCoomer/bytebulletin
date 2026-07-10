'use client';

import { useState } from 'react';
import type { Category, Interaction } from '@bytebulletin/shared/client';
import type { DigestJson } from '@/lib/data';
import { getActionToken } from './SettingsSheet';

const CATEGORY_STYLES: Record<Category, string> = {
  Architecture: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300',
  'Frontend-Performance': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  'AI-Infrastructure': 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
  'DevOps-Cloud': 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300',
  'General-Tech': 'bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
};

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.round(diffMs / 3_600_000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function DigestCard({ digest }: { digest: DigestJson }) {
  const [interaction, setInteraction] = useState<Interaction>(digest.userInteraction);
  const [error, setError] = useState<string | null>(null);

  async function sendInteraction(next: Interaction) {
    const token = getActionToken();
    if (!token) {
      setError('Set your action token in settings first.');
      return;
    }
    const previous = interaction;
    const value = next === previous ? 'NONE' : next; // tap again to undo
    setInteraction(value);
    setError(null);
    const res = await fetch('/api/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ dedupHash: digest.dedupHash, interaction: value }),
    }).catch(() => null);
    if (!res?.ok) {
      setInteraction(previous);
      setError(res?.status === 401 ? 'Invalid token.' : 'Failed to save — try again.');
    }
  }

  return (
    <li className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <div className="mb-2 flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
        <span className={`rounded-full px-2 py-0.5 font-medium ${CATEGORY_STYLES[digest.category]}`}>
          {digest.category}
        </span>
        <span>{digest.sourceName}</span>
        <span aria-hidden>·</span>
        <time dateTime={digest.createdAt}>{relativeTime(digest.createdAt)}</time>
      </div>

      <h2 className="text-base font-semibold leading-snug">
        <a
          href={digest.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
        >
          {digest.title}
        </a>
      </h2>

      <p className="mt-2 text-sm text-stone-700 dark:text-stone-300">
        {digest.summary.impactAnalysis}
      </p>

      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-stone-600 dark:text-stone-400">
        {digest.summary.bulletPoints.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={() => sendInteraction('LIKED')}
          aria-pressed={interaction === 'LIKED'}
          className={`rounded px-2 py-1 text-xs ${
            interaction === 'LIKED'
              ? 'bg-emerald-600 text-white'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-stone-700'
          }`}
        >
          👍 More like this
        </button>
        <button
          onClick={() => sendInteraction('DISLIKED')}
          aria-pressed={interaction === 'DISLIKED'}
          className={`rounded px-2 py-1 text-xs ${
            interaction === 'DISLIKED'
              ? 'bg-rose-600 text-white'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-stone-700'
          }`}
        >
          👎 Less
        </button>
        {error && <span className="text-xs text-rose-600 dark:text-rose-400">{error}</span>}
      </div>
    </li>
  );
}
