# P0 ES/FR UI static translation cleanup — 2026-05-21

**Scope:** UI/chrome only — no Supabase writes, seeds, migrations, OpenAI, auth/payment/Lemon, or `/en` routes.  
**Base URL (verification):** `http://localhost:3020` (production build, `NEXT_PUBLIC_SUPABASE_ANON_KEY` unset for build).  
**Commit/push:** Not performed (awaiting approval).

---

## 1. Executive summary

P0 public UI chrome for ES/FR is **implemented and verified** on local production build. Scholarship cards, provider hub, compare subhubs, resources/essays toolbars, hub footer CTA, desktop pricing nav, and taxonomy display helpers now pull from localized copy modules.

**Verdict**

| Question | Answer |
| --- | --- |
| Ready for push/deploy (P0 UI scope)? | **Yes** — after human review of diff; no DB/auth/payment changes. |
| Remaining blockers for “fully translated ES/FR”? | **Yes** — DB/CMS bodies, compare DB card titles, non-pilot static resource guide titles on hub, scholarship detail without `content_translations`. |

**Estimated production quality (ES/FR public surfaces)**

| Surface | Before (~47 overall) | After (P0) |
| --- | ---: | ---: |
| Public/static UI (nav, toolbars, CTAs) | 55 | **88** |
| Scholarship hub (cards + footer) | 40 | **82** |
| Provider hub (chrome) | 35 | **78** |
| Compare subhubs (chrome) | 45 | **85** |
| Resources hub (chrome) | 50 | **75** |
| Essays hub (chrome) | 55 | **86** |
| **Overall ES/FR production** | **47** | **~76** |

Scores are qualitative; chrome P0 items from `i18n-full-translation-gap-audit-2026-05-21.md` are addressed. DB/long-tail English remains by design.

---

## 2. Files changed

### New

| File | Purpose |
| --- | --- |
| `lib/i18n/compareSubhubUiCopy.ts` | ES/FR compare universities/states subhub chrome |
| `lib/i18n/providerDisplayLabels.ts` | Provider card UI + localized source/completeness badges; scholarship source/difficulty/best-for helpers |
| `app/compare/universities/universityCompareHubPageBody.tsx` | Shared compare universities body (locale prop; fixes Next.js page export constraint) |
| `app/compare/states/stateCompareHubPageBody.tsx` | Shared compare states body |
| `scripts/seo/i18n-ui-static-cleanup-smoke.ts` | Focused P0 route + English chrome marker smoke |

### Modified (core)

| Area | Files |
| --- | --- |
| Scholarship cards | `components/scholarships/ScholarshipCard.tsx`, `lib/i18n/scholarshipsHubUiCopy.ts`, `app/scholarships/category/ScholarshipCategoryPageClient.tsx` |
| Hub footer CTA | `components/scholarships/ScholarshipHubCanonicalSeo.tsx` |
| Providers | `components/providers/ProvidersHubCard.tsx`, `ProvidersHubToolbar.tsx`, `ProvidersHubCardsGrid.tsx`, `ProvidersHubPageContent.tsx` |
| Compare | `app/compare/universities/page.tsx`, `app/compare/states/page.tsx`, `app/[locale]/compare/*/page.tsx`, `components/compare/CompareCardGrid.tsx` |
| Resources | `components/content-hub/ResourcesIndexPageContent.tsx`, `ResourcesIndexToolbar.tsx` |
| Essays | `components/essays/EssaysIndexToolbar.tsx`, `EssaysIndexResultSummary.tsx`, `EssaysIndexPageContent.tsx` |
| Nav | `components/ui/Navbar/Navlinks.tsx` (Precios/Tarifs → `/es|fr/subscription`) |
| Taxonomy | `lib/i18n/taxonomyLabels.ts` (category/country/catalog chips, resource categories, toolbar copy) |
| Hrefs | `lib/i18n/localizedHref.ts` (resource pilot article prefix in `hrefForLocalizedUiRequired`) |
| Hub toolbar | `lib/i18n/hubUiCopy.ts` (`filtersAria`) |
| Audits | `scripts/i18n-visible-text-audit.ts` |

