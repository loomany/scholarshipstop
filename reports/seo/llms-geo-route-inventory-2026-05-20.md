# ScholarshipTop — llms.txt / GEO route inventory (2026-05-20)

**Audit only.** Sources: `app/**`, `lib/seo/sitemaps.ts`, `lib/i18n/pilotRoutes.ts`, `app/robots.ts`, i18n SEO reports (2026-05-20). Production origin: `https://scholarshiptop.com`.

---

## Summary counts

| Bucket | Approx. public URLs (EN) | In sitemap | ES/FR localized (Stage 2) | llms.txt include |
| --- | ---: | :---: | :---: | :---: |
| Core hubs + trust | ~35 | Partial | 53 paths × 2 locales | Summarize + link |
| Static guides (resources/essays/compare) | ~30 | Yes | Pilot subset | List hubs + examples |
| DB scholarships | ~19,000 | Yes (chunked) | UI only on hubs | Category summary + sitemap |
| DB providers | ~5,000 | Yes | No body translation | Category summary + sitemap |
| DB resources CMS | ~900 | Yes | Grid omitted on `/es|fr/resources` | Sitemap reference |
| DB essays | ~12,000 | Yes | No | Sitemap reference |
| Compare DB (state/univ) | ~1,000 | Quality-gated | No | Sitemap reference |
| Category L1 | 11 | Yes | Labels only | List category slugs |
| SEO manifest / programmatic hubs | Large | Drip-gated | No | Sitemap reference |
| Private / noindex | ~40 route patterns | No | N/A | **Exclude** |

**Pilot localized URLs:** 53 canonical paths → 106 URLs (`/es/*`, `/fr/*`). No `/en` prefix (English at root).

---

## A. Core public pages

| Path | Purpose | Indexable | Sitemap | ES/FR | llms.txt |
| --- | --- | :---: | :---: | :---: | :---: |
| `/` | Home | Yes | core | `/es`, `/fr` | Yes |
| `/scholarships` | Scholarship catalog | Yes | core | Yes | Yes |
| `/scholarships/hub/{tab}` | Curated listing hubs (matches, easy-apply, hot-deadlines, best-recommendation, etc.) | Yes* | core (subset) | Yes (UI); hub tabs not in locale sitemaps | Summarize pattern |
| `/scholarships?tab=*` | Legacy tab query URLs | noindex if non-canonical | No | — | No |
| `/providers` | Provider directory | Yes* | core | Yes | Yes |
| `/providers/{stateSlug}` | State provider hubs | Yes | core | No | Pattern only |
| `/essays` | Essay guides hub | Yes | essays bucket | Yes | Yes |
| `/resources` | Resources hub + CMS grid | Yes | resources | Yes (static; DB grid EN on localized hubs) | Yes |
| `/compare` | Compare hub | Yes | core + compare | Yes | Yes |
| `/compare/universities` | University compare index | Yes* | compare | No | Yes |
| `/compare/states` | State compare index | Yes* | compare | No | Yes |
| `/get-scholarships` | Marketing funnel entry | **noindex** | No | `/es`, `/fr` noindex | Mention as funnel only |
| `/subscription` | Pricing / premium | Yes (default) | **Excluded** by design | `/es`, `/fr` indexable metadata | Summarize product, no checkout URLs |
| `/subscription/success` | Post-checkout | **noindex** | No | Localized noindex | Exclude |
| `/start` | Entry redirect | Varies | — | — | Exclude |
| `/signup` | Redirect → onboarding | — | No | — | Exclude |

\* Query variants may be `noindex,follow` per page metadata.

---

## B. Static SEO pages

### Trust / methodology (also `TRUST_SEO_CORE_PATHS` in sitemap)

| Path | llms.txt priority |
| --- | :---: |
| `/about` | High |
| `/how-scholarshiptop-works` | High |
| `/scholarship-verification-methodology` | **Critical** |
| `/how-we-rank-scholarships` | High |
| `/editorial-policy` | High |
| `/financial-aid-disclaimer` | **Critical** |
| `/scholarship-scam-warning` | High |
| `/how-we-make-money` | High |
| `/contact` | Medium |
| `/corrections` | Medium |

### Legal / help / marketing

| Path | ES/FR pilot | Sitemap (EN) |
| --- | :---: | :---: |
| `/terms`, `/privacy-policy`, `/refund-policy` | Yes | Via extended pilot / pages |
| `/help`, `/faq` | Yes | pages |
| `/international-students` | Yes | pages |
| `/for-organizations` | Yes | pages |
| `/submit-grant` | Yes | pages |

### Resource guides (`/resources/{slug}`)

**Static manifest (`STATIC_SCHOLARSHIP_GUIDES`):** 9 slugs in `lib/resources/staticScholarshipGuides.ts`, plus dedicated routes for e.g. `/resources/how-to-apply-for-scholarships`, `/resources/scholarship-deadlines-explained`, `/resources/combine-multiple-scholarships`, `/resources/medical-scholarships-guide`, `/resources/scholarships-for-international-students-guide` (Stage 2 extended paths).

**Representative slugs:** `how-to-find-scholarships`, `how-to-apply-for-scholarships-checklist`, `no-essay-scholarships-guide`, `easy-scholarships-guide`, `stem-scholarships-guide`, `scholarship-eligibility-explained`, etc.

### Essay guides (`/essays/{slug}`)

**13 static guides** in `lib/essays/staticEssayGuides.ts`: `examples`, `outline`, `checklist`, `mistakes`, `financial-need`, `career-goals`, `leadership`, `why-do-you-deserve-this-scholarship`, `personal-statement`, `stem`, `no-essay-scholarships`, etc.

