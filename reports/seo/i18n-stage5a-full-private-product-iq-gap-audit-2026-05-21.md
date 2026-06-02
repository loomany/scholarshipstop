# Stage 5A — Full ES/FR private, product, DB detail, and IQ gap audit (2026-05-21)

**Type:** Audit only — no code, DB, commit, or production mutations.  
**Production checked:** https://scholarshiptop.com, https://iq.scholarshiptop.com  
**Baseline:** P0 UI chrome commit `252a4c4` (post-deploy smoke passed on public hubs).

---

## 1. Executive summary

P0 fixed **public hub chrome** (scholarship cards, provider hub listing, compare/resources/essays toolbars, footer CTA, pricing nav). Production is **materially better** on `/es|fr` hubs but **not** “fully translated.”

The largest remaining gaps are:

| Rank | Surface | Issue |
| ---: | --- | --- |
| 1 | **IQ subdomain** | Separate product surface in same repo; **100% English** — no locale system, no language switcher, English question bank and result templates |
| 2 | **DB long-tail pages** | Provider profiles, CMS essays, compare detail, scholarship detail — **EN-only URLs** or **404** under `/es|fr` (correct policy) |
| 3 | **Provider detail UI** | Even on EN URLs, section chrome still English (`About Provider`, policy badges, IQ CTA) |
| 4 | **Cross-product links** | Nav/footer IQ links → `iq.scholarshiptop.com` (English) |

**Verdict:** Safe to claim **localized public hub chrome**; **do not** claim full ES/FR product parity.

**Recommended next stage:** **Stage 5C (IQ localization architecture)** in parallel with **Stage 5B (account/auth polish)**. **Pause** new provider/essay/compare **DB translation batches** until IQ + account UX strategy is signed off.

---

## 2. Current production truth (live probes)

| Route | HTTP | Language switcher | Notes |
| --- | ---: | :---: | --- |
| `/providers/loyola-university-chicago` | 200 | No | EN body + EN UI chrome; DB `ai_description` |
| `/es/providers/loyola-university-chicago` | **404** | — | **No** localized provider detail route (expected) |
| `/essays/how-to-write-about-the-gap-…` | 200 | No | Full **English CMS** essay |
| `/es/essays/how-to-write-about-the-gap-…` | **404** | — | No localized essay detail route |
| `/scholarships/climate-stripes-scholarship-14487` | 200 | No | EN scholarship detail |
| `/es/scholarships/climate-stripes-scholarship-14487` | **404** | — | `gateLocalizedScholarshipDetailOrNotFound` → `notFound()` |
| `/es/resources/how-to-apply-for-scholarships` | 200 | **Yes** | Resource pilot OK |
| `/es/account` (logged out) | 200 → signin | No | Redirect; canonical → `/es/signin` |
| `/es/signin`, `/es/onboarding` | 200 | No | Auth UI uses `authUiCopy` / `onboardingUiCopy` (localized) |
| `/es/subscription` | 200 | No | Product copy localized |
| `/en` | **404** | — | OK |
| `iq.scholarshiptop.com/` | 200 | **No** | English only; canonical `en_US` |
| `iq.scholarshiptop.com/assessment` | 200 | **No** | English questions (client bundle) |

---

## 3. What is already fixed / live (P0)

- Scholarship hub + category STEM **card chrome** (Save, Award Amount, Requirements, etc.)
- Provider **hub** card/toolbar chrome
- Compare/resources/essays **hub** toolbars and footer CTA block
- Desktop **Precios / Tarifs** → subscription
- Resource **pilot** articles (25 slugs) with `/es|fr` URLs and switcher
- Category STEM pilot; hobbies **404**
- Auth funnel routes exist: `/es|fr/signin`, `/onboarding`, `/subscription`, `/account`
- Account profile form largely wired to `accountProfileUiCopy` (Stage 3M)

---

## 4. What remains untranslated

### DB / long-tail (by design until `content_translations`)

- Provider profile pages (`/providers/{slug}`)
- CMS essay articles (`/essays/{slug}`) — distinct from static essay **guides** (`/essays/examples`, etc.)
- University/state **compare detail** slugs
- Scholarship **detail** (ES/FR → 404; gate not rendering translated body yet)

### UI chrome still English on EN-indexable pages

- Provider detail: `About Provider`, `Scholarships from this provider`, `providerSourceStatusLabel` / `providerDataCompletenessLabel` (not using `providerDisplayLabels`)
- Essay/resource article shells: `On this page`, date lines (`en-US` Intl)
- Provider detail: `Start IQ Test` → English IQ product

### IQ product (entire surface)

- No `/es` / `/fr` on IQ host
- No `LocaleUiPreference` / switcher on `app/iq/*`
- Question bank: `lib/cognitiveAssessmentQuestions.ts` (English prompts/options/explanations)
- Result UI: `components/iq/UnlockedIqReport.tsx`, `assessmentScoring.ts` domain labels
- Metadata: `openGraph.locale: 'en_US'` on IQ home