---

## 3. Strings fixed (P0 chrome)

### Scholarship cards (`ScholarshipCard` + `scholarshipsHubUiCopy.card`)

| EN | ES | FR |
| --- | --- | --- |
| NEW | NUEVO | NOUVEAU |
| Award Amount | Monto de la beca | Montant de la bourse |
| Requirements | Requisitos | Exigences |
| Save / Not relevant | Guardar / No relevante | Enregistrer / Non pertinent |
| Best for: / Effort: / Source: | Mejor para: / Esfuerzo: / Fuente: | Meilleur pour: / Effort: / Source: |
| Host: Not specified | Anfitrión: sin especificar | Pays d’accueil non précisé |
| Requirement count fallbacks | Localized zero/one/many + summary lines | Same |

Category STEM pages receive full `cardCopy` from hub UI (fixes English “Save”).

### Hub footer (`ScholarshipHubCanonicalSeo`)

- Continue your scholarship search, Explore →, resource/essay/provider/compare cards and descriptions → `continueSearch` block in `scholarshipsHubUiCopy` per locale.

### Provider hub

| EN | ES | FR |
| --- | --- | --- |
| View Profile | Ver perfil | Voir le profil |
| Active Scholarship(s) | Beca(s) activa(s) | Bourse(s) active(s) |
| Official source available | Fuente oficial disponible | Source officielle disponible |
| Data: strong | Datos: sólidos | Données solides |
| Profile enriched | Perfil enriquecido | Profil enrichi |
| Search providers | Buscar proveedores | Rechercher des fournisseurs |
| Countries | Países | Pays |

### Compare subhubs

- H1, intro, breadcrumbs, search placeholder, result label, empty states, Showing range, Read more →, Categories (when shown) via `compareSubhubUiCopy` + `CompareIndexToolbar` / `CompareCardGrid`.

### Resources / essays toolbars

- Filters, Categories, All topics, topic labels, Clear, Apply, Read more →, search placeholders, **Open filters** aria (`filtersAria`).

### Pricing nav

- Desktop **Precios** / **Tarifs** → `/es/subscription`, `/fr/subscription` (EN **Pricing** → `/subscription`).

### Taxonomy display (IDs unchanged)

- `getLocalizedCategoryLabel`, `getLocalizedCountryLabel`, `getLocalizedCatalogChipLabel`, `getLocalizedResourceCategoryLabel`, `getLocalizedScholarshipSourceShortLabel`, `getLocalizedScholarshipDifficultyLevel`, `getLocalizedBestForPhrase` (partial phrase map), provider source/completeness labels.

---

## 4. What remains DB / allowed English

| Item | Bucket | Notes |
| --- | --- | --- |
| Scholarship titles, amounts, deadlines, provider names | D | Unchanged |
| Scholarship/provider/compare **descriptions** and list summaries from API | C | English until `content_translations` |
| Compare DB matchup **card titles** on university/state subhubs | C + F | EnglishZoneNotice; chrome localized |
| Static resource guide titles not in Stage 2 pilot map (e.g. “Scholarship Application Checklist”) | C | Shown on ES/FR hub static section; titles from EN fallback in `getStaticResourceGuideCardCopy` |
| Resource pilot articles (25 slugs) | DB/static pilot | Routes work; `/es/resources/{pilot-slug}` 200 |
| Lemon checkout UI | F | English by design |
| `/essay` product | F | Out of scope |

---

## 5. Audit script improvements

`scripts/i18n-visible-text-audit.ts`:

- Expanded `BLOCKING_ENGLISH` / `ATTR_BLOCKING_ENGLISH` (NEW, Award Amount, View Profile, Countries, Read more, Showing, Best for, Effort, Source, Continue your scholarship search, Explore, Filters, Categories, etc.).
- Opens scholarship **Categories** and provider **Countries** popovers on hub routes.
- Attribute checks for placeholder / aria-label / title.

