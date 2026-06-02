# Stage 4D — Resource translation SEO policy (2026-05-21)

Applies when `content_translations.source_type = 'resource_article'` and `status = 'published'`.

Reuses: `shouldIndexTranslatedContent`, `getTranslatedDbRobots`, `canAddTranslatedDbHreflang`, `canIncludeTranslatedDbPageInSitemap` (`lib/i18n/contentTranslationsDbPolicy.ts`).

---

## Per-locale URL

| Locale | URL pattern |
| --- | --- |
| EN (unchanged) | `/resources/{english-slug}` |
| ES | `/es/resources/{english-slug}` |
| FR | `/fr/resources/{english-slug}` |

**No `/en`.** **No localized slug** in pilot.

---

## Indexing and robots

| State | Route | Robots | Sitemap | Hreflang |
| --- | --- | --- | --- | --- |
| No translation row | `/es/resources/{slug}` | N/A (404) | No | No |
| draft / review / stale / blocked | 404 (no public row) | No | No | No |
| published, `quality_score < 85` | 200 or noindex per implementation | **noindex, follow** | No | No |
| published, `quality_score >= 85`, EN indexable | 200 | Yes (locale bucket) | Yes, cluster with EN |

**EN indexable** = published `content_posts` row (same as today). Hub filtered views remain **noindex** on all locales.

**No English fallback body** on ES/FR CMS routes — missing translation → `notFound()`.

---

## Canonical

- EN: `https://scholarshiptop.com/resources/{slug}` (existing `getCanonical`)
- ES/FR: self-canonical on localized URL when published + indexable
- Query variants: not applicable on article detail

---

## Hreflang cluster (published only)

For each CMS article with **both** ES and FR published + indexable:

```text
en → /resources/{slug}
es → /es/resources/{slug}
fr → /fr/resources/{slug}
x-default → /resources/{slug}
```

EN article pages today lack hreflang for CMS posts — add EN `<link rel="alternate">` only when **at least one** locale is indexable (mirror category pilot).

Partial locale (ES only): include `en` + `es` only; omit `fr` until published.

---

## Sitemap buckets

| Bucket | Contents today | After 4D |
| --- | --- | --- |
| `resources` (EN) | All published `content_posts` + static guides | Unchanged |
| `locale-es-resources` | Static Stage 2 pilot paths only | **Add** `buildLocalizedResourceArticleSitemapDocuments()` — **only** published `resource_article` rows with quality ≥ 85 |
| `locale-fr-resources` | Same | Same |

**Do not** dump all 900 EN posts into locale sitemaps. **Do not** mix static pilot URLs with DB rows in the same builder without dedupe by path.

Implementation sketch (mirror `buildLocalizedCategorySitemapDocuments`):

1. `listPublishedResourceArticleTranslations()` grouped by `source_id`
2. Map `source_id` → slug via one batched `content_posts` select
3. `buildLocalizedSitemapEntry({ canonicalPath: '/resources/' + slug, ... })`

---

## Static guides vs CMS

| Type | ES/FR sitemap | CMS `content_translations` |
| --- | --- | --- |
| `STATIC_SCHOLARSHIP_GUIDES` / extended static | Existing `listLocalizedPilotPages` | **No** |
| 5 `resourceShell` routes | Existing static pilot | **No** |
| `content_posts` articles | New DB bucket only | **Yes** |

Avoid double-listing if a slug exists in both static and DB (currently none).

---

## Hub `/es/resources` policy (until critical mass)

**Problem:** Index lists all 900 EN posts → mixed-language SERP/snippet risk.

**Phase 4D.1 (recommended):**

- Article routes: DB translation gate only
- Hub: show **only** posts with published ES/FR translation for that locale (filter by `source_id` set), **or** hide DB grid and show static guides + CTA until ≥ 10 published per locale

**Phase 4D.2:** Re-enable full grid with localized titles when ≥ 25–50 articles published per locale.

Search/filter on hub: keep **noindex** when query params active (same as EN).

---

## Revalidation

On publish: `POST /api/revalidate` paths `/resources/{slug}`, `/es/resources/{slug}`, `/fr/resources/{slug}`, and `/resources` hub per locale.
