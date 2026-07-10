# ByteBulletin — Implementation Plan

> Personalized dev-news pipeline. Product spec lives in [architecture.md](architecture.md);
> deployment/DNS lives in [deployment.md](deployment.md). This file is the build order:
> phases, tasks, acceptance criteria, and the concrete technical decisions an implementer
> (human or AI) must follow.

## 0. Verdict & key deviations from the original PRD

The system is fully buildable at **$0/month**: MongoDB Atlas M0 (free), Groq free tier,
Vercel Hobby, GitHub Actions free minutes, and local embeddings (no embedding API cost).

Two deliberate deviations from the original PRD — do not "fix" these back:

1. **The pipeline worker runs on GitHub Actions cron, not Vercel.** A daily run scrapes
   ~100–200 URLs, loads a ~90 MB embedding model, and makes ~50 LLM calls — several
   minutes of wall time. Vercel function limits (and cold-start model loads) make that
   fragile. A scheduled GitHub Actions workflow gets 6 hours per run for free and keeps
   the worker a plain Node CLI that also runs locally with `pnpm pipeline:run`.
2. **Service worker via Serwist, not raw Workbox/next-pwa.** `next-pwa` is unmaintained;
   Serwist is its maintained successor built on Workbox, with first-class Next.js App
   Router support.

## 1. Locked technical decisions

| Concern | Decision | Notes |
|---|---|---|
| Monorepo | Nx + pnpm workspaces | `npx create-nx-workspace bytebulletin --preset=ts --pm pnpm` |
| Language | TypeScript strict everywhere | `"strict": true`, no `any` at package boundaries |
| Node | 24 LTS | pin in `.nvmrc` and workflow `node-version` |
| Web app | Next.js 15, App Router | `apps/web-client` |
| Worker | Plain Node CLI (tsx) | `apps/pipeline-worker`, entry `src/main.ts` |
| Shared code | `packages/shared` | Zod schemas, TS types, Mongo client, constants |
| DB | MongoDB Atlas M0, db `bytebulletin`, collection `digests` | driver: official `mongodb` |
| Embeddings | Transformers.js (`@huggingface/transformers`), model `Xenova/all-MiniLM-L6-v2`, quantized | 384-dim, runs locally in Node, free |
| LLM | Groq SDK (`groq-sdk`), model `llama-3.3-70b-versatile`, `response_format: { type: "json_object" }` | free tier is ample for ~50 calls/day |
| HTTP | axios, 5000 ms timeout, `axios-retry` (2 retries, exp backoff + jitter) | set a real `User-Agent` |
| Concurrency | `p-limit` — 5 for fetches, 2 for Groq calls | stay under free-tier rate limits |
| Feed parsing | `rss-parser` | |
| Article extraction | `@mozilla/readability` + `jsdom` | truncate text to 8 000 chars before LLM |
| Validation | Zod at every I/O boundary (LLM output, API req/res, env vars) | schemas live in `packages/shared` |
| Styling | Tailwind CSS v4 | dark mode via `prefers-color-scheme` |
| Client data | SWR (stale-while-revalidate mirrors the SW strategy) | |
| PWA | Serwist (`@serwist/next`) | precache shell, runtime-cache `/api/digests` |
| Logging | `pino` in the worker; one JSON run-summary line at the end | |
| Tests | Vitest; fixtures for HTML/RSS/LLM responses — no network in tests | |
| Lint/format | ESLint + Prettier (Nx defaults) | |

### Environment variables

Defined once in `packages/shared/src/env.ts` via a Zod schema; both apps import it.
Ship a committed `.env.example`.

| Var | Used by | Purpose |
|---|---|---|
| `MONGODB_URI` | both | Atlas connection string |
| `GROQ_API_KEY` | worker | LLM synthesis |
| `ACTION_TOKEN` | web | shared secret authorizing like/dislike writes (single-user app; reads are public) |
| `MIN_SCORE` | worker | similarity keep-threshold, default `0.35` |

## 2. Repository layout (target state)

