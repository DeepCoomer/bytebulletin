'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { PipelineConfig, RunSummary } from '@bytebulletin/shared/client';

type AuthState = 'loading' | 'guest' | 'owner';

interface ConfigPayload {
  config: PipelineConfig;
  defaults: Required<PipelineConfig>;
}
type RunRow = Omit<RunSummary, 'startedAt'> & { startedAt: string };
interface InsightsPayload {
  byCategory: Array<{ _id: string; total: number }>;
  byInteraction: Array<{ _id: { category: string; interaction: string }; n: number }>;
  scoreStats: Array<{ _id: string; avgScore: number; n: number }>;
}

const inputCls =
  'w-full rounded border border-edge bg-raised px-3 py-2 text-sm text-ink outline-none focus:border-accent';
const sectionCls = 'rounded-xl border border-edge bg-surface p-5';
const h2Cls = 'text-sm font-semibold text-ink';

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
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Owner area</h1>
        {state === 'owner' && (
          <button
            onClick={logout}
            className="rounded bg-raised px-3 py-1.5 text-xs text-ink-dim transition-colors hover:bg-edge-hi hover:text-ink"
          >
            Sign out
          </button>
        )}
      </div>

      {state === 'loading' && <p className="text-sm text-ink-faint">…</p>}

      {state === 'guest' && (
        <div className={sectionCls}>
          <div className="flex items-center gap-2">
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
              className={inputCls}
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
        </div>
      )}

      {state === 'owner' && (
        <>
          <NotificationsSection />
          <ConfigSection />
          <RunsSection />
          <InsightsSection />
        </>
      )}

      <Link
        href="/"
        className="text-center text-sm text-ink-faint transition-colors hover:text-accent"
      >
        ← Back to feed
      </Link>
    </main>
  );
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function NotificationsSection() {
  const [status, setStatus] = useState<string>('');
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('Push is not supported in this browser.');
      return;
    }
    navigator.serviceWorker.getRegistration().then(async (reg) => {
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        setEnabled(true);
        setStatus('Notifications are on for this device.');
      }
    });
  }, []);

  async function enable() {
    setStatus('');
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      setStatus('Push not configured (missing public key).');
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      setStatus('Permission denied — allow notifications in browser settings.');
      return;
    }
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) {
      setStatus('No service worker — this works on the deployed site (or a production build), not in dev.');
      return;
    }
    try {
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
      });
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) throw new Error(String(res.status));
      setEnabled(true);
      setStatus('Notifications are on for this device.');
    } catch (err) {
      setStatus(`Subscription failed: ${String(err)}`);
    }
  }

  async function disable() {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      }).catch(() => null);
      await sub.unsubscribe();
    }
    setEnabled(false);
    setStatus('Notifications are off for this device.');
  }

  return (
    <section className={sectionCls}>
      <h2 className={h2Cls}>Notifications</h2>
      <p className="mt-1 text-xs text-ink-faint">
        One push per pipeline run: how many digests landed, plus the top headline. Quiet runs
        send nothing.
      </p>
      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={enabled ? disable : enable}
          className={
            enabled
              ? 'rounded bg-raised px-4 py-2 text-sm text-ink-dim transition-colors hover:bg-edge-hi hover:text-ink'
              : 'rounded bg-accent px-4 py-2 text-sm font-medium text-canvas transition-opacity hover:opacity-90'
          }
        >
          {enabled ? 'Disable on this device' : 'Enable on this device'}
        </button>
        {status && <span className="text-xs text-ink-dim">{status}</span>}
      </div>
    </section>
  );
}

function ConfigSection() {
  const [payload, setPayload] = useState<ConfigPayload | null>(null);
  const [minScore, setMinScore] = useState('');
  const [maxSynth, setMaxSynth] = useState('');
  const [statements, setStatements] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/config')
      .then((r) => r.json())
      .then((p: ConfigPayload) => {
        setPayload(p);
        setMinScore(String(p.config.minScore ?? p.defaults.minScore));
        setMaxSynth(String(p.config.maxSynthesizedPerRun ?? p.defaults.maxSynthesizedPerRun));
        setStatements((p.config.interestStatements ?? p.defaults.interestStatements).join('\n'));
      })
      .catch(() => setStatus('Failed to load config.'));
  }, []);

  async function save() {
    setStatus(null);
    const body: PipelineConfig = {
      minScore: Number(minScore),
      maxSynthesizedPerRun: Number(maxSynth),
      interestStatements: statements
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
    };
    const res = await fetch('/api/admin/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => null);
    setStatus(res?.ok ? 'Saved — applies from the next pipeline run.' : 'Save failed — check values.');
  }

  if (!payload) return <div className={sectionCls}>{status ?? 'Loading config…'}</div>;

  return (
    <section className={sectionCls}>
      <h2 className={h2Cls}>Pipeline tuning</h2>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="text-xs text-ink-dim">
          Min score (keep threshold)
          <input
            type="number"
            step="0.01"
            min="-1"
            max="1"
            value={minScore}
            onChange={(e) => setMinScore(e.target.value)}
            className={`${inputCls} mt-1`}
          />
        </label>
        <label className="text-xs text-ink-dim">
          Max articles per run
          <input
            type="number"
            min="1"
            max="100"
            value={maxSynth}
            onChange={(e) => setMaxSynth(e.target.value)}
            className={`${inputCls} mt-1`}
          />
        </label>
      </div>
      <label className="mt-3 block text-xs text-ink-dim">
        Interest statements (one per line — the profile the feed is scored against)
        <textarea
          value={statements}
          onChange={(e) => setStatements(e.target.value)}
          rows={10}
          className={`${inputCls} mt-1 font-mono text-xs leading-relaxed`}
        />
      </label>
      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={save}
          className="rounded bg-accent px-4 py-2 text-sm font-medium text-canvas transition-opacity hover:opacity-90"
        >
          Save
        </button>
        {status && <span className="text-xs text-ink-dim">{status}</span>}
      </div>
    </section>
  );
}

