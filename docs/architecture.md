# ByteBulletin — Architecture Design Document

> Personalized Knowledge Pipeline ("Dev-Digest"). Live at
> https://bytebulletin.deepcoomer.dev. Build order and acceptance criteria are in
> [plan.md](plan.md); infra/DNS in [deployment.md](deployment.md).

## 1. Product specification

### 1.1 Problem

The engineering news firehose (Hacker News, tech blogs, GitHub trends) buries
high-signal architectural content — framework internals, performance case studies,
distributed-systems trade-offs — under tutorials, product announcements, and
listicles. A mid-to-senior full-stack engineer wants the signal without the hour of
daily filtering.

### 1.2 Solution

ByteBulletin is a privacy-first, single-user, ultra-personalized PWA fed by a daily
asynchronous ingestion pipeline. It scrapes high-signal engineering channels, scores
every article against a developer-interest profile using local vector embeddings,
synthesizes structured summaries through an LLM, and serves the result through an
offline-first interface with sub-100 ms perceived loads.

### 1.3 Non-goals (MVP)

- Multi-user accounts, auth flows, or social features.
- Real-time updates — the pipeline runs once daily.
- Search, archives beyond ~60 days, email delivery (all post-MVP candidates).

## 2. System architecture

Two decoupled apps in one Nx + pnpm monorepo, sharing only `packages/shared`
(Zod schemas, types, Mongo client):

- **`apps/pipeline-worker`** — a plain Node/TypeScript CLI executed daily by a
  **GitHub Actions cron workflow** (not Vercel: runs take minutes, load a ~90 MB
  local embedding model, and make dozens of LLM calls — see plan.md §0).
- **`apps/web-client`** — a Next.js 15 (App Router) PWA on Vercel with a Serwist
  service worker.

```
 [ Ingestion Sources ]
 (HN Algolia, RSS: Cloudflare/Netflix/Uber/Stripe/…, Lobsters)
          │
          ▼
┌────────────────────────────────────────────────────────┐
│ apps/pipeline-worker   (GitHub Actions, daily cron)    │
│                                                        │
│  Ingest (axios + rss-parser)                           │
│    → Pre-dedup (MD5 title hash vs Mongo)               │
│    → Extract (Readability + jsdom, 5s timeout)         │
│    → Score (MiniLM-L6-v2 local embeddings, cosine      │
│             similarity vs interest-profile centroid)   │
│    → Synthesize (Groq llama-3.3-70b, JSON mode)        │
│    → Store (MongoDB Atlas, idempotent upsert)          │
└─────────────┬──────────────────────────────────────────┘
              │  MongoDB Atlas M0 · db "bytebulletin" · coll "digests"
              ▼
┌────────────────────────────────────────────────────────┐
│ apps/web-client        (Vercel, Next.js 15 PWA)        │
│                                                        │
│  GET /api/digests   — edge-cached (s-maxage=3600, SWR) │
│  POST /api/interactions — bearer-token guarded         │
│         │                                              │
│  Serwist service worker (precache shell,               │
│  NetworkFirst /api/digests → offline reading)          │
│         │                                              │
│  Mobile-first feed UI (cards, category chips,          │
│  like/dislike feedback)                                │
└────────────────────────────────────────────────────────┘
```

### Data flow guarantees

- **Idempotent**: storing uses `$setOnInsert` upserts keyed on `dedupHash`; re-runs
  insert nothing.
- **Fault-isolated**: every per-article step is wrapped; one broken source or
  malformed page never kills a run.
- **Bounded cost**: pre-dedup happens before extraction/embedding/LLM; at most the
  top 30 scored items per run reach the LLM.

## 3. Database schema (MongoDB)

Collection `digests`. Canonical runtime validation is the Zod `DigestSchema` in
`packages/shared/src/schemas.ts`; this `$jsonSchema` mirrors it:

