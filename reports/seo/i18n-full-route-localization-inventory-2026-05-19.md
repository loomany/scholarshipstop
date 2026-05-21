# Stage A — Full route localization inventory (2026-05-19)

This inventory groups every public/funnel/private route in `app/**` into the
three zones requested by the brief:

- **Zone A — Public SEO**: indexable or potentially indexable; must be fully
  translated for ES/FR, with canonical/hreflang/sitemap rules.
- **Zone B — Public conversion / product funnel**: marketing-adjacent flows
  reachable from public pages (quiz, auth, paywall). UI must be translated;
  pages may be `noindex, follow`.
- **Zone C — Private / authenticated UI** and **Zone C₂ — DB-backed long-tail**:
  audit-only in this round.

For each route the **"Should translate now?"** column reflects what was actually
shipped in this Stage A→L pass (see end-of-doc execution summary).

## Legend

- Index / noindex columns refer to `<meta robots>`. "noindex,follow" means
  the page can still pass link equity but won't appear in SERPs.
- "Locale-persist" = clicking links from `/es/...` or `/fr/...` must keep the
  user inside `/es/...` or `/fr/...`.

## Zone A — Public SEO pages

| Route | Type | ES exists | FR exists | Translate now? | Index? | noindex? | Locale-persist? | Risk | Fix plan |
|---|---|---|---|---|---|---|---|---|---|
| `/` (home) | Static SEO | ✅ `/es` | ✅ `/fr` | Done | ✅ | — | ✅ | None | Stage 2 pilot live |
| `/scholarships` | Hub (client) | ✅ `/es/scholarships` | ✅ `/fr/scholarships` | Done | ✅ | — | ✅ | Medium (client hub) | Best-recommendation default fixed in 2026-05-19 patch |
| `/scholarships/hub/*` | Hub deep tabs | ❌ | ❌ | No (Stage C₂ DB-backed UX) | ✅ EN | — | EN only | Low | Hidden on ES/FR nav; allowed English-only |
| `/scholarships/[state]/[university]` | DB long-tail | ❌ | ❌ | No (DB plan) | ✅ EN | — | EN only | High | See `i18n-db-content-translation-plan-2026-05-19.md` |
| `/scholarships/category/[slug]` | DB long-tail | ❌ | ❌ | No (DB plan) | ✅ EN | — | EN only | Medium | DB plan |
| `/scholarships/[[...slugPath]]` | DB long-tail | ❌ | ❌ | No (DB plan) | ✅ EN | — | EN only | Medium | DB plan |
| `/essays` | Hub | ✅ `/es/essays` | ✅ `/fr/essays` | Done | ✅ | — | ✅ | None | Stage 2 pilot live |
| `/essays/{examples,checklist,financial-need,career-goals,mistakes}` | Guide | ✅ | ✅ | Done | ✅ | — | ✅ | None | Stage 2 pilot live |
| `/essays/[slug]` (DB) | DB long-tail | ❌ | ❌ | No (DB plan) | ✅ EN | — | EN only | High | DB plan |
| `/providers` | Hub | ✅ `/es/providers` | ✅ `/fr/providers` | Done | ✅ | — | ✅ | None | Stage 2 pilot live |
| `/providers/[id]` | DB long-tail | ❌ | ❌ | No (DB plan) | ✅ EN | — | EN only | High | DB plan |
| `/compare` | Hub | ✅ `/es/compare` | ✅ `/fr/compare` | Done | ✅ | — | ✅ | None | Stage 2 pilot live |
| `/compare/{scholarship-vs-grant, merit-vs-need-based-scholarships, no-essay-vs-essay-scholarships, local-vs-national-scholarships}` | Guide | ✅ | ✅ | Done | ✅ | — | ✅ | None | Stage 2 pilot live |
| `/compare/states[/...]`, `/compare/universities[/...]`, `/compare/[slug]` | DB long-tail | ❌ | ❌ | No (DB plan) | ✅ EN | — | EN only | High | DB plan |
| `/resources` | Hub | ✅ `/es/resources` | ✅ `/fr/resources` | Done | ✅ | — | ✅ | None | Stage 2 pilot live |
| `/resources/{combine-multiple-scholarships, how-to-apply-for-scholarships, medical-scholarships-guide, scholarship-deadlines-explained, scholarships-for-international-students-guide}` | Static guide | ✅ | ✅ | Done | ✅ | — | ✅ | None | Stage 2 pilot live |
| `/resources/[slug]` (DB CMS) | DB long-tail | ❌ | ❌ | No (DB plan) | ✅ EN | — | EN only | High | DB plan |
| `/about`, `/editorial-policy`, `/scholarship-verification-methodology`, `/how-we-rank-scholarships`, `/how-scholarshiptop-works`, `/financial-aid-disclaimer`, `/contact`, `/corrections`, `/scholarship-scam-warning`, `/how-we-make-money` | Trust | ✅ | ✅ | Done | ✅ | — | ✅ | None | Stage 2 pilot live |
| `/terms`, `/privacy-policy`, `/refund-policy`, `/faq`, `/help` | Legal | ✅ | ✅ | Done | ✅ | — | ✅ | None | Stage 2 pilot live |
| `/for-organizations` | Marketing | ❌ | ❌ | No (B2B) | ✅ EN | — | EN only | Low | Hidden from ES/FR nav |
| `/international-students` | Marketing | ❌ | ❌ | No | ✅ EN | — | EN only | Low | Could ship next; not a P0 |
| `/submit-grant` | Marketing | ❌ | ❌ | No | ✅ EN | — | EN only | Low | Internal/B2B |
| `/scholarship-verification-methodology`, `/how-we-rank-scholarships`, `/how-we-make-money`, etc. | Trust (see above) | ✅ | ✅ | Done | ✅ | — | ✅ | None | — |
| `/iq/*` | Sub-brand | ❌ | ❌ | No (separate product) | ✅ EN | — | EN only | Low | Allowed explicit English |

