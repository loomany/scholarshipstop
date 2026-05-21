# Stage 5C-1 — IQ Middleware, Locale Infra, and Language Switcher

**Date:** 2026-05-21  
**Scope:** Routing + switcher foundation only (no question/report translation, no Supabase/auth/Lemon changes).  
**Not committed / not pushed** (per instructions).

---

## Summary

Fixed the critical bug where `iq.scholarshiptop.com/es` and `/fr` served the main ScholarshipTop localized hub. IQ host requests now rewrite into `app/iq/*` with `x-iq-locale` set. A pathname-driven language switcher and shell copy placeholders were added for ES/FR.

---

## Files changed

| File | Change |
|------|--------|
| `middleware.ts` | IQ host block via `handleIqSubdomainMiddleware`; `requestHostname()` uses `x-forwarded-host` then `host`; blocks main-site `[locale]` pass-through on IQ host |
| `lib/iq/i18n/iqLocales.ts` | `IQ_LOCALES`, `IQ_SUBDOMAIN_HOST`, helpers |
| `lib/iq/i18n/iqPaths.ts` | Path parse/strip, internal rewrite map, product path detection |
| `lib/iq/i18n/iqLocalizedHref.ts` | `getIqLocalizedHref`, `getIqLanguageSwitcherItems` |
| `lib/iq/i18n/iqMiddleware.ts` | Subdomain rewrite + locale header |
| `lib/iq/i18n/getIqLocaleFromRequest.ts` | Server header reader |
| `lib/iq/i18n/iqShellCopy.ts` | Shell-only ES/FR placeholders |
| `lib/iq/i18n/__tests__/iqPaths.test.ts` | Unit tests (6) |
| `app/layout.tsx` | IQ host uses `x-iq-locale` for `lang` / layout locale |
| `app/iq/layout.tsx` | `IqLocaleProvider`, shell notice, SSR locale marker |
| `components/iq/IqLocaleProvider.tsx` | Client context |
| `components/iq/IqLanguageSwitcher.tsx` | Switcher UI |
| `components/iq/IqLocaleShellNotice.tsx` | ES/FR “translation coming” banner |
| `components/ui/Navbar/Navbar.tsx` | Passes `isIqSubdomainHost` + `iqLocale` to nav |
| `components/ui/Navbar/Navlinks.tsx` | IQ minimal nav + switcher |
| `scripts/seo/i18n-stage5c-1-iq-locale-smoke.ts` | Local smoke (uses `x-forwarded-host`) |

---

## Middleware behavior

**Host detection:** `x-forwarded-host` (first value) then `Host`, port stripped — matches production behind Cloudflare and local smoke.

**IQ host only (`iq.scholarshiptop.com`):**

1. `/iq` or `/iq/*` → 308 redirect to unprefixed public path  
2. `/en` or `/en/*` → 308 redirect stripping `/en` (no `/en` product URLs)  
3. Parse optional locale prefix (`es`, `fr`) → `pathnameWithoutLocale`  
4. Known IQ paths → **rewrite** to `/iq…` + set `x-iq-locale`  
5. Unknown path with `es`/`fr` prefix → rewrite to `/iq` (avoid `app/[locale]` hub)  
6. Other paths → `next()` with `x-iq-locale: en`

**Main site:** `isStage2PilotLocale` skipped when `host === IQ_SUBDOMAIN_HOST`.

**Header:** `x-iq-locale` = `en` | `es` | `fr`

---

## Route table (public URL → internal)

| Public (IQ subdomain) | Internal rewrite | Locale |
|----------------------|------------------|--------|
| `/` | `/iq` | `en` |
| `/es` | `/iq` | `es` |
| `/fr` | `/iq` | `fr` |
| `/assessment` | `/iq/assessment` | `en` |
| `/es/assessment` | `/iq/assessment` | `es` |
| `/fr/assessment` | `/iq/assessment` | `fr` |
| `/report/{token}` | `/iq/report/{token}` | `en` |
| `/es/report/{token}` | `/iq/report/{token}` | `es` |
| `/about`, `/help`, `/faq`, … | `/iq/...` | per prefix |
| `/en`, `/en/assessment` | 308 → `/`, `/assessment` | — |
| `/scholarships` (etc.) | `next()` (unchanged) | `en` |

**www `scholarshiptop.com/iq`:** Unchanged (no locale prefix on main domain in this stage). ES/FR switcher links from www IQ pages point to `https://iq.scholarshiptop.com/es` (absolute).

---

## Language switcher

- **Location:** IQ minimal navbar (`Navlinks` when IQ product page)
- **Links:** `/` · `/es` · `/fr` (subdomain); preserves subpath (`/assessment` → `/es/assessment`)
- **Active locale:** Pathname (and server `iqLocale` prop on IQ host), not localStorage
- **No `/en` links**

---

## Shell copy (placeholders only)

`iqShellCopy.ts`: switcher label, language names, nav aria, ES/FR shell notice banner.  
**Not translated:** 30 questions, landing marketing body, paywall, report, legal pages.

---

## Build / typecheck / smoke

| Check | Result |
|-------|--------|
| `npm run build` | Pass |
| `npx tsc --noEmit` | Pass |
| `node --import tsx --test lib/iq/i18n/__tests__/iqPaths.test.ts` | 6/6 pass |
| `npx tsx scripts/seo/i18n-stage5c-1-iq-locale-smoke.ts` (port 8788, `x-forwarded-host`) | All paths pass |

Smoke paths: `/`, `/es`, `/fr`, `/assessment`, `/es/assessment`, `/en` (308).

**Local testing note:** Node `fetch` cannot override `Host`; use `x-forwarded-host: iq.scholarshiptop.com` or real DNS to the IQ host.

---

## Known remaining English surfaces

- Full landing copy (`ScholarshipIqTestClient.tsx`)
- All 30 cognitive questions and options
- Assessment intro/progress/analyzer UI
- Email step / paywall / unlocked report
- Contextual assessment funnel + strategy engine
- Legal pages and 5 SEO slug landings
- Main `SiteFooter` (scholarship links) still renders on IQ pages

---

## Final verdict

| Question | Answer |
|----------|--------|
| **Ready for push/deploy?** | **Yes** — after your review; routing fix is low-risk and English `/` behavior preserved. Recommend deploy before 5C-2 so production `/es`/`/fr` stop serving the main hub. |
| **Ready for question translations (5C-2)?** | **Yes** — locale plumbing and switcher are in place; next step is localized question banks + `AssessmentEngine` wiring. |

---

## Intentionally untouched

- Lemon checkout, auth, Supabase, scoring, question bank content, report templates, `assessment_result` storage shape