```json
{
  "$jsonSchema": {
    "bsonType": "object",
    "required": ["title", "sourceUrl", "dedupHash", "score", "category", "summary", "createdAt"],
    "properties": {
      "title": { "bsonType": "string" },
      "sourceUrl": { "bsonType": "string" },
      "sourceName": { "bsonType": "string" },
      "dedupHash": {
        "bsonType": "string",
        "description": "MD5 of normalized title (lowercased, non-alphanumerics collapsed to single spaces, trimmed) — enforces O(1) de-duplication"
      },
      "score": {
        "bsonType": "double",
        "description": "Cosine similarity of article embedding vs developer-profile centroid, [-1, 1]"
      },
      "category": {
        "enum": ["Architecture", "Frontend-Performance", "AI-Infrastructure", "DevOps-Cloud", "General-Tech"]
      },
      "summary": {
        "bsonType": "object",
        "required": ["impactAnalysis", "bulletPoints"],
        "properties": {
          "impactAnalysis": { "bsonType": "string", "description": "Why an SDE-2/3 cares about this change" },
          "bulletPoints": { "bsonType": "array", "items": { "bsonType": "string" } }
        }
      },
      "embedding": {
        "bsonType": "array",
        "items": { "bsonType": "double" },
        "description": "384-dim vector from Xenova/all-MiniLM-L6-v2 (mean-pooled, L2-normalized); kept for the feedback loop"
      },
      "userInteraction": { "enum": ["LIKED", "DISLIKED", "NONE"] },
      "createdAt": { "bsonType": "date" }
    }
  }
}
```

Indexes (created idempotently by `ensureIndexes()`):

```js
db.digests.createIndex({ dedupHash: 1 }, { unique: true })
db.digests.createIndex({ createdAt: -1, score: -1 })
```

## 4. LLM synthesis prompt

Groq · `llama-3.3-70b-versatile` · `response_format: { type: "json_object" }` ·
`temperature: 0.3`. Output is Zod-parsed (`LlmOutputSchema`); one retry with the
validation error appended, then skip. Canonical copy lives in
`apps/pipeline-worker/src/synthesize.ts` — update both together.

```
You are a highly analytical technical staff architect filtering and summarizing news
for a Senior Full-Stack Software Engineer specializing in the MERN stack, Next.js,
distributed databases, cloud engineering, and system design.

Ingest the raw article text provided, analyze its technical substance, and return a
single JSON object matching the schema below.

CRITICAL RULES:
1. Return ONLY the raw JSON object — no markdown fences, no wrapper text.
2. If the article has no architectural substance (generic marketing, funding rounds,
   non-technical corporate news), set category to "General-Tech" and summarize it in
   exactly one concise sentence with an empty-adjacent bulletPoints list (max 1 item).
3. "impactAnalysis" must explain the structural trade-off, performance implication,
   or developer-workflow change this introduces — not restate the headline.

INPUT ARTICLE TEXT:
---
{{RAW_INGESTED_TEXT}}
---

OUTPUT JSON SCHEMA:
{
  "category": "Architecture" | "Frontend-Performance" | "AI-Infrastructure" | "DevOps-Cloud" | "General-Tech",
  "summary": {
    "impactAnalysis": "string",
    "bulletPoints": ["string", "string", "string"]
  }
}
```

## 5. Personalization model

- **Profile centroid**: mean of MiniLM embeddings of ~8 interest statements
  (hardcoded in `apps/pipeline-worker/src/profile.ts`), L2-normalized.
- **Scoring**: dot product of normalized vectors (= cosine similarity). Keep
  `score >= MIN_SCORE` (default 0.35), then take the top 30.
- **Feedback loop (post-MVP)**: Rocchio update from like/dislike interactions —
  `profile' = normalize(profile + 0.4·mean(liked) − 0.2·mean(disliked))` over the
  trailing 60 days, applied at the start of each run.

## 6. Reconciliation notes for AI dev tools (Cursor / Claude Code)

- Follow [plan.md](plan.md) phase order; its "Locked technical decisions" table and
  operating rules are binding.
- Network calls in the worker: axios with 5000 ms timeout, retry ×2 with exponential
  backoff + jitter, concurrency capped by `p-limit`.
- Web client: validate all data with Zod from `packages/shared` before rendering;
  service-worker behavior is configured through Serwist in `next.config.ts` + `src/sw.ts`.
- Do not move the pipeline onto Vercel functions, and do not introduce a paid
  embedding API — both are deliberate architecture decisions.
