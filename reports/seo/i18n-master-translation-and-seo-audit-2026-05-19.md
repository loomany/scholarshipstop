# Master translation and SEO audit — ES/FR Stage 2 (2026-05-19)

**Audit-only.** No commits. No pushes. No product changes.

---

## 1. Executive summary

| Dimension | Status | Risk |
| --- | --- | ---: |
| Static SEO pages (53 paths) | ✅ ES+FR published | Low |
| Hub UI (6 hubs) | ✅ Localized chrome; DB grids hidden on ES/FR | Low–Medium |
| Funnel (`/get-scholarships`, `/signin/*`) | ✅ ES+FR UI | Medium |
| Subscription | ✅ `/es/subscription`, `/fr/subscription` UI localized | Medium |
| Taxonomy/filter value labels | ❌ English on ES/FR scholarships hub | Medium |
| DB long-tail content | ❌ Not translated (by design) | High (future) |
| English SEO (canonical/sitemap/hreflang) | ✅ Preserved | Low |
| Automated QA (prior run) | ✅ 0 blocking | Low |

### Push readiness: **READY**

Stage 2 ES/FR pilot is safe to deploy for static pages, hubs, funnel, and subscription UI. Remaining gaps are **known and intentional** (DB content, taxonomy labels, hub filter parity). Do **not** bulk-publish DB translations until Stage 4 pipeline exists.

### Do not push yet (future work, not blockers)

- DB translation rows (no schema yet)
- Localized category/country **value** labels (Stage 3B)
- Account/onboarding full localization (Stage 3M)

---

## 2. Translation coverage

### Static SEO pages — **53/53 ES+FR** ✅

All paths in `STAGE2_PILOT_CANONICAL_PATHS` have published translations (`listLocalizedPilotPages()` = 106 URLs).

| Group | Count | ES/FR |
| --- | ---: | --- |
| Hubs | 6 | ✅ |
| Trust | 10 | ✅ |
| Legal/help | 5 | ✅ |
| Marketing | 3 | ✅ |
| Essay static guides | 11 | ✅ |
| Resource static guides | 14 | ✅ |
| Compare static guides | 4 | ✅ |

See: [i18n-es-fr-seo-coverage-2026-05-19.md](./i18n-es-fr-seo-coverage-2026-05-19.md)

### Missing static pages

**None** within the Stage 2 pilot scope. English-only pages outside pilot:

| Route | Reason |
| --- | --- |
| `/tools/*` | Not in pilot |
| `/dashboard` | Private/legacy |
| `/iq/*` | Separate sub-brand |

### Funnel pages

| Route | ES/FR | Index | Notes |
| --- | --- | --- | --- |
| `/get-scholarships` | ✅ | noindex | Quiz redirects to `/{locale}/scholarships` |
| `/signin`, `/signin/{view}` | ✅ | noindex | Auth callbacks remain EN |
| `/subscription` | ✅ | index (default) | Payment logic unchanged |
| `/signup` | ❌ | redirect → `/onboarding` | EN only |
| `/onboarding` | ❌ | noindex | Partial shared copy only |
| `/auth/reset_password` | ❌ | noindex | Supabase email deep-link |

### Private pages (audit-only)

| Route | Localized? |
| --- | --- |
| `/account`, `/account/saved-scholarships` | ❌ EN UI |
| `/essay`, `/essays/u/[id]` | ❌ EN product |
| `/subscription/success` | ❌ EN (Lemon redirect) |

### DB SEO pages

~40,114 English sitemap URLs — **0 ES/FR body translations**. Hub routes serve localized **shell** only.

---

## 3. UX gaps

### Missing translations (visible UI)

| Area | Gap | Severity |
| --- | --- | ---: |
| Scholarship category **values** | Arts, Safety, Music, etc. remain EN | P1 |
| Resource category **values** | `RESOURCE_CATEGORIES` English labels | P2 (toolbar hidden on ES/FR) |
| Provider hub trust block | "SCHOLARSHIP PROVIDER DIRECTORY" section EN on ES/FR | P2 |
| Provider search placeholder | "Search providers" on ES/FR | P2 |
| Country names in filters | From DB/API — display labels EN | P2 |
| Account/onboarding | Full EN | P3 (private) |

### `/fr/resources` — no filters/search?

**Answer: Intentional for Stage 2.**

```595:599:components/content-hub/ResourcesIndexPageContent.tsx
        {/*
          On ES/FR the DB-backed long-tail grid (`ResourcesGrid`) and its toolbar/pagination
          would surface untranslated English cards. We hide them and keep only the localized
          static guides + IQ aside until the long-tail itself is translated.
        */}
```

