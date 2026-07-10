'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { CATEGORIES, type Category } from '@bytebulletin/shared/client';
import type { DigestJson } from '@/lib/data';
import { DigestCard } from './DigestCard';
import { SettingsSheet } from './SettingsSheet';

async function fetcher(url: string): Promise<{ digests: DigestJson[] }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
  return res.json();
}

export function Feed({ initialDigests }: { initialDigests: DigestJson[] }) {
  const [category, setCategory] = useState<Category | 'All'>('All');
  const { data } = useSWR('/api/digests', fetcher, {
    fallbackData: { digests: initialDigests },
    revalidateOnFocus: false,
  });

  const digests = data?.digests ?? [];
  const visible = category === 'All' ? digests : digests.filter((d) => d.category === category);

  return (
    <div>
      <nav className="mb-6 flex flex-wrap gap-2" aria-label="Filter by category">
        {(['All', ...CATEGORIES] as const).map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              category === c
                ? 'bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900'
                : 'bg-stone-200 text-stone-600 hover:bg-stone-300 dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-stone-700'
            }`}
          >
            {c.replace('-', ' · ')}
          </button>
        ))}
      </nav>

      {visible.length === 0 ? (
        <div className="rounded-lg border border-dashed border-stone-300 p-10 text-center text-sm text-stone-500 dark:border-stone-700 dark:text-stone-400">
          {digests.length === 0
            ? 'No digests yet — the pipeline will fill this in on its next daily run.'
            : 'Nothing in this category right now.'}
        </div>
      ) : (
        <ul className="space-y-4">
          {visible.map((d) => (
            <DigestCard key={d.dedupHash} digest={d} />
          ))}
        </ul>
      )}

      <footer className="mt-10 border-t border-stone-200 pt-4 dark:border-stone-800">
        <SettingsSheet />
      </footer>
    </div>
  );
}
