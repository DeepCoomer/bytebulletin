/** Minimal but Readability-parseable article page. */
export const ARTICLE_HTML = `<!DOCTYPE html>
<html>
<head><title>How We Sharded Our Postgres Fleet</title></head>
<body>
  <nav><a href="/">Home</a><a href="/blog">Blog</a></nav>
  <article>
    <h1>How We Sharded Our Postgres Fleet</h1>
    <p>When our primary database crossed four terabytes, single-node vertical scaling stopped
    being an option. This post covers how we moved to a sharded topology using logical
    replication, the routing layer we built, and the trade-offs we accepted along the way.</p>
    <p>The core decision was choosing a shard key. We evaluated tenant identifier, entity
    identifier, and a composite hash. Tenant identifier won because ninety-eight percent of our
    queries are tenant-scoped, which keeps cross-shard fan-out rare and lets us colocate hot
    tenants away from each other during rebalancing operations.</p>
    <p>Cutover used a dual-write phase with checksummed backfill verification. Total downtime
    was eleven seconds, spent flipping the router's consistent-hash ring configuration.</p>
  </article>
  <footer>© Example Engineering</footer>
</body>
</html>`;

/** A page Readability cannot extract an article from. */
export const EMPTY_HTML = `<!DOCTYPE html><html><head><title>x</title></head><body></body></html>`;
