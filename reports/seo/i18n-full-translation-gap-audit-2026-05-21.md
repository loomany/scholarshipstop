# Full ES/FR translation gap audit — 2026-05-21

**Type:** Audit only (no code, DB, commit, or translation runs)  
**Production base:** https://scholarshiptop.com  
**Evidence:** Live Playwright marker scan (`reports/seo/i18n-full-translation-gap-audit-run-2026-05-21.json`), P0 smoke (`scripts/seo/i18n-p0-live-regression-smoke.ts`), codebase trace, existing audit scripts.

---

## 1. Executive summary

Production ES/FR routes are **live and mostly reachable** (200 on hubs, compare subhubs, category STEM pilot, subscription). **They are not acceptable as “fully translated” public experiences.** Users correctly see large English islands: scholarship card chrome, provider cards/toolbar, compare DB subhub UI, resources static/EN CMS cards, scholarship hub footer CTA block, and taxonomy chip labels.

**Verdict:** **Not production-ready for a “complete ES/FR site” claim.** Acceptable only as a **partial pilot** with known English zones (DB long-tail, compare DB cards, resource CMS pre-seed, `/essay` product).

| Area | Production status |
| --- | --- |
| Route availability | Strong — P0 smoke all pass (incl. `/es/compare/universities`, `/fr/compare/states`) |
| Hub shell (nav, sidebars, search on compare/resources/essays) | Mostly localized after P0 hotfix |
| Listing card UI (scholarships) | **Poor** — metric labels, badges, intelligence row English on ES/FR |
| Provider hub | **Poor** — toolbar + card chrome English; descriptions English (DB) |
| Compare main hub | **Good** — static guides localized |
| Compare university/state subhubs | **Intentional EN body** + notice; **UI chrome still EN** |
| Resources hub | **Mixed** — shell ES/FR; static guide titles/snippets English |
| Essays hub | **Mixed** — static guides localized; toolbar labels + result summary English |
| Pricing nav | **Hidden** on ES/FR desktop; pages exist and are localized |
| Language switcher | **50/51** pass on production (`/essays` EN returned HTTP 500 once) |

---

## 2. Is current ES/FR production acceptable?

**No** for user-facing completeness. **Yes** for controlled pilot scope if messaging sets expectations: static pilots + category STEM + English DB listings until `content_translations` expands.

---

## 3. User screenshot issues — classified

| # | Finding | Verified on production | Bucket | Priority |
| --- | --- | --- | --- | --- |
| 1 | Category/filter modal labels | Hub filters use `scholarshipsHubUiCopy` (ES: Categorías, Soy de, Estudio en). Category **chip labels** on cards still EN (Education, Few Requirements). Counts present; zero counts = data, not i18n bug. | A shell / B chips | P0 / P1 |
| 2 | Study country filter | Labels localized in hub UI copy; country names from taxonomy (EN display). | B | P1 |
| 3 | Citizenship filter | `notSpecified` localized in hub copy; chip `Host: Not specified` on cards is EN in `ScholarshipCard`. | A | P0 |
| 4 | Scholarship cards | NEW, Award Amount, Requirements, Best for/Effort/Source, Host; Save/Not relevant **localized on main hub**, **English on category STEM** (missing `cardCopy`). Titles/descriptions = DB (EN). | A + C + D | P0 |
| 5 | Provider cards | View Profile, Active Scholarship(s), badges (Official source…, Profile enriched), EN descriptions. | A + C | P0 / P2 |
| 6 | Provider search/filter | Search placeholder localized; **Countries**, **Search providers** hardcoded EN. | A | P0 |
| 7 | Compare `/es/compare` | Static subhubs localized; no blocking EN markers in scan. | OK | — |
| 8 | Compare universities/states | EnglishZoneNotice shown; full EN page reused; Showing/Read more/University vs University EN. | A + C + F | P0 UI / P3 DB |
| 9 | Resources `/es/resources` | Shell localized; **Read more →** and EN static guide titles on cards. | A + C | P0 / P2 |
| 10 | Essays `/es/essays` | Static guide titles localized; **Filters/Categories/Showing** EN in toolbar + `EssaysIndexResultSummary`. DB essay grid hidden on ES/FR (by design). | A | P0 |
| 11 | Pricing nav | Desktop **Precios/Tarifs hidden** (`locale === 'en'` only). Mobile drawer shows localized label → `/es/subscription`. Pages 200, copy in `subscriptionPageCopy.ts`. | Policy | P1 decision |
| 12 | Language switcher | Works on audited pilot routes; `/essays` EN 500 intermittent in switcher audit. | — | P1 investigate |

---

## 4. Full route audit summary

