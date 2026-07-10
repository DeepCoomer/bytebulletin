'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { TOKEN_KEY, getActionToken } from '@/lib/token';

export default function SettingsPage() {
  const [token, setToken] = useState('');
  const [saved, setSaved] = useState(false);
  const [hasExisting, setHasExisting] = useState(false);

  useEffect(() => {
    setHasExisting(!!getActionToken());
  }, []);

  function save() {
    window.localStorage.setItem(TOKEN_KEY, token.trim());
    setToken('');
    setHasExisting(true);
    setSaved(true);
  }

  function clear() {
    window.localStorage.removeItem(TOKEN_KEY);
    setHasExisting(false);
    setSaved(false);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <div className="rounded-xl border border-edge bg-surface p-6">
        <h1 className="text-lg font-bold">Owner settings</h1>
        <p className="mt-1 text-sm text-ink-dim">
          Paste the action token to enable feedback buttons on this device. Status:{' '}
          {hasExisting ? (
            <span className="text-emerald-300">token set</span>
          ) : (
            <span className="text-ink-faint">no token</span>
          )}
        </p>

        <div className="mt-4 flex items-center gap-2">
          <input
            type="password"
            value={token}
            onChange={(e) => {
              setToken(e.target.value);
              setSaved(false);
            }}
            placeholder="Action token"
            className="w-full rounded border border-edge bg-raised px-3 py-2 text-sm text-ink outline-none focus:border-accent"
          />
          <button
            onClick={save}
            disabled={!token.trim()}
            className="rounded bg-accent px-4 py-2 text-sm font-medium text-canvas transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            Save
          </button>
        </div>

        <div className="mt-3 flex items-center gap-4 text-xs">
          {saved && <span className="text-emerald-300">Saved on this device.</span>}
          {hasExisting && (
            <button onClick={clear} className="text-ink-faint transition-colors hover:text-rose-300">
              Remove token
            </button>
          )}
        </div>
      </div>

      <Link
        href="/"
        className="mt-4 text-center text-sm text-ink-faint transition-colors hover:text-accent"
      >
        ← Back to feed
      </Link>
    </main>
  );
}
