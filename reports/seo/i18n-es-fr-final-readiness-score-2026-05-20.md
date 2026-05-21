# ES/FR final translation readiness score (2026-05-20)

**Audit-only.** No commits. No pushes. No product code changes in this run.

**Verification server:** Clean `npm run build` → `npx next start -p **3010**` (ScholarshipTop production).  
**Port 3000 warning:** `:3000` was **EADDRINUSE** and, when occupied, served a **different** Next.js app (`kaspi`). Route audit against `:3000` produced false 404/“wrong app” results. All authoritative QA below used **`:3010`**.

---

## 1. Executive summary

| Question | Answer |
| --- | --- |
| **Can you push this ES/FR stage?** | **Yes** — Stage 2 pilot is **ready to deploy** with documented, non-blocking gaps. |
| **What goes live after push?** | `/es` and `/fr` for **53 canonical static paths** (106 indexable pilot URLs in locale sitemaps), localized hub chrome, funnel UI, and subscription UI. English stays on **root** (no `/en`). |
| **What stays English?** | All DB long-tail (scholarship/provider/resource/essay detail, compare state pages, category SEO pages), taxonomy **filter values**, hub scholarship **cards**, account/onboarding, `/essay`, `/iq/*`, auth email deep-links. |
| **Biggest remaining risk?** | Users on ES/FR hubs see **English DB content** (cards, category chips, provider names) and may follow **423 allowed Zone C** English-only internal links — acceptable by design but affects perceived completeness. |
| **English SEO safe?** | **Yes** — root URLs, EN sitemaps, canonicals unchanged; `/en` and unsupported locales **404**. |
| **Next stage?** | P0 post-deploy GSC → P1 `taxonomyLabels.ts` → optional static-only resources filters → P2 DB pilot (top 100 scholarships / 50 providers / 50 resources) with review gates. |

### Readiness scores (/100)

| Area | Score | Notes |
| --- | ---: | --- |
| Public/static ES/FR SEO | **92** | 53/53 paths; hub cards EN; taxonomy values EN |
| Funnel ES/FR | **90** | All funnel routes 200 + localized; noindex correct |
| Private/account ES/FR | **12** | `/account`, `/onboarding`, `/essay` EN-only |
| DB translation readiness | **28** | Plan + schema design only; zero published DB translations |
| English SEO safety | **96** | Verified; minor hub-tab hreflang gaps on EN-only hub URLs |
| **Overall push readiness** | **88** | **READY** for Stage 2 ES/FR pilot |

---

## 2. Source-of-truth report resolution

### Report hierarchy (authoritative → stale)

| Priority | Artifact | Status |
| ---: | --- | --- |
| **1** | **Code** (`app/**`, `lib/i18n/**`, `middleware.ts`) | **Authoritative** |
| **2** | `i18n-es-fr-final-consistency-check-2026-05-20.md` | **Newest** — funnel route resolution |
| **3** | `i18n-es-fr-final-readiness-score-2026-05-20.md` (this file) | **Newest** — scores + full QA |
| **4** | `i18n-master-translation-and-seo-audit-2026-05-19.md` | Current overall |
| **5** | `i18n-es-fr-final-prepush-audit-2026-05-19.md` | Current QA (subscription wording outdated — see below) |
| **6** | `i18n-es-fr-seo-coverage-2026-05-19.md` + `.csv` | Current counts |
| **7** | Stage 2 link/switcher audits (`2026-05-19`) | Current methodology |
| **8** | `i18n-static-pages-inventory-2026-05-19.md` §4 | **STALE** — says funnel “skip” |

### Conflicts resolved

| Conflict | Stale claim | Truth (code + 2026-05-20 checks) |
| --- | --- | --- |
| Funnel routes exist? | `i18n-static-pages-inventory` §4: skip signin/get-scholarships/subscription | **Shipped:** `app/[locale]/get-scholarships/`, `signin/`, `subscription/` — all **200** on ES/FR |
| Subscription localized? | `i18n-es-fr-final-prepush-audit` §8 “Option A: English-only” | **Superseded:** `/es/subscription`, `/fr/subscription` localized UI; **indexable**; hreflang en/es/fr/x-default |
| Subscription noindex? | Some early notes grouped subscription with funnel | **Only** get-scholarships + signin are **noindex,follow** |
| Zone C link count | 454 vs 423 | Crawl variance; **423** on this run (`locale-link-audit`) — same policy |
| QA port | User spec `:3000` | Use **`:3010`** (or free `:3000` and confirm HTML says ScholarshipTop) |

