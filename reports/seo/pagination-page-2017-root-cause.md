# Pagination `?page=2017` — root cause (audit only)

**Mode:** Audit only — **no code changes** in this step.  
**Date:** 2026-05-12 (UTC).

---

## Executive summary

The value **`2017`** is **not** a misparsed deadline year or a swapped filter field. It is **`totalPages`** for the hub catalog when **`totalCount ≈ 18 153`** and page size is **`9`** (`⌈18153 / 9⌉ = 2017`).

The SSR shows **`href="/scholarships/hub/matches?page=2017"`** because **`visiblePaginationItemsDesktop`** (and the mobile helper) **always inject the last page index** into the pagination chip list whenever `totalPages` is large. **`ScholarshipsPagination`** turns each chip into a real **`<Link href={buildHref(page)}>`**.

So: **correct arithmetic + deliberate UI algorithm**, not a random bug. The number **coincidentally** looks like a year.

---

## 1. Exact file & functions

| Layer | File | Function / symbol |
|-------|------|-------------------|
| **Pager UI** | `components/scholarships/ScholarshipsPagination.tsx` | `ScholarshipsPagination` — builds `<Link href={buildHref(item)}>` for each chip; **two** rows (mobile `lg:hidden` + desktop `hidden lg:flex`) → **duplicate** `href` for the same page in HTML. |
| **Chip list (root cause)** | `lib/pagination/visiblePaginationItems.ts` | `visiblePaginationItemsDesktop(current, total)` — lines 53–57: always `set.add(total)` (last page). Also adds `1…DESKTOP_FIRST_BLOCK` (10) and a window around `current`. |
| **Mobile chips** | same file | `visiblePaginationItems` — lines 19–21: always `set.add(1)` and **`set.add(total)`**. |
| **Total page count** | `app/scholarships/ScholarshipsHubPageClient.tsx` | `totalPagesForUi = Math.max(1, Math.ceil(rangeTotalForPager / SCHOLARSHIPS_PAGE_SIZE))` (~L3480–3483). |
| **Row total** | same file | `rangeTotalForPager` derived from `effectiveHeaderTotalCount` vs `totalCount` (~L3474–3478). `totalCount` comes from list API / SSR `initialPayload.result.total` (~L446–447) and client refetches. |
| **Href builder** | `ScholarshipsHubPageClient.tsx` | `buildPageHref(page)` (~L3203–3221) — uses `buildHubCatalogBrowserUrl(..., { page, resetPage: false }, activeTab)` for hub routes → **`/scholarships/hub/matches?page=N`** (plus existing category filters encoded as `&amp;` in HTML). |

**Category / hub tabs:** The same **`ScholarshipsHubPageClient`** + **`ScholarshipsPagination`** stack drives **`/scholarships`**, **`/scholarships/hub/matches`**, **`best-recommendation`**, **`recommended`**, etc. (multiple `<ScholarshipsPagination buildHref={buildPageHref} />` sites in the same file ~L3836–4116).

**Category slug pages** (`/scholarships/category/...`) use **`ScholarshipCategoryPageClient.tsx`** with **`ScholarshipsPagination`** as well — **same** `visiblePaginationItems` / `visiblePaginationItemsDesktop` behavior (same “last page” chip rule).

---

## 2. Where `maxPage` / `totalPages` comes from (sanity checks)

| Hypothesis | Result |
|------------|--------|
| **`totalCount` mistaken for page number** | **No** — `totalPagesForUi` uses **`Math.ceil(count / PAGE_SIZE)`**, not `totalCount` as a page index. |
| **Year / deadline `2017` leaked into `page`** | **No** — `2017` equals **`⌈totalMatchingScholarships / 9⌉`** for current production data; coincidental calendar similarity. |
| **Mixed pagination & unrelated params** | **No** — `buildPageHref` delegates to **`buildHubCatalogBrowserUrl`** / `buildScholarshipListSearchParams`; `page` is the list page index. Filter params are preserved alongside `page` (e.g. `category=undergraduate&amp;page=2017`). |
| **Generating links for *every* page 1…N** | **No** — only **1…10**, **current±1**, **ellipsis**, and **last** (`total`) for desktop; mobile uses a smaller window + last. |

