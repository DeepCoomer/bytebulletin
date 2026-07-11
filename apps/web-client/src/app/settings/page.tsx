'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type AuthState = 'loading' | 'guest' | 'owner';

export default function SettingsPage() {
  const [state, setState] = useState<AuthState>('loading');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setState(d.owner ? 'owner' : 'guest'))
      .catch(() => setState('guest'));
  }, []);

  async function login() {
    setBusy(true);
    setError(null);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    }).catch(() => null);
    setBusy(false);
    if (res?.ok) {
      setPassword('');
      setState('owner');
    } else {
      setError(res?.status === 401 ? 'Incorrect password.' : 'Something went wrong — try again.');
    }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
    setState('guest');
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <div className="rounded-xl border border-edge bg-surface p-6">
        <h1 className="text-lg font-bold">Owner area</h1>

        {state === 'loading' && <p className="mt-2 text-sm text-ink-faint">…</p>}

        {state === 'guest' && (
          <>
            <div className="mt-4 flex items-center gap-2">
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => e.key === 'Enter' && password && login()}
                placeholder="Password"
                autoFocus
                className="w-full rounded border border-edge bg-raised px-3 py-2 text-sm text-ink outline-none focus:border-accent"
              />
              <button
                onClick={login}
                disabled={!password || busy}
                className="rounded bg-accent px-4 py-2 text-sm font-medium text-canvas transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {busy ? '…' : 'Unlock'}
              </button>
            </div>
            {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}
          </>
        )}

        {state === 'owner' && (
          <>
            <p className="mt-2 text-sm text-ink-dim">
              Signed in on this device — feedback buttons are active for 30 days.
            </p>
            <button
              onClick={logout}
              className="mt-4 rounded bg-raised px-4 py-2 text-sm text-ink-dim transition-colors hover:bg-edge-hi hover:text-ink"
            >
              Sign out
            </button>
          </>
        )}
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