---

## 5. Classification (buckets)

| Bucket | Meaning | Stage 5A volume |
| --- | --- | --- |
| **UI_STATIC** | Labels, CTAs, section headings in code | High (provider detail, article chrome, IQ) |
| **TAXONOMY_LABEL** | Display labels; IDs unchanged | Medium (account selects — mostly done) |
| **DB_CONTENT** | Bodies from Supabase/CMS | **Very high** (providers, essays, compare, listings) |
| **ENTITY_NAME_ALLOWED** | Org names, scholarship titles, USD | Expected |
| **AUTH_PRIVATE** | Account, signin, onboarding | Mostly localized shell; test logged-in |
| **PRODUCT_COPY** | Subscription, IQ CTAs, premium | Mixed |
| **IQ_DYNAMIC** | Assessment + scored report copy | **All English** |
| **OUT_OF_SCOPE** | Lemon checkout, `/essay` mentor | Document only |

---

## 6. Account / private findings

| Route | Behavior | ES/FR |
| --- | --- | --- |
| `/account` | Redirects to signin when logged out | EN signin strings |
| `/es/account`, `/fr/account` | Same; localized signin redirect target | Shell: `accountUiCopy` |
| `/es/signin` | 200 | Card UI via `authUiCopy` |
| `/es/onboarding` | 200 | `onboardingUiCopy` |
| `/es/subscription/success` | 200 | Localized; **noindex** |

**Logged-in audit:** Not run (no session created). Stage 3M reported profile form, grant toggles, and billing labels largely localized via `accountProfileUiCopy`; verify with existing test account only.

**Safe to localize now (no auth logic change):** Remaining EN strings in validation toasts if any, subscription debug labels, English-only field-of-study fallbacks.

**Risky:** Supabase reset-password email URL (English path); OAuth callback messages; server-side API error strings.

**SEO:** All private routes **`noindex,follow`** — correct; not in ES/FR sitemaps.

---

## 7. Registration / onboarding findings

- Localized routes: `/es|fr/onboarding`, `/es|fr/signin/*`
- Create-account CTAs should target `/es|fr/onboarding?step=1` (Stage 3M href helpers)
- **Do not** create users in audit; manual funnel test recommended once per locale

---

## 8. IQ subdomain findings

| Question | Answer |
| --- | --- |
| Same repo? | **Yes** — `app/iq/*` in monorepo |
| Deploy | `iq.scholarshiptop.com` via `middleware.ts` rewrites to `/iq` routes |
| Auth | Shares Supabase client (IQ funnel email step) |
| Locale system? | **None** for IQ pages |
| Language switcher? | **No** (confirmed production) |
| Questions | `lib/cognitiveAssessmentQuestions.ts` — static English array |
| Results | Template English in `UnlockedIqReport`; scoring copy in `assessmentScoring.ts` |
| AI-generated result text? | **No** for core IQ score — computed/template; paywall/email flows separate |
| Indexable? | IQ URLs in sitemap `core` bucket → **separate host**; IQ legal pages indexable EN |

**Recommended IQ strategy (audit recommendation):**

1. Add `iqUiCopy` + optional `iqQuestions.{en,es,fr}.ts` (or JSON) — **no OpenAI** for v1.
2. Subdomain paths: prefer **`https://iq.scholarshiptop.com/?lang=es`** or **`/es/` prefix** via middleware rewrite (mirror main app `es`/`fr` pattern).
3. Language switcher in `IqProductFooter` / header — persist `LocaleUiPreference` cookie shared with main domain if feasible.
4. Force result templates per locale; do **not** rely on model language for v1.
5. Keep IQ assessment **noindex** if product-led; or index only landing/legal per locale.

**Risk:** High — IQ is revenue/brand surface; test scoring parity across locales.

---

## 9. Provider detail findings

