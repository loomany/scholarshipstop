# Root `/scholarships` noindex — git history & root-cause analysis

**Mode:** READ-ONLY (no code / DB / env / deploy / GSC API changes).  
**Evidence:** local `git` history + `git show` of past file versions.  
**User context:** GSC reported (crawl **2026-04-25**) that `https://scholarshiptop.com/scholarships` was not indexed due to **meta robots noindex**. Live checks **after** that date show **`index, follow`** for a **clean** URL (see `reports/seo/googlebot-noindex-validation.md`).

---

## Executive summary

From repository history, **there is no commit that sets `robots: { index: false }` for a *clean* `/scholarships` URL** (no “noise” query) in `app/scholarships/[[...slugPath]]/page.tsx` after the indexing-controls work stabilized.

What **did** exist before and on **2026-04-25**:

1. **Query-based `noindex` by design** — from **`332324c`** (2026-04-07), the hub root returned **`noindex, follow`** when any of **`q`**, **`category`**, **`sort`**, **`page`**, **`deadline`**, **`tab`** was present. That is still the core idea today, now centralized in **`isSeoNoiseQuery`** (**`8e317a1`**, 2026-04-29) with a **larger** key list (incl. **`utm_*`**, **`gclid`**, **`scope`**, etc.).

2. **Explicit `index, follow` for the clean hub** — added in **`ba709bf`** (2026-04-07 22:56:14 +0500, *“SEO drip-feed… explicit index robots”*). **2026-04-25** is **after** that commit, so any production build aligned with `main` should already have included **positive** robots for the clean URL in `page.tsx` (unless an old build was pinned — not knowable from git alone).

**Most likely explanation for GSC on 2026-04-25:** Google evaluated a **non-canonical URL** (e.g. with **`?tab=…`**, **`?sort=…`**, **`?utm_*`**, etc.) or the Search Console row summarized a **parameterized** fetch, while the product intent was **`noindex`** for those variants. Less likely: **stale crawl** / **UI vs exact inspected URL** mismatch.

**Code change:** not required to explain historical `noindex` if the URL carried disallowed query keys. **GSC:** use **Request indexing** on the **exact** canonical `https://scholarshiptop.com/scholarships` with **no** query string; avoid requesting tagged marketing URLs if you want them indexed (they are intentionally `noindex` today).

---

## Was clean `/scholarships` ever `noindex` in app metadata?

### `app/scholarships/[[...slugPath]]/page.tsx`

| Period (approx.) | Behaviour for **root** (`segments.length === 0`) |
|-------------------|-----------------------------------------------------|
| **`332324c`** (2026-04-07) | If **noise** query → `noindex, follow`. If **clean** query → **no `robots` key at all** in the returned metadata (only `title` + relative `canonical: '/scholarships'`). That is **not** the same as explicitly setting `noindex`, but it relies on Next.js defaults for anything not overridden elsewhere. |
| **`ba709bf`** (2026-04-07 22:56) | **Else branch adds explicit** `robots: { index: true, follow: true }` for the clean hub. |
| **`ad1b5c7`** (2026-04-24, pre–Apr-29 SEO polish) | Same pattern as today’s intent: **explicit `index, true`** when no noise query; **`noindex`** when `hasNonCanonicalQuery` (subset of keys). |
| **`8e317a1`** (2026-04-29) | Switches to **`isSeoNoiseQuery`**, adds hub/tab handling for non-root paths, **`getCanonical`**, description/OG, etc. |

**Conclusion:** In **known `page.tsx` history**, **clean** `/scholarships` was never given an explicit **`robots: { index: false }`** branch. The only explicit `noindex` on the hub is tied to **search params** (expanded over time).

### `app/scholarships/[[...slugPath]]/layout.tsx` + `scholarshipSlugLayoutMetadata.ts`

At **`ad1b5c7`** (2026-04-24), `generateScholarshipSlugLayoutMetadata` returns **`{ title: 'Find Scholarships' }`** when `segments.length === 0` — **no `robots`**. Drip-related **`applySafeNoindexFallback`** applies to **non-empty** resolved SEO paths (e.g. blocked drip listings), **not** the empty hub root.

**Conclusion:** Layout path does **not** explain `noindex` on **clean** `/scholarships`.

### Middleware, root `app/layout.tsx`, `next.config.mjs`

- **`middleware.ts`:** no `X-Robots-Tag` / robots logic (www→apex redirects, compare path fixes, iq host rewrites).
- **`app/layout.tsx`:** no `robots` / `noindex` in the inspected patterns (site-wide template metadata only).
- **`next.config.mjs`:** sitemap rewrite + legacy redirects; **no** SEO robots headers.

**Conclusion:** No repo evidence that **Cloudflare/Railway**-configurable **headers** are defined in Next config; any edge `noindex` would be **outside** this repository (not audited here).

---

## Was query `/scholarships` `noindex` by design?

**Yes**, continuously from **`332324c`** onward for the hub root:

- **2026-04-07 → 2026-04-28 (through `ad1b5c7`):** `q`, `category`, `sort`, `page`, `deadline`, `tab` → **`noindex, follow`**.
- **From `8e317a1` (2026-04-29):** extended list via **`scholarshipSeoNoiseQuery.ts`** (`utm_*`, `gclid`, `fbclid`, `scope`, `aud`, …).