### Compare guides (`/compare/{slug}`)

**4 static guides:** `scholarship-vs-grant`, `merit-vs-need-based-scholarships`, `no-essay-vs-essay-scholarships`, `local-vs-national-scholarships`.

---

## C. DB-backed pages

| Pattern | Example | Indexability | Sitemap bucket | llms.txt |
| --- | --- | --- | --- | --- |
| `/scholarships/{slug-or-uuid}` | `/scholarships/example-award-2026` | Quality + drip policy | `scholarships-*` (chunked) | **Do not enumerate** |
| `/scholarships/category/{id}` | `/scholarships/category/stem` | 11 promoted categories | `categories` | List 11 ids |
| `/scholarships/{long-tail}` | `/scholarships/closing-soon` | 11 routed; 4 in sitemap subset | `seo` / manifest | Name patterns only |
| `/scholarships/{state}/{university}` | University hubs | RPC-backed | `seo` | Pattern only |
| `/scholarships/country/*` | Country SEO routes | Manifest + drip | `seo` | Pattern only |
| `/providers/{id}` | Provider profile | Provider SEO quality policy | `providers` | Pattern only |
| `/resources/{slug}` | CMS articles | Published posts | `resources` | Pattern only |
| `/essays/{slug}` | DB essay pages | Published rows | `essays` | Pattern only |
| `/compare/universities/{slug}` | A-vs-B pages | Compare quality policy | `compare` | Pattern only |
| `/compare/states/{slug}` | State comparisons | Compare quality policy | `compare` | Pattern only |

**Scale (from i18n ES/FR reports):** ~19k scholarships, ~5k providers, ~900 resources, ~12k essays, ~1k compare DB pages, ~40k total EN SEO surface.

**Drip feed:** `SEO_DRIP_ENABLED` / `getVisibleSeoRoutes()` gates manifest SEO URLs in sitemap — counts change over time.

---

## D. Localized pages (Stage 2)

| Pattern | Notes |
| --- | --- |
| `/es/*`, `/fr/*` | Only `STAGE2_PILOT_CANONICAL_PATHS` (53 paths); no `/en` |
| `/es/scholarships`, `/fr/scholarships` | Full hreflang cluster with EN |
| DB detail URLs | **Not** translated; English titles on localized hubs |
| Funnel | `/es|fr/get-scholarships`, `/es|fr/signin/*`, `/es|fr/onboarding` — **noindex** |
| Account | `/es/account`, `/fr/account` — **noindex** |
| Subscription | `/es/subscription`, `/fr/subscription` — indexable; success pages noindex |

**Sitemap:** `locale-es-{bucket}` and `locale-fr-{bucket}` documents (mirror EN buckets for pilot content only).

---

## E. Private / noindex / excluded (must NOT appear in llms.txt)

### Auth, account, billing

| Path pattern | Reason |
| --- | --- |
| `/account`, `/account/*`, `/es/account`, `/fr/account` | Private user dashboard |
| `/dashboard` | noindex,nofollow |
| `/signin`, `/signin/*`, `/es/signin/*`, `/fr/signin/*` | noindex |
| `/onboarding`, `/es/onboarding`, `/fr/onboarding` | noindex funnel |
| `/get-scholarships`, `/es/get-scholarships`, `/fr/get-scholarships` | noindex funnel |
| `/subscription/success`, `/es/subscription/success`, `/fr/subscription/success` | noindex |
| `/auth/*` (e.g. `/auth/reset_password`, `/auth/register-conversion`) | Auth flows |
| `/saved-scholarships` | Redirect to private tab |
| `/unsubscribe` | Token/user specific |

### Product tools (not scholarship SEO corpus)

| Path | Reason |
| --- | --- |
| `/essay`, `/essay/{id}` | AI essay product; noindex |
| `/essays/u/{id}` | User-specific; noindex |
| `/tools/word-counter` | noindex |
| `/iq/*` on main domain | IQ product (separate subdomain `iq.scholarshiptop.com`) |
| `/iq/report/{token}` | Private report |

### API and internal (robots disallow `/api/`)

All `app/api/**` routes including:

- `billing/*`, `webhooks`, Lemon debug
- `account/*`, `onboarding/*`
- `internal/*` (SEO workers, grant notifications, google-indexing, telegram, content-hub)
- `cron/*`, `essay/*` (generate, check-ai, etc.)
- `scholarships` JSON API, `compare/university-match`, `revalidate`, `track-gpt-visit`, etc.

### Other

| Path | Reason |
| --- | --- |
| `/scholarships/email-digest/{token}` | Tokenized |
| `/start` | Internal entry |
| Environment / secrets | Never document |

---

## Sitemap architecture (for llms cross-reference)

| Document | URL |
| --- | --- |
| Index | `https://scholarshiptop.com/sitemap.xml` |
| Chunks | `https://scholarshiptop.com/sitemaps/{slug}.xml` |

**EN buckets:** `core`, `resources`, `essays`, `providers`, `categories`, `seo`, `scholarships-{n}`, `compare`, plus IQ subdomain sitemap entries in `core` (external `https://iq.scholarshiptop.com`).

**Localized buckets:** `locale-es-*`, `locale-fr-*` (pilot only).

**robots.txt:** `Allow: /`, `Disallow: /api/`, `Sitemap: https://scholarshiptop.com/sitemap.xml`.

---

## Related CSV

Machine-readable inventory: [llms-geo-route-inventory-2026-05-20.csv](./llms-geo-route-inventory-2026-05-20.csv).
