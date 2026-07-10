# CLAUDE.md — ByteBulletin

Personalized dev-news pipeline + PWA, deployed at https://bytebulletin.deepcoomer.dev.
Single-user, privacy-first, $0/month infrastructure.

## Read these before making changes

- [docs/plan.md](docs/plan.md) — **binding** build phases, locked tech decisions, and
  operating rules. If code and plan disagree during initial build-out, the plan wins.
- [docs/architecture.md](docs/architecture.md) — system design, DB schema, LLM prompt,
  personalization model.
- [docs/deployment.md](docs/deployment.md) — Vercel, GitHub Actions cron, Atlas, DNS.

## What this is

An Nx + pnpm monorepo with two decoupled apps and one shared package:

- `apps/pipeline-worker` — Node/TS CLI, run daily by GitHub Actions cron. Ingests
  HN + engineering-blog RSS → dedups by MD5 title hash → extracts article text
  (Readability) → scores with local MiniLM embeddings vs an interest-profile
  centroid → summarizes top items via Groq (JSON mode) → idempotent upserts into
  MongoDB Atlas.
- `apps/web-client` — Next.js 15 App Router PWA on Vercel. Edge-cached
  `GET /api/digests`, token-guarded `POST /api/interactions`, Serwist service
  worker for offline reading.
- `packages/shared` — Zod schemas, inferred types, Mongo client, env validation.
  **The only code shared between the apps.**

## Commands

```bash
pnpm install            # workspace install
pnpm web:dev            # Next.js dev server (apps/web-client)
pnpm pipeline:run       # run the full pipeline locally (needs .env)
pnpm test               # vitest, all projects — no network, fixtures only
pnpm lint               # eslint
pnpm build              # build everything
```

Env vars (see `.env.example`): `MONGODB_URI`, `GROQ_API_KEY`, `ACTION_TOKEN`,
`MIN_SCORE`. Copy to `.env` locally; never commit real values.

## Hard rules

- **Never** import web-client code into the worker or vice versa; share only via
  `packages/shared`.
- Browser code (client components) imports `@bytebulletin/shared/client` — the
  root barrel pulls in `mongodb` and breaks the client bundle. Server code uses
  the root import.
- Relative imports are extensionless (`moduleResolution: bundler`); do not add
  `.js` extensions — webpack/Next cannot resolve them from TS sources.
- **Never** move the pipeline onto Vercel functions or add a paid embedding API —
  deliberate decisions, see plan.md §0.
- Zod-validate every I/O boundary: env at startup, LLM responses, API
  request/response bodies. Internals rely on TS types only.
- The pipeline must stay idempotent (upserts keyed on `dedupHash` with
  `$setOnInsert`) and per-item fault-isolated (one bad article never kills a run).
- Load the MiniLM embedding model once per process (module singleton), never
  per-article.
- Tests never hit the network — add fixtures under `__fixtures__/` instead.
- TypeScript strict; no `any` crossing package boundaries.
- The LLM prompt is duplicated in `apps/pipeline-worker/src/synthesize.ts` and
  docs/architecture.md §4 — change both together.

## Domain/data vocabulary

- **Digest** — one processed article document in Mongo (`digests` collection).
- **Category** — exactly: `Architecture`, `Frontend-Performance`,
  `AI-Infrastructure`, `DevOps-Cloud`, `Databases-Storage`, `Security`,
  `Languages-Runtimes`, `Open-Source-Tools`, `Trending-Discussions`,
  `General-Tech` (defined once in `packages/shared/src/constants.ts`).
- **Score** — cosine similarity (−1..1) of article embedding vs profile centroid;
  keep-threshold `MIN_SCORE` (default 0.35), top 30 per run go to the LLM.
- **dedupHash** — `md5(title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim())`,
  unique index.
- **Interaction** — `LIKED | DISLIKED | NONE`; feeds the post-MVP Rocchio profile
  update.

## Deploy context

Web: Vercel project rooted at `apps/web-client`, custom domain
`bytebulletin.deepcoomer.dev` (CNAME at Spaceship → `cname.vercel-dns.com`).
Pipeline: `.github/workflows/pipeline.yml`, daily 01:30 UTC. Details in
docs/deployment.md.
