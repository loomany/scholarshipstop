# SEO Indexing Drop Audit

**Scope:** Read-only audit of production `https://scholarshiptop.com` and repository code. No code, DB, env, Railway, Cloudflare, or GSC API changes were made.  
**Date:** 2026-05-12 (UTC).

---

## 1. Executive summary

Production is **broadly indexable**: `robots.txt` allows crawling, `/sitemap.xml` returns a valid sitemap **index** with **nine** child sitemaps, all child sitemaps return **200** and **`text/xml`**. Sampled pages return **200**, with **`index, follow`** on the main scholarship hub, SEO listings, scholarship detail, cross-country SEO URL, and `/resources`. Canonicals in HTML point to **`https://scholarshiptop.com`** (hardcoded origin in code). No **`X-Robots-Tag`** was observed on HEAD checks for sampled URLs.

The drop from **10,000+** to **~163** indexed URLs in Search Console is **not explained** by an empty sitemap, global `noindex`, or site-wide 404/500 in this audit. More plausible explanations are **GSC property scope** (apex vs `www` vs subdomain), **Google quality / deduplication** after an outage, **intentional `noindex` on large route groups** (e.g. compare university detail), and **reporting lag / recrawl**. **Action:** confirm which Search Console property URL is verified and align it with where traffic and canonicals live, then use URL Inspection on a few representative URLs (see §9).

**Caveat:** The first `<h1>` in fetched HTML is often the shared shell string **“Scholarship matches”** even when `<title>` and body copy are page-specific; grant names still appear many times in the document (e.g. **61** matches for “Harjit” on one detail URL). This is a **medium** UX/semantic-heading risk for crawlers, not a proof of empty SSR.

---

## 2. Most likely causes (strength order)

1. **Search Console property mismatch** — `core` sitemap lists many URLs on **`https://iq.scholarshiptop.com`** (separate host). If the GSC property is only `https://scholarshiptop.com/`, those URLs do not count toward that property’s indexed totals.
2. **Google deindexing / quality consolidation** after **Railway/availability issues** — temporary errors or thin/duplicate signals can trigger large drops that recover slowly without a sitemap bug.
3. **Large portions of the site intentionally `noindex`** — e.g. `/compare/universities/[slug]` uses `robots: noindex` in app code; many sitemap URLs under `compare.xml` may never be indexed.
4. **Crawl budget / prioritization** — ~**39k** URLs in sitemaps is large; Google may index a small fraction at any moment even when URLs are valid.
5. **Misinterpretation of “indexed” metric** — “Discovered / indexed” vs “Not indexed” filters, date range, and property type (URL-prefix vs Domain) change counts dramatically.

Less likely given checks: **broken root sitemap**, **robots blocking `/scholarships`**, **canonical pointing to localhost** (canonical helper is fixed to production origin), **wrong site shell** (build output shows ScholarshipTop routes, not a foreign project).

---

## 3. Production health (curl / headers)

| URL | Status | Content-Type | Cache-Control (summary) | x-robots-tag | Notes |
|-----|--------|----------------|-------------------------|--------------|--------|
| `https://scholarshiptop.com/` | 200 | `text/html; charset=utf-8` | `private, no-cache, no-store, max-age=0, must-revalidate` | (none) | `Server: cloudflare`, `x-powered-by: Next.js`, `x-railway-edge`, `x-railway-request-id` |
| `https://scholarshiptop.com/robots.txt` | 200 | `text/plain` | `public, max-age=14400, must-revalidate` | (none) | Served as static (`○ /robots.txt` in build) |
| `https://scholarshiptop.com/sitemap.xml` | 200 | `text/xml; charset=utf-8` | `public, max-age=300, s-maxage=3600` | (none) | Valid sitemap **index** (not a flat urlset) |
| `https://scholarshiptop.com/sitemaps/scholarships.xml` | **404** | `application/json` | — | — | **Expected:** real chunk is `scholarships-0.xml` (see §5). Wrong path returns JSON `{"error":"Sitemap not found"}` from `app/sitemaps/[slug]/route.ts`. |
| `https://scholarshiptop.com/sitemaps/cross-country.xml` | **404** | `application/json` | — | — | **Expected:** cross-country URLs live in **`seo.xml`**, not a separate `cross-country.xml` file. |
| `https://scholarshiptop.com/sitemaps/scholarships-0.xml` | 200 | `text/xml; charset=utf-8` | `public, max-age=300, s-maxage=3600` | (none) | Confirmed child sitemap works |
| `https://scholarshiptop.com/scholarships` | 200 | `text/html; charset=utf-8` | `private, no-cache, no-store…` | (none) | — |

