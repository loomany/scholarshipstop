# Scholarships UI Filter Surface Audit (legacy vs v2)

Date: 2026-04-05
Scope: inventory + mapping only. No route/UI wiring changes.

## Current filters in UI

### Search / keyword

1. **Keyword search**
   - UI: `ScholarshipsListHeader` search input (`query`, `onQueryChange`).
   - Hub state: `query` local state in `ScholarshipsHubPageClient`.
   - URL serialization: `q` query param via `buildScholarshipListSearchParams`.
   - Request serialization: in POST body as `searchParams` string (contains `q`).
   - Legacy apply: `applyCatalogTextSearchFilter(...)` OR-ilike across title/provider/summary/requirements/etc.

### Sort / pagination

2. **Sort dropdown**
   - UI: `ScholarshipsListHeader` `sortBy` + dropdown options.
   - URL serialization: `sort` query param.
   - Request serialization: in `searchParams` (`sort`).
   - Legacy apply: `applySort(...)` in SQL order stack.

3. **Pagination**
   - UI: `ScholarshipsPagination` + `buildPageHref`.
   - URL serialization: `page` query param (`limit` fixed by page size).
   - Request serialization: `page` + explicit `limit` in built search params.
   - Legacy apply: request `page/limit` -> SQL range in `executeScholarshipListQuery`.

### Category

4. **Category multiselect**
   - UI: category dropdown in `ScholarshipsListHeader`.
   - URL serialization: `category` query param (`comma-separated ids`).
   - Request serialization: in `searchParams` (`category`).
   - Legacy apply: `parseCommaCategories` -> `categoryIds`; `applySelectedCategoriesFilter` or page-scope filter.

5. **Category page scope**
   - UI: category route context (`/scholarships/category/[slug]`).
   - URL/request serialization: `category_page` query param.
   - Legacy apply: `resolveCatalogSubjectCategoryForPageSlug(...)` then `categoryPageSlug` or `catalogSubjectCategoryId` filtering.

### Location

6. **Top-level state filter (URL)**
   - UI state source: URL `state` param (not primary visible control in hub header).
   - URL serialization: `state=CA,NY` style codes.
   - Request serialization: in `searchParams` (`state`).
   - Legacy apply: `stateCodes` via `parseCommaStateCodes`; SQL `state_codes.cs.[code]` OR.

7. **More Filters: state autocomplete (`filterStateInput`)**
   - UI: `UsStateAutocomplete` inside `ScholarshipsMoreFiltersPanel`.
   - Request serialization: `moreFilters.filterStateInput` inside JSON body.
   - Legacy apply: canonicalize state name -> code -> SQL `state_codes.cs.[code]`.

8. **More Filters: location labels (`includeLocationLabels`)**
   - UI: checkbox list in `ScholarshipsMoreFiltersPanel` (currently `locationOptions` may be empty on hub).
   - Request serialization: `moreFilters.includeLocationLabels[]`.
   - Legacy apply: `location_tags.cs.[label]` OR via `applyMoreFilters`.

### Education

9. **More Filters: education levels (`includeEducationLevels`)**
   - UI: checkbox list in `ScholarshipsMoreFiltersPanel`.
   - Request serialization: `moreFilters.includeEducationLevels[]`.
   - Legacy apply: `catalog_education_levels.cs.[id]` OR.

### Eligibility / audience

10. **More Filters: eligibility audiences (`includeEligibility`)**
   - UI: checkbox list in `ScholarshipsMoreFiltersPanel`.
   - Request serialization: `moreFilters.includeEligibility[]`.
   - Legacy apply:
     - primary `eligibility_tags.cs.[id]` OR,
     - plus special text fallback clauses (`applyEligibilityTextSearchClauses`) for IDs like `first_generation`.

11. **User tab audience mode (Best/Recommended/Easy/Matches/etc.)**
   - UI: sidebar tabs (`ScholarshipsSidebar`), plus guest segmented control Best/All/Easy in header area.
   - URL serialization: `tab` query param (+ `scope=catalog` for All/Matches path).
   - Request serialization: `tab` in `searchParams`.
   - Legacy apply: `applyTabScopeFixed(...)` (best/recommended/easy/saved/ignored/started/submitted/matches semantics).

### GPA / requirements

12. **More Filters: GPA buckets (`includeGpaBuckets`)**
   - UI: checkbox list in `ScholarshipsMoreFiltersPanel`.
   - Request serialization: `moreFilters.includeGpaBuckets[]`.
   - Legacy apply: SQL `gpa_bucket IN (...)`.

13. **More Filters: excluded requirement types (`excludeRequirementTypes`)**
   - UI: checkbox list in `ScholarshipsMoreFiltersPanel`.
   - Request serialization: `moreFilters.excludeRequirementTypes[]`.
   - Legacy apply: boolean-column negations (`essay_required`, `document_required`, ...). `resume` has no DB column and is effectively no-op server-side.

### Amount / deadline / misc

14. **Deadline preset (top-level + more-filters mirror)**
   - UI:
     - URL-level deadline param support,
     - radio group in More Filters (`deadlinePreset`).
   - URL serialization: `deadline` query param (`lt1d|d1_7|w1_4|gt4w|any`).
   - Request serialization:
     - URL `deadline`,
     - JSON `moreFilters.deadlinePreset`.
   - Legacy apply: `applyDeadlinePreset(...)` within `applyMoreFilters`; non-SEO flow may copy URL deadline into moreFilters before applying.

