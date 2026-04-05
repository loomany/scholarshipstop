# Scholarships V2 Coverage Matrix (UI surface vs legacy vs v2)

Date: 2026-04-05
Scope: mapping audit only (no runtime wiring changes).

## Coverage matrix

| UI label | Internal state/value name | Legacy request field / URL param / moreFilters key | Legacy pipeline handler | v2 status | Missing details (for partial/missing) |
|---|---|---|---|---|---|
| Search by keyword | `query` (`ScholarshipsHubPageClient`), parsed as `parsedList.q` | URL `q` inside `searchParams` | `applyCatalogTextSearchFilter` via `applyCommonFilters` | **full** | — |
| Sort | `sortBy` / `parsedList.sort` | URL `sort` | `applySort` | **full** | v2 sort enum values differ from legacy names; needs mapping adapter |
| Page | `rawPageParam` / `currentPage` | URL `page`; request `limit` | `executeScholarshipListQuery` range/paging | **full** | — |
| Category dropdown (multi-select) | `appliedCategoryIds` | URL `category` (comma ids) | `parseCommaCategories` + `applySelectedCategoriesFilter` | **missing** | v2 contract has no category ids field |
| Tab selection (Best/Recommended/Easy/Matches/Saved/Ignored/Started/Submitted) | `activeTab` | URL `tab` | `applyTabScopeFixed` | **partial** | v2 has `mode` + `userCollectionTab`, but no parity for `recommended/easy-apply/matches` SQL semantics |
| Scope marker for All tab | implicit `catalogListScope='catalog'` | URL `scope=catalog` | request normalization (`applyCatalogOnlyListingNormalization`) | **missing** | no explicit scope parity contract in v2 request |
| Saved ids transport | `savedIds` | URL `saved` (UUID csv) | `parseCommaUuids` + `applyTabScopeFixed(saved)` | **missing** | v2 has no id-list transport fields |
| Ignored ids transport | `ignoredIds` | URL `ignored` (UUID csv) | `parseCommaUuids` + `applyTabScopeFixed(matches/ignored)` | **missing** | v2 has no ignored-id exclusion input |
| Started ids transport | `startedIds` | URL `started` (UUID csv) | `parseCommaUuids` + `applyTabScopeFixed(started)` | **missing** | v2 has no started-id input |
| Submitted ids transport | `submittedIds` | URL `submitted` (UUID csv) | `parseCommaUuids` + `applyTabScopeFixed(submitted)` | **missing** | v2 has no submitted-id input |
| Deadline presets (Any / <1d / 1-7d / 1-4w / >4w) | `moreFilters.deadlinePreset` + URL deadline parse | URL `deadline`; JSON `moreFilters.deadlinePreset` | `applyDeadlinePreset` inside `applyMoreFilters` | **partial** | v2 has generic `deadlineDays`, not legacy preset taxonomy |
| Amount range | `moreFilters.amountMin/amountMax` | JSON `moreFilters.amountMin/amountMax` | `applyMoreFilters` amount + non-monetary OR logic | **partial** | v2 has min/max amount, but not non-monetary OR semantics |
| Application requirements exclusions | `moreFilters.excludeRequirementTypes` | JSON `moreFilters.excludeRequirementTypes[]` | `applyMoreFilters` exclusion map (`essay/document/...`; `resume` no-op) | **missing** | no requirements exclusion field in v2 |
| Applicants range | `moreFilters.applicantsMin/applicantsMax` | JSON `moreFilters.applicantsMin/applicantsMax` | `applyMoreFilters` applicants null-or-range clause | **missing** | no applicants range field in v2 |
| Eligibility audiences | `moreFilters.includeEligibility` | JSON `moreFilters.includeEligibility[]` | `applyMoreFilters` (`eligibility_tags`) + `applyEligibilityTextSearchClauses` | **missing** | no eligibility facet field or text-fallback semantics in v2 |
| Education level | `moreFilters.includeEducationLevels` | JSON `moreFilters.includeEducationLevels[]` | `applyMoreFilters` (`catalog_education_levels`) | **partial** | v2 has `educationLevelIds`, but no explicit facet OR-set parity mapping yet |
| GPA group | `moreFilters.includeGpaBuckets` | JSON `moreFilters.includeGpaBuckets[]` | `applyMoreFilters` (`gpa_bucket IN (...)`) | **missing** | v2 has numeric GPA fields, no GPA bucket facet |
| Location: State input | `moreFilters.filterStateInput` | JSON `moreFilters.filterStateInput` | `applyMoreFilters` -> canonicalize state -> `state_codes.cs` | **partial** | v2 has `stateCodes/stateQuery`, but no canonical state-name-to-code adapter baked in |
| Location: label checkboxes (if options available) | `moreFilters.includeLocationLabels` | JSON `moreFilters.includeLocationLabels[]` | `applyMoreFilters` (`location_tags`) | **missing** | no location label facet in v2 |
| Easy apply group | `moreFilters.includeEasyApply` | JSON `moreFilters.includeEasyApply[]` | `applyMoreFilters` (`easy_apply_flags`) | **missing** | no easy-apply facet field in v2 |
| Data completeness | `moreFilters.dataCompleteness.{low,medium,high,verified}` | JSON object in `moreFilters` | `applyMoreFilters` (`listing_completeness_bucket` + `is_verified`) | **missing** | no data-completeness facet object in v2 |
| Payout method | `moreFilters.payout.{college,student,nonMonetary,notStated}` | JSON object in `moreFilters` | `applyMoreFilters` (`payout_method`) | **missing** | no payout facet object in v2 |
| Category page route filter | route slug + `categorySlug` | URL `category_page` (or `category_slug`) | `resolveCatalogSubjectCategoryForPageSlug` + category filters in `applyCommonFilters` | **missing** | no category-page/category-subject field in v2 |
| Top-level URL state filter | parsed from URL | URL `state=CA,NY,...` | `parseCommaStateCodes` + `applyCommonFilters` (`state_codes`) | **partial** | v2 has `stateCodes`, but no explicit URL parser/adapter implemented |