**Redirects / wrong host:** `middleware.ts` issues **301** from `www.scholarshiptop.com` to apex `https://scholarshiptop.com` (no `:8080` in `Location` observed). Legacy **`/scholarships/compare/...`** paths redirect to **`/compare/...`** (301).

---

## 4. Robots audit

### Production `robots.txt` (fetched)

```
User-Agent: *
Allow: /
Disallow: /api/

Sitemap: https://scholarshiptop.com/sitemap.xml
```

### Code generation

- **`app/robots.ts`** — `allow: '/'`, `disallow: ['/api/']`, sitemap `getURL() + '/sitemap.xml'`. No `Disallow: /` and no block of `/scholarships` or `/sitemaps`.
- **`app/robots.txt/route.ts`** — **Not present**; robots come from **`app/robots.ts`** (MetadataRoute).

### `siteIndexable` / env flags (repository search)

- **`siteIndexable()`** — **not found** in the codebase (no matches).
- **`NEXT_PUBLIC_SITE_INDEXABLE` / `SITE_INDEXABLE` / `ROBOTS_NOINDEX` / `NOINDEX`** — no product usage found in the same grep pass as other SEO terms; **`.env.example`** documents **`SEO_DRIP_ENABLED`**, **`SEO_DRIP_START_DATE`**, **`SEO_PAGES_PER_HOUR`**, not a global “noindex site” flag.

**`getURL()`** (`utils/helpers.ts`): server uses **`NEXT_PUBLIC_SITE_URL`** with fallback **`https://scholarshiptop.com`** if unset (relevant for Railway misconfig of public URL for *links*, not for canonical tags — see §7).

### Robots verdict

| Question | Answer |
|----------|--------|
| Is Google allowed? | **Yes** (`Allow: /`, only `/api/` disallowed). |
| Is sitemap declared? | **Yes** → `https://scholarshiptop.com/sitemap.xml`. |
| Any accidental `Disallow`? | **No** on production file. |
| Any env risk? | **No global noindex flag found.** Drip env (`SEO_DRIP_*`) affects **which SEO listing paths appear in sitemap**, not robots.txt. |

---

## 5. Sitemap audit

### Sitemap index (`/sitemap.xml`)

- **Format:** Valid XML sitemap **index** (`<sitemapindex>`).
- **Child `<loc>` entries:** **9** (each ends in `.xml` under `/sitemaps/`).
- **No** `localhost`, **no** stray `:8080`, **no** obvious wrong domain in index (all `https://scholarshiptop.com/sitemaps/...`).

### Child sitemaps: HEAD + approximate `<loc>` counts

Counts obtained by fetching each child XML and counting `<loc>` substrings (read-only).

