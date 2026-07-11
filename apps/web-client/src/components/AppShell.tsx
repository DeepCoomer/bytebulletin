'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { CATEGORIES, type Category } from '@bytebulletin/shared/client';
import type { DigestJson } from '@/lib/data';
import { DigestCard, relativeTime } from './DigestCard';
import { DigestModal } from './DigestModal';

type Filter = Category | 'All';

async function fetcher(url: string): Promise<{ digests: DigestJson[] }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
  return res.json();
}

// UTC day keys: deterministic across server and client, so SSR never mismatches.
function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function dayLabel(key: string): string {
  const todayKey = new Date().toISOString().slice(0, 10);
  if (key === todayKey) return 'Today';
  const yesterdayKey = new Date(Date.now() - 86400_000).toISOString().slice(0, 10);
  if (key === yesterdayKey) return 'Yesterday';
  return new Date(`${key}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function groupByDay(digests: DigestJson[]): Array<{ key: string; items: DigestJson[] }> {
  const groups: Array<{ key: string; items: DigestJson[] }> = [];
  for (const d of digests) {
    const key = dayKey(d.createdAt);
    const last = groups[groups.length - 1];
    if (last?.key === key) last.items.push(d);
    else groups.push({ key, items: [d] });
  }
  return groups;
}

function Logo() {
  return (
    <span className="text-lg font-bold tracking-tight">
      Byte<span className="text-accent">Bulletin</span>
    </span>
  );
}

export function AppShell({ initialDigests }: { initialDigests: DigestJson[] }) {
  const [filter, setFilter] = useState<Filter>('All');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [active, setActive] = useState<DigestJson | null>(null);
  // Owner session unlocks feedback buttons; guests see a read-only app.
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setIsOwner(!!d.owner))
      .catch(() => {});
  }, []);

  // Older pages accumulate locally; exhausted = last page came back short.
  const [older, setOlder] = useState<DigestJson[]>([]);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [exhausted, setExhausted] = useState(false);

  const { data } = useSWR('/api/digests', fetcher, {
    fallbackData: { digests: initialDigests },
    revalidateOnFocus: false,
  });

  const digests = useMemo(() => {
    const seen = new Set<string>();
    return [...(data?.digests ?? []), ...older].filter((d) =>
      seen.has(d.dedupHash) ? false : (seen.add(d.dedupHash), true),
    );
  }, [data, older]);

  async function loadOlder() {
    const oldest = digests[digests.length - 1];
    if (!oldest || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const res = await fetch(`/api/digests?before=${encodeURIComponent(oldest.createdAt)}`);
      const body: { digests: DigestJson[] } = await res.json();
      setOlder((prev) => [...prev, ...body.digests]);
      if (body.digests.length < 100) setExhausted(true);
    } catch {
      // leave the button available for retry
    } finally {
      setLoadingOlder(false);
    }
  }

  const counts = useMemo(() => {
    const map = new Map<Filter, number>([['All', digests.length]]);
    for (const d of digests) map.set(d.category, (map.get(d.category) ?? 0) + 1);
    return map;
  }, [digests]);

  const visible = filter === 'All' ? digests : digests.filter((d) => d.category === filter);

  function selectFilter(f: Filter) {
    setFilter(f);
    setDrawerOpen(false);
  }

  return (
    <div className="md:flex">
      {/* Mobile top bar */}
      <header className="fixed inset-x-0 top-0 z-30 flex items-center gap-3 border-b border-edge bg-canvas/90 px-4 py-3 backdrop-blur md:hidden">
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="Open categories"
          className="rounded p-1 text-ink-dim hover:text-ink"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <rect x="2" y="4" width="16" height="2" rx="1" />
            <rect x="2" y="9" width="16" height="2" rx="1" />
            <rect x="2" y="14" width="16" height="2" rx="1" />
          </svg>
        </button>
        <Logo />
      </header>

      {/* Drawer backdrop (mobile) */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setDrawerOpen(false)}
          aria-hidden
        />
      )}

      {/* Sidebar / drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 transform flex-col border-r border-edge bg-surface transition-transform duration-200 md:sticky md:top-0 md:h-screen md:translate-x-0 ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-5 py-5">
          <Logo />
          <p className="mt-1 text-xs text-ink-faint">High-signal engineering news, daily.</p>
          {digests[0] && (
            <p className="mt-1 text-xs text-ink-faint">
              Updated {relativeTime(digests[0].createdAt)}
            </p>
          )}
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3" aria-label="Categories">
          {(['All', ...CATEGORIES] as const).map((c) => (
            <button
              key={c}
              onClick={() => selectFilter(c)}
              className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
                filter === c
                  ? 'bg-accent/10 font-medium text-accent'
                  : 'text-ink-dim hover:bg-raised hover:text-ink'
              }`}
            >
              <span>{c === 'All' ? 'All' : c.replace('-', ' ')}</span>
              <span className="text-xs text-ink-faint">{counts.get(c) ?? 0}</span>
            </button>
          ))}
        </nav>

        <div className="border-t border-edge px-5 py-4">
          <a
            href="https://www.deepcoomer.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-ink-faint transition-colors hover:text-accent"
          >
            Built by deepcoomer
          </a>
        </div>
      </aside>

      {/* Main grid */}
      <main className="min-w-0 flex-1 px-4 pb-10 pt-18 md:px-8 md:pt-8">
        {visible.length === 0 ? (
          <div className="mt-8 rounded-lg border border-dashed border-edge-hi p-10 text-center text-sm text-ink-dim">
            {digests.length === 0
              ? 'No digests yet — the pipeline will fill this in on its next daily run.'
              : 'Nothing in this category right now.'}
          </div>
        ) : (
          groupByDay(visible).map((group) => (
            <section key={group.key} className="mb-6">
              <h2 className="sticky top-14 z-10 -mx-1 mb-3 bg-canvas/95 px-1 py-1 text-xs font-semibold uppercase tracking-wide text-ink-faint backdrop-blur md:top-0">
                {dayLabel(group.key)}
              </h2>
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {group.items.map((d) => (
                  <DigestCard key={d.dedupHash} digest={d} onOpen={setActive} />
                ))}
              </ul>
            </section>
          ))
        )}

        {digests.length > 0 && !exhausted && (
          <div className="mt-2 text-center">
            <button
              onClick={loadOlder}
              disabled={loadingOlder}
              className="rounded-md bg-raised px-4 py-2 text-sm text-ink-dim transition-colors hover:bg-edge-hi hover:text-ink disabled:opacity-40"
            >
              {loadingOlder ? 'Loading…' : 'Load older'}
            </button>
          </div>
        )}
      </main>

      {active && <DigestModal digest={active} isOwner={isOwner} onClose={() => setActive(null)} />}
    </div>
  );
}