**Newest operational source of truth:** this report + `i18n-final-readiness-route-audit-2026-05-20.json` + live audits on `:3010`.

---

## 3. Route status table

Legend:

- **Switcher:** from `i18n-language-switcher-audit.ts` (51/51 pass). Route script `data-language-switcher` heuristic under-reports switcher on some hubs — switcher audit is authoritative.
- **Locale links:** `i18n-locale-link-audit.ts` — **0 blocking** (423 Zone C allowed).
- **Template:** ES/FR use same `*PageContent` components as EN.

### English (root)

| Route | HTTP | Translated UI | Same template | Index | Sitemap | Canonical | Hreflang | Switcher | Locale links | Ready | Notes |
| --- | ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | 200 | en | yes | index | EN buckets | yes | en,es,fr,x-default | yes* | 0 blocking | yes | *Pilot home cluster |
| `/scholarships` | 200 | en | yes | index | yes | yes | en,es,fr,x-default | yes* | 0 blocking | yes | Filter chrome localized on ES/FR; **values** EN |
| `/scholarships/hub/best-recommendation` | 200 | en | yes | index | EN hub only | yes | none | yes | 0 blocking | yes | DB cards EN on all locales |
| `/essays` | 200 | en | yes | index | yes | yes | en,es,fr,x-default | yes* | 0 blocking | yes | DB grid EN-only on hub |
| `/providers` | 200 | en | yes | index | yes | yes | en,es,fr,x-default | yes* | 0 blocking | yes | Provider cards link to EN detail |
| `/compare` | 200 | en | yes | index | yes | yes | en,es,fr,x-default | yes* | 0 blocking | yes | DB compare grid EN-only |
| `/resources` | 200 | en | yes | index | yes | yes | en,es,fr,x-default | yes* | 0 blocking | yes | Full search/toolbar + DB grid |
| `/terms` | 200 | en | yes | index | yes | yes | en,es,fr,x-default | yes | 0 blocking | yes | |
| `/faq` | 200 | en | yes | index | yes | yes | en,es,fr,x-default | yes | 0 blocking | yes | |
| `/privacy-policy` | 200 | en | yes | index | yes | yes | en,es,fr,x-default | yes | 0 blocking | yes | |
| `/get-scholarships` | 200 | en | yes | **noindex,follow** | no | partial | none | no | 0 blocking | yes | Funnel — switcher hidden by design |
| `/signin` | 200 | en | yes | **noindex,follow** | no | partial | none | no | 0 blocking | yes | `/login` `/register` N/A |
| `/subscription` | 200 | en | yes | **index** | no | yes | en,es,fr,x-default | yes | 0 blocking | yes | Not in sitemap by design |

### Spanish (`/es`)

