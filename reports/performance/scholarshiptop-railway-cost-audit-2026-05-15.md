# ScholarshipTop Railway Cost & Performance Audit

**Mode:** Audit-only — no code, DB, env, auth, payments, Lemon, Supabase RLS, commit, or push changes.  
**Date:** 2026-05-15 (UTC)  
**Service:** Railway `Сайт` → https://scholarshiptop.com  
**Method:** Static codebase review + prior production SEO audits in `reports/seo/`.

---

## 1. Executive summary

Railway billing for the main site service shows **~$26.58 total**, with **RAM ~$18.47** (dominant), **egress ~$5.58 / ~111 GB**, **~5.8M requests**, **memory spikes 8–10 GB**, and **p99 latency 10–15s**. The codebase explains both dimensions:

| Dimension | Primary drivers (code-backed) |
|-----------|------------------------------|
| **RAM spikes** | Per-request sitemap builds that materialize **all buckets** (including every indexable scholarship URL) before returning one child file; in-process **`listMetaCache`** (up to **400** full `ScholarshipListMeta` objects); static SEO manifests loaded at process start; sitemap scholarship array growth in `fetchScholarshipSitemapEntries`. |
| **Request volume & CPU** | **`/api/scholarships`** marked `force-dynamic` with heavy meta queries (13+ parallel DB counts per `meta_only`); hub/SEO **SSR** + client **POST** refetch; crawlers use the **same** paths as users (no bot fast path). |
| **Egress** | Large JSON list/meta responses (~60 columns × up to 50 rows per request); sitemap XML; **`/_next/image`** optimization (middleware-excluded, still hits Next origin). |

**Highest-confidence fix (P0, config/architecture):** Put **Cloudflare** (or similar) in front with cache rules for sitemaps, static assets, and the narrow guest hub API case; consider **splitting sitemap generation** off the web service.

**Highest-confidence code fix (P1):** Change `getSitemapDocumentBySlug` so a request for e.g. `scholarships-0` does **not** call `buildSitemapDocuments()` (full rebuild).

---

## 2. Railway metrics vs. codebase (interpretation)

| Metric | Observation | Likely code correlate |
|--------|-------------|------------------------|
| RAM ~70% of bill, 8–10 GB spikes | Long-lived Node process + large transient allocations | Sitemap full-build, meta cache, manifest JSON in heap |
| 5.8M requests | High crawl + SPA hydration + API POSTs | Hub pagination links, SEO manifest routes, `meta_only` refetch |
| 111 GB egress | XML + JSON + images | `/api/scholarships`, `/sitemaps/*`, `/_next/image` |
| p99 10–15s | Cold meta/sitemap/SEO SSR | `fetchScholarshipListMeta`, `buildSitemapBuckets`, cross-country SSR with full meta |

---

## 3. Top suspected cost drivers (ranked)

| Rank | Driver | Risk | Routes / files |
|------|--------|------|----------------|
| **1** | Child sitemap handler rebuilds **entire** sitemap graph per request | **Critical** | `app/sitemaps/[slug]/route.ts` → `lib/seo/sitemaps.ts` `getSitemapDocumentBySlug` |
| **2** | `/api/scholarships` always dynamic; `meta_only` runs full meta SQL | **Critical** | `app/api/scholarships/route.ts`, `lib/scholarships/scholarshipListServer.ts` |
| **3** | `listMetaCache` — up to 400 full meta blobs × 120s TTL | **High** | `lib/scholarships/scholarshipListServer.ts` L237–327, L3208–3323 |
| **4** | Hub + SEO SSR + client POST (double work on first paint) | **High** | `scholarshipListServerPayload.ts`, `ScholarshipsHubPageClient.tsx`, `scholarshipListFetch.ts` |
| **5** | Sitemap scholarship bucket loads **all** indexable rows into one array | **High** | `lib/seo/sitemaps.ts` `fetchScholarshipSitemapEntries` |
| **6** | SEO listing SSR with `includeCategoryCounts: true` | **High** | `scholarshipListServerPayload.ts` (cross-country, country, long-tail) |
| **7** | Crawler-discoverable deep pagination (`page=2017` etc.) | **Medium** | `lib/pagination/visiblePaginationItems.ts`, hub client |
| **8** | Process-lifetime manifest Maps (~780 KB JSON + entries) | **Medium** | `data/seo-scholarship-routes.json`, `lib/scholarships/seoScholarshipResolve.ts` |
| **9** | Unbounded thin-listing policy caches (2 min TTL, no max keys) | **Medium** | `lib/scholarships/seoListingMetadataPolicy.ts` |
| **10** | `/_next/image` + static (egress; less RAM) | **Medium** | Next.js defaults; `middleware.ts` excludes from session |