## Visible More Filters sections checklist (explicit)

- Deadline presets → **partial** in v2 (taxonomy mismatch).  
- Amount range → **partial** in v2 (missing legacy non-monetary OR behavior).  
- Requirement exclusions → **missing** in v2.  
- Applicants range → **missing** in v2.  
- Eligibility → **missing** in v2.  
- Education level → **partial** in v2.  
- GPA → **missing** (bucket facet) in v2.  
- State input → **partial** in v2.  
- Easy apply group → **missing** in v2.  
- Data completeness → **missing** in v2.  
- Payout method → **missing** in v2.

## Legacy-only / currently hidden filters

1. **Hidden hub tabs**: `started`, `submitted` are valid in types/API but intentionally hidden in hub URL UX/nav.
2. **SEO-only request fields**: `requiredSeoTags`, `seoListingFallback`, `slugOnlyMoreFilters` (used for SEO listing modes; not regular hub UI controls).
3. **Long-tail legacy slugs**: `longTailLegacySlugs` pipeline path exists, not exposed in standard hub controls.
4. **Similar listings controls**: `similar_to`, `similar_category_slug` exist in request path, not normal hub filter controls.
5. **Category L2 internal join path**: `catalogSubjectCategoryId` resolved server-side from category route, not a direct hub UI control.

## Highest-priority missing filters for v2

1. `includeEligibility` (+ text fallback behavior parity).
2. `includeGpaBuckets`.
3. `excludeRequirementTypes`.
4. Applicants range (`applicantsMin/applicantsMax`).
5. `includeEasyApply`.
6. `dataCompleteness`.
7. `payout`.
8. ID-list transport (`saved/ignored/started/submitted`) for tab parity.
9. Category filter fields (`categoryIds`, `category_page` / subject category).
10. Deadline preset enum parity.

## Recommended next safe implementation batch

Batch-1 (still internal-only, no route/UI switch):

1. Extend v2 contract types with exact legacy facet keys (no behavioral rewiring).
2. Add URL+JSON adapter layer: legacy `searchParams` + `MoreFiltersJson` -> v2 effective contract.
3. Add request parity tests for all rows above (input serialization -> normalized v2 shape).
4. Add query-layer parity stubs for top-priority missing facets (eligibility, GPA buckets, requirement exclusions, applicants).
5. Keep feature flag OFF and keep live `/scholarships` using legacy path.
