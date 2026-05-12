# Pagination SEO cleanup (deep last-page chip)

## Goal

Avoid emitting a direct numeric pagination `<Link>` to the deepest last page (e.g. `?page=2017`) in SSR HTML when `totalPages` is very large, while keeping sequential navigation via Previous/Next and local numeric context.

## What changed

- **`lib/pagination/visiblePaginationItems.ts`**
  - Added `MAX_TOTAL_PAGES_FOR_EXPLICIT_LAST_PAGE_CHIP = 100`.
  - **`visiblePaginationItems` (mobile):** `set.add(total)` runs only when `total <= 100`. For `total > 100`, page 1, `current ± 1`, and ellipsis behavior are unchanged; the **standalone** last-page chip is omitted.
  - **`visiblePaginationItemsDesktop`:** same rule for the explicit `set.add(total)` after the `1 … 10` block.
  - JSDoc updated so the desktop example no longer implies a trailing last chip when `total > 100`.

- **`lib/pagination/__tests__/visiblePaginationItems.test.ts`** (new)
  - Covers: no `2017` chip for `totalPages = 2017` (mobile + desktop); `totalPages = 10` still includes last page; middle page includes `current ± 1`; boundary at `total = 100` vs `101`.

## Did `page=2017` disappear from SSR?

**Mechanism:** `ScholarshipsPagination` only renders numeric links for values returned by `visiblePaginationItems` / `visiblePaginationItemsDesktop` (each number → `href={buildHref(item)}`). With `totalPages = 2017` and `currentPage = 1`, neither helper includes `2017` in the chip list anymore, so **no `Link` is emitted for `page=2017`** from pagination chips.

**Caveat:** This report does not include a live `curl` against production after deploy. To confirm on a deployed URL, search the HTML for `page=2017` (or the equivalent `page%3D2017`) in pagination `href`s; count should be **0** for the default hub view on page 1. Other parts of the page could still mention large totals in copy (e.g. “Page 1 of 2017”) — that is unchanged and intentional.

**Duplicate mobile + desktop rows:** `ScholarshipsPagination` still renders two separate `<nav>` rows (`lg:hidden` vs `hidden lg:flex`) with the same chip sources. **No refactor** was done; both rows benefit from the same omission of the deep last chip.

## What we did **not** touch

- `components/scholarships/ScholarshipsPagination.tsx` — no code changes (still passes `buildHref` through).
- `app/scholarships/ScholarshipsHubPageClient.tsx` — no changes (`buildPageHref` / query handling unchanged).
- Sitemap, `robots.txt`, canonical/noindex policy, auth/payments/Lemon/Supabase RLS, database, `SCHOLARSHIPS_PAGE_SIZE`.

**Query params (`category`, `sort`, etc.):** unchanged; preservation is entirely in `buildPageHref` in the hub client, not in the visible-page helpers.

**`/scholarships/hub/matches?page=2`:** routing and href building were not modified; deep pages remain valid URLs if requested directly.

## Verification commands (local)

| Command | Result |
|--------|--------|
| `npx tsc --noEmit` | Pass (exit 0 as part of the run) |
| `npx tsx --test lib/pagination/__tests__/visiblePaginationItems.test.ts` | 6 tests, all pass |
| `npm run build` | Success |

## Risks

- **UX:** On very large lists, users on page 1 no longer get a one-click “jump to last page” chip; they rely on **Next** repeatedly, changing the page in the URL bar, or other UI outside this change.
- **SEO:** Crawlers lose a single hop from page 1 to the last page via pagination HTML; that is the intended tradeoff to reduce ultra-deep crawl targets from the default SSR view.

## Rollback

Revert the conditional around `set.add(total)` in both functions (restore unconditional `set.add(total)`), remove the constant if desired, and drop or adjust the new tests. Single-file logic change; low merge conflict risk.