---

## 4. Route-by-route analysis

### 4.1 `/scholarships` (catalog root)

| Item | Detail |
|------|--------|
| **Handler** | `app/scholarships/[[...slugPath]]/page.tsx` — empty `slugPath` → `scholarshipsSlugPathPageBody.tsx` |
| **Rendering** | `revalidate = 300` (ISR); still executes server work on revalidation |
| **SSR path** | `HubRootStreamedBridge` → `fetchInitialHubScholarshipsPayload` |
| **DB work** | List query with `includeMeta: false`, `includeCategoryCounts: false`; meta stub via `createDeferredScholarshipListMeta` (`deferredCounts: true`) |
| **Client follow-up** | `postScholarshipsMeta` / `postScholarshipsList` → `/api/scholarships` (full meta on client) |
| **Risk** | **High** — every page view = SSR list + client API meta |

**Evidence — hub SSR defers heavy meta:**

```164:172:app/scholarships/scholarshipListServerPayload.ts
    result = await executeScholarshipListQuery(
      supabase,
      profile ? { ...req, personalizedProfile: profile } : req,
      {
        countOnly: false,
        includeMeta: false,
        includeCategoryCounts: false,
        isProSubscriber: false
      }
    );
```

```190:192:app/scholarships/scholarshipListServerPayload.ts
  result.meta = createDeferredScholarshipListMeta(metaReq, defaultBounds);
```

---

### 4.2 `/scholarships/hub/*`

| Item | Detail |
|------|--------|
| **Handler** | Same catch-all; `segments[0] === 'hub'` in `scholarshipsSlugPathPageBody.tsx` |
| **Metadata** | `buildScholarshipHubRouteMetadata` — `noindex` when `isSeoNoiseQuery` (e.g. `page`, `category`, `tab`) |
| **SSR** | Same `HubRootStreamedBridge`; logged-in users trigger `profiles.select('*')` on SSR |
| **Risk** | **High** — canonical hub URLs indexed; noisy variants still hit origin (noindex but full SSR) |

**Evidence — noise query keys include `page`:**

```5:17:app/scholarships/scholarshipSeoNoiseQuery.ts
const SCHOLARSHIP_SEO_NOISE_QUERY_KEYS = [
  'app_cc',
  'aud',
  'category',
  ...
  'page',
  ...
  'tab',
```

Prior audit: live `/scholarships` HTML exposes `href` to `/scholarships/hub/matches?page=2` … `page=2017` (see `reports/seo/noisy-query-url-discovery-audit.md`, `reports/seo/pagination-page-2017-root-cause.md`).

---

### 4.3 `/scholarships/for-students-from/*/study-in/*`

| Item | Detail |
|------|--------|
| **Resolve** | `lib/scholarships/seoCrossCountryManifest.ts` + `seoScholarshipResolve.ts` |
| **SSR** | `fetchInitialCrossCountryScholarshipsPayload` — **`includeMeta: true`, `includeCategoryCounts: true`** |
| **Manifest** | 308 cross-country entries in `data/seo-cross-country-routes.json` (Map at import) |
| **Risk** | **High** per crawl — full meta query stack on each SEO page SSR |

---

### 4.4 `/api/scholarships`

