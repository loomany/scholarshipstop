# Stage C3 localized enrichment report

**Date:** 2026-05-31  
**Base commit:** `9bd739f` — `feat(data): expand static enrichment to site sections`  
**Suggested commit:** `feat(data): extend enrichment context to localized content`

---

## Executive summary

Stage C3 extends C2 enrichment to localized provider/resource/essay routes and improves content context matching using richer metadata hints (title, slug, meta description, category) while keeping conservative hide rules for generic topics and ambiguous matches.

Compare localized hubs required no changes — they already reuse C2 hub teasers via shared page bodies.

---

## Localized routes found

| Route | File |
|-------|------|
| `/[locale]/providers/[slug]` | `app/[locale]/providers/[slug]/page.tsx` |
| `/[locale]/resources/[slug]` | `app/[locale]/resources/[slug]/page.tsx` |
| `/[locale]/essays/[slug]` | `app/[locale]/essays/[slug]/page.tsx` |
| `/[locale]/compare/universities` | `app/[locale]/compare/universities/page.tsx` |
| `/[locale]/compare/states` | `app/[locale]/compare/states/page.tsx` |
| `/[locale]/compare/universities/[slug]` | `app/[locale]/compare/universities/[slug]/page.tsx` |
| `/[locale]/compare/states/[slug]` | `app/[locale]/compare/states/[slug]/page.tsx` |

Full audit: `stage-c3-localized-route-audit.md`

---

## Routes changed

| Route / surface | Change |
|-----------------|--------|
| `/resources/[slug]` | Pass meta_title, meta_description, classification to context card |
| `/essays/[slug]` | Pass meta_description, hub category, manual topic |
| `/[locale]/providers/[slug]` | `ProviderExternalSchoolContext` in `LocalizedProviderProfilePage` |
| `/[locale]/resources/[slug]` | `ResourceExternalContextCard` in `LocalizedResourceArticlePage` |
| `/[locale]/essays/[slug]` | `EssayExternalContextCard` in `LocalizedEssayGuidePage` |

---

## Routes skipped (and why)

| Route | Reason |
|-------|--------|
| `/[locale]/compare/universities` | Already has C2 teaser via shared hub body |
| `/[locale]/compare/states` | Already has C2 teaser via shared hub body |
| `/[locale]/compare/*/ [slug]` detail | C1 enrichment already in shared detail bodies — audit only |
| Static localized pilot pages (`LocalizedProductionPage`) | No CMS post/essay row — card not applicable |
| Scholarship state/university pages | Deferred to Stage C4 per C2 plan |

---

## Resolver improvements

**File:** `lib/external-data/resolveContentEnrichmentContext.ts`

### New / updated API

- `ContentEnrichmentHints` — slug, title, subtitle, metaTitle, category, subcategory, stateCode, schoolName, city, tags
- `isGenericTopicSlug()` — blocks slug-based state inference for generic essay/resource slugs
- Improved state slug matching — full state slug boundary patterns (`new-york`, `california`, etc.)
- Multi-field text scan — title + subtitle + metaTitle + category + subcategory + tags
- School candidate extraction — institution phrases in title (`at Loyola University Chicago`) with strict `matchSchoolForInstitution`
- Explicit `stateCode` input validated against affordability dataset

### Match confidence rules (unchanged philosophy)

1. Exact state from unambiguous slug or text → show state context  
2. School + state with unambiguous Scorecard match → show school context  
3. Ambiguous multi-state slug/title → hide  
4. Generic topic slug → skip slug inference; title/meta must still resolve unambiguously  
5. No context → hide  

---

## Examples where cards **show**

| Page type | Example hints | Context shown |
|-----------|---------------|---------------|
| Resource | slug `best-scholarships-texas-international-students` | Texas affordability highlights |
| Resource | title "California Community College Scholarships" | California affordability |
| Provider | Loyola + `hqState: IL` | Loyola University Chicago Scorecard card |
| Provider | Tarleton + `hqState: TX` | Tarleton State University card |
| Compare hubs | N/A (aggregate teaser) | Coverage stats (C2) |

---

## Examples where cards **hide correctly**

| Page type | Example | Why hidden |
|-----------|---------|------------|
| Essay | `/essays/financial-need` | Generic slug; no geographic title |
| Essay | `/essays/career-goals` | Generic slug |
| Resource | `/resources/best-scholarship-websites` | Generic slug blocklist |
| Resource | `/resources/how-to-find-scholarships` | No unambiguous state |
| Provider | `/providers/alamo-colleges-foundation` | Foundation name; strict match fails |

Localized routes use **English source metadata** for matching even when UI headline is translated — prevents false negatives on translated titles without state names.

---

## Components updated

| Component | Change |
|-----------|--------|
| `ResourceExternalContextCard` | Accepts full `ContentEnrichmentHints` |
| `EssayExternalContextCard` | Accepts full `ContentEnrichmentHints` |
| `LocalizedProviderProfilePage` | Provider school context card |
| `LocalizedResourceArticlePage` | Resource context card + classification |
| `LocalizedEssayGuidePage` | Essay context card |

`ProviderExternalSchoolContext` unchanged (strict provider matching).

---

## Validation results

See `stage-c3-validation-report.md`.

| Gate | Result |
|------|--------|
| data:validate-enrichment | PASS |
| tsc --noEmit | PASS |
| npm run build | PASS |

---

## Risk notes

| Risk | Mitigation |
|------|------------|
| Wrong college on provider pages | Unchanged strict `matchProviderToSchool`; foundation names hidden |
| Irrelevant state cards on generic guides | Generic slug blocklist + unambiguous state requirement |
| Localized title without state name | Match on English slug + DB title/meta, not translated headline |
| Client bundle bloat | Server-only resolver; no JSON in client props |

---

## Next Stage C4 (scholarship pages)

Per `stage-c2-scholarship-page-sidebar-plan.md`:

- `/scholarships/[state]` — state affordability sidebar via route segment → state code  
- `/scholarships/[state]/[university]` — school + state context via hub row + strict school match  
- Server sidebar sibling to client scholarship list; no SEO policy changes  

---

## Commit prep

**Ready to commit:** yes (pending user approval)

**Suggested message:**

```
feat(data): extend enrichment context to localized content
```

**Stage only scoped C3 paths** — exclude unrelated i18n, SEO reports, `.env*`, content drafts.

**Do not push** without explicit approval.

---

## Related reports

- `stage-c3-preflight.md`
- `stage-c3-localized-route-audit.md`
- `stage-c3-validation-report.md`
- `stage-c2-post-deploy-smoke.md`
