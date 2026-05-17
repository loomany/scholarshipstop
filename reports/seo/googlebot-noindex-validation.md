# Googlebot Smartphone vs normal UA — noindex validation

**Mode:** READ-ONLY (no code / DB / env / GSC API / Indexing API changes).  
**Date:** 2026-05-12 (UTC).  
**Production:** `https://scholarshiptop.com`

---

## Method

1. **GET** (follow redirects, same as `curl -sL`) for each URL twice:
   - **Normal UA:** Chrome 125 desktop string.
   - **Googlebot Smartphone:** exact UA from your spec (Nexus 5X / Chrome 41 / `compatible; Googlebot/2.1`).
2. For each response, record: HTTP status, final URL, `X-Robots-Tag`, `Content-Type`, parsed `<title>`, first `<h1>`, `rel="canonical"`, `meta name="robots"` (strict patterns where noted), substring hits for `noindex`, presence of `__NEXT_DATA__`.
3. **Comparison:** byte length of HTML and all parsed fields; flag **any** UA divergence.

**Implementation note:** Dual-UA GETs were run via a **temporary local Node probe** (not committed to the app). Results below are from that run on 2026-05-12.

---

## URL list (exactly as requested)

| # | Source | URL |
|---|--------|-----|
| 1 | fixed | `https://scholarshiptop.com/scholarships` |
| 2–6 | first 5 `<loc>` in live `scholarships-0.xml` | harjit-sandhu…, arizona-foundation…, bishop-soter…, lower-brule…, california-youth… |
| 7–11 | first 5 `<loc>` in live `seo.xml` | `/scholarships/for-women`, `engineering`, `closing-soon`, `first-generation`, `computer-science` |
| 12 | fixed | `https://scholarshiptop.com/resources` |
| 13–15 | first 3 `<loc>` in live `resources.xml` | `scholarship-faq-low-gpa-students`, `verify-scholarship-emails-usa`, `usa-design-student-scholarships` |
| 16–18 | first 3 `<loc>` in live `essays.xml` | Richard R. Tufenkian…, Ballinger…, BBB Chicago… |

---

## Results summary

| Check | Normal UA | Googlebot Smartphone |
|-------|-----------|----------------------|
| **HTTP status** | **200** for all 18 URLs | **200** for all 18 URLs |
| **Final URL** | Same as request (no redirect chain beyond self) | Identical to normal UA |
| **`X-Robots-Tag`** | **absent** (null) on all sampled responses | **absent** — same as normal |
| **`meta name="robots"`** (scholarship hub, detail, SEO listings) | **`index, follow`** | **Identical** |
| **Canonical** | `https://scholarshiptop.com/...` (self) | **Identical** |
| **HTML length** | Per-URL length matched pair-wise | **Identical** to normal (e.g. `/scholarships` = 253 437 bytes both UAs) |
| **`noindex` in HTML body** | Count of literal `noindex` substring: **0** on scholarship URLs checked | **0** — same |
| **`__NEXT_DATA__`** | **Not present** (Next.js App Router streaming HTML; expected) | Same |

**Conclusion for UA diff:** For all listed URLs, **Googlebot Smartphone and normal UA received the same indexing signals and the same HTML** (no UA-based cloaking detected in this sample).

---

## Per-row table (representative fields)

Scholarship and hub URLs emit explicit `<meta name="robots" content="index, follow">`. Resource and essay article HTML often **omit** a `name="robots"` tag (Next defaults to indexable); the automated script must **not** confuse `meta name="viewport" content="...width..."` with robots — scholarship rows below use a strict `name="robots"` match.

| URL (short) | Status | X-Robots-Tag | meta robots (robots name only) | Canonical | Title (abridged) | First h1 (abridged) | SSR body | UA diff |
|-------------|--------|--------------|----------------------------------|-----------|------------------|---------------------|----------|---------|
| `/scholarships` | 200 | — | `index, follow` | `/scholarships` | Find Scholarships | Scholarship matches | large HTML | **none** |
| 5× scholarship detail | 200 | — | `index, follow` | self | grant-specific | Scholarship matches | large HTML | **none** |
| 5× SEO listing | 200 | — | `index, follow` | self | listing-specific | Scholarship matches | large HTML | **none** |
| `/resources` | 200 | — | (no `name="robots"` in head — default index) | `/resources` | Scholarship Resources… | Scholarship Resources | large HTML | **none** |
| 3× resource articles | 200 | — | (no `name="robots"` tag) | self | article titles | article h1s | large HTML | **none** |
| 3× essay articles | 200 | — | (no `name="robots"` tag) | self | essay titles | essay h1s | large HTML | **none** |

---

## Code paths where `/scholarships` can become `noindex` (read-only review)

### 1. Query-string “noise” → `noindex` (same for all user agents)

`app/scholarships/[[...slugPath]]/page.tsx` calls `isSeoNoiseQuery(searchParams)`. For the **root** `/scholarships` (`segments.length === 0`), if any listed query key is non-empty, metadata sets **`robots: { index: false, follow: true }`**.