| Item | Detail |
|------|--------|
| **Handler** | `app/api/scholarships/route.ts` |
| **Dynamic** | `export const dynamic = 'force-dynamic'` (L52) — bypasses static/ISR for all methods |
| **List select** | `PUBLIC_LIST_CARD_SELECT` (~55 columns), not `select('*')` on scholarships |
| **Profile** | `profiles.select('*')` when session exists (L97) |
| **Meta** | `fetchScholarshipListMeta` — sidebar counts + **13 parallel `countCategory`** + applicant/host country aggregates |
| **Guest cache** | Only hub page 1, default limit 9, `matches`/`easy-apply`, no filters — `public, s-maxage=45, stale-while-revalidate=300` |
| **Risk** | **Critical** — primary origin load for hub UX and bots |

**Evidence — force-dynamic:**

```52:52:app/api/scholarships/route.ts
export const dynamic = 'force-dynamic';
```

**Evidence — category count fan-out:**

```3251:3257:lib/scholarships/scholarshipListServer.ts
  if (includeCategoryCounts) {
    const categoryParts = await Promise.allSettled(
      SCHOLARSHIP_CATEGORY_ORDER.map(async (id) => ({
        id,
        n: await countCategory(supabase, categoryReq, id)
      }))
    );
```

`SCHOLARSHIP_CATEGORY_ORDER` has **13** categories (`app/scholarships/scholarshipCategories.ts`).

**Evidence — narrow public cache:**

```173:209:app/api/scholarships/route.ts
function buildGuestPublicCacheControl(args: { ... }): string | null {
  if (args.authUser) return null;
  if (!args.isHubPrimaryListing) return null;
  if (args.countOnly || args.includeMeta || args.metaOnly) return null;
  if (args.req.page !== 1 || args.req.limit !== SCHOLARSHIPS_PAGE_SIZE) return null;
  ...
  return 'public, s-maxage=45, stale-while-revalidate=300';
}
```

**Client `meta_only` path** (`app/scholarships/scholarshipListFetch.ts` L124–130) always gets `Cache-Control: private, no-store` (L588 in route).

---

### 4.5 `/sitemap.xml` and `/sitemaps/*`

| Item | Detail |
|------|--------|
| **Index** | `app/sitemap.xml/route.ts` — `revalidate = 3600`, `Cache-Control: public, max-age=300, s-maxage=3600` |
| **Children** | `app/sitemaps/[slug]/route.ts` — same cache headers |
| **Build** | `lib/seo/sitemaps.ts` — `buildSitemapBuckets` / `buildSitemapDocuments` wrapped in React `cache()` (per-request dedupe only) |
| **Scholarships** | Paginated DB read (1000/page) into growing `out[]` until all indexable scholarships loaded |
| **SEO bucket** | 789 manifest paths (≥3 grants) + long-tail + state/university/cross-country URLs |
| **Critical bug** | `getSitemapDocumentBySlug` calls `buildSitemapDocuments()` → builds **all** buckets, then `.find()` one slug |

**Evidence — full rebuild for one child:**

```596:600:lib/seo/sitemaps.ts
export const getSitemapDocumentBySlug = cache(
  async (slug: string): Promise<SitemapDocument | null> => {
    const docs = await buildSitemapDocuments();
    return docs.find((doc) => doc.slug === slug) ?? null;
  }
);
```

**Impact model:** If crawlers fetch index + ~9 child sitemaps per hour, each child request may still allocate scholarship + SEO URL arrays (~tens of thousands of URLs). Prior audit noted **~39k** URLs across sitemaps (`reports/seo/indexing-drop-audit.md`). This aligns with **RAM spikes** and **high p99** on sitemap routes.

**Evidence — scholarship array materialization:**

```286:315:lib/seo/sitemaps.ts
async function fetchScholarshipSitemapEntries(base: string): Promise<MetadataRoute.Sitemap> {
  ...
  const out: MetadataRoute.Sitemap = [];
  ...
  for (;;) {
    const { data, error } = await supabase
      .from('scholarships')
      .select('id, slug, updated_at, is_indexable')
      ...
    for (const row of batch) { ... out.push({ url: ... }); }
    if (batch.length < SITEMAP_DB_PAGE_SIZE) break;
    offset += SITEMAP_DB_PAGE_SIZE;
  }
  return out;
}
```

