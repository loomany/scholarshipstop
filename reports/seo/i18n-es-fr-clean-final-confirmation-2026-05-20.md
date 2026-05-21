# ES/FR Clean Final Confirmation (2026-05-20)

**Purpose:** Single source of truth before push. No contradictory stale notes.

**Constraints honored:** No commit, no push, no Supabase writes, no migrations, no auth/payment/Lemon logic changes, no new locales, no `/en` route, no product code changes in this confirmation run.

**QA environment**

| Item | Value |
| --- | --- |
| Build | `Remove-Item .next` → `npm run build` (twice: before server + final) |
| Server | `npx next start -p 3020` |
| Base URL | `http://localhost:3020` |
| App identity | Homepage HTML contains **ScholarshipTop**; `/en` → **404** |

---

## 1. Build / typecheck / unit tests

| Check | Result |
| --- | --- |
| `npm run build` (clean `.next`, pre-server) | **PASS** |
| `npm run build` (post-audits) | **PASS** |
| `npx tsc --noEmit` | **PASS** |
| `npx tsx --test lib/i18n/__tests__/*.test.ts` | **PASS — 54/54** |

---

## 2. Playwright audit trio (full mode, `LINK_AUDIT_CLICKS_ONLY` unset)

All runs used `SCREENSHOT_BASE_URL=http://localhost:3020`.

| Audit | Result | Evidence |
| --- | --- | --- |
| **Visible text** | **PASS** | 124 pages; **0** blocking EN UI; **0** blocking placeholder/aria/title; **0** blocking links; **0** errors — `reports/seo/i18n-visible-text-audit-2026-05-19.md` (base URL line shows `:3020`) |
| **Locale links** | **PASS** | 118 pages crawled; **0** blocking; **18/18** click tests passed; 452 allowed Zone C — `reports/seo/i18n-locale-link-audit-2026-05-19.json` |
| **Language switcher** | **PASS** | **51/51** pages; **0** blocking — run `generatedAt: 2026-05-21T10:09:32.596Z`, `baseUrl: http://localhost:3020` |

Funnel paths included in visible-text run: `/es|fr/onboarding`, `/es|fr/subscription/success`, `/es|fr/account`, get-scholarships, signin cluster, subscription.

---

## 3. Hreflang smoke (`i18n-build-smoke-check.ts`)

**Result: PASS — 21/21** (including previously failing paths).

### Indexable scholarships roots (required)

| Path | HTTP | Self canonical | hreflang en | hreflang es | hreflang fr | x-default | noindex in HTML |
| --- | ---: | --- | :---: | :---: | :---: | :---: | :---: |
| `/scholarships` | 200 | `https://scholarshiptop.com/scholarships` | Yes | Yes | Yes | Yes | No |
| `/es/scholarships` | 200 | `https://scholarshiptop.com/es/scholarships` | Yes | Yes | Yes | Yes | No |
| `/fr/scholarships` | 200 | `https://scholarshiptop.com/fr/scholarships` | Yes | Yes | Yes | Yes | No |

No `/en` URL in cluster. `/en` and `/de` paths return **404** (smoke script verified).

### Other routes (200 / policy)

| Path | HTTP | Notes |
| --- | ---: | --- |
| `/es/onboarding` | 200 | `noindex` in HTML (private funnel — expected) |
| `/fr/onboarding` | 200 | same |
| `/es/subscription/success` | 200 | `noindex` (post-checkout — expected) |
| `/fr/subscription/success` | 200 | same |
| `/es/account` | 200 | Unauthenticated → serves sign-in flow; `noindex` (private) |
| `/fr/account` | 200 | same |
| `/onboarding` | 200 | EN canonical funnel; `noindex` |
| `/signup` | — | Server redirect to `/onboarding` (EN); not indexable |

Private routes correctly omit hreflang cluster in static HTML; they are not sitemap/index targets.

---

## 4. Known intentional gaps (not push blockers)

| Gap | Status |
| --- | --- |
| **Lemon hosted checkout** | Remains **English** (external UI) |
| **`/essay` product** | Remains **English**; Zone C links allowed in audits |
| **DB long-tail** (scholarship slugs, provider names) | Remains **English**; Zone C in locale-link audit |
| **Hub tab hreflang** (`/scholarships/hub/*`, `/es|fr/.../hub/*`) | **Pre-existing gap:** canonical only, **no** hreflang in initial HTML on EN, ES, or FR (verified on `best-recommendation`) |
| **`/signup` → `/onboarding`** | **EN-only** redirect unchanged |
| **Supabase reset email URL** | Still **`/auth/reset_password`**; after visiting `/es` or `/fr`, UI + redirects use `sessionStorage` locale |
| **Field-of-study** select (account) | Partial EN fallback for unmapped slugs |
| **Resources ES/FR DB grid** | Hidden by design (`locale === 'en'` guard) |

---

## 5. Git safety

| Check | Result |
| --- | --- |
| `.env` / secrets in `git status` | **None matched** |
| Supabase migrations in diff | **None** |
| `app/api/billing/**`, `lib/payments/**`, `app/actions/billing.ts` | **No diff** |
| `/en` route in diff | **None** |
| New locales | **None** (es, fr pilot only) |
| Working tree size | **~193** lines in `git status --short` (Stage 2/3M i18n work, untracked reports/scripts) |
| `git diff --stat` (tracked) | **97 files**, +2899 / −3761 lines — i18n UI/metadata; `SubscriptionPricingClient.tsx` is **copy-only** (no billing API change) |

No DB writes performed during this confirmation.

---

## 6. Final verdict

### **READY for ES/FR UI pilot push**

All automated gates on **`http://localhost:3020`** passed in this run:

- Production build (×2), tsc, 54 unit tests  
- Playwright trio: 0 blocking  
- Hreflang smoke: **including `/es/scholarships` and `/fr/scholarships`**  
- `/en` → 404; app confirmed ScholarshipTop  

**Not included in this release:** DB SEO translation, `/essay` localization, hub-tab hreflang, Lemon checkout localization.

**Recommended manual smoke after deploy:** `/es/onboarding?step=1`, `/es/account` (signed in), `/es/subscription/success`, Lemon checkout overlay (expect EN).

---

*Confirmation run completed 2026-05-21. Reports filename date 2026-05-20 per request. Do not commit or push per instructions.*