| Sitemap | HTTP | `<loc>` count | Content-Type | Assessment |
|---------|------|---------------:|--------------|------------|
| `/sitemap.xml` | 200 | **9** (child sitemaps) | `text/xml; charset=utf-8` | OK — index, not urlset |
| `/sitemaps/core.xml` | 200 | **75** | `text/xml; charset=utf-8` | OK — includes **iq.scholarshiptop.com** URLs |
| `/sitemaps/resources.xml` | 200 | **900** | `text/xml; charset=utf-8` | OK |
| `/sitemaps/essays.xml` | 200 | **11,788** | `text/xml; charset=utf-8` | OK — `/essays/...` URLs |
| `/sitemaps/providers.xml` | 200 | **5,197** | `text/xml; charset=utf-8` | OK |
| `/sitemaps/categories.xml` | 200 | **11** | `text/xml; charset=utf-8` | OK |
| `/sitemaps/seo.xml` | 200 | **1,626** | `text/xml; charset=utf-8` | OK — includes long-tail / cross-country style `/scholarships/...` paths |
| `/sitemaps/scholarships-0.xml` | 200 | **18,176** | `text/xml; charset=utf-8` | OK — detail URLs |
| `/sitemaps/compare.xml` | 200 | **1,171** | `text/xml; charset=utf-8` | OK — note many targets may be **noindex** in app metadata |

**Approximate total URL entries across all child sitemaps:** **75 + 900 + 11,788 + 5,197 + 11 + 1,626 + 18,176 + 1,171 ≈ 38,944**.

### Code references (generation)

| File | Role |
|------|------|
| `app/sitemap.xml/route.ts` | Builds index from `buildSitemapDocuments()` |
| `app/sitemaps/[slug]/route.ts` | Renders urlset per slug; **404 JSON** if slug unknown |
| `lib/seo/sitemaps.ts` | Buckets, DB reads, chunk `scholarships` as `scholarships-0`, `scholarships-1`, …; `buildCrossCountrySeoSitemapEntries` |
| `lib/seo/crossCountrySitemapEntries.ts` | Cross-country entries for **seo** bucket |
| `data/seo-cross-country-routes.json` | Source data for cross-country manifest |

**Scholarship + cross-country presence:** Sampled `seo.xml` content includes international / long-tail **`/scholarships/...`** URLs; cross-country example **`/scholarships/for-students-from/united-states/study-in/united-states`** is present in data and responds **200** with **`index, follow`**.

---

## 6. URL sample audit

### HEAD bulk sample (read-only script)

- **URLs checked:** **89** (mixed: `core` hub + iq subdomain + state provider directories + scholarship details + SEO listing paths).
- **Results:** **89 × HTTP 200** on HEAD; **no** `x-robots-tag` header on these responses; **no** `301/302/404/500` in this sample.
- **Limitation:** HEAD does not follow redirects to completion in this script; no systematic **canonical vs final URL** matrix was computed for all 89.

### HTML snippet sample (GET, parsed)

| URL | Status | meta robots | link canonical | Title (truncated sense) | First `<h1>` text (SSR) | Body markers | Verdict |
|-----|--------|-------------|----------------|-------------------------|-------------------------|--------------|---------|
| `/scholarships` | 200 | `index, follow` | `https://scholarshiptop.com/scholarships` | Find Scholarships (brand prefix) | `Scholarship matches` | scholarship / deadline / eligibility / award words present | **Indexable** |
| `/scholarships/for-women` | 200 | `index, follow` | self | Women listing title | `Scholarship matches` | same | **Indexable** (title OK; H1 generic) |
| `/scholarships/harjit-sandhu-criminal-justice-scholarship-uue8kcn4pdkc` | 200 | `index, follow` | self | Harjit Sandhu… | `Scholarship matches` | “Harjit” appears **61×** in HTML | **Indexable**; strong text signal despite generic H1 |
| `/scholarships/for-students-from/united-states/study-in/united-states` | 200 | `index, follow` | self | American Students… | `Scholarship matches` | same | **Indexable** (cross-country) |
| `/resources` | 200 | (no meta robots in first parse) | self | Resources title | `Scholarship Resources` | content markers present | **Likely indexable** |
| `/compare/universities/stanford-university` | 200 | **`noindex`** | (not captured in simple parse) | Matched scholarships title | (not in narrow parse) | fewer “deadline/eligibility” hits | **By design noindex** per app |

---

## 7. Metadata / canonical audit (code)

### Canonical