---

### 4.6 `/_next/static/*` and `/_next/image`

| Item | Detail |
|------|--------|
| **Implementation** | Next.js built-in; no custom route handlers in repo |
| **Middleware** | Excluded from Supabase session matcher (`middleware.ts` L189–199) |
| **Config** | No custom `images` block in `next.config.mjs` |
| **Caching** | Framework defaults (hashed static assets long-lived; image optimizer hits origin) |
| **Risk** | **Medium egress** — 111 GB total egress may include significant image bytes; RAM lower than API/sitemap |

---

## 5. Memory: caches, leaks, and retention

| Location | Mechanism | Cap / TTL | Risk | Notes |
|----------|-----------|-----------|------|-------|
| `listMetaCache` | `Map<string, ScholarshipListMeta>` | **400 entries**, **120s** TTL | **High** | Each value = full sidebar + 13 category counts + country arrays |
| `globalFilterBoundsCache` | Single slot | 5 min | Low | Small |
| `applicantCountryCountsCache` / `hostCountryCountsCache` | Single slot | 5 min | Medium | Large country arrays |
| `homeCatalogStatsCache` | Single slot | 5 min | Low | |
| `manifestThinCache` / `legacyThinCache` / `categoryThinCache` | `Map` | **2 min TTL, no max size** | **Medium** | Keys = SEO paths; crawler burst → many keys until expiry |
| `manifestByPath` | `Map` from JSON | **Process lifetime** | **Medium** | 789 routes, ~780 KB file |
| `entriesByCanonicalPath` (cross-country) | `Map` | **Process lifetime** | **Low–Medium** | 308 entries |
| `buildSitemapBuckets` | React `cache()` | Per HTTP request | **High** transient | Not cross-request; spikes within request |
| `unstable_cache` (scholarships listing) | Intentionally **not** used for list API | — | — | Comment in `route.ts` L86–88; home stats only in `homePageStatsCached.ts` |

**Evidence — list meta cache limits:**

```276:284:lib/scholarships/scholarshipListServer.ts
/** LRU-ish cap: bump on read moves entry to Map end; evict from start when over limit. */
const LIST_META_CACHE_MAX_ENTRIES = 400;
...
const listMetaCache = new Map<string, ListMetaCacheEntry>();
```

**Worst-case RAM sketch (order of magnitude):** 400 × (filter bounds + 13 counts + country count arrays + sidebar counts). If country aggregates list hundreds of codes, **hundreds of MB** in `listMetaCache` alone is plausible under diverse crawler query combinations (`app_cc`, `host_cc`, tab, filters).

---

## 6. API payload size

### 6.1 List row shape

- Source view: `scholarships_safe_listing` via `SCHOLARSHIPS_LISTING_SOURCE`.
- **~55 columns** in `PUBLIC_LIST_CARD_SELECT` (strips URLs, social, AI fields, `raw_data`).
- Max **`limit` = 50** (`MAX_LIMIT` in `scholarshipListServer.ts` L233).
- Default page size **9** (`SCHOLARSHIPS_PAGE_SIZE`).

```125:199:lib/scholarships/supabase.ts
const LISTING_CARD_SELECT_COLUMNS = [
  'id', 'slug', 'source', 'title', ... ~60 fields including tags, seo_tags, country codes, etc.
];
```

### 6.2 Meta payload

`ScholarshipListMeta` includes:

- `filterBounds`, `sidebarCounts`
- `categoryCounts` (13 keys)
- `countryCounts`, `hostCountryCounts` (+ unspecified counts)
- Optional profile fields when authenticated

Returned on:

- `meta_only=1` / `meta=1` API calls
- SEO SSR paths with `includeMeta: true`
- List responses when `includeMeta` true (not hub SSR initial path)

### 6.3 `select('*')` in scholarships hot path

| File | Usage |
|------|--------|
| `app/api/scholarships/route.ts` L97 | `profiles` for personalized listing |
| `app/scholarships/scholarshipsSlugPathPageBody.tsx` L198 | Hub SSR when logged in |