| URL | HTTP | EN UI markers (sample) | Notes |
| --- | --- | --- | --- |
| `/es/scholarships`, `/fr/scholarships` | 200 | Award Amount, NEW, Continue your scholarship search, Explore →, Best for/Effort/Source | Hub filters OK; cards + footer CTA block EN |
| `/es/providers`, `/fr/providers` | 200 | View Profile, Countries, Profile enriched, Active Scholarships | Descriptions = DB EN |
| `/es/compare`, `/fr/compare` | 200 | None in marker scan | Static compare pilots OK |
| `/es/compare/universities`, states (+ FR) | 200 | Showing, Read more, University/State vs … | Wraps EN `UniversityBattlesPage` + notice |
| `/es/compare/scholarship-vs-grant`, no-essay-vs-essay | 200 | None | Static localized pages |
| `/es/resources`, `/fr/resources` | 200 | Read more, EN guide titles | DB CMS grid policy: filtered/hidden until 4D seed |
| `/es/essays`, `/fr/essays` | 200 | Filters, Categories, Showing | DB long-tail grid hidden |
| `/es/subscription`, `/fr/subscription` | 200 | None in scan | Nav link desktop-hidden |
| `/es/scholarships/category/stem` (+ FR) | 200 | Same card EN as hub + **Save** (not Guardar) | Category client missing `cardCopy` |
| `/es/scholarships/category/hobbies` | 404 | — | Expected (not in pilot) |
| `/es/resources/how-to-find-scholarships` | 200 | None in scan | Static pilot page |
| `/es/essays/examples` | 200 | None in scan | Static pilot |

---

## 5. UI/static vs DB

| Bucket | Meaning | Volume on public ES/FR |
| --- | --- | --- |
| **A** | Must fix in code (labels, placeholders, CTAs) | **High** — cards, providers, compare subhub chrome, hub footer, essays toolbar |
| **B** | Taxonomy/display labels (keep IDs) | **High** — category chips, compare kind labels, filter option names |
| **C** | `content_translations` / CMS body | **Very high** — scholarship snippets, provider `ai_description`, compare card titles, resource articles |
| **D** | Entity names (stay EN) | Expected — university names, scholarship titles, USD |
| **E** | Brand terms | ScholarshipTop, STEM, IQ, GPA — OK |
| **F** | Out of scope | Lemon checkout, `/essay`, EN compare DB until P3 |

---

## 6. Fix now without DB

See **`i18n-fix-without-db-plan-2026-05-21.md`** (~25 items, P0-heavy).

---

## 7. Requires `content_translations`

See **`i18n-requires-db-translation-plan-2026-05-21.md`**.

---

## 8. Pricing / nav recommendation

| Item | Status |
| --- | --- |
| `/es/subscription`, `/fr/subscription` | **200**, localized copy exists (`lib/i18n/subscriptionPageCopy.ts`) |
| Desktop nav Pricing | **Hidden** for ES/FR (`Navlinks.tsx` ~749: `{locale === 'en' ? <Link href="/subscription">…`) |
| Mobile nav | Shows **Precios** / **Tarifs** → localized subscription path |

**Recommendation:** **Show Precios / Tarifs in ES/FR desktop nav** now that subscription pages are production-ready. Lemon checkout remains out of scope; link is same product surface as EN. Risk: low; test switcher + active state on `/es/subscription`.

---

## 9. Language switcher status

- **P0 smoke:** PASS on `/es/compare`, `/es/resources`, `/es/essays`, `/es/compare/universities` (href + active locale).
- **Full switcher audit (production):** 50/51 pass; **`/essays` (EN) returned HTTP 500** once — treat as **P1 reliability** (not ES/FR regression).
- **No `/en` routes** in switcher hrefs.
- **Gap:** Switcher audit clusters omit `/es/compare/universities`, `/es/providers` hub cards, category STEM — extend targets in script (proposal only).

---

## 10. Audit script weaknesses

### `scripts/i18n-visible-text-audit.ts`

| Weakness | Effect |
| --- | --- |
| Fixed `BLOCKING_ENGLISH` list (~30 terms) | Misses **Award Amount, NEW, View Profile, Read more, Showing, Best for, Effort, Countries**, etc. |
| No zone split | UI chrome and DB body text treated alike; DB English **ignored** as blocking |
| No modal interaction | Category/citizenship/more-filters popovers not opened |
| `STAGE2_PILOT_CANONICAL_PATHS` only | Misses `/compare/universities`, `/compare/states` until added |
| Scholarship hub false negative | Removes `Find Scholarships` if localized nav phrase found — **masks other EN** |
| Allowlist `term.length < 12` | Over-broad |
| Zone C link allowlist | Correct for policy but **hides** hundreds of EN internal links from “blocking” count |