- **`lib/seo/canonical.ts`** — **`CANONICAL_ORIGIN = 'https://scholarshiptop.com'`** fixed. Reduces risk of Railway mis-`NEXT_PUBLIC_SITE_URL` breaking canonicals.

### `/scholarships` catch-all metadata

- **`app/scholarships/[[...slugPath]]/page.tsx`** — Root `/scholarships`: explicit **`index, follow`** when query is clean; **`index: false, follow: true`** for “SEO noise” query strings (`isSeoNoiseQuery`). Non-root paths with bad queries: **`noindex`** + canonical to path without noise.

### Layout metadata driver

- **`app/scholarships/[[...slugPath]]/layout.tsx`** → **`generateScholarshipSlugLayoutMetadata`** (`app/scholarships/scholarshipSlugLayoutMetadata.ts`):
  - **`cross_country_seo`**: robots from **`crossCountryListingRobotsFromManifest`** (can be noindex for some manifest rows).
  - **`scholarship_detail`**: **`meta.robots = { index: false, follow: true }`** when **`record.isIndexable === false`**.
  - Drip: when `shouldBlockScholarshipListingForDrip` is true, listings still get explicit canonical with **`withExplicitIndexFollowWhenUnset`** behavior on robots (see file for combinations).

### Compare routes

- **`app/compare/universities/[slug]/page.tsx`** — **`robots: { index: false, follow: false }`** (matches live **`noindex`** sample).

### Files to review if GSC shows “Crawled / not indexed” for classes of URLs

- `app/scholarships/scholarshipSlugLayoutMetadata.ts`
- `app/scholarships/[[...slugPath]]/page.tsx`
- `lib/scholarships/seoCrossCountryManifest.ts`
- `lib/scholarships/seoListingBroadNoindex.ts` / `lib/scholarships/seoScholarshipResolve.ts` (broad / thin rules)
- `app/scholarships/category/[slug]/page.tsx` (conditional noindex for categories)

---

## 8. Route regression audit (build)

`npm run build` **succeeded** (Next.js **14.2.35**).

Relevant routes in build output:

- `ƒ /scholarships/[[...slugPath]]`
- `ƒ /scholarships/[state]/[university]`
- `ƒ /scholarships/category/[slug]`
- `○ /robots.txt`
- `○ /sitemap.xml`
- `ƒ /sitemaps/[slug]`

**No** evidence of a wrong project shell or **`NEXT_PUBLIC_STATIC_UI`** takeover (no matches in TS/TSX for `NEXT_PUBLIC_STATIC_UI` / `dordoi` in application code from targeted grep; **`middleware.ts`** only documents iq subdomain rewrites and compare path fixes).

---

## 9. SSR content audit

- **Hub `/scholarships`:** Large HTML (~250 KB in sample), **`index, follow`**, canonical correct, keywords present in body.
- **Detail sample:** Grant name appears **many** times; JSON-LD and title are scholarship-specific per layout code.
- **Loading shell:** `[[...slugPath]]/layout.tsx` comments note **Suspense / `loading.tsx`** streaming — the **first `<h1>`** in the downloaded HTML is often the **shared shell** (“Scholarship matches”), not the grant H1. **Risk:** weaker heading semantics vs title; not the same as “empty HTML shell.”

---

## 10. Search Console–related checks (no Google scraping)

Already verified without GSC:

- Sitemap reachable and non-empty.
- Robots not blocking primary paths.
- Sample pages **200** with **`index, follow`** where expected.
- Canonical host stable (`scholarshiptop.com`).

**Manual checks in GSC (recommended):**

1. Confirm **property** type: Domain vs URL prefix (`https://scholarshiptop.com/` vs `https://www…` vs `https://iq…`).
2. **URL Inspection** on: `/scholarships`, one **detail** URL from sitemap, one **`seo.xml`** long-tail, one **cross-country** URL, one **`/compare/universities/...`** (expect **noindex**).
3. Compare **User-declared canonical** vs **Google-selected canonical** on a detail page.
4. **Page indexing** section: reason for “not indexed” on random samples from `compare.xml` vs `scholarships-0.xml`.
5. **Sitemaps** report: processed URLs vs discovered.
6. **Crawl stats** around outage dates (server errors spike).