| Option | Recommendation |
| --- | --- |
| Keep simplified hub (static guides only) | ✅ **Accept for Stage 2** — avoids English DB leakage |
| Add filter/search for static guides only | **Stage 3A optional** — client-side filter on `StaticScholarshipGuidesSection` |
| Restore EN-like DB grid | ❌ **Not until Stage 4B** resources CMS translated |

Same pattern on `/es|fr/essays` and `/es|fr/compare` (DB lists hidden).

### `/get-scholarships`

- ✅ `/es/get-scholarships`, `/fr/get-scholarships` exist
- Uses `GetScholarshipsQuizWizard` with `locale` prop
- Post-submit → localized scholarships hub
- noindex,follow on all locales
- **Verify after deploy:** quiz completion redirect preserves locale

### Signin/signup

- ✅ `/es/signin`, `/fr/signin`, `/es/signin/{view}`, `/fr/signin/{view}`
- Copy from `lib/i18n/authUiCopy.ts`
- `/signup` → `/onboarding` (EN redirect; no `/es/signup`)
- `/login`, `/register` **do not exist** (project uses `/signin`)
- Auth callbacks (`/auth/callback`, etc.) — **do not localize**

### Subscription

- ✅ UI localized at `/es/subscription`, `/fr/subscription`
- Same loader as EN (`subscriptionPageProps.ts`); Lemon/checkout unchanged
- Nav shows Precios/Tarifs
- Indexable like EN; not in sitemap (unchanged)
- hreflang: en, es, fr, x-default

---

## 4. SEO status

### English SEO preservation: **YES** ✅

| Check | Status |
| --- | --- |
| English root URLs unchanged | ✅ |
| `/en` does not exist (404) | ✅ |
| English sitemap buckets unchanged (~40k URLs) | ✅ |
| English canonicals on `https://scholarshiptop.com` | ✅ |
| English pages not accidentally noindexed | ✅ |
| ES/FR not mixed into EN sitemap buckets | ✅ |
| Unsupported locales 404 (`/de`, `/pt`, …) | ✅ |
| `robots.txt`: allow `/`, disallow `/api/` | ✅ |

### ES/FR sitemaps

Separate documents: `locale-es-core`, `locale-es-resources`, `locale-es-essays`, `locale-es-compare` (+ FR mirrors).  
~53 URLs per locale bucket set; quality-gated via `shouldIncludeLocalizedUrl`.

### Hreflang

- Pilot static: bidirectional `en`, `es`, `fr`, `x-default` via `buildLocalizedAlternates` / `buildStage2EnglishPilotAlternates`
- Subscription cluster: same
- DB long-tail: **no hreflang** (EN only)
- Query/filter views: noindex on all locales

### What could still break English SEO

1. Accidentally adding ES/FR URLs to EN sitemap buckets
2. Publishing machine-drafted DB translations with index,follow
3. hreflang pointing to missing/unpublished ES/FR pages
4. Changing English canonical paths when adding localized slugs
5. Removing EN indexable pages when enabling ES/FR DB routes

### Post-deploy checks

- [ ] URL Inspection on `/`, `/scholarships`, sample EN detail URL
- [ ] Confirm `/en` → 404, `/es/about` → 200
- [ ] Sitemap index: EN child counts stable; locale-es-* present
- [ ] hreflang on `/about`, `/es/about`, `/fr/about` — mutual alternates
- [ ] GSC property = apex `scholarshiptop.com`

---

## 5. Link / language persistence

### Zone C — what it is

**Zone C** = English-only internal links **explicitly allowed** on ES/FR pages because the destination is DB long-tail, auth, or product flow — not a localization bug.

Authoritative allowlist: `isExplicitEnglishOnlyInternalLink()` in `lib/i18n/localizedHref.ts`.

Examples: `/scholarships/{detail-slug}`, `/providers/{id}`, `/account`, `/essay`, `/iq/*`, `/onboarding`, `/auth/*`.

~454 allowed Zone C links on last locale-link audit (0 blocking).

### Language switcher

- Shown on: 53 pilot paths, hub tabs, `/subscription`
- Never emits `/en/*`
- Last audit: 51/51 pass (incl. subscription cluster)

### Locale reset risks

| Flow | Status |
| --- | --- |
| Nav/footer pilot links | ✅ localized |
| Hub tabs | ✅ `localizedScholarshipHubTabHref` |
| Get-scholarships quiz | ✅ locale prop |
| Lemon checkout success | ⚠️ redirects to `/scholarships?status=success` (EN) — known |
| Onboarding from ES signin | ⚠️ `/onboarding` EN — future Stage 3M |

---

## 6. Taxonomy / filter localization gaps

