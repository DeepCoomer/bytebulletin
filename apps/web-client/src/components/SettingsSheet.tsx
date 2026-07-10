'use client';

import { useEffect, useState } from 'react';

const TOKEN_KEY = 'bytebulletin:action-token';

export function getActionToken(): string {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(TOKEN_KEY) ?? '';
}

/** One-time paste of the ACTION_TOKEN that authorizes like/dislike writes. */
export function SettingsSheet() {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState('');

  useEffect(() => {
    setToken(getActionToken());
  }, []);

  function save() {
    window.localStorage.setItem(TOKEN_KEY, token.trim());
    setOpen(false);
  }

  return (
    <div className="text-xs text-stone-500 dark:text-stone-400">
      <button onClick={() => setOpen(!open)} className="hover:underline">
        {open ? 'Close settings' : 'Settings'}
      </button>
      {open && (
        <div className="mt-3 flex max-w-sm items-center gap-2">
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Action token"
            className="w-full rounded border border-stone-300 bg-white px-2 py-1 text-sm dark:border-stone-700 dark:bg-stone-900"
          />
          <button
            onClick={save}
            className="rounded bg-stone-900 px-3 py-1 text-sm text-stone-50 dark:bg-stone-100 dark:text-stone-900"
          >
            Save
          </button>
        </div>
      )}
    </div>
  );
}
