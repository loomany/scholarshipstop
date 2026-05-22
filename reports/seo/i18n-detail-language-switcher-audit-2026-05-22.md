# Detail language switcher audit — 2026-05-22

**Base URL:** https://scholarshiptop.com  
**Script:** `scripts/seo/i18n-detail-language-switcher-audit.ts`  
**Note:** Navbar uses `LanguageSwitcher` `variant="dropdown"` (client). Static HTML fetch only reliably sees locale anchors on **inline** switchers (e.g. localized resource article shell). Post-fix behavior validated programmatically via `getDetailLanguageSwitcherItems` / `getStage2LanguageSwitcherItems`.

## Findings (production snapshot — largely pre-deploy HTML)

| Route | HTTP | Switcher in HTML | Expected after `885dcaf` |
|-------|------|------------------|---------------------------|
| `/scholarships/climate-stripes-scholarship-14487` | 200 | None in HTML | Navbar: EN only (no ES/FR links) |
| `/es/scholarships/climate-stripes-scholarship-14487` | 404 | — | 404 until `scholarship_detail` published |
| `/providers/loyola-university-chicago` | 200 | None in HTML | Navbar: EN/ES/FR |
| `/es/providers/loyola-university-chicago` | 200 | None in HTML | Page + navbar clusters |
| `/fr/providers/harvard-university` | 200 | None in HTML | Page + navbar clusters |
| `/resources/how-to-apply-for-scholarships` | 200 | None | EN resource (no pilot switcher on EN) |
| `/es/resources/how-to-apply-for-scholarships` | 200 | en, es, fr | OK (inline) |
| `/es/resources/verify-scholarship-winners-usa-previous-years` | 404 | — | OK gate |
| `/essays/how-to-write-about-the-gap-…` | 200 | None | EN-only cluster (no DB essay pilot) |
| `/es/essays/how-to-write-about-the-gap-…` | 404 | — | OK |
| `/compare/universities/harvard-…-vs-mit` | 404 | — | No compare detail pilot |
| `/en` | 404 | — | OK |

## Root cause (code)

1. `getStage2LanguageSwitcherItems` did not map scholarship/provider detail paths.
2. `LanguageSwitcher` hid when `items.length <= 1` (scholarship EN-only never showed).
3. `detailLanguageSwitcher` did not `stripLocalePrefix` for `/es/providers/…` paths.

## Fix (`885dcaf`)

- `lib/i18n/detailLanguageSwitcher.ts` — clusters for provider pilot, resource pilot, scholarship (EN-only until published set), essay long-tail (EN-only; excludes Stage 2 static essay paths).
- `LanguageSwitcher` — render when `items.length > 0`.
- Stage 2 static essay paths (e.g. `/essays/checklist`) still use full EN/ES/FR pilot cluster.

## Rules verified (programmatic)

- No `/en` hrefs in clusters.
- ES/FR scholarship detail without translation → not linked (404 route).
- Provider pilot → three locales when slug in `PROVIDER_PILOT_SLUGS`.

## Post-deploy manual check

1. Open EN scholarship detail → header language control visible, English selected, no ES/FR options.
2. Open EN provider pilot → EN/ES/FR in dropdown.
3. Open ES resource pilot → three inline links, correct `hreflang` paths (no `/en`).
