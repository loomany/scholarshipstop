# Stage 2 ES/FR Visual Parity Audit

Date: 2026-05-18

## Summary

The ES/FR pilot is technically correct for SEO, but the localized route layer currently renders most pages through a generic pilot component instead of the production English templates. This creates visible design drift: simplified hero, generic cards, different section order, different max-width, and less specialized page chrome than the English pages.

This audit maps the current implementation and the safest fix path. No code was changed before this audit was written.

## Implementation Map

| Page Type | English Route | English Template | Current ES/FR Template | Mismatch | Fix Approach | Risk |
|---|---|---|---|---|---|---|
| Homepage | `/` | `app/page.tsx` with full homepage sections and product preview components | `components/i18n/LocalizedPilotPage.tsx` | Generic article layout instead of production home page composition | Add a localized homepage renderer that mirrors the English homepage structure and uses existing homepage preview/trust components where safe | Medium: full homepage has many hard-coded English sections |
| Scholarships hub | `/scholarships` | `app/scholarships/[[...slugPath]]/page.tsx` + `scholarshipsSlugPathPageBody.tsx` + catalog bridge | `LocalizedPilotPage.tsx` | No production catalog shell, filters/search/listing area, or catalog-specific explanatory block | Add a localized catalog-style shell with the same visual hierarchy, localized explanatory blocks, and explicit non-long-tail scope | Medium: reusing full live catalog would expose English UI labels |
| Essays hub | `/essays` | `app/essays/page.tsx` command center + toolbar/cards | `LocalizedPilotPage.tsx` | Generic cards; does not match command center section structure | Add a localized essay hub shell that mirrors the command center groups and card layout | Low/medium |
| Providers hub | `/providers` | `app/providers/page.tsx` + `ProvidersHubPageContent` | `LocalizedPilotPage.tsx` | No provider directory toolbar/listing chrome or source-status trust section | Add a localized provider-directory shell with same trust/source concepts and production-like cards | Medium: live provider rows are DB-backed and English-labeled |
| Compare hub | `/compare` | `app/compare/page.tsx` evergreen compare section + matchup grid | `LocalizedPilotPage.tsx` | Generic hub instead of evergreen compare card band | Add localized compare hub shell matching the English evergreen structure | Low |
| Resources hub | `/resources` | `app/resources/page.tsx` resources index + static guide section | `LocalizedPilotPage.tsx` | Generic hub instead of resource cluster/index style | Add localized resources hub shell with production-like cluster cards | Low |
| Trust pages | Trust pages under root | `components/trust/TrustPageTemplate.tsx` | `LocalizedPilotPage.tsx` | ES/FR trust pages do not use the same trust hero/sidebar/card layout | Reuse `TrustPageTemplate` with localized content and localized links/copy props | Low |
| Essay guide pages | `/essays/[slug]` static guides | `components/essays/StaticEssayGuidePage.tsx` | `LocalizedPilotPage.tsx` | Similar content blocks, but not the exact English static guide template and labels | Reuse `StaticEssayGuidePage` with locale-aware labels/link mapping | Low |
| Compare guide pages | `/compare/[slug]` static compare guides | `components/compare/StaticCompareGuidePage.tsx` | `LocalizedPilotPage.tsx` | Similar table/cards, but not exact compare guide template and labels | Reuse `StaticCompareGuidePage` with locale-aware labels/link mapping | Low |

## Current Localized Routing

Localized pilot pages resolve through:

- `app/[locale]/[[...slugPath]]/page.tsx`
- `components/i18n/LocalizedPilotPage.tsx`
- `lib/i18n/staticTranslations/index.ts`

This architecture is SEO-safe but visually generic. The generic renderer is useful as a fallback, but it should not be the primary UI for Stage 2 pilot pages that have production English equivalents.

## Recommended Fix

Use production-style templates by page type:

1. Keep the existing locale route and static translation manifest.
2. Replace the generic renderer with page-type renderers:
   - Trust pages -> `TrustPageTemplate`
   - Essay guides -> `StaticEssayGuidePage`
   - Compare guides -> `StaticCompareGuidePage`
   - Homepage/hubs -> localized production-style shells that mirror the English section order and card language.
3. Add locale-aware props to the reusable English templates instead of duplicating the full layout.
4. Preserve all Stage 2 SEO rules:
   - English root URLs unchanged
   - `/en` absent
   - only ES/FR route prefixes launched
   - self-canonical localized URLs
   - `en/es/fr/x-default` hreflang only
   - query noindex
   - localized sitemap scope unchanged

## Do Not Do

- Do not pipe ES/FR routes directly into English pages unless the UI labels are localized.
- Do not translate scholarship/provider long-tail pages.
- Do not add new locale prefixes.
- Do not call OpenAI or translation APIs.
- Do not write to Supabase.
