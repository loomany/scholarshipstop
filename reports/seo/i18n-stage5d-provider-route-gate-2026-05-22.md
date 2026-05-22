# Stage 5D-1 — Provider ES/FR detail route gate

Date: 2026-05-22

## 1. Provider slug / id / source_id mapping

| Question | Decision |
|----------|----------|
| Route param | English: `app/providers/[id]/page.tsx` — param name `id`, value is **slug or UUID** via `resolveProviderProfileSlug()`. Localized: `app/[locale]/providers/[slug]/page.tsx` — **slug only** (canonical lowercase). |
| DB mapping for `/providers/loyola-university-chicago` | `providers.slug` → profile load; stable key for translations is **`providers.id` (UUID)** from `ProviderProfilePayload.providerId`. |
| `content_translations.source_id` | **`providers.id` (UUID)** — not slug (same pattern as `resource_article` / `content_posts.id`). |
| Fetch published translation by slug | Resolve slug → `getCachedProviderProfilePage` → `getPublishedContentTranslation({ sourceType: 'provider_profile', sourceId: providerId, locale })` → gate: `status=published`, `quality_score >= 85`, `translated_title` + `translated_body` required; optional `translated_slug` must match URL when set. |
| Fields to translate later | `translated_title`, `translated_meta_title`, `translated_meta_description`, `translated_summary`, `translated_body`, `translated_faq_json`, optional `translated_extra_json` (UI chrome). Type: `lib/i18n/providerPilot/providerProfileTranslationPayload.ts`. |
| Must not translate | Legal `displayName`, `officialUrl`, country/HQ IDs, scholarship counts, award pool numbers, `aiSources` URLs, internal IDs, English slug (for now). |

## 2. Files changed

- `app/[locale]/providers/[slug]/page.tsx` — localized route + metadata gate
- `components/providers/LocalizedProviderProfilePage.tsx` — ES/FR render from translation payload + `providerDetailUiCopy`
- `lib/i18n/providerPilot/providerProfileTranslationGate.ts` — publish/quality gate + copy builder
- `lib/i18n/providerPilot/resolveLocalizedProviderPage.ts` — server fetch + gate
- `lib/i18n/providerPilot/providerTranslationAlternates.ts` — hreflang en/es/fr/x-default
- `lib/i18n/providerPilot/listPublishedProviderProfileTranslations.ts` — sitemap listing
- `lib/i18n/providerPilot/providerProfileTranslationPayload.ts` — TS payload contract
- `lib/i18n/localizedHref.ts` — `localizedProviderProfileHref` + href builder wiring
- `lib/providers/providerProfilePagination.ts` — localized pagination hrefs
- `lib/seo/sitemaps.ts` — `locale-{es,fr}-providers-db` buckets (empty until published rows)
- `scripts/i18n/seed-provider-pilot-translations.ts` — dry-run with UUID lookup, max 10 rows
- `scripts/seo/i18n-stage5d-provider-route-gate-smoke.ts` — route + regression smoke
- `lib/i18n/__tests__/providerPilotGate.test.ts` — unit tests for gate/copy

## 3. Route behavior

| URL | Behavior |
|-----|----------|
| `/providers/{slug}` | Unchanged English detail. |
| `/es/providers/{slug}` | **404** unless published `provider_profile` row (quality ≥ 85). No English body fallback. |
| `/fr/providers/{slug}` | Same as ES. |
| `/es/providers`, `/fr/providers` | Unchanged pilot hub (200). |
| `/en` | 404 |

## 4. Sitemap / hreflang

- New buckets: `locale-es-providers-db`, `locale-fr-providers-db` — built only from **published** `provider_profile` rows with quality ≥ 85 and English provider still `includeInSitemap` per `provider_hub_listing`.
- **Currently empty** (no published provider_profile rows) — sitemap index omits empty buckets.
- Published localized pages: self canonical; hreflang `en` / `es` / `fr` / `x-default` only for locales with a passing published row.

## 5. Dry-run seed script

- `npx tsx scripts/i18n/seed-provider-pilot-translations.ts` — default dry-run; resolves `source_id` from `providers` table; prints slug + UUID; writes `reports/seo/i18n-stage5d-provider-pilot-rows-2026-05-22.csv`.
- Default status: `review_required` (not published).
- Writes require `I18N_PILOT_ALLOW_DB_WRITES=1` + `I18N_PILOT_ALLOW_PRODUCTION=1` on hosted; upsert **not wired** (exits with message).
- Max 10 rows enforced; skips slugs missing from DB (e.g. stanford/yale not in local catalog).

## 6. Tests / build / smoke

| Check | Result |
|-------|--------|
| `npm run build` | PASS |
| `npx tsc --noEmit` | PASS |
| `npx tsx --test lib/i18n/__tests__/*.test.ts` | PASS (81 tests) |
| `npx tsx scripts/seo/i18n-stage5d-provider-route-gate-smoke.ts` (local :3020) | PASS |

## 7. Production smoke

_Not run in this session (push/deploy pending)._ After deploy, run:

```powershell
$env:SMOKE_BASE_URL='https://scholarshiptop.com'
npx tsx scripts/seo/i18n-stage5d-provider-route-gate-smoke.ts
```

Expected before seed: Loyola EN 200; ES/FR detail 404; hubs 200; category/resource pilots unchanged; `/en` 404.

## 8. What was not done

- No `provider_profile` production DB seed
- No OpenAI translation
- No auth/payment/Lemon/RLS changes
- No `/en` route
- No new languages
- No English provider URL changes
- No provider_profile upsert implementation in seed script

## 9. Verdict

| Question | Answer |
|----------|--------|
| Provider route gate accepted? | **yes** (local build + smoke) |
| Ready for `provider_profile` seed? | **yes** (after deploy of this gate) |
| Recommended seed batch size | **3 providers × ES+FR = 6 rows** first (loyola, harvard, university-of-michigan resolvable locally); expand to 5×2=10 after QA |