```
bytebulletin/
├── CLAUDE.md
├── README.md
├── .gitignore
├── .nvmrc
├── .env.example
├── nx.json / pnpm-workspace.yaml / package.json / tsconfig.base.json
├── .github/workflows/
│   ├── pipeline.yml          # daily cron → runs the worker
│   └── ci.yml                # lint + test + build on PR
├── docs/
│   ├── architecture.md
│   ├── plan.md               # this file
│   └── deployment.md
├── packages/shared/src/
│   ├── env.ts                # Zod-validated process.env
│   ├── schemas.ts            # Digest, Summary, Category, LLM-output Zod schemas
│   ├── types.ts              # inferred TS types
│   ├── mongo.ts              # cached client, getDigestsCollection(), ensureIndexes()
│   └── constants.ts          # categories, model ids, limits
├── apps/pipeline-worker/src/
│   ├── main.ts               # orchestrator: sources → extract → score → synthesize → store
│   ├── profile.ts            # interest statements → profile centroid (+ feedback)
│   ├── sources/
│   │   ├── hackernews.ts     # Algolia HN API
│   │   ├── rss.ts            # generic RSS ingester
│   │   └── registry.ts       # list of all sources
│   ├── extract.ts            # fetch URL → Readability → clean text
│   ├── embed.ts              # Transformers.js pipeline, embed(), cosineSimilarity()
│   ├── synthesize.ts         # Groq call, prompt, Zod-parse + 1 retry on invalid JSON
│   ├── store.ts              # dedup-hash upsert into Mongo
│   └── __fixtures__/         # saved HTML/RSS/JSON for tests
└── apps/web-client/
    ├── next.config.ts        # withSerwist(...)
    ├── public/manifest.json  # + icons 192/512, maskable
    └── src/
        ├── app/
        │   ├── layout.tsx / page.tsx        # feed (server component)
        │   ├── ~offline/page.tsx            # offline fallback
        │   └── api/
        │       ├── digests/route.ts         # GET, cached
        │       └── interactions/route.ts    # POST, token-guarded
        ├── sw.ts                            # Serwist service worker
        ├── components/                      # DigestCard, CategoryFilter, FeedbackButtons…
        └── lib/                             # fetcher, client-side Zod parsing
```

## 3. Phases

Each phase ends in a working, verifiable state. Do them in order; don't start a phase
until the previous one's acceptance criteria pass.

### Phase 0 — Workspace scaffold

- Nx workspace with pnpm, `packages/shared`, `apps/pipeline-worker` (Node lib + tsx
  entry), `apps/web-client` (Next.js 15 via `@nx/next` or plain `create-next-app`
  wired into the workspace).
- Root scripts: `pnpm pipeline:run`, `pnpm web:dev`, `pnpm test`, `pnpm lint`, `pnpm build`.
- `.nvmrc` (22), `.env.example`, `ci.yml` running lint + test + build.

**Accept:** `pnpm build` and `pnpm lint` pass on a fresh clone; CI green.

### Phase 1 — Shared package

- `schemas.ts`: `CategorySchema` (the 5-value enum), `SummarySchema`
  (`impactAnalysis: string`, `bulletPoints: string[]` length 1–5),
  `DigestSchema` (title, sourceUrl (url), sourceName, dedupHash, score,
  category, summary, embedding `number[]` length 384, userInteraction
  `LIKED|DISLIKED|NONE` default NONE, createdAt), and `LlmOutputSchema`
  (category + summary only — what Groq must return).
- `mongo.ts`: lazily-cached `MongoClient` (module-level promise — safe for both the
  worker and Next.js hot reload), `ensureIndexes()` creating
  `{ dedupHash: 1 } unique` and `{ createdAt: -1, score: -1 }`.
- `env.ts`: Zod-parse `process.env` once, export typed `env`.

**Accept:** unit tests: schemas reject bad payloads; `ensureIndexes` is idempotent
(run twice against a local/Atlas test db).

### Phase 2 — Pipeline worker (the core)

Orchestration in `main.ts`, strictly this order, with per-item error isolation
(one bad article must never kill the run):

1. **Ingest** (`sources/`): HN via Algolia
   (`https://hn.algolia.com/api/v1/search?tags=front_page` and
   `search_by_date?tags=story&numericFilters=points>100`), plus an RSS registry —
   start with: Cloudflare blog, Netflix TechBlog, Uber Engineering, Stripe blog,
   GitHub blog (engineering tag), Vercel blog, AWS Architecture blog, Lobsters
   (`https://lobste.rs/rss`). Each source returns
   `{ title, url, sourceName, publishedAt }`. Drop items older than 48 h.
2. **Pre-dedup**: compute `dedupHash = md5(title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim())`;
   batch-query Mongo for existing hashes and skip them **before** any expensive work.
3. **Extract** (`extract.ts`): fetch HTML (5 s timeout, UA header), parse with
   Readability, strip whitespace, truncate to 8 000 chars. On failure fall back to
   the RSS `contentSnippet`/title so the item can still be scored (with a penalty
   flag), never crash.