---

## 3. Production SSR check (2026-05-12)

Script: fetched HTML (≤700 KB) and listed `href="...page=2017..."`.

| URL | `href` hits containing `page=2017` | Notes |
|-----|-------------------------------------|--------|
| `https://scholarshiptop.com/scholarships` | **2** | Same path twice → mobile + desktop pagination rows. |
| `https://scholarshiptop.com/scholarships/hub/matches` | **2** | `/scholarships/hub/matches?page=2017` |
| `https://scholarshiptop.com/scholarships/hub/matches?category=undergraduate` | **2** | `...?category=undergraduate&amp;page=2017` |
| `https://scholarshiptop.com/scholarships/hub/matches?page=2` | **2** | Still exposes jump to last page `2017`. |

So the “suspicious” link is **stable across** root redirect to hub, clean hub, filtered hub, and **page=2** view.

---

## 4. How many such links are emitted?

- **Per pagination block:** at most **one** numeric “last page” chip per viewport row (`2017`), plus `1…10`, `current`, neighbors — **not** thousands of `<a>` tags for every page.
- **Per HTML document:** **two** identical `href`s to `page=2017` (mobile + desktop **display:none** sibling rows in `ScholarshipsPagination`).
- **Across the site:** any route that mounts **`ScholarshipsPagination`** with the **same** large `totalPages` will repeat the pattern (hub + category client, etc.).

---

## 5. Crawl budget / SEO impact

- Target URLs with **`?page=`** (and `category=`, etc.) are already treated as **non-canonical / noisy** for indexing elsewhere in the app (`isSeoNoiseQuery` + hub metadata). Crawlers **may** still request them; adding **one** deep `page=` link per document is a **small** extra discovery path vs infinite “list all pages” spam.
- The main “surprise” is **human diagnostics** (“why 2017?”) and **duplicate** mobile/desktop links, not an exponential internal link farm.

---

## 6. Minimal safe fix (proposal only — **not applied**)

**Goal:** keep UX (jump toward end of catalog) without looking like a data bug, and optionally trim redundant crawl signals.

1. **Cosmetic / clarity (smallest):** In **`ScholarshipsPagination`**, render link **text** as **`Last`** (or `Last (2017)`) when `item === totalPages && totalPages > THRESHOLD` (e.g. 20), while keeping **`href={buildHref(totalPages)}`** unchanged. **No SEO policy change.**

2. **Reduce duplicate href:** Render **one** `<nav>` (or one chip list) with responsive classes instead of **two** full copies of the same links — halves duplicate `page=2017` in HTML. **Pure markup refactor.**

3. **Optional crawl-shaping:** In **`visiblePaginationItemsDesktop` / `visiblePaginationItems`**, **omit `set.add(total)`** when `total > N` (e.g. 100) and replace with a single **“Last”** link implemented in **`ScholarshipsPagination`** only (chips stay bounded). **Product trade-off:** users lose a one-click numeric “2017” chip but keep a “Last” jump.

**Avoid (for this audit):** capping `totalPagesForUi` below the real API total for layout — that would **lie** in “Page *x* of *y*” meta and break pagination.

---

## 7. Conclusion

| Question | Answer |
|----------|--------|
| Bug? | **No** — expected last-page index from real **`totalCount`** and **`SCHOLARSHIPS_PAGE_SIZE`**. |
| Why `2017`? | **`⌈matches / 9⌉`**, coincidentally looks like a year. |
| Where fixed later? | Primarily **`lib/pagination/visiblePaginationItems.ts`** (+ optional dedupe in **`ScholarshipsPagination.tsx`**). |

---

*End of audit — implementation intentionally deferred.*