Scholarship **rows** avoid `*` in production list path — good.

### 6.4 Payload optimization opportunities (P1, not implemented)

- Trim list columns for hub cards vs. detail.
- Split `meta_only` into lighter endpoints (sidebar-only vs. category dropdown).
- Compress or paginate `countryCounts` for API consumers that only need top-N.

---

## 7. Bot, pagination, and query spam

### 7.1 Bot handling

- **Analytics only:** `lib/analytics/visitorDiagnostics.ts` detects Googlebot, Bingbot, AhrefsBot, SemrushBot, etc. — **no routing or caching shortcut**.
- **Middleware:** Session refresh on almost all paths; bots still invoke scholarship SSR/API unless cached at CDN.
- **Same HTML/API as users** for scholarship and SEO routes.

### 7.2 Pagination

- Page size **9**; UI `totalPages` ≈ `ceil(total/9)` → **~2017** for ~18k scholarships (`reports/seo/pagination-page-2017-root-cause.md`).
- API parses `page` up to **50000** (`scholarshipListServer.ts` L643–648); execution clamps to `maxPage` but **count queries** may still run for out-of-range pages depending on path.
- Pagination chips **always link to last page** (`lib/pagination/visiblePaginationItems.ts`) — crawlers discover deep `page=` URLs.

### 7.3 Noisy query params

- `isSeoNoiseQuery` → `noindex, follow` on scholarship pages with `page`, `tab`, `category`, UTM, etc.
- Sitemaps **do not** include query URLs (verified in `reports/seo/noisy-query-url-discovery-audit.md`).
- Internal links **do** expose noisy hub URLs → crawl discovery without index intent.

### 7.4 SEO route inventory (crawl surface)

| Source | Approx. scale |
|--------|----------------|
| Manifest routes (sitemap-eligible, ≥3 grants) | **789** |
| Cross-country manifest | **308** entries |
| Scholarship detail sitemap chunks | **~18k+** URLs (inferred from pagination total) |
| Long-tail / state / university / compare | Additional thousands (`indexing-drop-audit` ~39k total) |

---

## 8. Caching headers (summary)

| Surface | Cache-Control / behavior | CDN-friendly? |
|---------|--------------------------|---------------|
| `/sitemap.xml` | `public, max-age=300, s-maxage=3600` | **Yes** (if edge caches XML) |
| `/sitemaps/*` | Same | **Yes** (origin work still heavy on miss) |
| `/scholarships` HTML | `revalidate=300`; typical Next `private, no-cache` on dynamic HTML | **Partial** (ISR) |
| `/api/scholarships` (guest hub p1) | `public, s-maxage=45, stale-while-revalidate=300` | **Narrow** |
| `/api/scholarships` (default) | `private, no-store` | **No** |
| `/api/scholarships` `meta_only` | `private, no-store` | **No** |
| `/_next/static/*` | Next default (long cache hashed assets) | **Yes** at CDN |
| `/_next/image` | Next image optimizer defaults | **Depends** on CDN image cache |

Production sample from `reports/seo/indexing-drop-audit.md`: HTML scholarship pages returned `private, no-cache, no-store, max-age=0, must-revalidate` — **origin-heavy** without edge HTML cache.

---

## 9. Recommendations (no implementation in this audit)

### P0 — Quick config / infra (no code deploy required)

| Action | Rationale |
|--------|-----------|
| **Cloudflare cache rules** for `/sitemaps/*.xml`, `/sitemap.xml` | Headers already allow `s-maxage=3600`; reduces repeat full sitemap builds on Railway |
| **Cache static** `/_next/static/*` aggressively | Low risk; cuts egress |
| **Review Railway replica count / memory limit** | Spikes to 8–10 GB may indicate need for vertical scale **or** fixing sitemap (cheaper than over-provisioning) |
| **Enable SCHOLARSHIPS_META_TIMING_DEBUG / API timing** temporarily in staging | Validates meta vs. list time before code changes |
| **Log sampling** by path (`/api/scholarships`, `/sitemaps/`, `/scholarships/hub`) | Confirm 5.8M request breakdown in Railway metrics |