| Route | HTTP | Translated UI | Same template | Index | Sitemap | Canonical | Hreflang | Switcher | Locale links | Ready | Notes |
| --- | ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/es` | 200 | yes | yes | index | locale-es-* | yes | en,es,fr,x-default | yes* | 0 blocking | yes | |
| `/es/scholarships` | 200 | yes | yes | index | yes | yes | partial† | yes* | 0 blocking | yes | †Listing pages often omit hreflang cluster |
| `/es/scholarships/hub/best-recommendation` | 200 | partial | yes | index | no | yes | none | yes | 0 blocking | yes (partial) | Chrome ES; cards EN |
| `/es/essays` | 200 | yes | yes | index | yes | yes | en,es,fr,x-default | yes* | 0 blocking | yes | No DB essay grid |
| `/es/providers` | 200 | yes | yes | index | yes | yes | en,es,fr,x-default | yes* | 0 blocking | yes | Zone C provider detail links |
| `/es/compare` | 200 | yes | yes | index | yes | yes | en,es,fr,x-default | yes* | 0 blocking | yes | Static guides only |
| `/es/resources` | 200 | yes | yes | index | yes | yes | en,es,fr,x-default | yes* | 0 blocking | yes | **No DB search/grid** (intentional) |
| `/es/terms` | 200 | yes | yes | index | yes | yes | en,es,fr,x-default | yes | 0 blocking | yes | |
| `/es/faq` | 200 | yes | yes | index | yes | yes | en,es,fr,x-default | yes | 0 blocking | yes | |
| `/es/privacy-policy` | 200 | yes | yes | index | yes | yes | en,es,fr,x-default | yes | 0 blocking | yes | |
| `/es/get-scholarships` | 200 | yes | yes | **noindex,follow** | no | yes | none | no | 0 blocking | yes | **Confirmed 200** |
| `/es/signin` | 200 | yes | yes | **noindex,follow** | no | yes | none | no | 0 blocking | yes | **Confirmed 200** |
| `/es/subscription` | 200 | yes | yes | **index** | no | yes | en,es,fr,x-default | yes | 0 blocking | yes | **Confirmed 200**; payment unchanged |

### French (`/fr`)

Same pattern as ES (all **200**, same policies). Funnel confirmed:

- `/fr/get-scholarships` — **200**, localized, noindex
- `/fr/signin` — **200**, localized, noindex
- `/fr/subscription` — **200**, localized, indexable, hreflang complete

### Unsupported locales

| Route | HTTP | Ready |
| --- | ---: | --- |
| `/en` | **404** | yes (required) |
| `/de` | **404** | yes |
| `/pt` | **404** | yes |

Also **404** per middleware: `/ar`, `/zh-Hans`, `/hi`, `/id`, `/vi`, `/ru` (verified in prior prepush smoke).

**Machine-readable route dump:** `reports/seo/i18n-final-readiness-route-audit-2026-05-20.json`

---

## 4. Translation coverage

### Counts

| Metric | Value |
| --- | ---: |
| English canonical paths with ES+FR versions (Stage 2 pilot) | **53** |
| ES localized pilot URLs (`listLocalizedPilotPages({ locale: 'es' })`) | **53** |
| FR localized pilot URLs | **53** |
| ES+FR pilot URLs in locale sitemaps | **106** |
| English DB long-tail in EN sitemaps | **~40,114** (not translated) |

### By group

| Group | Translated? | ES/FR | Notes |
| --- | --- | --- | --- |
| **A. Static public SEO** | ✅ Full | 53 paths | Title, meta, H1, body, CTAs, FAQ where present |
| **B. Hubs** | ✅ Chrome | 6 hubs | Scholarship/provider/compare/resources/essays/home — DB grids hidden or EN cards |
| **C. Trust/legal/help** | ✅ Full | 15 paths | terms, privacy, refund, help, faq, trust pages |
| **D. Essay guides** | ✅ Static | 11 static | DB `/essays/[slug]` not translated |
| **E. Resource guides** | ✅ Static | 14 static | DB `/resources/[slug]` grid hidden on ES/FR index |
| **F. Compare guides** | ✅ Static | 4 static | DB compare pages EN-only |
| **G. Marketing** | ✅ | 3 paths | international-students, for-organizations, submit-grant |
| **H. Funnel** | ✅ UI | get-scholarships, signin(+views), subscription | noindex except subscription |
| **I. Private/account** | ❌ | — | `/account`, `/onboarding`, `/essay`, `/iq` |
| **J. DB long-tail** | ❌ By design | 0 ES/FR body | Zone C links allowed |

### Visible English UI leftovers?

**No blocking** UI English on audited pilot pages (`i18n-visible-text-audit`: **0 blocking**, 118 pages).

**Non-blocking English still visible:**

- Scholarship **category filter values** (Safety, Music, …) — see §6
- DB **card titles**, amounts, provider names on hubs
- Zone C links to English detail URLs

### Translated pages with English DB content?

**Yes** — by design on:

- `/es/scholarships`, `/fr/scholarships` (listing + hubs)
- `/es/providers`, `/fr/providers` (cards → EN detail)
- Hub tabs (localized chrome, EN scholarship cards)

### Taxonomy/filter labels

| Layer | Status |
| --- | --- |
| Filter **chrome** (search placeholder, sort, modal titles, chips UI) | ✅ `scholarshipsHubUiCopy.ts` |
| Category **values** in filters | ❌ **13/13 English** from `SCHOLARSHIP_CATEGORY_LABELS` |
| Country labels | Partially EN (DB-driven names) |

---

## 5. Funnel / subscription status

| Route | ES/FR exist | HTTP (:3010) | Translated UI | Robots | Sitemap | Payment safe |
| --- | :---: | ---: | :---: | --- | :---: | :---: |
| `/get-scholarships` | ✅ | 200 | ✅ | noindex,follow | ❌ | ✅ |
| `/signin`, `/signin/[id]` | ✅ | 200 | ✅ | noindex,follow | ❌ | ✅ auth UI only |
| `/subscription` | ✅ | 200 | ✅ | index (default) | ❌ | ✅ |

**Not localized (expected):** `/signup` → redirects; `/onboarding`, `/account/*`, `/auth/reset_password`, `/subscription/success` (Lemon return).

### Payment / auth verification

| Check | Result |
| --- | --- |
| `git diff app/api/billing/**` | **Empty** |
| `git diff lib/payments/**` | **Empty** |
| `git diff app/actions/billing.ts` | **Empty** |
| Plan keys | `monthly`, `quarterly`, `yearly` unchanged |
| Checkout | Still `getCheckoutURL(planKey)` |
| Subscription diff | `SubscriptionPricingClient.tsx` — **copy props only** |

`scripts/i18n-funnel-seo-smoke.ts` on `:3010`: **9/9 URLs 200**, robots/hreflang correct.

---

## 6. Filters / taxonomy readiness

### Finding

Category values like **Safety, Music, Disability, Hobbies, Miscellaneous** remain **English** on `/es/scholarships` and `/fr/scholarships`.

### Source

```41:58:app/scholarships/scholarshipCategories.ts
export const SCHOLARSHIP_CATEGORY_LABELS: Record<
  ScholarshipCategoryId,
  string
> = {
  arts: 'Arts',
  // ...
  safety: 'Safety',
  music: 'Music',
  disability: 'Disability',
  hobbies: 'Hobbies',
  miscellaneous: 'Miscellaneous'
};
```

- **IDs/slugs/query params:** English canonical (`safety`, `music`, …) — **do not change**
- **DB field:** `Scholarship.categories` stores same IDs
- **Display:** Rendered directly from `SCHOLARSHIP_CATEGORY_LABELS` without locale branch

### Safe fix plan (Stage 3B — not implemented)

1. Add `lib/i18n/taxonomyLabels.ts` with `getCategoryLabel(id, locale)` for **es** / **fr** / **en**
2. Wire `ScholarshipsHubPageClient`, `ScholarshipCategoryPageClient`, filter modals to use display helper
3. Keep IDs, slugs, and API query params **unchanged**
4. Optional: country display names via same pattern (ISO code → localized label)

**Missing count:** **13** category display labels × 2 locales = **26** strings (+ page headings if desired).

---

## 7. `/fr/resources` filter/search

### Is this intentional?

**Yes.** `ResourcesIndexPageContent.tsx` explicitly hides `ResourcesIndexToolbar`, `ResourcesGrid`, and pagination when `locale !== 'en'`:

```595:671:components/content-hub/ResourcesIndexPageContent.tsx
        {/*
          On ES/FR the DB-backed long-tail grid ... would surface untranslated English cards.
          We hide them and keep only the localized static guides + IQ aside ...
        */}
        {locale === 'en' ? (
          ... toolbar + grid ...
        ) : (
          ... header + static guides only ...
        )}