So on **2026-04-25**, **`utm_*` / `gclid` / `scope` alone** would **not** yet have been classified as noise in **`page.tsx`** (that expansion is **`8e317a1`**), but **`tab`**, **`sort`**, **`page`**, etc. **would** still force **`noindex`**.

---

## Relevant commits before / after 2026-04-25

### `app/scholarships/[[...slugPath]]/page.tsx` (recent `git log --format="%h %ci %s"`)

| Commit | Date (author) | Summary |
|--------|----------------|---------|
| `d492378` | 2026-04-30 | SEO system upgrade (canonical, data, providers) |
| `8e317a1` | 2026-04-29 | Hub metadata, **`isSeoNoiseQuery`**, canonical/robots polish |
| `ad1b5c7` | 2026-04-24 | Deploy marker; **page.tsx** at this rev already has **explicit index** for clean hub + **noindex** for noise queries |
| `616aec2` | 2026-04-19 | Guest flows / hub edits |
| `972b15c` … `332324c` | 2026-04-07–08 | Guest-first hub, indexing controls, drip |

**Robots-related commits touching this file (`git log -S "robots:" -- page.tsx`):** `332324c`, `ba709bf`, `8e317a1`.

### `scholarshipSeoNoiseQuery.ts`

Introduced / wired in hub metadata work: **`8e317a1`** (2026-04-29) — **after** the GSC crawl date you cited.

### `app/scholarships/[[...slugPath]]/layout.tsx`

Notable SEO commits include **`0b8cc6b`** (cross-country), **`7ce2277`** (UTM persistence + cross-country hub), **`972b15c`**, drip/manifest era — none add root-hub `noindex` for empty `slugPath`.

### `lib/seo/sitemaps.ts` on / around 2026-04-25

- **`0fa2591`** — **2026-04-25 01:21 +0500** — “deploy: outreach…” — touches **`lib/seo/sitemaps.ts`** (+ SQL/types). This is **sitemap/RPC**, not `/scholarships` HTML robots.

### `git log -S "isSeoNoiseQuery"` (repo-wide, sample)

Commits include **`8e317a1`**, **`7ce2277`** (broader UTM / cross-country work).

---

## Could clean `/scholarships` get `noindex` from …?

| Mechanism | Verdict (from code + git) |
|-----------|---------------------------|
| **Query params** | **Yes** — primary documented mechanism (`page.tsx` + `isSeoNoiseQuery` / earlier inline list). |
| **Cookies / session / auth** | **`generateMetadata` on `[[...slugPath]]/page.tsx` does not read auth/cookies** in versions inspected (`ad1b5c7`, current). Default page component may fetch user for UI, but **metadata for the hub root is param-driven**, not session-driven. |
| **Feature flag / env** | No `siteIndexable`-style global kill switch found in prior audits; drip affects **SEO listing paths**, not empty hub root metadata in `page.tsx`. |
| **Middleware** | **No** robots / `noindex` in `middleware.ts`. |
| **CF / Railway headers** | **Not in repo** — cannot disprove edge config from git. |
| **“Fallback metadata”** | Between **`332324c`** and **`ba709bf`**, clean hub omitted explicit `robots` (relied on defaults). That is **not** explicit `noindex`; **`ba709bf`** made **`index, follow`** explicit before 2026-04-25. |

---

## Most likely root cause (ranked)

1. **Google saw `/scholarships` with at least one “noise” query key active on 2026-04-25** (very plausible: **`tab`**, **`sort`**, **`page`**, **`q`**, etc.) → **correct `noindex`** per app design.
2. **GSC row vs exact URL mismatch** (inspection, sitemap, internal links) — UI shows “scholarships” but crawl URL included params.
3. **Stale or delayed interpretation** in GSC relative to a short window of builds (less likely after **`ba709bf`**, but possible if production lagged git).

---

## What to do in GSC now

1. **URL Inspection** on **exactly** `https://scholarshiptop.com/scholarships` (no `?…`).
2. **Live test** — confirm **`index, follow`** (matches recent live audits).
3. **Request indexing** only for **canonical, parameterless** URLs you care about.
4. For internal marketing links, accept **`noindex`** on tagged URLs or change **product policy** later (not part of this read-only note).

---

## Is a code change needed?

- **To fix “GSC said noindex on 2026-04-25” in retrospect:** usually **no**, if the crawl URL carried **tab/sort/utm**-class params — behaviour matches code.
- **To force marketing query URLs to be indexable:** that would be a **deliberate SEO/product change** (widen what counts as “noise”), not “Request indexing” alone.

---

## Commands reference (already run for this report)

```text
git log --oneline -- app/scholarships/[[...slugPath]]/page.tsx
git log --oneline -- app/scholarships/[[...slugPath]]/layout.tsx
git log --oneline -- app/scholarships/scholarshipSlugLayoutMetadata.ts
git log --oneline -- app/scholarships/scholarshipSeoNoiseQuery.ts
git log -S "hasNonCanonicalQuery" -- app/scholarships/[[...slugPath]]/page.tsx
git log -S "robots:" -- app/scholarships/[[...slugPath]]/page.tsx
git show ad1b5c7:app/scholarships/[[...slugPath]]/page.tsx
git show 332324c:app/scholarships/[[...slugPath]]/page.tsx
git show ba709bf   (patch for explicit index robots)
git log --since=2026-04-20 --until=2026-05-01 -- lib/seo/sitemaps.ts
```

---

*End of report.*
