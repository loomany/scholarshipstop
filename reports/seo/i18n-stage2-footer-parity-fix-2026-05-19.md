# Stage 2 Footer Parity Fix (ES/FR)

Date: 2026-05-19  
**No commit / no push.**

---

## Root cause

`SiteFooterNav.tsx` maintained **two separate link lists**:

| List | Count | Issue |
|------|-------|--------|
| `PRIMARY_LINKS` (English) | **14** links | Full trust + legal set |
| `LOCALIZED_FOOTER_LINKS` (es/fr) | **10** links | Subset of trust only |

ES/FR footer **omitted** (present in English, missing in localized list):

- `/help`
- `/privacy-policy`
- `/terms`
- `/refund-policy`
- `/faq`

ES/FR footer **added** a link **not** in English footer:

- `/scholarship-scam-warning` (Fraudes / Arnaques)

Labels also diverged from spec (e.g. ES “Recomendaciones” vs “Clasificación”, FR “Revenus” vs full “Comment nous gagnons de l'argent”).

`localizedPilotHref()` was already applied to hrefs, but the **wrong canonical paths** were in the localized array.

---

## Solution

### `lib/i18n/localizedFooterLinks.ts`

Single registry + `getFooterLinks(locale)`:

- One ordered definition list (14 canonical paths)
- Labels per `en` | `es` | `fr`
- `href` via `localizedPilotHref`
- `available`: for `es`/`fr`, requires `getLocalizedPilotPage(locale, path)` (all 14 exist in static translations)
- Omits links when translation missing (none today)
- Never emits `/en/...` or unsupported locale prefixes

### `components/ui/Footer/SiteFooterNav.tsx`

- Removed `PRIMARY_LINKS` and `LOCALIZED_FOOTER_LINKS`
- Renders `getFooterLinks(locale)` only
- Active state via `isFooterLinkActive(canonicalPath, pathname)`

`SiteFooter.tsx` unchanged structurally (logo + nav + tagline).

---

## Links added for ES/FR (were missing)

| Canonical path | ES label | FR label |
|----------------|----------|----------|
| `/help` | Ayuda | Aide |
| `/privacy-policy` | Política de privacidad | Politique de confidentialité |
| `/terms` | Términos de servicio | Conditions d'utilisation |
| `/refund-policy` | Política de reembolso | Politique de remboursement |
| `/faq` | Preguntas frecuentes | FAQ |

## Link removed from ES/FR (English parity)

| Path | Was |
|------|-----|
| `/scholarship-scam-warning` | ES “Fraudes”, FR “Arnaques” — not in English footer |

## Label updates (ES/FR)

| Path | Before (ES/FR) | After |
|------|------------------|-------|
| `/how-we-rank-scholarships` | Recomendaciones / Recommandations | Clasificación / Classement |
| `/financial-aid-disclaimer` | Aviso financiero / Avertissement | Aviso legal / Avertissement |
| `/how-we-make-money` | (ok ES) / Revenus | Cómo ganamos dinero / Comment nous gagnons de l'argent |

---

## Before / after

| Locale | Before | After |
|--------|--------|-------|
| `en` | 14 links | **14** (unchanged paths/labels) |
| `es` | 10 + scam warning | **14** with `/es/...` |
| `fr` | 10 + scam warning | **14** with `/fr/...` |

Example:

- Before ES Terms: *(missing)*
- After ES Terms: `Términos de servicio` → `/es/terms`

---

## Files changed

| File | Change |
|------|--------|
| `lib/i18n/localizedFooterLinks.ts` | **New** — registry + `getFooterLinks` |
| `lib/i18n/__tests__/localizedFooterLinks.test.ts` | **New** — 7 tests |
| `components/ui/Footer/SiteFooterNav.tsx` | Use registry |

---

## Tests & build

```text
npx tsx --test lib/i18n/__tests__/*.test.ts  → 45/45 pass
npx tsc --noEmit                             → pass
npm run build                                → pass
```

---

## Manual checks (recommended)

From `/es`: About → `/es/about`, Terms → `/es/terms`, FAQ → `/es/faq`  
From `/fr`: same with `/fr` prefix  
From `/`: English unprefixed paths  

Viewports: 375 / 768 / 1280+ — footer uses `flex-wrap`; 14 links fit in 1–2 rows.

---

## SEO (unchanged)

- English URLs unchanged
- `/en` → 404
- ES/FR self-canonical + hreflang
- Sitemap scope unchanged
- No long-tail translations added

---

## Not touched

- Auth, payments, subscription, onboarding
- Navbar link sets (separate from footer)
- OpenAI / Supabase
- New languages or `/en` routes

---

## Sign-off

- [x] ES footer same count/structure as English
- [x] FR footer same count/structure as English
- [x] Locale-aware hrefs via `localizedPilotHref`
- [x] No `/en` links
- [x] All 14 footer paths have es/fr static pages
- [x] Tests + build pass
- [x] No commit / no push