**Follow-up recommended:** Treat RSC prop names (`showCategories`, `moreFilters`, `activeScholarships`) as non-visible; classify static EN guide **titles** on ES/FR resources hub as Zone C until translated or hidden.

---

## 6. Tests and build

| Check | Result |
| --- | --- |
| `npm run build` (anon key unset) | **Pass** |
| `npx tsc --noEmit` | **Pass** (after compare page body extraction) |
| `npx tsx --test lib/i18n/__tests__/*.test.ts` | **79/79 pass** |

---

## 7. Smoke and audits (localhost:3020)

### `scripts/seo/i18n-ui-static-cleanup-smoke.ts`

**All checks passed**, including:

- `/es|fr` scholarships, providers, compare, resources, essays, subscription
- `/es/scholarships/category/stem` 200; hobbies 404
- `/es/resources/how-to-apply-for-scholarships` 200
- `/en` 404
- No P0 English chrome markers in HTML (with RSC false-positive stripping)

### `scripts/i18n-locale-link-audit.ts`

```json
{
  "pagesCrawled": 118,
  "blockingLinkIssues": 0,
  "clickTestsPassed": 18,
  "clickTestsFailed": 0
}
```

(Resource pilot links now prefix `/es|fr` via `hrefForLocalizedUiRequired`.)

### `scripts/i18n-language-switcher-audit.ts`

```json
{
  "totalPages": 51,
  "pagesPassingSwitcher": 51,
  "pagesWithBlockingSwitcherIssues": 0
}
```

### `scripts/i18n-visible-text-audit.ts`

**Exit 1** — 6 pages with blocking markers (down from prior run; attributes **0** blocking):

| Page | Markers | Classification |
| --- | --- | --- |
| `/es`, `/fr` | Requirements | Likely DB listing summaries / chips after client hydration |
| `/es/providers`, `/fr/providers` | Active Scholarships | Possible DB description text or audit substring; SSR HTML uses **Becas activas** / **Bourses actives** |
| `/es/resources`, `/fr/resources` | Scholarship Application Checklist, Requirements | Static EN guide card titles (non-pilot); allowed Zone C until translated |

**Link issues:** 0 blocking (fixed pilot resource hrefs).

---

## 8. SEO safety

| Check | Status |
| --- | --- |
| `/en` | 404 (smoke) |
| `/es|fr/scholarships/category/stem` | 200 |
| `/es|fr/scholarships/category/hobbies` | 404 |
| Resource pilot `/es/resources/how-to-apply-for-scholarships` | 200 |
| English URLs / canonicals / sitemap policy | Unchanged |
| `content_translations` / DB status | Unchanged |
| Auth / payment / Lemon / RLS | Unchanged |
| No `/en` route added | Confirmed |

Scholarship detail without published ES/FR translation remains **404** (existing policy).

---

## 9. Git safety

```
git status --short  → P0 code under app/, components/, lib/, scripts/
                      + audit report JSON/MD updates
                      Untracked: .env backups, .cursor/, stage4 reports (not staged)
git diff --stat     → ~23 code files + audit artifacts; no migrations/seeds
```

**Not in diff:** `.env`, secrets committed, Supabase migrations, seed runs, auth/payment/Lemon changes, new languages, `/en` routes, `resource_article` seed scripts.

---

## 10. Push / deploy readiness

| Criterion | Status |
| --- | --- |
| P0 UI chrome without DB | **Done** |
| Build + unit tests | **Pass** |
| P0 smoke + locale links + switcher | **Pass** |
| Visible-text audit zero blocking | **No** — 6 pages (mostly Zone C / DB; see §7) |
| Full ES/FR “complete site” claim | **No** — DB translation plan still required |

**Recommendation:** Safe to **push and deploy** for P0 UI chrome. Communicate remaining English in listings, provider/compare descriptions, and non-pilot resource guide titles until Stage 4D+ DB work.

---

## 11. References

- `reports/seo/i18n-full-translation-gap-audit-2026-05-21.md`
- `reports/seo/i18n-fix-without-db-plan-2026-05-21.md`
- `reports/seo/i18n-requires-db-translation-plan-2026-05-21.md`