### `scripts/i18n-language-switcher-audit.ts`

- Missing compare subhub + provider + category cluster targets.
- EN `/essays` 500 causes false failure.

### `scripts/i18n-locale-link-audit.ts`

- Link-focused; does not inspect visible card strings.

### Proposed improvements (report only — not implemented)

1. **Zone-based rules:** `chrome` (strict), `taxonomy` (display map), `db_body` (allow with flag), `entity` (allow).
2. **Expand marker dictionary** from `scholarshipsHubUiCopy` / grep of `DEFAULT_*_COPY`.
3. **Playwright flows:** open Categories, Study in, I'm from, More filters, provider Countries dropdown.
4. **Per-route expectations** file (YAML/TS) with required ES/FR phrases.
5. **Separate exit code** for chrome vs allowed DB English.
6. **Attribute audit** for all hub toolbars (essays currently hardcoded aria-labels).

Repro run script (read-only): `scripts/seo/i18n-full-translation-gap-audit-run.ts` → JSON in `reports/seo/`.

---

## 11. Proposed implementation stages

| Stage | Scope | DB? |
| --- | --- | --- |
| **P0** | Scholarship card metrics/badges/NEW/Host; hub footer CTA (`ScholarshipHubCanonicalListingFooter`); provider card + toolbar; compare subhub toolbar/grid chrome; resources/essays Read more + essays toolbar/summary; category page `cardCopy`; pricing nav visibility | No |
| **P1** | Taxonomy chip labels (categories, best-for levels, source status); country display names in filters; provider badge label helpers | Mostly no (display map) |
| **P2** | Resource article pilot seed (25×2) + hub filtered grid | Yes |
| **P3** | Compare DB translation pilot (university/state pages) | Yes |
| **P4** | Scholarship + provider detail pages via `content_translations` | Yes |

---

## 12. Risks and blockers

- **SEO:** Localized URLs OK; no `/en`. Risk if EN compare/resource URLs get hreflang before translation — keep sitemap gates (`lib/seo/sitemaps.ts`, `contentTranslationsDbPolicy`).
- **Category STEM:** English **Save** on cards hurts trust vs main hub **Guardar**.
- **Compare subhubs:** English body is disclosed via `EnglishZoneNotice` but **chrome EN** undermines notice.
- **Resources:** Showing EN titles on ES hub until 4D seed or static card translation.
- **EN `/essays` 500:** Investigate separately; affects EN SEO crawl.

---

## 13. Recommended next TZ

1. Execute **P0 UI bundle** (single PR, no DB).
2. Extend automated audits (chrome dictionary + modal opens).
3. Product decision: **show Precios/Tarifs** in nav.
4. Plan **4D resource seed** only after P0 chrome clean.
5. Do **not** start bulk OpenAI translation until P0/P1 green on production smoke + new gap audit.

---

## 14. Readiness scores (honest)

| Surface | Score /100 |
| --- | ---: |
| Public/static UI ES/FR | **52** |
| DB content ES/FR | **8** |
| Provider surface ES/FR | **38** |
| Scholarship hub ES/FR | **48** |
| Compare ES/FR | **58** (main hub ~75, subhubs ~35) |
| Resources ES/FR | **55** |
| Essays ES/FR | **68** |
| **Overall ES/FR production quality** | **47** |

---

## 15. CSV index

Detailed row-level findings: **`i18n-full-translation-gap-audit-2026-05-21.csv`**.

---

## Appendix: Key source files

| Issue | File |
| --- | --- |
| Card metrics EN | `components/scholarships/ScholarshipCard.tsx` |
| Hub footer CTA EN | `components/scholarships/ScholarshipHubCanonicalSeo.tsx` (`ScholarshipHubCanonicalListingFooter`) |
| Provider card EN | `components/providers/ProvidersHubCard.tsx` |
| Provider toolbar EN | `components/providers/ProvidersHubToolbar.tsx` |
| Compare subhub EN reuse | `app/[locale]/compare/universities/page.tsx`, `states/page.tsx` |
| Compare Read more EN | `components/compare/CompareCardGrid.tsx` |
| Resources Read more EN | `components/content-hub/ResourcesIndexPageContent.tsx` |
| Essays Filters EN | `components/essays/EssaysIndexToolbar.tsx`, `EssaysIndexResultSummary.tsx` |
| Pricing nav hidden | `components/ui/Navbar/Navlinks.tsx` ~749 |
| Category card Save EN | `app/scholarships/category/ScholarshipCategoryPageClient.tsx` (no `cardCopy`) |