function RunsSection() {
  const [runs, setRuns] = useState<RunRow[] | null>(null);

  useEffect(() => {
    fetch('/api/admin/runs')
      .then((r) => r.json())
      .then((d) => setRuns(d.runs))
      .catch(() => setRuns([]));
  }, []);

  return (
    <section className={sectionCls}>
      <h2 className={h2Cls}>Pipeline runs</h2>
      {!runs ? (
        <p className="mt-2 text-xs text-ink-faint">Loading…</p>
      ) : runs.length === 0 ? (
        <p className="mt-2 text-xs text-ink-faint">
          No runs recorded yet — history starts with the next pipeline run.
        </p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {runs.map((run) => (
            <li key={run.startedAt} className="flex items-center gap-3 text-xs text-ink-dim">
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${run.success ? 'bg-emerald-400' : 'bg-rose-400'}`}
                title={run.success ? 'success' : 'failed'}
              />
              <span className="w-32 shrink-0">
                {new Date(run.startedAt).toLocaleString('en-IN', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <span>
                stored {run.stored}/{run.kept} kept · {run.fetched} fetched · {run.failures}{' '}
                failures · {Math.round(run.durationMs / 1000)}s
                {run.pruned > 0 && ` · pruned ${run.pruned}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function InsightsSection() {
  const [data, setData] = useState<InsightsPayload | null>(null);

  useEffect(() => {
    fetch('/api/admin/insights')
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, []);

  if (!data) return <section className={sectionCls}>Loading insights…</section>;

  const maxTotal = Math.max(1, ...data.byCategory.map((c) => c.total));
  const liked = data.byInteraction.filter((i) => i._id.interaction === 'LIKED');
  const disliked = data.byInteraction.filter((i) => i._id.interaction === 'DISLIKED');

  return (
    <section className={sectionCls}>
      <h2 className={h2Cls}>Insights</h2>

      <h3 className="mt-3 text-xs font-medium uppercase tracking-wide text-ink-faint">
        Stored by category
      </h3>
      <ul className="mt-2 space-y-1">
        {data.byCategory.map((c) => (
          <li key={c._id} className="flex items-center gap-2 text-xs text-ink-dim">
            <span className="w-40 shrink-0 truncate">{c._id}</span>
            <span
              className="h-2 rounded bg-accent/60"
              style={{ width: `${(c.total / maxTotal) * 100 * 0.6}%` }}
            />
            <span className="text-ink-faint">{c.total}</span>
          </li>
        ))}
      </ul>

      <h3 className="mt-4 text-xs font-medium uppercase tracking-wide text-ink-faint">
        Your feedback
      </h3>
      {liked.length === 0 && disliked.length === 0 ? (
        <p className="mt-2 text-xs text-ink-faint">No likes or dislikes yet.</p>
      ) : (
        <ul className="mt-2 space-y-1 text-xs text-ink-dim">
          {liked.map((i) => (
            <li key={`l-${i._id.category}`}>
              👍 {i._id.category}: {i.n}
            </li>
          ))}
          {disliked.map((i) => (
            <li key={`d-${i._id.category}`}>
              👎 {i._id.category}: {i.n}
            </li>
          ))}
        </ul>
      )}

      {data.scoreStats.length > 0 && (
        <>
          <h3 className="mt-4 text-xs font-medium uppercase tracking-wide text-ink-faint">
            Average relevance score
          </h3>
          <ul className="mt-2 space-y-1 text-xs text-ink-dim">
            {data.scoreStats.map((s) => (
              <li key={s._id}>
                {s._id === 'NONE' ? 'Unrated' : s._id.toLowerCase()}: {s.avgScore.toFixed(3)} ({s.n})
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