```

### Regression vs Stage 2 choice?

**Acceptable Stage 2 choice**, not a bug — avoids English DB article cards and English category filters on ES/FR.

### Safest next stage (recommendation only)

| Stage | Action |
| --- | --- |
| **3A (optional)** | Static-guide-only search/filter on ES/FR (filter **translated** static cards in `staticResourceGuideCards.ts`, no DB) |
| **4B** | After CMS translation pipeline, re-enable DB grid with `locale` column or `translation_status` |

Same pattern applies to **ES/FR essays index** and **compare index** (`locale === 'en'` guards).

---

## 8. Static SEO pages readiness

| Metric | Count |
| --- | ---: |
| Ready static pilot pages (ES+FR metadata + body) | **53** |
| Missing within pilot | **0** |
| Partial (EN DB body on same URL) | **0** for static paths; hubs are partial UX |
| Blockers | **0** |

### Checklist (pilot static)

| Check | Status |
| --- | --- |
| Title / meta / H1 / body translated | ✅ |
| Buttons / FAQ / breadcrumbs | ✅ where present |
| Same layout as EN | ✅ shared `*PageContent` |
| No blocking English UI | ✅ audit |
| Self-canonical on ES/FR | ✅ |
| hreflang en/es/fr/x-default | ✅ on static cluster pages |
| In `locale-es-*` / `locale-fr-*` sitemaps only when indexable | ✅ 106 URLs |
| Schema text localized | ✅ where implemented per page |

---

## 9. English SEO safety

| Check | Status |
| --- | --- |
| English URLs unchanged (root, no `/en`) | ✅ |
| English canonicals unchanged | ✅ |
| EN sitemap entries not removed | ✅ (`lib/seo/sitemaps.ts`) |
| EN pages not accidentally noindexed | ✅ |
| `/en` → 404 | ✅ |
| Unsupported locales → 404 | ✅ |
| ES/FR self-canonical | ✅ |
| hreflang only en/es/fr/x-default on pilot | ✅ |
| hreflang does not point to missing pages | ✅ |
| Locale sitemaps = pilot 106 only (no DB long-tail) | ✅ |
| Filter/pagination noindex (EN) | ✅ unchanged |
| DB long-tail not in ES/FR sitemaps | ✅ |

### ES/FR SEO technically safe?

**Yes** for Stage 2 scope. Residual UX/quality risks: English slugs under `/es/` prefix, English DB snippets if linked from SERP (most hub DB grids hidden).

### Post-deploy GSC checklist

1. Submit `sitemap.xml` + confirm `locale-es-core.xml` / `locale-fr-core.xml` indexed counts
2. Validate hreflang for `/`, `/es`, `/fr`, `/subscription` cluster
3. Monitor **Excluded by noindex** for get-scholarships/signin
4. Watch **Duplicate without user-selected canonical** on ES/FR
5. Confirm no `/en` URLs in coverage report
6. Spot-check impressions on `/es/scholarships` vs EN — expect slow ramp

---

## 10. Zone C / DB long-tail status

### What is Zone C?

**Zone C** = internal links that **must stay English** in Stage 2 because there is no localized destination: DB detail pages, product routes (`/essay`, `/iq/*`), onboarding, or EN-only programmatic SEO.

Allowed via `isExplicitEnglishOnlyInternalLink()` in `lib/i18n/localizedHref.ts`. Locale-link audit classifies these as **allowed**, not blocking.

### How many Zone C links remain?

| Run | Allowed English links |
| --- | ---: |
| Prepush 2026-05-19 | 454 |
| **This audit (:3010)** | **423** |

Variance = crawl depth/page set; policy unchanged.

### Are they safe?

**Yes** for Stage 2 push — documented, audited, no accidental `/en` hrefs (switcher audit **0** `/en` links).

### Prominent English DB cards on ES/FR public pages?

| Page | Visible EN DB content |
| --- | --- |
| `/es/scholarships` | Listing cards (titles, providers) — **expected** |
| `/es/providers` | Provider cards → EN detail |
| `/es/resources` | **Hidden** DB grid |
| Hub tabs | EN scholarship cards in carousel |

### DB groups — not translated

| Group | Action now | Later |
| --- | --- | --- |
| Scholarship detail | Keep + link (Zone C) | Translate top 100 → review → publish |
| Provider detail | Keep + link | Top 50 pilot |
| Resources CMS | Hidden on ES/FR hub | Top 50 pilot |
| DB essays | Zone C links | Volume batch P2 |
| Compare state/univ | Zone C | P3 |
| Category/country SEO pages | EN only | P1 category hubs (11) |

---

## 11. DB translation readiness (OpenAI later)

**Not ready to bulk-translate now** — need `translation_status` workflow, review UI, and noindex-until-published policy.

### First batch (recommended)

1. **11 category hub pages** (small, high intent)
2. **Top 50 resource CMS** articles (from EN hub links)
3. **Top 100 scholarships** (GSC impressions + indexable)

### Do not translate

- Official scholarship/provider **names**
- Amounts, deadlines, URLs, slugs, category **IDs**
- User-generated / legal quotes without review

### Model / API (later)

- **Pilot MT:** `gpt-4o-mini` with fact-preservation JSON schema
- **Scale draft:** DeepL or `gpt-4o-mini` → `draft_machine` → **noindex**
- **Publish:** human review only → `published` → sitemap + hreflang

### Rough cost (from `i18n-translation-cost-and-model-plan-2026-05-19.md`)

| Batch | Est. cost (ES+FR, both locales) |
| --- | ---: |
| Top 100 scholarships | ~$80–150 |
| Top 50 providers | ~$30–60 |
| Top 50 resources | ~$60–120 |
| **Pilot total** | **~$200–350** |

Formula: `(input_tokens × rate + output_tokens × rate) / 1e6` per page per locale.

### Quality gate / SEO spam avoidance

- `translation_status`: `draft_machine` → `review` → `published`
- **noindex** until `published`
- Fact-check prompts; no hallucinated eligibility
- ES/FR sitemap entry **only** when published
- hreflang only when **both** locales published for that entity

### Slug strategy for DB (later)

Keep **English slugs** under `/es/` and `/fr/` for Stage 4; localized slugs only for curated pages with 301 maps.

---

## 12. Slug strategy (explicit recommendation)

| Question | Recommendation |
| --- | --- |
| Current `/es/{english-slug}`, `/fr/{english-slug}` safe? | **Yes** for Stage 2–4 |
| Translate slugs now? | **No** |
| English slugs hurt ranking? | Minor vs content quality; hreflang + canonical matter more |
| Localized slugs later? | **Selected** curated static pages only, with redirects |
| DB pages later? | Keep stable English slugs; optional localized alias field + 301 |

**Keep English slugs now.** Revisit localized slugs post–DB pilot for high-traffic guides only.

---

## 13. Final checks run (2026-05-21)

| Command | Result | Port |
| --- | --- | --- |
| `npm run build` | ✅ PASS (prior clean build in session) | — |
| `npx next start -p 3000` | ❌ EADDRINUSE (wrong app risk) | 3000 |
| `npx next start -p 3010` | ✅ Running | **3010** |
| `npx tsc --noEmit` | ✅ PASS | — |
| `npx tsx --test lib/i18n/__tests__/*.test.ts` | ✅ **51/51** | — |
| `i18n-final-readiness-route-audit.ts` | ✅ JSON written | 3010 |
| `i18n-funnel-seo-smoke.ts` | ✅ 9/9 | 3010 |
| `i18n-visible-text-audit.ts` | ✅ **0 blocking** (118 pages) | 3010 |
| `i18n-locale-link-audit.ts` | ✅ **0 blocking**, 18/18 clicks, 423 Zone C | 3010 |
| `i18n-language-switcher-audit.ts` | ✅ **51/51** | 3010 |

### Git / safety scan

- **89 files** changed in working tree (Stage 2 i18n — not committed)
- **No** diff in `app/api/billing/**`, `lib/payments/**`, `app/actions/billing.ts`
- **No** `.env` / secrets in `git status` sample
- **No** Supabase migrations in diff
- New audit artifacts: `reports/seo/i18n-final-readiness-route-audit-2026-05-20.json`, this report

---

## 14. Final scores (recap)

| Area | Score |
| --- | ---: |
| Public/static ES/FR SEO | **92** |
| Funnel ES/FR | **90** |
| Private/account ES/FR | **12** |
| DB translation readiness | **28** |
| English SEO safety | **96** |
| **Overall push readiness** | **88** |

### Plain-language summary

- **Push?** Yes — Stage 2 ES/FR is production-ready for the agreed scope.
- **Live after push:** 106 pilot SEO URLs + localized funnel + subscription UI; English at root.
- **Still English:** DB details, filter category values, account flows, most product URLs.
- **Biggest risk:** User expectation mismatch (looks translated but DB content is English).
- **Next implementation:** taxonomy display labels → optional static resources filters → DB pilot with review gates.

---

## 15. Recommended next stages

| Priority | Stage | Work |
| --- | --- | --- |
| P0 | Deploy + GSC | Push branch; verify sitemaps/hreflang; monitor noindex funnel |
| P1 | 3B Taxonomy | `lib/i18n/taxonomyLabels.ts` — 13 categories × ES/FR |
| P1 | 3A Resources hub | Static-only filter UI on ES/FR (optional) |
| P2 | 4 DB pilot | Schema + worker; top 100/50/50; noindex until reviewed |
| P3 | Scale + slugs | Batch MT; localized slugs only with redirects |

---

## 16. What was not touched (this audit)

- No commits, pushes, Supabase writes, migrations
- No OpenAI bulk translation
- No `/en` route
- No new languages
- No auth/payment/Lemon/RLS/onboarding logic changes
- No DB slug/query param changes
- No product code fixes (audit-only)

---

## 17. Git status / diff summary

```
git diff --stat: 89 files changed, 2624 insertions(+), 3531 deletions(-)
```

Major areas: `app/[locale]/**`, `lib/i18n/**`, `components/i18n/**`, hub `*PageContent` extractions, `middleware.ts` (+locale header), `Navlinks.tsx`, `lib/seo/sitemaps.ts`, subscription/auth **copy** wiring.

Untracked: `.next/` build artifacts (do not commit), `reports/seo/*`, `scripts/i18n-*.ts`.

**Safe to push (source):** application i18n changes only; exclude `.next` and local env files.

---

*Generated: 2026-05-21. QA base URL: http://localhost:3010. Prior related report: [i18n-es-fr-final-consistency-check-2026-05-20.md](./i18n-es-fr-final-consistency-check-2026-05-20.md).*
