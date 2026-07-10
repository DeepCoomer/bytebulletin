'use client';

import { useEffect, useState } from 'react';
import type { Interaction } from '@bytebulletin/shared/client';
import type { DigestJson } from '@/lib/data';
import { CATEGORY_STYLES, relativeTime } from './DigestCard';
import { getActionToken } from './SettingsSheet';

export function DigestModal({ digest, onClose }: { digest: DigestJson; onClose: () => void }) {
  const [interaction, setInteraction] = useState<Interaction>(digest.userInteraction);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

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
    <div className="fixed inset-0 z-60 flex items-end justify-center sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={digest.title}
        className="relative max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-t-xl border border-edge bg-surface p-6 sm:rounded-xl"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 rounded p-1 text-ink-faint transition-colors hover:text-ink"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
            <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        <div className="mb-3 flex flex-wrap items-center gap-2 pr-8 text-xs text-ink-faint">
          <span
            className={`rounded-full px-2 py-0.5 font-medium ${CATEGORY_STYLES[digest.category]}`}
          >
            {digest.category.replace('-', ' ')}
          </span>
          <span>{digest.sourceName}</span>
          <span aria-hidden>·</span>
          <time dateTime={digest.createdAt}>{relativeTime(digest.createdAt)}</time>
        </div>

        <h2 className="text-lg font-bold leading-snug text-ink">{digest.title}</h2>

        <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-ink-faint">
          Why it matters
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-ink-dim">
          {digest.summary.impactAnalysis}
        </p>

        <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-ink-faint">
          Key takeaways
        </h3>
        <ul className="mt-1 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ink-dim marker:text-accent/60">
          {digest.summary.bulletPoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>

        <a
          href={digest.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-canvas transition-opacity hover:opacity-90"
        >
          Read original →
        </a>

        <div className="mt-5 flex items-center gap-2 border-t border-edge pt-4">
          <button
            onClick={() => sendInteraction('LIKED')}
            aria-pressed={interaction === 'LIKED'}
            className={`rounded px-2 py-1 text-xs transition-colors ${
              interaction === 'LIKED'
                ? 'bg-emerald-500/20 text-emerald-300'
                : 'bg-raised text-ink-dim hover:bg-edge-hi hover:text-ink'
            }`}
          >
            👍 More like this
          </button>
          <button
            onClick={() => sendInteraction('DISLIKED')}
            aria-pressed={interaction === 'DISLIKED'}
            className={`rounded px-2 py-1 text-xs transition-colors ${
              interaction === 'DISLIKED'
                ? 'bg-rose-500/20 text-rose-300'
                : 'bg-raised text-ink-dim hover:bg-edge-hi hover:text-ink'
            }`}
          >
            👎 Less
          </button>
          {error && <span className="text-xs text-rose-400">{error}</span>}
        </div>
      </div>
    </div>
  );
}
