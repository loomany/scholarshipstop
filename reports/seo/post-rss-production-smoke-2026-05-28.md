# Post-RSS Production Smoke - 2026-05-28

## Verdict

- RSS production status: pass.
- AI crawler access to RSS: pass for CCBot, GPTBot, Googlebot, and Bingbot.
- Cache posture: sane for public feeds, `public, max-age=300, s-maxage=3600`.
- XML validity: pass in Stage 1 validator and live duplicate/forbidden URL checks.

## Feed headers

Command shape:

```bash
curl -I https://scholarshiptop.com/rss.xml
curl -I https://scholarshiptop.com/rss/resources.xml
curl -I https://scholarshiptop.com/rss/essays.xml
curl -I https://scholarshiptop.com/rss/compare.xml
curl -I https://scholarshiptop.com/rss/categories.xml
```

| Feed | Status | Content-Type | Cache-Control | Cloudflare |
|---|---:|---|---|---|
| `/rss.xml` | 200 | `application/rss+xml; charset=utf-8` | `public, max-age=300, s-maxage=3600` | `cf-cache-status: DYNAMIC` |
| `/rss/resources.xml` | 200 | `application/rss+xml; charset=utf-8` | `public, max-age=300, s-maxage=3600` | `cf-cache-status: DYNAMIC` |
| `/rss/essays.xml` | 200 | `application/rss+xml; charset=utf-8` | `public, max-age=300, s-maxage=3600` | `cf-cache-status: DYNAMIC` |
| `/rss/compare.xml` | 200 | `application/rss+xml; charset=utf-8` | `public, max-age=300, s-maxage=3600` | `cf-cache-status: DYNAMIC` |
| `/rss/categories.xml` | 200 | `application/rss+xml; charset=utf-8` | `public, max-age=300, s-maxage=3600` | `cf-cache-status: DYNAMIC` |

## Feed body checks

Command:

```bash
npx tsx scripts/seo/validate-rss-stage1.ts --base-url=https://scholarshiptop.com
```

Live results:

| Feed | Live items | RSS root | Content-Type OK | Errors |
|---|---:|---|---|---|
| `/rss.xml` | 500 | yes | yes | 0 |
| `/rss/resources.xml` | 926 | yes | yes | 0 |
| `/rss/essays.xml` | 2269 | yes | yes | 0 |
| `/rss/compare.xml` | 5 | yes | yes | 0 |
| `/rss/categories.xml` | 11 | yes | yes | 0 |

Local builder counts were lower in the same run (`38/10/12/5/11`) because the local environment did not have the same production content source coverage. Production live feed validation is the authoritative smoke result for deployed RSS.

Additional live validation checked required RSS fields, duplicate links, duplicate GUIDs, local/staging URLs, and forbidden path patterns.

| Feed | Duplicate links | Duplicate GUIDs | Forbidden URLs | Missing required fields |
|---|---:|---:|---:|---:|
| `/rss.xml` | 0 | 0 | 0 | 0 |
| `/rss/resources.xml` | 0 | 0 | 0 | 0 |
| `/rss/essays.xml` | 0 | 0 | 0 | 0 |
| `/rss/compare.xml` | 0 | 0 | 0 | 0 |
| `/rss/categories.xml` | 0 | 0 | 0 | 0 |

The XML starts with the expected RSS 2.0 root:

```xml
<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
```

## Crawler user-agent checks

Command shape:

```bash
curl -I -A "CCBot/2.0" https://scholarshiptop.com/rss.xml
curl -I -A "GPTBot" https://scholarshiptop.com/rss.xml
curl -I -A "Googlebot" https://scholarshiptop.com/rss.xml
curl -I -A "Bingbot" https://scholarshiptop.com/rss.xml
```

| User-Agent | Status | Content-Type | Cache-Control |
|---|---:|---|---|
| CCBot/2.0 | 200 | `application/rss+xml; charset=utf-8` | `public, max-age=300, s-maxage=3600` |
| GPTBot | 200 | `application/rss+xml; charset=utf-8` | `public, max-age=300, s-maxage=3600` |
| Googlebot | 200 | `application/rss+xml; charset=utf-8` | `public, max-age=300, s-maxage=3600` |
| Bingbot | 200 | `application/rss+xml; charset=utf-8` | `public, max-age=300, s-maxage=3600` |

## Findings

- The RSS deploy is live and working.
- RSS feeds are not blocked by Cloudflare for tested crawler user agents.
- The RSS generator is not leaking local, staging, preview, auth, account, API, checkout, or admin URLs.
- Some live resource descriptions still contain old weak wording such as manual verification language. That is a content quality issue in existing resource copy, not an RSS transport failure. It should be handled by a later content cleanup stage.

## Protected areas

This smoke did not touch auth, payments, Lemon Squeezy, checkout, onboarding, Supabase RLS, DB schema, migrations, private essay routes, account/dashboard/profile, or private API endpoints.