15. **Amount range (`amountMin` / `amountMax`)**
   - UI: numeric inputs + dual range slider in More Filters.
   - Request serialization: `moreFilters.amountMin/amountMax`.
   - Legacy apply: amount OR-clause with non-monetary fallback in `applyMoreFilters`.

16. **Applicants range (`applicantsMin` / `applicantsMax`)**
   - UI: numeric inputs + dual range slider in More Filters.
   - Request serialization: `moreFilters.applicantsMin/applicantsMax`.
   - Legacy apply: applicants null-or-range clause in `applyMoreFilters`.

17. **Easy apply flags (`includeEasyApply`)**
   - UI: checkbox list in More Filters.
   - Request serialization: `moreFilters.includeEasyApply[]`.
   - Legacy apply: `easy_apply_flags.cs.[id]` OR.

18. **Data completeness (`dataCompleteness.low/medium/high/verified`)**
   - UI: checkbox section in More Filters.
   - Request serialization: `moreFilters.dataCompleteness` object.
   - Legacy apply: OR on `listing_completeness_bucket` + `is_verified`.

19. **Payout method (`payout.college/student/nonMonetary/notStated`)**
   - UI: checkbox section in More Filters.
   - Request serialization: `moreFilters.payout` object.
   - Legacy apply: OR on `payout_method` values.

### User tabs / collections

20. **Saved / ignored / started / submitted sets**
   - UI state: local ids from storage (`savedIds`, `ignoredIds`, `startedIds`, `submittedIds`).
   - Request serialization: appended into query string as comma-separated UUID lists (`saved`, `ignored`, `started`, `submitted`) by `buildHubListingSearchParams`/category variant.
   - Legacy apply: parsed by `parseCommaUuids`; used by `applyTabScopeFixed` for tab scoping and ignored exclusion from matches.

## Legacy filter data path

1. UI controls update URL/search params and/or `moreFiltersApplied` state in hub/category clients.
2. Client POST calls send:
   - `searchParams` string,
   - optional `moreFilters` JSON payload.
3. API route parses URL params (`q/sort/page/category/deadline/tab/state/...`) and converts JSON via `moreFiltersFromJson`.
4. API builds normalized request through `scholarshipListRequestFromParts(...)` (+ catalog normalization).
5. SQL pipeline applies filters in order through:
   - `applyCommonFilters` (text/category/state/long-tail/moreFilters),
   - `applyTabScopeFixed` (tab/user-collection semantics),
   - `applySort`,
   - pagination/range in `executeScholarshipListQuery`.

## Covered in v2

### Covered (direct)

- `q` keyword search.
- `stateCodes` (URL-like structured state list).
- `fieldsOfStudy`.
- `educationLevelIds`.
- `minGpa` / `maxGpa` profile compatibility signals.
- `minAmount` / `maxAmount`.
- `deadlineDays` (generic deadline control placeholder).
- `userCollectionTab` + explicit mode separation (`catalog` / `bestMatches` / `userCollections`).
- page/pageSize/sort basics.
- applied vs draft request context in effective contract.

### Covered partially

- State filtering: v2 has structured + text fallback in scoring, but request-side location label facets and full synonym normalization are not in contract yet.
- GPA: v2 models numeric GPA compatibility, while legacy UI uses bucket filters heavily.
- Best matches: v2 scoring exists, but legacy tab semantics include SQL gates (credibility/verified/easy flags) not yet mirrored in v2 contract.

## Missing in v2

1. `includeEligibility` (audience facets) + legacy text fallback behavior.
2. `includeEducationLevels` as OR-set (v2 has ids but not the exact UI facet model for list filtering yet).
3. `includeGpaBuckets` (bucket-based filtering).
4. `excludeRequirementTypes` (and resume special-case semantics).
5. `applicantsMin/applicantsMax` range filter.
6. `includeLocationLabels` facet filter.
7. `includeEasyApply` facet filter.
8. `dataCompleteness` flags (`low/medium/high/verified`).
9. `payout` flags (`college/student/nonMonetary/notStated`).
10. URL-level `category_page` / `catalogSubjectCategoryId` distinction.
11. user id list sets transport fields (`saved/ignored/started/submitted`) as first-class filter input (currently only tab id in v2 contract).
12. deadline preset taxonomy parity (`lt1d/d1_7/w1_4/gt4w/any`) vs v2 generic `deadlineDays`.
13. SEO-listing-related filter interaction boundaries (required tags + reduced more-filters) are absent from v2 contract.

## Recommended order to add missing filters safely

1. **Contract parity first (types only, no wiring):**
   add exact More Filters facet fields to v2 contract (`includeEligibility`, `includeGpaBuckets`, `excludeRequirementTypes`, `dataCompleteness`, `payout`, `includeEasyApply`, `includeLocationLabels`, applicants range, deadline preset enum).

2. **Serialization parity adapters (internal only):**
   map current URL + `MoreFiltersJson` into v2 effective contract in one adapter module; no route switch.

3. **Legacy-equivalent query layer in v2 (behind adapter tests):**
   implement query builder parity for these facets one-by-one with snapshot tests versus legacy request→SQL expectations.

4. **Tabs/collections parity:**
   add explicit id-list transport fields (saved/ignored/started/submitted) into v2 request contract and verify `matches`/`saved`/`ignored` semantics.

5. **Scoring + facet coexistence tests:**
   ensure Best Matches scoring composes with facet filters without collapsing to hard-zero behavior.

6. **Only after parity audits/tests:**
   expose internal feature-flagged endpoint for v2 shadow responses (no UI route migration yet).
