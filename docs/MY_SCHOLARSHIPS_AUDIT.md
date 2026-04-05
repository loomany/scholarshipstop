# My Scholarships flow audit (code-level)

Date: 2026-04-05

## Key factual findings

1. Hub listing is now catalog-only on server path.
   - `scholarshipListRequestFromParts` hard-sets `listScope: 'catalog'`.
   - `applyCatalogOnlyListingNormalization` rewrites `best-matches` / `recommended` / `easy-apply` to `matches`.

2. Sidebar counts are mixed-source on client:
   - `bestMatches` / `recommended` from `/api/scholarships/match` (`countsUnfiltered`, minus ignored only).
   - `matches` often forced to current `totalCount` for browse tabs.
   - `saved` / `ignored` / `started` / `submitted` from local id array lengths.

3. Main left list comes from `POST /api/scholarships` and does a fresh fetch on URL/filter changes.

4. Filters open a modal panel, stored in component state, serialized to JSON in POST body (`moreFilters`), not fully in URL (only `deadline` is mirrored).

5. Server applies filters in SQL (`applyCommonFilters` + `applyMoreFilters` + tab scope).

## Why count mismatches can happen

- Personalized sidebar counts (`best/recommended`) are computed from match-index buckets and do not include search/category/moreFilters from current view.
- Sidebar `saved/ignored` are local array lengths, not filtered SQL counts.
- `matches` may be overridden by current list `totalCount` in browse tabs.

## Risky / fragile spots

- Dual count systems (match index vs SQL/meta vs local arrays) create UX ambiguity.
- Tab semantics are partially legacy in UI labels, but server normalizes personalized tabs to catalog `matches`.
- Deadline is duplicated in URL and moreFilters baseline merge logic; drift is possible.
