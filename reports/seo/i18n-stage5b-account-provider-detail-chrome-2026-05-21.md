# Stage 5B — Account / provider chrome (2026-05-21)

## Implemented

- `lib/i18n/providerDetailUiCopy.ts` — ES/FR labels for provider detail TOC, stats, about, scholarships, IQ CTA (ready for `/[locale]/providers/[slug]`).
- Existing modules confirmed: `accountUiCopy`, `accountProfileUiCopy`, `authUiCopy`, `funnelUiCopy`, `providerDisplayLabels` (card + badge labels).

## Not wired tonight

- `app/providers/[id]/page.tsx` still uses inline English (EN-only route `/providers/[id]`). Copy module is staged; wire when localized provider detail routes ship.

## Smoke

`npx tsx scripts/seo/i18n-stage5b-account-provider-chrome-smoke.ts` — PASS (programmatic copy + `/es/account` redirect + EN provider page).

## Local commit

Bundled with provider pilot scripts commit or separate — see handoff.