```33:70:app/scholarships/[[...slugPath]]/page.tsx
  const hasNonCanonicalQuery = isSeoNoiseQuery(searchParams);
  if (segments.length > 0) {
    const canonical = getCanonical(`/scholarships/${segments.join('/')}`);
    return hasNonCanonicalQuery
      ? {
          alternates: { canonical },
          robots: {
            index: false,
            follow: true
          }
        }
      : {};
  }

  const canonical = getCanonical('/scholarships');
  return {
    title: 'Find Scholarships',
    description: SCHOLARSHIPS_ROOT_DESCRIPTION,
    alternates: { canonical },
    openGraph: {
      title: 'Find Scholarships',
      description: SCHOLARSHIPS_ROOT_DESCRIPTION,
      url: canonical,
      type: 'website'
    },
    ...(hasNonCanonicalQuery
      ? {
          robots: {
            index: false,
            follow: true
          }
        }
      : {
          robots: {
            index: true,
            follow: true
          }
        })
  };
```

Keys include **`utm_*`**, **`gclid`**, **`fbclid`**, **`tab`**, **`sort`**, **`scope`**, **`page`**, **`q`**, etc.:

```5:29:app/scholarships/scholarshipSeoNoiseQuery.ts
const SCHOLARSHIP_SEO_NOISE_QUERY_KEYS = [
  'app_cc',
  'aud',
  'category',
  'deadline',
  'email_ids',
  'fbclid',
  'gclid',
  'host_cc',
  'limit',
  'msclkid',
  'next',
  'page',
  'q',
  'return_to',
  'scope',
  'sort',
  'status',
  'step',
  'tab',
  'utm_campaign',
  'utm_content',
  'utm_medium',
  'utm_source',
  'utm_term'
] as const;
```

**Implication:** URL Inspection or a crawl that hits `https://scholarshiptop.com/scholarships?utm_source=…` (or `?tab=…`, etc.) will correctly see **`noindex`**. That is **not** Googlebot-specific — any UA gets the same HTML for the same URL including query.

### 2. Layout metadata for empty `slugPath`

`generateScholarshipSlugLayoutMetadata` returns `{ title: 'Find Scholarships' }` when `segments.length === 0` — **does not set `robots`**. Indexing for the clean root is driven by **page** `generateMetadata` above.

```86:88:app/scholarships/scholarshipSlugLayoutMetadata.ts
  if (segments.length === 0) {
    return { title: 'Find Scholarships' };
  }
```

### 3. Other `noindex` sources (not on `/scholarships` clean URL)

- Detail pages: `isIndexable === false` → `meta.robots` noindex (`scholarshipSlugLayoutMetadata.ts`).
- Cross-country: manifest-driven robots.
- Hub routes: `buildScholarshipHubRouteMetadata` (separate file) for `/scholarships/hub/...`.

None of these explain **Googlebot-only** noindex on the **clean** `/scholarships` URL given today’s live responses.

---

## Answers to your five questions

### 1. Does live production currently serve `noindex` or `index` for `/scholarships`?

For **`https://scholarshiptop.com/scholarships`** with **no query string**, both UAs get **`meta name="robots" content="index, follow"`**, **no `X-Robots-Tag`**, **200**, canonical `https://scholarshiptop.com/scholarships`.  
→ **Indexable today.**

### 2. Does Googlebot differ from a normal user?

**No** in this test: same status, headers, canonical, robots meta, title, h1, and **identical HTML length** for all 18 URLs.

### 3. Why might GSC have shown “noindex” on 2026-04-25?

Plausible explanations consistent with code + live checks:

1. **Crawl URL included “noise” query parameters** (`utm_*`, `tab`, `gclid`, etc.) → intentional **`noindex, follow`** per `page.tsx` + `isSeoNoiseQuery`.
2. **GSC UI / URL Inspection** tested a slightly different URL than the bare canonical (copy-paste from Ads, email, or internal tools with params).
3. **Stale report** — “Last crawl” date is not the same as “current live HTML”; between Apr 25 and May 12 deploy/config could have changed (not verified here).
4. Less likely given dual-UA parity: **edge/CDN UA sniffing** — not observed on these samples today.

### 4. Which URLs are safe to request re-indexing for in GSC?

Use **canonical, query-stripped** URLs:

- `https://scholarshiptop.com/scholarships`
- Representative **scholarship detail** URLs from sitemap (same slugs as in sitemap, no params).
- Representative **SEO listing** URLs (`/scholarships/for-women`, etc., no params).
- `https://scholarshiptop.com/resources` and individual **`/resources/{slug}`** articles (no `?page=`, `?q=`, etc. — see `app/resources/page.tsx` for index/noindex on filtered index views).

**Avoid** requesting indexing for URLs with **`utm_*`**, **`tab`**, **`sort`**, **`scope`**, **`gclid`**, etc., on `/scholarships` — they are **designed** to be `noindex`.

### 5. Code change vs “Request indexing”?

- **If** the live URL is the **clean** `/scholarships` and GSC still shows historical noindex: **Request indexing** on the **exact** canonical URL is reasonable; no code change required for UA parity.
- **If** the goal is for **tagged marketing URLs** (e.g. `?utm_source=…`) to also be **indexable**, that would require a **product/SEO policy change** in code (currently intentional noindex) — outside “request indexing” alone.

---

## `__NEXT_DATA__`

Not present in responses (App Router / RSC-style payload). **No** `noindex` inside `__NEXT_DATA__` applicable.

---

## Follow-up (optional, still read-only)

1. In GSC **URL Inspection**, paste **exactly** `https://scholarshiptop.com/scholarships` with **no** query string and re-run **Live test**.
2. If the inspected URL in history had params, compare with a clean URL.
3. Optional one-off local check: `curl -sL 'https://scholarshiptop.com/scholarships?utm_source=debug' | findstr /i robots` — expect **`noindex`** for both UAs (by design).

---

*End of report.*