## Zone B — Public conversion / product funnel pages

| Route | Type | ES exists | FR exists | Translate now? | Index? | noindex? | Locale-persist? | Risk | Fix plan |
|---|---|---|---|---|---|---|---|---|---|
| `/get-scholarships` (quiz wizard) | Funnel | **✅ new `/es/get-scholarships`** | **✅ new `/fr/get-scholarships`** | **Yes, this pass** | — | ✅ `noindex,follow` | ✅ | Medium | New `app/[locale]/get-scholarships/{layout,page}.tsx` reuses production component with `locale` prop; redirects to `/es|fr/scholarships` post-submit |
| `/signin` (index → default view) | Funnel | **✅ new `/es/signin`** | **✅ new `/fr/signin`** | **Yes, this pass** | — | ✅ `noindex,follow` | ✅ | Medium | `app/[locale]/signin/page.tsx` mirrors `SignInIndexClient` with locale-aware redirect target |
| `/signin/{password_signin,email_signin,forgot_password,update_password,signup}` | Funnel | **✅ new `/es/signin/[id]`** | **✅ new `/fr/signin/[id]`** | **Yes, this pass** | — | ✅ `noindex,follow` | ✅ | Medium-high (Supabase callback shared) | `app/[locale]/signin/[id]/page.tsx` reuses `<Card>`, `<PasswordSignIn>`, `<EmailSignIn>`, `<ForgotPassword>`, `<SignUp>` with `locale` prop. Visible labels switched to dictionary `lib/i18n/authUiCopy.ts` |
| `/signup` | Server redirect → `/onboarding` | — | — | No (server redirect) | — | n/a | — | Low | Locale-aware redirect not added; onboarding is private (Zone C). EN redirect is preserved |
| `/login`, `/register` | **Do not exist** | — | — | — | — | — | — | — | The project uses `/signin` only — we do not invent `/login` per brief |
| `/forgot-password`, `/reset-password` | **Do not exist as top-level** | — | — | — | — | — | — | — | Lives under `/signin/forgot_password` and `/auth/reset_password` |
| `/auth/reset_password` | Auth callback page | ❌ | ❌ | No (shared deep-link from email) | — | ✅ `noindex,follow` | EN only | Medium | Sentinel page used by Supabase recovery email; do not duplicate per locale |
| `/auth/callback`, `/auth/register-conversion`, `/auth/verify-email` | Auth route handler | — | — | No | — | n/a | EN only | High (touching breaks auth) | Off-limits per constraints |
| `/subscription` | Paywall + billing | ❌ | ❌ | **No — Stage D Option B** | ✅ EN (current) | — | EN only | High (mixed billing state) | Hidden from ES/FR nav; ES/FR links to `/subscription` are **blocking** in link audit. See Stage D decision below. |
| `/subscription/success` | Billing post-checkout | ❌ | ❌ | No | — | ✅ `noindex` | EN only | High | Off-limits |
| `/pricing` | **Does not exist** | — | — | — | — | — | — | — | The pricing surface lives at `/subscription`. We hide "Precios/Tarifs" from ES/FR nav; no silent EN link |
| `/essay` (Essay Mentor) | Paid product | ❌ | ❌ | No (DB-driven mentor) | ✅ EN | — | EN only | High | Allowed English-only; hidden from ES/FR Essay-Guides flyout |
| `/essay/[id]` | Paid product | ❌ | ❌ | No | — | ✅ `noindex` | EN only | High | Off-limits |
| `/unsubscribe` | Email link | — | — | No | — | ✅ `noindex` | EN only | Low | Functional, not user-facing nav |
| `/tools/*` | Public tools | ❌ | ❌ | No | ✅ EN | — | EN only | Low | Could ship later; not P0 |