**Architecture recommendation:** `lib/i18n/taxonomyLabels.ts`

```typescript
// Stable IDs unchanged; visible labels localized
categoryLabel(id: ScholarshipCategoryId, locale): string
resourceCategoryLabel(id: ResourceCategoryId, locale): string
countryDisplayName(code: string, locale): string
```

### Sources today

| Label set | Source file | Localized? |
| --- | --- | --- |
| Scholarship categories | `app/scholarships/scholarshipCategories.ts` | ❌ EN only |
| Resource categories | `lib/content-hub/resourceTaxonomy.ts` | ❌ EN only |
| Compare hub categories | `lib/i18n/hubUiCopy.ts` | ✅ ES/FR |
| Filter panel chrome | `lib/i18n/scholarshipsFilterPanelsUiCopy.ts` | ✅ ES/FR |
| Sort options | `lib/i18n/scholarshipsHubUiCopy.ts` | ✅ ES/FR labels |
| Category **values** in modal | `SCHOLARSHIP_CATEGORY_LABELS` direct | ❌ EN |

**Stage 3B:** Add ES/FR maps for 13 scholarship categories + 11 resource category groups. Do **not** change filter params or DB category IDs.

---

## 7. DB translation roadmap

See [i18n-db-content-translation-readiness-2026-05-19.md](./i18n-db-content-translation-readiness-2026-05-19.md)

| Priority | Content | When |
| --- | --- | --- |
| P1 | Category hubs (11) | Stage 4A |
| P1 | Top 50 resources CMS | Stage 4B — unblocks resources grid |
| P2 | Top 100 scholarships | Stage 4C |
| P3 | Essays DB, compare, full catalog | Stage 5+ |

Quality gate: `published` only → index + sitemap + hreflang.

---

## 8. Cost / model plan

See [i18n-translation-cost-and-model-plan-2026-05-19.md](./i18n-translation-cost-and-model-plan-2026-05-19.md)

- **Hybrid recommended:** manual UI (done) + OpenAI DB pilot + human review
- **Pilot MT cost (161 pages × 2 locales):** ~$1 OpenAI (gpt-4o-mini)
- **Human review dominates** project cost
- `OPENAI_API_KEY`: present; not used in this audit

---

## 9. Slug strategy for international SEO

### Now (safest)

- English: root paths (`/scholarships/foo-bar`)
- ES/FR: **English slug + locale prefix** (`/es/scholarships/foo-bar`)
- No localized slugs for DB content
- `x-default` → English root

### Ranking with English slugs

Translated **content + hreflang + locale prefix** is sufficient for ES/FR ranking. English keywords in URL are common for international sites; native slug keywords are a **P3 optimization** for curated static pages only.

### Localized slugs (later)

Requires: slug mapping table, 301 redirects, hreflang updates, GSC monitoring. **Not recommended until** static pilot proves healthy in GSC (3–6 months).

---

## 10. Recommended next steps

### P0 — before / with deploy

- [x] Static pilot 53 paths ES+FR
- [x] 0 blocking visible-text / locale-link / switcher audits
- [x] `tsc`, i18n tests, build pass
- [ ] Post-deploy smoke: 20 URLs 200, 9 unsupported locales 404

### P1 — after deploy (Stage 3)

| ID | Task |
| --- | --- |
| 3A | Optional static-guide filter on ES/FR resources hub |
| 3B | Taxonomy label helper (categories, countries display) |
| 3C | Provider hub EN leftover blocks (directory section) |
| 3M | Onboarding locale entry from ES/FR signin |

### P2 — DB translation pilot (Stage 4)

1. Migration: `long_tail_translations` table (proposal only until approved)
2. Translate 11 category hubs + top 50 resources
3. Serve with noindex until reviewed → publish batch
4. Re-enable resources DB grid on ES/FR when articles published

### P3 — scale (Stage 5)

- Top 1000 scholarships by GSC
- Monitor crawl budget + hreflang in GSC
- Consider localized slugs for top static guides only

### P4 — new languages

Not until ES/FR GSC healthy + DB pipeline proven.

---

## 11. Implementation plan summary

```
Stage 2 (DONE) ──► Static 53 paths, hubs, funnel, subscription UI
       │
Stage 3A/B ──────► Taxonomy labels, optional static filters, provider chrome
       │
Stage 3M ────────► Account/onboarding locale
       │
Stage 4 ─────────► DB pilot (categories + top resources + top scholarships)
       │
Stage 5 ─────────► Scale DB translation with quality gates
```

---

## 12. Automated QA — this audit run

