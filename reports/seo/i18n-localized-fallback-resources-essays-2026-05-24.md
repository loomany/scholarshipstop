# i18n localized fallback — Resources & Essays (2026-05-24)

## Summary

Localized resource and essay **detail** routes now return **200** with English body when a published English post exists but ES/FR translation is missing. UX uses localized shell + visible fallback notice. SEO: **noindex, follow**, canonical = English URL, no hreflang cluster pretending translation exists. Localized sitemaps unchanged (translated-only). No DB writes.

## SEO policy

| Case | HTTP | robots | canonical | hreflang | Localized sitemap |
|------|------|--------|-----------|----------|-------------------|
| Published translation (quality ≥ 85, title + body) | 200 | index, follow (per existing SEO gates) | localized self-URL | en/es/fr for available translations | Included when list gate passes |
| English exists, translation missing | 200 | **noindex, follow** | `/resources/{slug}` or `/essays/{slug}` | **None** (canonical only) | **Excluded** |
| English missing | 404 | — | — | — | — |

Fallback notice:

- **ES:** Esta página está disponible actualmente en inglés. La traducción al español está pendiente.
- **FR:** Cette page est actuellement disponible en anglais. La traduction française est en cours.

## What changed

### Resources

- `resolveLocalizedResourceArticlePage()` → `translated` | `englishFallback` | null (404).
- `app/[locale]/resources/[slug]/page.tsx` — metadata + render for fallback mode.
- `LocalizedResourceArticlePage` — fallback banner, `inLanguage: en` in JSON-LD when fallback.
- `ResourcesIndexPageContent` — ES/FR CMS cards always link to `/es|fr/resources/{slug}`.

### Essays

- `resolveLocalizedEssayGuidePage()` — same tri-state; `fetchPublishedEssayGuide` unchanged for sitemap/translated-only callers.
- Relaxed pilot-slug-only gate for **existence** (any published English essay can fallback).
- `app/[locale]/essays/[slug]/page.tsx`, `LocalizedEssayGuidePage` — parallel to resources.
- `EssaysIndexPageContent` — ES/FR cards always link to localized essay URLs.

### Chrome / 404

- `LocalizedNotFoundContent` — ES/FR copy on global `app/not-found.tsx`.
- Essay detail breadcrumbs use localized home label from `getResourceDetailUiCopy`.

### Shared

- `lib/i18n/englishFallbackNotice.ts`
- `lib/i18n/localizedContentFallbackMetadata.ts`

## Intentionally still English

- Article **title, summary, body, FAQ** on fallback pages.
- English scholarship/essay content in DB unchanged.
- Scholarship detail: still no fallback.
- Static Stage 2 resource guides: unchanged (`LocalizedProductionPage`).

## Files touched

- `lib/i18n/englishFallbackNotice.ts` (new)
- `lib/i18n/localizedContentFallbackMetadata.ts` (new)
- `lib/i18n/resourcePilot/resolveLocalizedResourcePage.ts`
- `lib/i18n/essayPilot/resolveLocalizedEssayGuide.ts`
- `lib/i18n/essayPilot/essayDetailTranslationGate.ts`
- `app/[locale]/resources/[slug]/page.tsx`
- `app/[locale]/essays/[slug]/page.tsx`
- `components/content-hub/LocalizedResourceArticlePage.tsx`
- `components/content-hub/ResourcesIndexPageContent.tsx`
- `components/essays/LocalizedEssayGuidePage.tsx`
- `components/essays/EssaysIndexPageContent.tsx`
- `components/i18n/LocalizedNotFoundContent.tsx` (new)
- `app/not-found.tsx`
- `lib/i18n/__tests__/localizedFallbackResourcesEssays.test.ts` (new)
- `scripts/seo/i18n-localized-fallback-resources-essays-smoke.ts` (new)
- `reports/seo/i18n-localized-fallback-resources-essays-audit-2026-05-24.md` (new)

## Tests

Run locally:

```bash
npx tsx --test lib/i18n/__tests__/localizedFallbackResourcesEssays.test.ts
npx tsc --noEmit
npm run build
```

Smoke (dev server):

```bash
npx tsx scripts/seo/i18n-localized-fallback-resources-essays-smoke.ts --base=http://localhost:3000
```

## Production smoke (post-deploy)

Verify manually after deploy:

- `/es/resources/scholarship-eligibility-requirements-usa` → 200, notice, noindex, canonical English
- `/es/resources/fake-does-not-exist` → 404, localized not-found copy
- `/en/...` → 404
- Localized resources-db sitemap does not list fallback-only slugs
- Same pattern for a known English-only essay slug on `/es/essays/...`

Record results in this file when production checks are run.
