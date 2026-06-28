# 07. P1 SEO and migration

Issue IDs covered: `SEO-001`, `MIG-001`, `SEO-002`, `SEO-004`, `SEO-005`, `SEO-003`  
Production touched: **NO**  
Secrets exposed: **NO**

## Files changed

- Corrective DB migration makes `essay_index_normalize` call the installed `public.unaccent` explicitly; rollback is included.
- IQ core/detail/assessment canonical metadata now points to reachable apex `/iq` routes.
- Sitemap IQ entries now use apex routes and no longer publish Railway 404 URLs.
- Root sitemap index no longer advertises empty ES/FR scholarship-detail DB shards; the route builder remains available when translations exist and index logic can later become count-aware.
- `/login`, `/register` and canonical one-hop redirects are included in Stage 6 Next/Nginx config.
- Root metadata already provides a 1200x630 default image; route-level overrides still need a broader metadata merge audit for `SEO-003`.

## Commands run

- SEO contract tests and existing `test:seo-lib`.
- Disposable PostgreSQL unaccent migration/function test.

## Tests passed/failed

- VPS migration SEO contract: **PASS, 3/3**.
- Existing SEO library suite: **PASS, 85/85**.
- Disposable PostgreSQL unaccent migration/function test: **PASS**.

## GO smoke plan

1. Require validated live DB backup, then apply essay migration.
2. Verify `/essays` 200 for empty query, keyword query, category, sort and pagination.
3. Deploy sitemap/canonical changes and crawl all child documents.
4. Confirm IQ sitemap URLs return 200 with self-canonical apex URLs.
5. Add Cloudflare/DNS 301 from the old IQ host to matching apex paths after separate DNS GO.
6. Verify `/login`, `/register`, `/home/` and HTTP www in one hop with query strings.

## Rollback plan

Roll back application image for sitemap/metadata. Roll back the SQL function only if `unaccent` actually exists in `extensions`; otherwise restore the validated DB backup. DNS is unchanged in this patch.

## Remaining risks

- Essay migration is not applied until backup + GO; live `/essays` remains 500.
- IQ DNS still points at Railway until a separate Cloudflare change; sitemap/canonical no longer depend on it after deploy.
- Localized scholarship-detail shards are omitted rather than count-aware; add them back only when the builder returns entries.
- Mass route-level `og:image` overrides remain P2.