## Zone C — Private / account UI (audit only)

| Route | Type | Visible English on ES/FR? | Public or private? | Localize now? | Risk | Recommended stage |
|---|---|---|---|---|---|---|
| `/account` | Account dashboard | Yes (full EN) | Private (requires session) | No | High (RLS, saved filters, etc.) | Future Stage M (account-only translation pass) |
| `/account/saved-scholarships` | Saved list | Yes | Private | No | High | Future |
| `/dashboard` | Legacy account dashboard | Yes | Private | No | Medium | Future / dedupe with `/account` |
| `/onboarding` | Multi-step signup | Yes (some shared labels translated via `funnelUiCopy`) | Private | Partial only (shared CountryFirstStep / CountryEmailSignupStep) | High (writes to `profiles`) | Future Stage M |
| `/profile`, `/settings` | **Do not exist** | — | — | — | — | — |
| `/saved-scholarships` (legacy) | Redirect to `/account/saved-scholarships` | — | Private | No | Low | Future |
| `/essays/u/[id]` | User essay editor | Yes | Private | No | High | Future |
| `/start` | Marketing intro | Yes | Public | No | Low | Future |

## Zone C₂ — DB-backed long-tail (audit only)

See `reports/seo/i18n-db-content-translation-plan-2026-05-19.md`.

Routes intentionally left in English:
- `/scholarships/[state]/[university]`, `/scholarships/category/[slug]`, `/scholarships/[[...slugPath]]`
- `/providers/[id]`
- `/resources/[slug]` (DB CMS)
- `/essays/[slug]` (DB)
- `/compare/[slug]`, `/compare/states/[slug]`, `/compare/universities/[slug]`

## API / route handlers / sitemaps — out of scope

- `/api/**` — not user-facing; not localized.
- `/sitemap.xml`, `/sitemaps/[slug]` — see `lib/i18n/localizedSitemaps.ts` for locale handling.

## Execution summary (what shipped in this pass)

- **New routes**: `app/[locale]/get-scholarships/{layout,page}.tsx`,
  `app/[locale]/signin/{page,layout}.tsx`, `app/[locale]/signin/[id]/page.tsx`.
- **Shared components updated to accept `locale`**:
  - `components/get-scholarships/GetScholarshipsQuizWizard.tsx`
  - `components/onboarding/CountryFirstStep.tsx`
  - `components/onboarding/CountryEmailSignupStep.tsx`
  - `components/ui/AuthForms/{PasswordSignIn,EmailSignIn,ForgotPassword,Signup}.tsx`
- **Locale-aware Nav**: `components/ui/Navbar/NavbarUserSlot.tsx` now points
  unauthenticated ES/FR users at `/es/signin` and `/fr/signin`.
- **Locale-aware Home CTA**: `components/navigation/useScholarshipEntryHref.ts`
  routes guests on `/es`/`/fr` to `/es/get-scholarships` / `/fr/get-scholarships`.
- **Audit allowlist**: `isExplicitEnglishOnlyInternalLink` no longer accepts
  `/get-scholarships` or `/signin/*` as "allowed English" — those have
  localized equivalents now and ES/FR links to them are **blocking**.
- **New copy dictionaries**: `lib/i18n/authUiCopy.ts`,
  `lib/i18n/funnelUiCopy.ts`.

## Pricing decision (Stage D)

We chose **Option B — keep hidden**. Rationale:

- `/subscription` is **not** a flat marketing/pricing page: it dynamically
  derives state from `getSubscription` + Lemon Squeezy `raw_payload` and renders
  manage / update-payment / billing-fix CTAs based on signed-in user state.
- Lemon webhook handling, `subscriptionEntitlements`, and the billing fix
  URL pipeline are explicitly off-limits per constraints.
- Producing a "safe public pricing snapshot" at `/es/subscription` would
  require either (a) duplicating server-side state derivation in a new
  marketing-safe component (significant new surface), or (b) shipping a
  Lemon-coupled localized page (forbidden).
- The Nav already hides "Pricing / Precios / Tarifs" on ES/FR (see
  `components/ui/Navbar/Navlinks.tsx` `locale === 'en'` gating).
- ES/FR pages MUST NOT link to `/subscription` silently — link audit treats
  this as **blocking** (`scripts/i18n-locale-link-audit.ts`).

Pricing/subscription will revisit only when a flat marketing snapshot is split
from the billing-coupled page.
