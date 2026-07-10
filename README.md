# ByteBulletin

Personalized dev-news digest — a privacy-first, single-user PWA fed by a daily
ingestion pipeline. It scrapes high-signal engineering channels (Hacker News,
engineering blogs), filters with local vector embeddings against a developer-interest
profile, synthesizes structured summaries with an LLM, and serves them offline-first.

**Live:** https://bytebulletin.deepcoomer.dev · **Cost:** $0/month

## How it works

```
HN + RSS feeds ──► pipeline-worker (GitHub Actions, daily)
                    dedup → extract → embed & score → LLM summarize
                          │
                    MongoDB Atlas
                          │
               web-client (Next.js PWA on Vercel)
               edge-cached API · offline via service worker
```

## Stack

Nx + pnpm monorepo · TypeScript · Next.js 15 (App Router) · MongoDB Atlas ·
Transformers.js (`all-MiniLM-L6-v2` local embeddings) · Groq (`llama-3.3-70b`) ·
Serwist PWA · Tailwind v4 · Zod · Vitest

## Getting started

```bash
pnpm install
cp .env.example .env    # fill in MONGODB_URI, GROQ_API_KEY, ACTION_TOKEN
pnpm pipeline:run       # populate the database
pnpm web:dev            # http://localhost:3000
```

## Documentation

- [docs/plan.md](docs/plan.md) — implementation phases & locked decisions
- [docs/architecture.md](docs/architecture.md) — system design, schema, LLM prompt
- [docs/deployment.md](docs/deployment.md) — Vercel, cron, Atlas, DNS setup
- [CLAUDE.md](CLAUDE.md) — context & rules for AI coding assistants
