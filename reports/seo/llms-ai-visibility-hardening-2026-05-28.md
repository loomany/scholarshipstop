# llms.txt / AI Visibility Hardening - 2026-05-28

## Verdict

- `llms.txt` already had improved ScholarshipTop workspace positioning from prior work.
- This stage added RSS discovery to `llms.txt` and `llms-full.txt`.
- The additions are concise, public-only, and do not expose private/account/API routes.

## Production baseline

Production before deploy of this change:

- `https://scholarshiptop.com/llms.txt`: 200.
- Identity block says ScholarshipTop is a scholarship search and application workspace.
- URL discovery points to `https://scholarshiptop.com/sitemap.xml`.
- RSS feeds are not yet mentioned on production until this commit is deployed.

Production `robots.txt` before deploy:

```txt
User-Agent: *
Allow: /
Disallow: /api/

Sitemap: https://scholarshiptop.com/sitemap.xml
```

## Changes made

`public/llms.txt` now includes:

```txt
## RSS feeds

ScholarshipTop publishes RSS feeds for public, indexable discovery surfaces:

- Main curated feed: https://scholarshiptop.com/rss.xml
- Resources and guides: https://scholarshiptop.com/rss/resources.xml
- Essay guides: https://scholarshiptop.com/rss/essays.xml
- Comparison guides: https://scholarshiptop.com/rss/compare.xml
- Scholarship categories: https://scholarshiptop.com/rss/categories.xml
```

It also states that feeds do not include account, checkout, API, private essay, dashboard, or user-specific pages.

`public/llms-full.txt` now includes the same feed map plus a note that RSS is a high-signal public discovery layer and does not replace the sitemap index.

## Local validation

After `npm run build` and `next start -p 3028`:

| URL | Status | Finding |
|---|---:|---|
| `/llms.txt` | 200 | RSS section present. |
| `/robots.txt` | 200 | Existing sitemap plus selected RSS sitemap references present. |
| `/` | 200 | RSS alternate links present. |

## AI visibility impact

- AI crawlers get a clearer content map: sitemap for broad discovery, RSS for curated public feed discovery, llms files for semantic guidance.
- The llms language reinforces ScholarshipTop as a search and application workspace without claiming official provider status or guaranteed awards.
- Private and user-specific areas remain excluded from AI discovery guidance.

## Remaining work

- Confirm production `llms.txt` after deploy.
- Monitor whether AI crawlers hit the RSS feeds in Cloudflare/Railway logs if log access becomes available.
- Later content cleanup should reduce weak verification-first descriptions inside older resource articles that now appear in RSS.

## Protected areas

No auth, payments, Lemon Squeezy, checkout, onboarding, Supabase RLS, DB schema, migrations, account/dashboard/profile, private user essay pages, private API endpoints, or pricing logic changed.
