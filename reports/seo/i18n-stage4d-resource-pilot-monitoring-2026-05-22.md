# Stage 4D — resource pilot monitoring (2026-05-22)

Read-only production checks (no new seeds).

## Sitemap index (`/sitemap.xml`)

Locale resource DB child sitemaps **are listed**:

- `https://scholarshiptop.com/sitemaps/locale-es-resources-db.xml`
- `https://scholarshiptop.com/sitemaps/locale-fr-resources-db.xml`

Also present: `locale-es-resources.xml`, `locale-fr-resources.xml` (static shell), `locale-es-categories.xml`, etc.

**Conclusion:** Index includes resources-db buckets; no code change required tonight.

## URL spot checks (production)

| URL | HTTP |
|-----|------|
| `/es/resources/how-to-apply-for-scholarships` | 200 |
| `/es/scholarships/category/stem` | 200 |
| `/es/scholarships/category/hobbies` | 404 (expected — no published ES category pilot) |

## DB row counts (from prior deploy reports)

| source_type | Published rows (expected) |
|-------------|---------------------------|
| `resource_article` | 50 (25 × ES/FR) |
| `scholarship_category` | 22 (11 × ES/FR) |

Re-verify locally: `npx tsx scripts/seo/i18n-stage4d-post-seed-db-verify.ts` (read-only when env points at prod with service role — do not run writes).

## Actions taken

- No new seed
- No sitemap code change
- No cache bust forced

## If child sitemap stale

`lastmod` on `locale-es-resources-db.xml` is `2026-05-21` — acceptable. Revalidate via existing deploy or `POST /api/revalidate` only if URLs missing from child XML (spot-check child file if needed next session).