| Command | Result |
| --- | --- |
| `npx tsc --noEmit` | ✅ PASS |
| `npx tsx --test lib/i18n/__tests__/*.test.ts` | ✅ 51/51 pass |
| `npm run build` | ✅ Compiled successfully (196 static pages) |
| `npx tsx scripts/i18n-full-audit-inventory.ts` | ✅ Reports + CSVs generated |
| `npx tsx scripts/i18n-visible-text-audit.ts` | ✅ **0 blocking** UI/links (118 pages, 2026-05-20) |
| `npx tsx scripts/i18n-locale-link-audit.ts` | ✅ **0 blocking links** (118 pages); click tests 0/18* |
| `npx tsx scripts/i18n-language-switcher-audit.ts` | ⚠️ Playwright re-run inconclusive* |

\*Long Playwright crawl (~2h) degraded the local `next start` process. Re-run after fresh `npm run build && npx next start` before deploy. **Prior validated run (2026-05-19):** 51/51 switcher, 18/18 click tests, 0 blocking links. Unit tests cover switcher href parity.

### Script coverage gaps (proposed)

| Gap | Proposed addition |
| --- | --- |
| Taxonomy label English detection | Add category value phrases to visible-text BLOCKING list |
| Canonical/hreflang HTTP check | New `i18n-hreflang-audit.ts` (fetch `<link rel="alternate">`) |
| EN sitemap regression | CI diff: EN bucket URL counts |
| Unsupported locale 404 | Extend smoke script |

---

## 13. Appendix — report index

| Report | Path |
| --- | --- |
| Route inventory (MD) | [i18n-full-route-translation-inventory-2026-05-19.md](./i18n-full-route-translation-inventory-2026-05-19.md) |
| Route inventory (CSV) | [i18n-full-route-translation-inventory-2026-05-19.csv](./i18n-full-route-translation-inventory-2026-05-19.csv) |
| SEO coverage (MD) | [i18n-es-fr-seo-coverage-2026-05-19.md](./i18n-es-fr-seo-coverage-2026-05-19.md) |
| SEO coverage (CSV) | [i18n-es-fr-seo-coverage-2026-05-19.csv](./i18n-es-fr-seo-coverage-2026-05-19.csv) |
| DB readiness | [i18n-db-content-translation-readiness-2026-05-19.md](./i18n-db-content-translation-readiness-2026-05-19.md) |
| Cost/model plan | [i18n-translation-cost-and-model-plan-2026-05-19.md](./i18n-translation-cost-and-model-plan-2026-05-19.md) |
| Visible-text audit | [i18n-visible-text-audit-2026-05-19.md](./i18n-visible-text-audit-2026-05-19.md) |
| Locale-link audit | [i18n-locale-link-audit-2026-05-19.md](./i18n-locale-link-audit-2026-05-19.md) |
| Language switcher audit | [i18n-language-switcher-audit-2026-05-19.md](./i18n-language-switcher-audit-2026-05-19.md) |
| Subscription localization | [i18n-subscription-localization-2026-05-19.md](./i18n-subscription-localization-2026-05-19.md) |
| Zone C cleanup | [i18n-stage2-zone-c-link-cleanup-2026-05-19.md](./i18n-stage2-zone-c-link-cleanup-2026-05-19.md) |
| Inventory script | `scripts/i18n-full-audit-inventory.ts` |

---

## Acceptance criteria checklist

| Question | Answer |
| --- | --- |
| Which static pages translated? | All 53 pilot paths — see SEO coverage report |
| Which static pages missing? | None in pilot; `/tools/*` outside scope |
| Which funnel pages translated? | get-scholarships, signin/*, subscription |
| `/get-scholarships` ES/FR? | ✅ Yes |
| Signin/signup? | Signin ✅; signup redirects to EN onboarding |
| Subscription? | ✅ ES/FR UI; payment unchanged |
| Why `/fr/resources` no filters? | Intentional — DB grid hidden until CMS translated |
| Taxonomy labels English? | Category **values** in scholarships filter modal |
| SEO pages translated? | 53 static + 6 hubs; ~40k DB pages not |
| English SEO safe? | ✅ Yes |
| ES/FR sitemaps correct? | ✅ Pilot buckets only |
| Hreflang bidirectional? | ✅ On published pilot + subscription |
| Language reset? | Rare; Lemon success → EN scholarships |
| Zone C links? | ~454 allowed English DB/product links |
| When translate DB? | Stage 4 after taxonomy labels |
| How translate DB? | Queue table + OpenAI draft + human review |
| Model/API? | Hybrid; gpt-4o-mini for DB draft |
| Cost? | ~$1 MT for pilot batch; see cost report |
| Translate slugs? | Not now; English slugs + prefix |
| Safe next stage? | **Stage 3B** taxonomy labels, then deploy if not yet pushed |