4. **Score** (`embed.ts` + `profile.ts`): load the MiniLM feature-extraction pipeline
   **once** (module singleton, `{ pooling: "mean", normalize: true }` → dot product
   = cosine similarity). Profile centroid = mean of embeddings of ~8 hardcoded
   interest statements (e.g. "distributed systems trade-offs and consistency models",
   "Next.js and React performance optimization", "database internals and indexing
   strategies", "cloud infrastructure cost and scaling case studies", …) stored in
   `profile.ts`. Keep items with `score >= MIN_SCORE`; cap the survivors at the
   **top 30 by score** to bound LLM spend.
5. **Synthesize** (`synthesize.ts`): Groq chat completion with the system prompt from
   [architecture.md §4](architecture.md), `response_format: { type: "json_object" }`,
   `temperature: 0.3`. Zod-parse the reply with `LlmOutputSchema`; on parse failure
   retry **once** with the validation error appended to the prompt; on second failure
   skip the item and count it in the run summary. Handle 429 with backoff.
6. **Store** (`store.ts`): `updateOne({ dedupHash }, { $setOnInsert: doc }, { upsert: true })`
   — idempotent; re-running the same day must insert nothing new.
7. **Summary**: log one JSON line `{ fetched, deduped, extracted, scored, kept, synthesized, stored, failures, durationMs }`
   and exit non-zero only if `stored === 0 && fetched > 0` (so cron failures surface).

**Accept:** `pnpm pipeline:run` against real Atlas inserts docs end-to-end; immediate
re-run inserts 0; Vitest covers dedup normalization, cosine scoring against fixture
vectors, LLM-output parsing (valid, invalid, retry path), and extraction fallback —
all offline via fixtures.

### Phase 3 — Scheduling

- `.github/workflows/pipeline.yml`: `schedule: cron "30 1 * * *"` (≈ 07:00 IST) +
  `workflow_dispatch` for manual runs. Steps: checkout → pnpm install (cached) →
  cache `~/.cache/huggingface` (model weights) → `pnpm pipeline:run`.
  Secrets: `MONGODB_URI`, `GROQ_API_KEY`. `timeout-minutes: 30`.
- Atlas network access: allow `0.0.0.0/0` (Actions runners have no stable IP; the
  URI credential is the gate).

**Accept:** manual `workflow_dispatch` run is green and writes to Atlas.

### Phase 4 — Web client

- `GET /api/digests?category=&days=7`: query Mongo sorted `{ createdAt: -1, score: -1 }`,
  limit 100, Zod-serialize, respond with
  `Cache-Control: s-maxage=3600, stale-while-revalidate=86400` (Vercel edge cache —
  data changes once a day, so this makes reads effectively free and sub-100 ms).
- `POST /api/interactions` body `{ dedupHash, interaction }`, guarded by
  `Authorization: Bearer <ACTION_TOKEN>`; updates `userInteraction`.
- UI: server-rendered feed; `DigestCard` (title → source link, sourceName, relative
  time, category badge, impactAnalysis paragraph, bulletPoints list, like/dislike);
  category filter chips; skeleton loading; empty state. Mobile-first, dark mode.
  Token for interactions is pasted once into a small settings sheet and kept in
  `localStorage`.

**Accept:** feed renders real data locally and on Vercel preview; interactions
persist; Lighthouse performance ≥ 90 on mobile.

### Phase 5 — PWA / offline

- Serwist: precache app shell, `NetworkFirst`→cache fallback for `/api/digests`
  (this is where offline reading comes from), `~offline` fallback page,
  `manifest.json` + 192/512/maskable icons, `skipWaiting` + user-visible
  "new version" reload prompt.

**Accept:** Chrome DevTools → offline → previously loaded feed still renders;
installable on Android/iOS ("Add to Home Screen"); Lighthouse PWA checks pass.

### Phase 6 — Production deploy

Follow [deployment.md](deployment.md): Vercel project rooted at `apps/web-client`,
env vars set, domain `bytebulletin.deepcoomer.dev` added in Vercel + CNAME at
Spaceship.

**Accept:** `https://bytebulletin.deepcoomer.dev` serves the feed over HTTPS the
morning after a scheduled pipeline run.

### Phase 7 — Feedback personalization (post-MVP)

- At the start of each pipeline run, fetch docs with `userInteraction != NONE` from
  the last 60 days and apply Rocchio-style adjustment:
  `profile' = normalize(profile + 0.4 · mean(liked embeddings) − 0.2 · mean(disliked embeddings))`.
- Later candidates: per-category thresholds, weekly email digest, full-text search,
  CORS header on `GET /api/digests` (allow `https://www.deepcoomer.dev`) so the
  portfolio can embed a live "top 3 headlines" teaser.

**Accept:** liking several AI-infra articles measurably raises next-run scores for
similar items (log profile drift in the run summary).

## 4. Operating rules for AI-assisted implementation

- Zod-validate **every** boundary: env at startup, LLM output, API request/response.
  Internal function calls rely on TS types only.
- The worker must stay **idempotent and per-item fault-isolated**: wrap each article
  in try/catch, count failures, keep going.
- Never import Next.js code into the worker or worker code into the web app; the only
  shared surface is `packages/shared`.
- No live-network unit tests. New source/LLM behavior ⇒ new fixture.
- Secrets only via env; `.env.example` documents shape, never values.
- Load the embedding model exactly once per process; loading per-article is the #1
  perf mistake available in this codebase.
