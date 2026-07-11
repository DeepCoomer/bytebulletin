# ByteBulletin — Deployment & Infrastructure

Everything runs on free tiers: Vercel Hobby (web), GitHub Actions (pipeline cron),
MongoDB Atlas M0 (data), Groq free tier (LLM). Total: **$0/month**.

## 1. One-time provisioning

### MongoDB Atlas
1. Create a free **M0** cluster (region: pick one near Vercel's default `iad1`/US-East
   or near you — reads go through Vercel's server functions, so US-East minimizes
   API latency for cached misses).
2. Create database `bytebulletin`, collection `digests`.
3. Database user with `readWrite` on `bytebulletin` only.
4. **Network Access → allow `0.0.0.0/0`.** Required: GitHub Actions runners and
   Vercel functions have no stable IPs. The credential in the URI is the gate.
5. Copy the `mongodb+srv://…` connection string → this is `MONGODB_URI`.

### Groq
1. Create an account at console.groq.com → API key → `GROQ_API_KEY`.
2. Free-tier rate limits are generous for ~30–50 calls/day; the worker still caps
   Groq concurrency at 2 and backs off on 429.

### GitHub repository
1. Push the monorepo to GitHub (private is fine).
2. Repo **Settings → Secrets and variables → Actions → Secrets**: add
   `MONGODB_URI`, `GROQ_API_KEY`.

## 2. Pipeline scheduling (GitHub Actions)

`.github/workflows/pipeline.yml` (created in plan.md Phase 3):

- `on.schedule: cron: "30 1 * * *"` — 01:30 UTC ≈ 07:00 IST, plus
  `workflow_dispatch` for manual runs.
- Cache pnpm store and `~/.cache/huggingface` (embedding model weights, ~90 MB) so
  steady-state runs take ~2–4 minutes.
- `timeout-minutes: 30`; the worker exits non-zero when a run stores nothing despite
  fetching items, so failures show up as red runs (enable email notifications for
  failed workflows in GitHub settings).

Note: GitHub may delay scheduled runs by a few minutes under load, and **disables
schedules after 60 days without repo activity** — a like/dislike doesn't count, a
commit does. If the repo goes quiet, re-enable the workflow from the Actions tab.

## 3. Web deploy (Vercel)

1. Vercel → **Add New Project** → import the GitHub repo.
2. **Root Directory: `apps/web-client`** (Enable "Include files outside the root
   directory" so the build can see `packages/shared`). Framework preset: Next.js.
   If the Nx setup needs it, set the install command to
   `pnpm install --frozen-lockfile` at the repo root.
3. Environment variables (Production + Preview): `MONGODB_URI` and
   `OWNER_PASSWORD_HASH` (generate locally with `pnpm auth:hash`, copy the
   printed hash). The web app does **not** need `GROQ_API_KEY`.
4. Deploy — verify the `*.vercel.app` URL renders the feed.

## 4. Custom domain: `bytebulletin.deepcoomer.dev`

The apex `deepcoomer.dev` (portfolio) stays untouched; only a subdomain record is
added at Spaceship.

1. **Vercel** → Project → Settings → **Domains** → add `bytebulletin.deepcoomer.dev`.
   Vercel will show the required record (a CNAME for subdomains).
2. **Spaceship** → Domain Manager → `deepcoomer.dev` → **Advanced DNS** → add:

   | Type  | Host          | Value                  | TTL     |
   |-------|---------------|------------------------|---------|
   | CNAME | `bytebulletin`| `cname.vercel-dns.com` | 30 min  |

   (Host is just the subdomain label — Spaceship appends `deepcoomer.dev`. Use the
   exact target Vercel displays if it differs.)
3. Wait for propagation (usually minutes, up to an hour). Vercel auto-provisions the
   TLS certificate once the CNAME resolves; the Domains page will show a green check.
4. Verify: `dig +short bytebulletin.deepcoomer.dev CNAME` → `cname.vercel-dns.com.`,
   then open https://bytebulletin.deepcoomer.dev.

Gotchas:
- If Spaceship has a wildcard `*` record or conflicting `bytebulletin` record,
  remove it first.
- Don't enable any Spaceship "forwarding/parking" feature on this subdomain — it
  conflicts with the CNAME.
- If `deepcoomer.dev`'s nameservers are delegated elsewhere (e.g. Cloudflare or
  Vercel DNS), add the CNAME **there**, not in Spaceship. Check with
  `dig +short deepcoomer.dev NS` first. (On Cloudflare, set the record to
  "DNS only" — grey cloud — so Vercel can issue the certificate.)

## 5. Caching model in production

- `GET /api/digests` responds with `Cache-Control: s-maxage=3600,
  stale-while-revalidate=86400` → Vercel's edge cache serves nearly all reads
  without touching Mongo; data only changes once a day anyway.
- The Serwist service worker adds a client-side NetworkFirst cache on the same
  endpoint → offline reading + instant repeat loads.
- Result: the M0 cluster sees a handful of queries per day; free tiers hold
  indefinitely for a single user.

## 6. Rollback & ops

- Web: Vercel → Deployments → "Promote to Production" on any previous deployment.
- Pipeline: revert the commit; data writes are idempotent upserts, so a bad run at
  worst inserts low-quality docs — delete by date:
  `db.digests.deleteMany({ createdAt: { $gte: ISODate("…") } })`.
- Secrets rotation: update in GitHub Secrets + Vercel env → redeploy web.
