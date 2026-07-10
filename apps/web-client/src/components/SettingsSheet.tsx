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
    <div className="text-xs text-ink-faint">
      <button onClick={() => setOpen(!open)} className="transition-colors hover:text-accent">
        {open ? 'Close settings' : 'Settings'}
      </button>
      {open && (
        <div className="mt-3 flex max-w-sm items-center gap-2">
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Action token"
            className="w-full rounded border border-edge bg-raised px-2 py-1 text-sm text-ink outline-none focus:border-accent"
          />
          <button
            onClick={save}
            className="rounded bg-accent px-3 py-1 text-sm font-medium text-canvas"
          >
            Save
          </button>
        </div>
      )}
    </div>
  );
}