**Example:** [Loyola provider (EN)](https://scholarshiptop.com/providers/loyola-university-chicago)

| Field | Classification |
| --- | --- |
| `display_name` | ENTITY_NAME_ALLOWED |
| `ai_description` | DB_CONTENT → `provider_profile` translations |
| HQ location line | Taxonomy/geo display (partially localized countries elsewhere) |
| Badges | UI_STATIC — still EN policy strings on detail page |
| Scholarships list cards | Listing chrome localized; **titles/descriptions EN** |
| FAQ / TOC labels | UI_STATIC |
| IQ CTA | UI_STATIC + cross-link to EN IQ |

**ES/FR URL:** **404** — no `app/[locale]/providers/[id]`. Correct until published `content_translations` + render path.

---

## 10. Essay detail findings

**Example:** [Gap expectation essay (EN)](https://scholarshiptop.com/essays/how-to-write-about-the-gap-between-expectation-and-reality-of-studying-in-america)

- **200** English CMS body (not static pilot guide).
- `/es/essays/{same-slug}` → **404**.
- Static pilots (`/es/essays/examples`, etc.) remain on Stage 2 static translation map — **separate** from DB long-tail.

**Strategy fork (Stage 5E):**

- **A:** Curate + translate high-traffic essays via `content_translations` (`essay_guide` or new type).
- **B:** Keep **404** under `/es|fr` until translated (current).
- **C:** `noindex` English-only long-tail — SEO policy decision.

---

## 11. Compare / resource detail findings

| Surface | EN | ES/FR |
| --- | --- | --- |
| Compare **hubs** | 200 | 200 + localized chrome + EnglishZoneNotice |
| Compare **detail** `/compare/universities/{slug}` | 200 EN DB | No localized detail route |
| Resource **pilot** | 200 | 200 + switcher |
| Resource **non-pilot** | 200 EN | 404 under `/es|fr` |

Compare detail pages use `app/compare/universities/[slug]/page.tsx` — full English narrative from DB/RPC. No hreflang to ES/FR for slugs.

---

## 12. SaaS / product findings

| Surface | ES/FR status |
| --- | --- |
| `/es/subscription` | Localized UI (`subscriptionPageCopy`) |
| Pricing nav | Localized (P0) |
| Hub IQ promo cards | Promo copy localized (`hubIqPromoByHub`); links → **English IQ** |
| Lemon checkout | **OUT_OF_SCOPE** — stays English |
| `/essay` mentor | **OUT_OF_SCOPE** |
| Account subscription card | Localized labels; portal URLs English |

---

## 13. SEO / noindex / sitemap

| Item | Status |
| --- | --- |
| `/en` | 404 ✓ |
| Private routes | noindex ✓ |
| ES/FR detail without translation | 404 ✓ (scholarship, provider, essay, compare slug) |
| Resource pilot | In locale sitemaps when published |
| IQ host in `core.xml` | English URLs only — separate property in GSC |
| Provider/essay EN detail | Indexable EN — hreflang only when translations published |

**Risk:** Publishing ES/FR URLs with English body (old pattern) — **not** occurring on probed routes (404 instead).

---

## 14. Risks

| Risk | Severity |
| --- | --- |
| IQ localization breaks scoring or timing | High |
| Provider DB translation at scale | Medium (quality, official names) |
| Auth funnel regression | Medium (test required) |
| Compare ES/FR policy (404 vs EnglishZone) | Medium SEO/product |
| User expectation mismatch (“site is translated”) | High comms |

---

## 15. Readiness scores (honest)

| Surface | Score |
| --- | ---: |
| Public static UI ES/FR | **88** |
| Scholarship hub ES/FR | **82** |
| Provider hub ES/FR | **78** |
| Provider detail ES/FR | **22** |
| Resource hub ES/FR | **74** |
| Resource detail ES/FR (pilot only) | **85** |
| Essay hub ES/FR | **86** |
| Essay detail / long-tail ES/FR | **12** |
| Compare hub ES/FR | **84** |
| Compare detail / long-tail ES/FR | **18** |
| Account / private ES/FR | **68** |
| Auth / onboarding ES/FR | **76** |
| Subscription / product ES/FR | **72** |
| **IQ subdomain ES/FR** | **5** |
| DB translation ES/FR overall | **18** |
| **Overall production ES/FR quality** | **58** |

---

## 16. Recommended next stage

**Start with Stage 5C (IQ)** — highest user-visible gap outside DB long-tail, isolated subdomain, no `content_translations` dependency for v1.

**Parallel Stage 5B** — provider detail UI chrome + any account gaps found in logged-in spot-check.

**Pause Stage 5D–5G DB batches** until:

- IQ locale architecture approved, and
- Provider detail render policy confirmed (404 vs translated shell).

Resource batch **5G (+25)** may continue **only** with monitoring — low coupling to IQ.

---

## 17. Artifacts

| File | Purpose |
| --- | --- |
| `i18n-stage5a-full-private-product-iq-gap-audit-2026-05-21.csv` | Full translation map (sample rows) |
| `i18n-stage5a-next-implementation-plan-2026-05-21.md` | Staged 5B–5G plan |
| `scripts/seo/i18n-stage5a-production-audit-run.ts` | Local probe helper (**not committed**) |

---

## Final answer

- **Do not implement** in this audit.
- **Exact next stage:** **5C (IQ subdomain ES/FR architecture + switcher + question/result dictionaries)** alongside **5B (provider detail UI chrome + account verification)**.
- **Pause new DB batches** (provider/essay/compare long-tail) until IQ and account/private gaps are addressed — **except** monitored resource +25 if ops wants continued content velocity.