### P1 — Safe code fixes (low product risk)

| Fix | File(s) | Impact |
|-----|---------|--------|
| **Lazy sitemap slug resolution** — build only requested bucket/slug, not `buildSitemapDocuments()` | `lib/seo/sitemaps.ts`, `app/sitemaps/[slug]/route.ts` | **Large** RAM/CPU reduction on sitemap hits |
| **Cap `manifestThinCache` / policy caches** with max entries (mirror `listMetaCache`) | `lib/scholarships/seoListingMetadataPolicy.ts` | Prevents unbounded Map growth |
| **Extend guest `Cache-Control`** to hub `meta_only` sidebar-only mode when `sidebarOnlyMeta` | `app/api/scholarships/route.ts` | Fewer origin meta hits |
| **Clamp sitemap-unrelated API `page` earlier** (e.g. max 500) for anonymous | `scholarshipListServer.ts` | Reduces junk crawler pages |
| **Optional: `select` explicit profile columns** instead of `*` | `route.ts`, `scholarshipsSlugPathPageBody.tsx` | Smaller rows, minor |

### P2 — Architecture / CDN / product

| Initiative | Notes |
|------------|-------|
| **Pre-generate sitemaps** to R2/Blob + serve statically | Eliminates DB scan on each crawl wave |
| **Edge cache HTML** for canonical SEO listings (short TTL) | Reduces SSR for Googlebot |
| **Bot-aware lightweight SSR** (strip meta, defer counts) | Controversial for SEO; only with measurement |
| **Pagination UX** — omit or `nofollow` last-page jump link | Reduces `page=2017` crawl noise (`visiblePaginationItems.ts`) |
| **Split scholarship API** — list vs. meta microservice or edge function | Isolates 5.8M request blast from page SSR |
| **Move images to CDN** with transform cache | Targets 111 GB egress |
| **Consider removing `force-dynamic`** on API where cookie-less public reads allow `revalidate` + cache tags | Requires careful auth boundary testing |

---

## 10. Evidence index (primary files)

| Area | Path |
|------|------|
| Scholarships API | `app/api/scholarships/route.ts` |
| List + meta server | `lib/scholarships/scholarshipListServer.ts` |
| Hub SSR payload | `app/scholarships/scholarshipListServerPayload.ts` |
| Hub client + fetch | `app/scholarships/ScholarshipsHubPageClient.tsx`, `app/scholarships/scholarshipListFetch.ts` |
| Catch-all pages | `app/scholarships/[[...slugPath]]/page.tsx`, `app/scholarships/scholarshipsSlugPathPageBody.tsx` |
| Sitemaps | `lib/seo/sitemaps.ts`, `app/sitemap.xml/route.ts`, `app/sitemaps/[slug]/route.ts` |
| SEO manifest | `lib/scholarships/seoScholarshipResolve.ts`, `data/seo-scholarship-routes.json` |
| Cross-country | `lib/scholarships/seoCrossCountryManifest.ts`, `data/seo-cross-country-routes.json` |
| Column selection | `lib/scholarships/supabase.ts` |
| Noise queries | `app/scholarships/scholarshipSeoNoiseQuery.ts` |
| Middleware | `middleware.ts` |
| Prior SEO audits | `reports/seo/noisy-query-url-discovery-audit.md`, `reports/seo/pagination-page-2017-root-cause.md`, `reports/seo/indexing-drop-audit.md` |

---

## 11. What this audit did **not** do

- No Railway log pulls, APM traces, or request-path histograms (recommend enabling).
- No live payload byte measurement (recommend `curl -w '%{size_download}'` on `/api/scholarships` with representative bodies).
- No Supabase query plan analysis.
- No changes to production systems.

---

**Next step for approval:** Prioritize **P1 sitemap lazy build** and **P0 Cloudflare sitemap caching** — highest ROI vs. RAM spikes and crawl-driven cost.
