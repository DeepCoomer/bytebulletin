# ByteBulletin

Personalized dev-news digest — a privacy-first, single-user PWA fed by a
twice-daily ingestion pipeline. It scrapes high-signal engineering channels
(Hacker News, engineering blogs, Reddit), scores every article with local vector
embeddings against a developer-interest profile that **learns from feedback**,
synthesizes structured summaries with an LLM, and serves them offline-first with
push notifications.

**Live:** https://bytebulletin.deepcoomer.dev · **Cost:** $0/month · **License:** Apache-2.0

## Features

- **Personalized scoring** — MiniLM embeddings vs. an interest-profile centroid,
  Rocchio-adjusted by the owner's likes/dislikes on every run
- **LLM synthesis** — impact analysis + key takeaways per article, 12 categories,
  strict JSON with self-correcting retries (Groq)
- **Installable PWA** — offline reading, day-grouped archive with pagination,
  web push (one notification per run: count + top-scored headline)
- **Invisible single-owner auth** — scrypt password → HttpOnly sessions; visitors
  get a clean read-only feed, the owner gets feedback buttons, bookmarks, and a
  tuning dashboard (thresholds, interest statements, run health, insights)
- **Self-maintaining** — idempotent runs, per-item fault isolation, dead-source
  tolerance, 90-day auto-prune (saved/liked items kept), dead push-subscription
  cleanup

## How it works

```
HN + RSS + Reddit ──► pipeline-worker (GitHub Actions, 2× daily)
                       dedup → extract → embed & score (feedback-adjusted)
                       → LLM summarize → store → push notify
                             │
                       MongoDB Atlas
                             │
                  web-client (Next.js PWA on Vercel)
                  edge-cached API · offline via service worker
```

## Stack

Nx + pnpm monorepo · TypeScript · Next.js 15 (App Router) · MongoDB Atlas ·
Transformers.js (`all-MiniLM-L6-v2` local embeddings) · Groq (`llama-3.3-70b`) ·
Serwist PWA · Web Push (VAPID) · Tailwind v4 · Zod · Vitest

## Getting started

```bash
pnpm install
cp .env.example .env    # fill in MONGODB_URI, GROQ_API_KEY
pnpm auth:hash          # set your owner password (writes OWNER_PASSWORD_HASH)
pnpm pipeline:run       # populate the database
pnpm web:dev            # http://localhost:3000
```

## Documentation

- [docs/plan.md](docs/plan.md) — implementation phases & locked decisions
- [docs/architecture.md](docs/architecture.md) — system design, schema, LLM prompt
- [docs/deployment.md](docs/deployment.md) — Vercel, cron, Atlas, DNS setup
- [CLAUDE.md](CLAUDE.md) — context & rules for AI coding assistants
- [CHANGELOG.md](CHANGELOG.md) — release history
