# RSS Discovery Signals - 2026-05-28

## Verdict

- Discovery signals added safely in code.
- Homepage and public pages now expose global RSS `rel=alternate` links in local production build.
- `robots.txt` now includes the main sitemap plus selected RSS feed references in local production build.
- `llms.txt` and `llms-full.txt` now describe RSS feeds as public, indexable discovery surfaces.

## Changes made

| File | Change |
|---|---|
| `app/layout.tsx` | Added global RSS alternate links for master, resources, essays, compare, and categories feeds. |
| `app/robots.ts` | Added RSS feed references alongside the existing sitemap. |
| `public/llms.txt` | Added concise RSS feeds section with public-only boundaries. |
| `public/llms-full.txt` | Added RSS feeds section and SEO coordination row. |

## RSS alternate links

Expected links added globally:

```html
<link rel="alternate" type="application/rss+xml" title="ScholarshipTop RSS" href="https://scholarshiptop.com/rss.xml" />
<link rel="alternate" type="application/rss+xml" title="ScholarshipTop Resources RSS" href="https://scholarshiptop.com/rss/resources.xml" />
<link rel="alternate" type="application/rss+xml" title="ScholarshipTop Essay Guides RSS" href="https://scholarshiptop.com/rss/essays.xml" />
<link rel="alternate" type="application/rss+xml" title="ScholarshipTop Comparison Guides RSS" href="https://scholarshiptop.com/rss/compare.xml" />
<link rel="alternate" type="application/rss+xml" title="ScholarshipTop Scholarship Categories RSS" href="https://scholarshiptop.com/rss/categories.xml" />
```

Local validation after `npm run build` and `next start -p 3028`:

| URL | Status | RSS alternate signal |
|---|---:|---|
| `/` | 200 | present |
| `/resources` | 200 | present |

The scanner counted ten `application/rss+xml` occurrences because the rendered document includes the five links in the head plus serialized framework metadata. The important signal is present and global.

## Robots discovery

Production before this change:

```txt
User-Agent: *
Allow: /
Disallow: /api/

Sitemap: https://scholarshiptop.com/sitemap.xml
```

Local after this change:

```txt
User-Agent: *
Allow: /
Disallow: /api/

Sitemap: https://scholarshiptop.com/sitemap.xml
Sitemap: https://scholarshiptop.com/rss.xml
Sitemap: https://scholarshiptop.com/rss/resources.xml
Sitemap: https://scholarshiptop.com/rss/essays.xml
```

Decision: include only the master, resources, and essays feeds in robots. Compare and categories remain discoverable through HTML `rel=alternate` and `llms.txt`; they are smaller evergreen feeds and do not need to crowd robots.

## llms.txt discovery

`llms.txt` now includes:

- Main curated feed: `https://scholarshiptop.com/rss.xml`
- Resources and guides: `https://scholarshiptop.com/rss/resources.xml`
- Essay guides: `https://scholarshiptop.com/rss/essays.xml`
- Comparison guides: `https://scholarshiptop.com/rss/compare.xml`
- Scholarship categories: `https://scholarshiptop.com/rss/categories.xml`

It explicitly states that feeds contain public ScholarshipTop URLs only and exclude account, checkout, API, private essay, dashboard, and user-specific pages.

## Validation

- `npm run build`: pass.
- Local `/robots.txt`: 200, four `Sitemap:` lines.
- Local `/llms.txt`: 200, RSS section present.
- Local `/`: 200, RSS alternate links present.
- Local `/resources`: 200, RSS alternate links present.

Production will show these discovery additions after deploy.

## Protected areas

No auth, payments, Lemon Squeezy, checkout, onboarding, Supabase RLS, DB schema, migrations, account/dashboard/profile, private user essay pages, private API endpoints, or pricing logic changed.