---

## 11. Critical findings (evidence-based)

1. **Sitemap is large and valid** (~**39k** URLs); root **`/sitemap.xml`** is an **index**, not a single urlset — tools counting only top-level `<loc>` as “pages” will be wrong.
2. **`/sitemaps/scholarships.xml` does not exist** by design (use **`scholarships-0.xml`** etc.). A monitor using the wrong URL will false-alarm **404**.
3. **No separate `/sitemaps/cross-country.xml`** — cross-country is in **`seo.xml`**.
4. **`core.xml` includes `https://iq.scholarshiptop.com/...`** — indexed counts on a **scholarshiptop.com-only** property will not include those URLs.
5. **Many compare URLs are `noindex`** while still listed in **`compare.xml`** — normal, but inflates “submitted vs indexed” gap.
6. **Generic first `<h1>`** (“Scholarship matches”) on several templates while titles/body are specific — worth UX/SEO review, not a smoking gun for total deindex.

---

## 12. Risk levels

| ID | Level | Item |
|----|-------|------|
| R1 | **P1** | **GSC property / host scope** — iq subdomain and apex/www split can explain order-of-magnitude index count differences. |
| R2 | **P1** | **Outage / error-rate history** — if Google saw sustained **5xx** or empty responses, a sharp indexed drop is expected until recrawl stabilizes. |
| R3 | **P2** | **Submitted vs indexed gap** — ~39k submitted URLs vs ~163 indexed suggests **quality/crawl/noindex** mix, not sitemap absence. |
| R4 | **P2** | **First `<h1>` shared across routes** — may dilute topical clarity; titles and copy mitigate. |
| R5 | **P3** | **Monitoring false positives** — checking non-existent `scholarships.xml` / `cross-country.xml` paths. |

---

## 13. Recommended next steps (no implementation in this pass)

1. **Confirm Search Console property** (exact URL prefix or Domain) and whether **`iq.scholarshiptop.com`** should be a separate property or consolidated reporting.
2. In GSC, run **URL Inspection** on 5 URLs from §6 and compare indexing vs live `curl` (already healthy).
3. If crawl errors spiked during Railway issues, pull **server logs / status time series** for that window (read-only) to correlate.
4. Optionally export a list of **“Discovered – currently not indexed”** reasons from GSC and map them to route kinds (`compare` noindex vs thin listing vs duplicate).
5. **After** confirming no systematic `noindex`/404 for strategic URLs, use normal GSC sitemap refresh / patience — **do not** mass resubmit until stakeholders agree (per your note).

---

## 14. Bulk status sample (HEAD)

| Metric | Value |
|--------|------:|
| Total checked | 89 |
| 200 | 89 |
| 301/302 | 0 (in this HEAD sample) |
| 404 | 0 |
| 500 | 0 |
| `x-robots-tag: noindex` in response headers | 0 |
| Canonical mismatch scan | Not run for all 89 (HTML not fetched for each) |

---

## 15. Acceptance criteria checklist

| Requirement | Met |
|-------------|-----|
| Exact list of sitemaps + URL counts | Yes (§5) |
| 30–100 URLs with statuses | Yes — **89** HEAD checks + HTML deep sample (§6, §14) |
| noindex conclusion | Yes — global **index,follow** on key samples; **by-design noindex** on compare university (§6–7) |
| robots conclusion | Yes (§4) |
| SSR HTML conclusion | Yes — substantial HTML, titles, robots, canonical; generic first H1 noted (§9) |
| Scholarship routes not removed | Yes — build lists catch-all + related routes (§8) |
| No accidental other site / static UI | Nothing found in targeted search (§8) |
| Files with potential issues | Listed §5, §7, §11 |
| P0 / P1 | §12 |
| What to fix first | §13 (measurement + GSC validation before code changes) |

---

*End of report.*
