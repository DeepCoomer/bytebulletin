# Changelog

All notable changes to ByteBulletin. Follows [SemVer](https://semver.org):
MAJOR for breaking data/API changes, MINOR for features, PATCH for fixes.

## [1.0.0] — 2026-07-11

First production release, live at https://bytebulletin.deepcoomer.dev.

### Pipeline
- Twice-daily ingestion (01:30 / 13:30 UTC) from Hacker News (Algolia),
  engineering-blog RSS (Cloudflare, Netflix, Meta, Stripe, GitHub, Vercel, AWS,
  Lobsters), and Reddit top-of-day (r/programming, r/ExperiencedDevs,
  r/developersIndia)
- MD5-title dedup, Readability extraction with snippet fallback, noise filters
  (job posts, recurring meta-threads), per-source fault isolation, rate-limit
  pacing (Reddit stagger + retry, serial Groq calls)
- Local MiniLM embeddings scored against an interest-profile centroid with
  Rocchio feedback adjustment (+0.4 liked / −0.2 disliked, 60-day window)
- Groq (`llama-3.3-70b`) JSON synthesis across 12 categories with
  self-correcting retry; owner-tunable config (threshold, cap, interest
  statements) read from Mongo each run
- 90-day auto-prune (liked/disliked/saved exempt), run-summary recording,
  web-push notification per run (count + top headline, silent when quiet)

### Web app
- Next.js 15 PWA: day-grouped feed, category sidebar/chip-strip filters,
  clickable category tags, reading modal, Load-older pagination, offline
  reading via Serwist, installable with themed icons/favicon
- Invisible single-owner auth: scrypt password (`pnpm auth:hash`) → 30-day
  HttpOnly sessions; owner-only feedback buttons, 🔖 saved bookmarks, and a
  dashboard (pipeline tuning, run health, insights) at /settings
- Edge-cached public API; session-guarded write/admin APIs

### Infrastructure
- $0/month: MongoDB Atlas M0, Groq free tier, Vercel Hobby, GitHub Actions
- CI (lint + test + build) and pipeline workflows; VAPID web push;
  portfolio-matched design system (deepcoomer.dev tokens)
