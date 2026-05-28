# Sitemap / Canonical / Noindex Consistency - 2026-05-28

## Verdict

- Sitemap index health: good at document level.
- Sampled canonical/noindex health: mostly good for strong public families.
- P0 issue fixed locally: localized static essay URLs in the sitemap returned 404/noindex on production because a more specific dynamic route shadowed the localized static pilot route.
- Remaining P1 issue: several long-tail scholarship landing pages are indexable but thin.

## Sitemap index inventory

Command:

```bash
curl -sS https://scholarshiptop.com/sitemap.xml
```

Result:

- Sitemap index status: 200.
- Content-Type: `text/xml; charset=utf-8`.
- Child sitemap count: 71.
- Sampled all child sitemap documents for document-level status: all returned 200.

Key child groups:

| Sitemap group | Count | Notes |
|---|---:|---|
| `/sitemaps/core.xml` | 85 | Core public pages and hubs. |
| `/sitemaps/resources.xml` | 925 | Resource articles and guides. |
| `/sitemaps/essays-*.xml` | 2269 total in RSS live; sitemap shards include several populated and several empty shards. Empty shards return 200. |
| `/sitemaps/providers.xml` | 5139 | Provider pages, quality varies. |
| `/sitemaps/categories.xml` | 11 | Strong category pages. |
| `/sitemaps/seo.xml` | 1626 | Programmatic scholarship SEO routes, includes strong cross-country pages and thin long-tail pages. |
| `/sitemaps/scholarships-0.xml` | 19936 | Scholarship detail pages. |
| `/sitemaps/compare.xml` | 4 | Static compare guides. |
| `/sitemaps/locale-es-essays.xml` | 12 | Had production 404/noindex issue on static essay detail URLs. |
| `/sitemaps/locale-fr-essays.xml` | 12 | Had production 404/noindex issue on static essay detail URLs. |
| `/sitemaps/locale-*-scholarships-detail-db.xml` | 17451 each | Large localized scholarship detail sets; sampled separately only at high level in this stage. |

## Page sample results

| URL family | Checked examples | Status | Canonical | Robots | Text quality | Action |
|---|---:|---|---|---|---|---|
| Homepage | 1 | 200 | clean | default index | strong, 35k text chars | keep |
| Resources hub/articles | 3 | 200 | clean | default index | strong, 3.8k-12k chars | keep |
| Essay hub/static/generated | 4 | 200 | clean | default or `index, follow` | medium to strong, 2.6k-14.9k chars | keep |
| Compare hub/guides | 3 | 200 | clean | default index | medium, 2.2k-4.5k chars | keep |
| Categories | 3 | 200 | clean | default index | strong, 12k chars | keep |
| Providers | 3 | 200 | clean | default index | medium to strong, 3.9k-12.4k chars | keep, later provider RSS gates |
| Cross-country GEO | 2 | 200 | clean | `index, follow` | medium, about 3k chars | keep, curated only |
| Scholarship detail | 1 | 200 | clean | `index, follow` | medium, 3.5k chars | keep, later scholarship RSS gates |
| Thin long-tail scholarship SEO | 4 | 200 | clean | `index, follow` | weak, 268-603 chars | P1 cleanup plan |
| Localized static essay URLs | 4 production samples | 404 | none | `noindex` | empty 404 body | P0 fixed locally |

## P0 localized essay sitemap issue

Production samples before fix:

| URL | Production status | Production robots | Production H1 |
|---|---:|---|---|
| `/es/essays/examples` | 404 | `noindex` | missing |
| `/fr/essays/checklist` | 404 | `noindex` | missing |
| `/es/essays/no-essay-scholarships` | 404 | `noindex` | missing |
| `/fr/essays/no-essay-scholarships` | 404 | `noindex` | missing |

Root cause:

- Localized static essay pages exist in `lib/i18n/staticTranslations`.
- They are included in localized sitemap groups.
- The specific route `app/[locale]/essays/[slug]/page.tsx` handled these URLs before the generic localized static pilot route and returned `notFound()` whenever the slug matched a static English essay guide.

Fix:

- `app/[locale]/essays/[slug]/page.tsx` now checks whether the slug maps to a localized static pilot page.
- If it does, the route returns `LocalizedProductionPage` and `buildLocalizedPilotMetadata` instead of 404/noindex.
- DB/generated localized essay guide behavior remains unchanged.

Local validation after fix:

| URL | Local status | Canonical | Robots | H1 | Text length |
|---|---:|---|---|---|---:|
| `/es/essays/examples` | 200 | `/es/essays/examples` | default index | `Ejemplos de ensayos para becas` | 2058 |
| `/fr/essays/checklist` | 200 | `/fr/essays/checklist` | default index | `Checklist pour rédaction de bourse` | 1916 |
| `/es/essays/no-essay-scholarships` | 200 | `/es/essays/no-essay-scholarships` | default index | `Becas sin ensayo` | 2664 |
| `/fr/essays/no-essay-scholarships` | 200 | `/fr/essays/no-essay-scholarships` | default index | `Bourses sans rédaction` | 2875 |

## Remaining sitemap risks

- Thin long-tail pages in `/sitemaps/seo.xml` remain indexable and should not be added to RSS until improved or policy-gated.
- Some `essays-*.xml` sitemap shards are empty but return 200. This is not a crawl breakage, but a later sitemap cleanup could remove empty shards if generation supports it safely.
- Localized scholarship detail sitemap groups are very large. This stage did not full-crawl them because that would be a high-load production crawl; they need a separate sampled QA pass.

## Validation

- `npm run build`: pass.
- Local production server: pass for fixed localized static essay URLs.
- No sitemap policy rewrite was performed.

## Protected areas

No auth, payments, Lemon Squeezy, checkout, onboarding, Supabase RLS, DB schema, migrations, account/dashboard/profile, private user essay pages, private API endpoints, or pricing logic changed.
