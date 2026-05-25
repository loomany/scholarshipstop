# i18n localized fallback — Resources & Essays audit (2026-05-24)

## Problem (manual QA)

On `/es/resources`, CMS article cards linked to `/es/resources/{slug}`. When `content_translations` had no published ES/FR row, the localized detail route returned **404**, while English worked at `/resources/{slug}`.

Example: `scholarship-eligibility-requirements-usa` — English 200, `/es/resources/...` and `/fr/resources/...` 404.

Same pattern on `/es/essays/{slug}` and `/fr/essays/{slug}` for English-only essay guides.

## Route inventory (pre-change)

| Surface | English | ES/FR localized | Gate before fix |
|--------|---------|-----------------|-----------------|
| Resources hub | `/resources` | `/es/resources`, `/fr/resources` | Hub chrome localized; CMS cards linked to `/es/...` only when translation id in set |
| Resource detail (CMS) | `/resources/[slug]` | `/[locale]/resources/[slug]` | `fetchPublishedResourceTranslation` → 404 if no published translation |
| Resource detail (static Stage 2) | `/resources/{guide}` | `/es/resources/{guide}` via `LocalizedProductionPage` | Static pilot pages unchanged |
| Essays hub | `/essays` | `/es/essays`, `/fr/essays` | Cards linked localized only when translated |
| Essay detail (DB) | `/essays/[slug]` | `/[locale]/essays/[slug]` | `fetchPublishedEssayGuide` required published translation; also limited by essay pilot slug list for some flows |
| Essay detail (static) | `/essays/{guide}` | N/A on localized slug route | Static guides excluded on `[locale]/essays/[slug]` |

## Link behavior (pre-change)

- **Resources CMS grid** (`ResourcesIndexPageContent`): `href = hasTranslation ? /es/resources/{slug} : /resources/{slug}` — untranslated cards sent users to English URL from ES hub (inconsistent with card staying on ES hub).
- **Essays CMS grid** (`EssaysIndexPageContent`): same pattern for `/es/essays/{slug}` vs `/essays/{slug}`.
- **Language switcher** (`detailLanguageSwitcher`): already emitted `/es/resources/{slug}` and `/fr/resources/{slug}` for all CMS resource slugs (not only translated).

## Content types

| Slug example | Type | DB `content_translations` |
|--------------|------|---------------------------|
| `scholarship-eligibility-requirements-usa` | CMS `content_posts` resource article | Not in 25-slug resource pilot; typically no ES/FR row → 404 on localized URL |
| `verify-scholarship-eligibility-usa` | CMS + resource pilot | May have published ES/FR rows |
| `scholarship-eligibility-explained` | Static Stage 2 guide | Static translations, not CMS gate |
| Essay pilot slugs (3) | DB essay guides | Published translations when seeded |

## Sitemap (unchanged policy)

- `locale-{es,fr}-resources-db.xml` — only slugs with published `resource_article` translations (quality ≥ 85, body/title).
- `locale-{es,fr}-essays-guide-db.xml` — only published `essay_guide` translations.
- Fallback URLs must **not** appear in these buckets (still true after implementation).

## Scholarship detail

Out of scope for this stage; remains 404 without translation (no English fallback).

## Target policy (implemented in code)

See implementation report `i18n-localized-fallback-resources-essays-2026-05-24.md`.
