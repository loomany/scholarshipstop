# Noisy query URL discovery — internal links & sitemaps (read-only)

**Mode:** READ-ONLY (no code / DB / env / deploy / Indexing API).  
**Date:** 2026-05-12 (UTC).  
**Production checks:** HTTP GET HTML from `https://scholarshiptop.com` + substring scan of `<loc>` in selected sitemaps.

---

## Executive summary

1. **Sitemaps** sampled (`core.xml`, `seo.xml`, first chunk of `scholarships-0.xml`) contain **no `?` in `<loc>` URLs** — Google is **not** handed noisy query URLs via the XML sitemaps in these samples.

2. **SSR HTML** on **`/scholarships`** and some **resource / essay** articles contains **internal `<a href>` links** to **`/scholarships/hub/matches?...`** with **`category=`** and **`page=`** query parameters. Under current app rules, those URLs are **intentionally `noindex, follow`** (same idea as noisy hub metadata in `buildScholarshipHubRouteMetadata`).

3. **Literal `href="/scholarships?tab=…"`**-style links were **not** found in the SSR HTML of the sampled pages (`/`, `/scholarships`, `/resources`, one resource article, one essay, one scholarship detail). Such URLs **do exist in the codebase** for redirects, emails, and a few components (see §4).

4. **`page=2017`** appears once in the hub pagination link set on live `/scholarships` HTML — likely a **data/UI bug** (worth a future engineering pass; not “SEO config”).

**Bottom line:** Google can discover many **filter/pagination** URLs **because the site links to them on purpose** for UX; that is **aligned** with `noindex` on non-canonical hub views. Changing that is a **product trade-off** (SEO crawl shape vs filter-in-URL UX), not an emergency fix.

---

## 1. SSR HTML scan (production)

Fetched HTML (first ~900 KB per URL) and collected `href="..."` / `href='...'` targets containing `scholarships` **and** a noisy query key:  
`tab`, `sort`, `page`, `q`, `utm_`, `gclid`, `fbclid`, `msclkid`, `scope`, `aud`, `category`, `deadline`, `status`, `email_ids`.

| URL | Noisy `href` count (pattern above) | Examples (deduped) |
|-----|--------------------------------------|----------------------|
| `/` | **0** | — |
| `/scholarships` | **13** | `/scholarships/hub/matches?category=education`, `?category=arts`, `?category=medical`, `?page=2` … `?page=10`, **`?page=2017`** |
| `/resources` | **0** | — |
| `/resources/scholarship-faq-low-gpa-students` | **4** | Hub matches + `category=` (humanities, arts, stem, education) |
| `/essays/how-to-write-richard-r-tufenkian-scholarship-details-scholarship-essay` | **3** | Hub matches + `category=` (education, medical, law) |
| `/scholarships/harjit-sandhu-criminal-justice-scholarship-uue8kcn4pdkc` | **0** | — |

**Separate check:** regex for **`href="/scholarships?`** (root with query only) on the same HTML samples → **no matches** (no printed block in the scan run).

---

## 2. Sitemap check (`<loc>` with `?`)

From the same automated fetch (first 300–400 KB of each file):

| Sitemap | `<loc>` containing `?` in scanned prefix |
|---------|----------------------------------------|
| `core.xml` | **0** |
| `scholarships-0.xml` | **0** |
| `seo.xml` | **0** |

So **submitted URLs in sitemap are canonical paths** in this audit — not parameterized hub URLs.

---

## 3. Why Google still sees query URLs (sources)

### A. Internal crawl (confirmed in SSR)

- **Hub catalog chips + pagination** emit `href` to `/scholarships/hub/matches?category=…` and `?page=…`. Metadata for those URLs uses **`isSeoNoiseQuery`** via **`scholarshipHubListingQueryIsNonCanonical`** → **`robots: { index: false, follow: true }`** when any noise param is present:

```60:82:app/scholarships/scholarshipHubPageMetadata.ts
export function scholarshipHubListingQueryIsNonCanonical(
  searchParams?: Record<string, string | string[] | undefined>
): boolean {
  return isSeoNoiseQuery(searchParams);
}

export function buildScholarshipHubRouteMetadata(opts: {
  hubSegment: string;
  searchParams?: Record<string, string | string[] | undefined>;
}): Metadata {
  // ...
  const nonClean = scholarshipHubListingQueryIsNonCanonical(opts.searchParams);

  return {
    // ...
    robots: nonClean
      ? { index: false, follow: true }
      : { index: true, follow: true },
```

So: **internal links → crawl → correct `noindex`** for non-canonical hub states. **Safe for SEO policy**; only “expensive” if crawl budget is tight.

### B. JSON-LD `SearchAction` (not a literal internal anchor)

`app/layout.tsx` exposes a **Sitelinks Search Box** template with **`q=`**:

```154:157:app/layout.tsx
        potentialAction: {
          '@type': 'SearchAction',
          target: `${siteUrl}/scholarships?q={search_term_string}`,
          'query-input': 'required name=search_term_string'
        }
```

Google may construct **`/scholarships?q=…`** from this pattern. That URL class is **expected to be `noindex`** under `isSeoNoiseQuery` (key `q`). **Normal** for site search markup.

### C. Code paths with literal `/scholarships?…` (mostly off-marketing-SSR)

Examples from `rg` (not all SSR on every page):

| Area | Pattern | Role |
|------|---------|------|
| `app/saved-scholarships/page.tsx` | redirect to `?tab=saved` | Post-login / bookmark URL |
| `app/scholarships/email-digest/[token]/page.tsx` | `?tab=…&scope=…&sort=…` | Email digest flows |
| `lib/notifications/runGrantNotificationDispatch.ts` | `?tab=best-recommendation&scope=catalog&sort=…` | **Outbound email** links |
| `components/providers/ProviderProfileScholarshipsList.tsx` | `href="/scholarships?tab=ignored"` | Provider UI |
| `components/subscription/SubscriptionPricingClient.tsx` | `window.location.assign('/scholarships?status=success')` | Post-checkout client redirect |
| `middleware.ts` (comment) | legacy `?tab=` → `/scholarships/hub/…` | **Migration** of old links |

Google can find **(C)** via **emails**, **redirect chains**, **bookmarks**, and **any page that SSRs those links** (e.g. provider profile if indexed).

### D. External inbound links

Ads, affiliates, social posts, Telegram, partner sites often append **`utm_*` / `gclid` / `fbclid`**. Not controlled in-repo; still hit your **`noindex`** rules when they land on scholarship routes that read `searchParams`.

---

## 4. CTA / menu / cards — do they point to noisy URLs?

- **Global nav / home sample:** `/` had **no** noisy scholarship `href` in the scanned window.
- **Main hub `/scholarships`:** primary UX links include **canonical hub path** patterns **plus** explicit **category** and **pagination** query links (see table above) — **by design** for filtering.
- **Scholarship detail sample:** **no** noisy internal scholarship `href` in scan (related links use clean `/scholarships/{slug}` style paths elsewhere in codebase).
- **Resources index:** **no** noisy scholarship `href` in scan; **article** pages link into **hub + category** as related discovery.

**Verdict:** Important marketing surfaces (home, resources index, detail sample) are **not** littered with **`/scholarships?tab=`** in SSR; the **hub** intentionally exposes **filter/pagination** query URLs.

---

## 5. Which links are “safe” (indexable intent)

| Link pattern | Indexing intent (current code) |
|--------------|--------------------------------|
| `https://scholarshiptop.com/scholarships` (no query) | **Index** (hub root metadata) |
| `https://scholarshiptop.com/scholarships/hub/{segment}` (no query) | **Index** (`buildScholarshipHubRouteMetadata` clean branch) |
| `https://scholarshiptop.com/scholarships/{slug}` (detail / SEO listing) | Usually **index** unless route-specific rules apply |
| `/resources/...`, `/essays/...` (sampled) | No noisy scholarship hrefs on index; articles use hub category links as above |

---

## 6. What could be switched to “clean” canonicals (optional product work)

**Only if** you want **fewer** `noindex` URLs in Google’s crawl graph:

1. **Category chips / filters** — drive filters via **client state** (or `POST`/cookie) while keeping the visible URL as **`/scholarships/hub/matches`** only. **Trade-off:** shareable filtered URLs disappear unless you add a different pattern (e.g. dedicated SEO paths you already use for long-tail).

2. **Pagination** — same trade-off: `?page=2` is explicit and crawlable; **rel-prev/next** is legacy-weak; infinite scroll hurts crawl of deep pages.

3. **Outbound email / saved redirects** — often **should** stay query-based for **deep links** into a specific tab; **nofollow** on marketing modules rarely needed if those URLs are already `noindex`.

**Not recommended blindly:** removing `noindex` from noisy hub URLs — you would create **thin/near-duplicate** indexable URLs.

---

## 7. `page=2017` observation

Live `/scholarships` HTML included **`/scholarships/hub/matches?page=2017`** alongside `?page=2` … `?page=10`. That number is **implausible** as a real page index for pagination and **suggests a bug** (e.g. wrong variable fed into `buildHubListingSearchParams`). **Read-only flag:** verify in a future coding task; it wastes crawl on a useless URL.

---

## 8. Do you need to change anything?

| Question | Answer |
|----------|--------|
| Are sitemaps “leaking” query URLs? | **No** in sampled sitemaps. |
| Are internal links “wrong”? | They largely **match** the intentional **hub `noindex`** policy. |
| Must code change now? | **No**, unless you want **less** crawl of filter states or to **fix `page=2017`**. |
| GSC action | Keep promoting **clean** canonical URLs; noisy URLs being discovered is **expected** and **consistent** with metadata. |

---

*End of report.*
