# RSS + Common Crawl Readiness Audit — ScholarshipTop

Date: 2026-05-28  
Mode: Audit only. No code, DB, env, auth, payment, sitemap, robots, Cloudflare, commit, or push changes were made.

## Verdict

| Area | Status | Summary |
|---|---|---|
| RSS status | Missing | No local RSS/Atom route or public feed file was found. Production `/rss.xml`, `/feed.xml`, `/atom.xml`, `/blog/rss.xml`, and `/resources/rss.xml` return `404`. |
| Common Crawl readiness | Partial | The site is crawlable by `CCBot` in header checks, robots allows public pages, sitemap is available and large, and SSR HTML is present. However, no RSS feed exists and Common Crawl Index API checks did not confirm indexed records in the latest sampled indexes. |
| AI crawler readiness | Ready with caveats | `robots.txt` does not block major AI crawlers, `llms.txt` is live, and `GPTBot` / `ClaudeBot` traffic is visible in an existing Cloudflare audit report. Caveats: HTML responses are dynamic/no-store and RSS-based discovery is missing. |

## Executive Summary

- ScholarshipTop does not currently expose RSS or Atom feeds.
- `robots.txt` is permissive for public crawling and includes `Sitemap: https://scholarshiptop.com/sitemap.xml`.
- No explicit blocks were found for `CCBot`, `CommonCrawl`, `GPTBot`, `ClaudeBot`, `PerplexityBot`, `Google-Extended`, `Bingbot`, or `Googlebot`.
- `CCBot`, `GPTBot`, `ClaudeBot`, `PerplexityBot`, `Googlebot`, and `Bingbot` received `200 OK` on production header checks.
- `sitemap.xml` is healthy as a sitemap index and links to 71 child sitemap documents with 65,025 sampled URLs total; no localhost/staging host leaks were detected in the checked sitemap documents.
- Sample HTML pages return SSR content with title, meta description, canonical, H1, internal links, and structured data.
- `llms.txt` returns `200 OK` and uses the improved workspace positioning.
- Common Crawl Index API checks against the latest sampled indexes did not find records for the tested ScholarshipTop URLs. This does not prove the site has never been crawled, but public CC index inclusion was not confirmed in this audit.

## RSS Audit

### Local Code Search

Commands run:

```powershell
rg -n -i "generateRss|buildRss|application/rss\+xml|application/atom\+xml|rss\.xml|feed\.xml|atom\.xml|rel=.*application/rss\+xml|type=.*application/rss\+xml|\bRSS\b|\bAtom\b" app lib components public scripts data reports --glob "!reports/seo/**" --glob "!node_modules/**"
Get-ChildItem -Recurse -Directory -Path app,public | Where-Object { $_.FullName -match '(rss|feed|atom)\.xml$' }
Get-ChildItem -Recurse -File -Include rss.xml,feed.xml,atom.xml,route.ts -Path app,public
```

Findings:

- No `app/rss.xml/route.ts`, `app/feed.xml/route.ts`, or `app/atom.xml/route.ts` route was found.
- No public `rss.xml`, `feed.xml`, or `atom.xml` file was found.
- No meaningful local RSS/Atom generator or `application/rss+xml` / `application/atom+xml` response code was found.
- The only RSS-like text hit was unrelated scholarship content containing `ATOM College Scholarship`.

### Production Feed Endpoints

Commands run:

```powershell
curl.exe -sS -I -L https://scholarshiptop.com/rss.xml
curl.exe -sS -I -L https://scholarshiptop.com/feed.xml
curl.exe -sS -I -L https://scholarshiptop.com/atom.xml
curl.exe -sS -I -L https://scholarshiptop.com/blog/rss.xml
curl.exe -sS -I -L https://scholarshiptop.com/resources/rss.xml
```

Results:

| URL | Status | Content-Type | Cloudflare |
|---|---:|---|---|
| `https://scholarshiptop.com/rss.xml` | 404 | `text/html; charset=utf-8` | `cf-cache-status: DYNAMIC` |
| `https://scholarshiptop.com/feed.xml` | 404 | `text/html; charset=utf-8` | `cf-cache-status: DYNAMIC` |
| `https://scholarshiptop.com/atom.xml` | 404 | `text/html; charset=utf-8` | `cf-cache-status: DYNAMIC` |
| `https://scholarshiptop.com/blog/rss.xml` | 404 | `text/html; charset=utf-8` | `cf-cache-status: DYNAMIC` |
| `https://scholarshiptop.com/resources/rss.xml` | 404 | `text/html; charset=utf-8` | `cf-cache-status: DYNAMIC` |

Because no feed exists, XML validity, item count, item fields, absolute feed URLs, draft/noindex leakage, feed `rel=alternate`, and robots feed links are not applicable yet.

## Robots.txt and Crawler Access

Command run:

```powershell
curl.exe -sS https://scholarshiptop.com/robots.txt
```

Production output:

```txt
User-Agent: *
Allow: /
Disallow: /api/

Sitemap: https://scholarshiptop.com/sitemap.xml
```

Findings:

- Public crawling is allowed.
- `/api/` is blocked, which is appropriate.
- No explicit block was found for:
  - `CCBot`
  - `CommonCrawl`
  - `GPTBot`
  - `ClaudeBot`
  - `PerplexityBot`
  - `Google-Extended`
  - `Bingbot`
  - `Googlebot`
- `robots.txt` links the sitemap.
- `robots.txt` does not link an RSS feed, which is expected because RSS is missing.

## User-Agent Header Checks

Commands run:

```powershell
curl.exe -sS -I -L -A "CCBot/2.0" https://scholarshiptop.com/
curl.exe -sS -I -L -A "CCBot/2.0" https://scholarshiptop.com/robots.txt
curl.exe -sS -I -L -A "CCBot/2.0" https://scholarshiptop.com/sitemap.xml
curl.exe -sS -I -L -A "CCBot/2.0" https://scholarshiptop.com/scholarships
curl.exe -sS -I -L -A "CCBot/2.0" https://scholarshiptop.com/resources/how-to-apply-for-scholarships
curl.exe -sS -I -L -A "GPTBot" https://scholarshiptop.com/
curl.exe -sS -I -L -A "ClaudeBot" https://scholarshiptop.com/
curl.exe -sS -I -L -A "PerplexityBot" https://scholarshiptop.com/
curl.exe -sS -I -L -A "Googlebot" https://scholarshiptop.com/
curl.exe -sS -I -L -A "Bingbot" https://scholarshiptop.com/
```

Results:

| User-Agent | URL | Status | Content-Type | Cloudflare |
|---|---|---:|---|---|
| `CCBot/2.0` | `/` | 200 | `text/html; charset=utf-8` | `cf-cache-status: DYNAMIC` |
| `CCBot/2.0` | `/robots.txt` | 200 | `text/plain` | `cf-cache-status: EXPIRED` |
| `CCBot/2.0` | `/sitemap.xml` | 200 | `text/xml; charset=utf-8` | `cf-cache-status: DYNAMIC` |
| `CCBot/2.0` | `/scholarships` | 200 | `text/html; charset=utf-8` | `cf-cache-status: DYNAMIC` |
| `CCBot/2.0` | `/resources/how-to-apply-for-scholarships` | 200 | `text/html; charset=utf-8` | `cf-cache-status: DYNAMIC` |
| `GPTBot` | `/` | 200 | `text/html; charset=utf-8` | `cf-cache-status: DYNAMIC` |
| `ClaudeBot` | `/` | 200 | `text/html; charset=utf-8` | `cf-cache-status: DYNAMIC` |
| `PerplexityBot` | `/` | 200 | `text/html; charset=utf-8` | `cf-cache-status: DYNAMIC` |
| `Googlebot` | `/` | 200 | `text/html; charset=utf-8` | `cf-cache-status: DYNAMIC` |
| `Bingbot` | `/` | 200 | `text/html; charset=utf-8` | `cf-cache-status: DYNAMIC` |

Conclusion:

- No `403`, `429`, or `5xx` block was observed for the tested AI/search crawlers via `curl -I`.
- Cloudflare is present, but this audit did not find header-level evidence that Cloudflare/WAF blocks the tested crawlers.
- HTML pages use dynamic/no-store cache headers. This does not block crawling, but it can make large-scale crawler access more expensive and less cache-friendly.

## Sitemap Audit

Commands run:

```powershell
curl.exe -sS -I -L https://scholarshiptop.com/sitemap.xml
curl.exe -sS https://scholarshiptop.com/sitemap.xml
```

Sitemap index headers:

- Status: `200 OK`
- Content-Type: `text/xml; charset=utf-8`
- Cache-Control: `public, max-age=300, s-maxage=3600`
- Cloudflare: `cf-cache-status: DYNAMIC`

Sitemap index includes examples:

- `https://scholarshiptop.com/sitemaps/core.xml`
- `https://scholarshiptop.com/sitemaps/resources.xml`
- `https://scholarshiptop.com/sitemaps/essays-0.xml`
- `https://scholarshiptop.com/sitemaps/providers.xml`
- `https://scholarshiptop.com/sitemaps/categories.xml`
- `https://scholarshiptop.com/sitemaps/seo.xml`
- `https://scholarshiptop.com/sitemaps/scholarships-0.xml`
- locale sitemap shards

Child sitemap validation summary:

```json
{
  "sitemapDocuments": 71,
  "checked": 71,
  "totalUrls": 65025,
  "failures": [],
  "hostLeaks": [],
  "max": {
    "loc": "https://scholarshiptop.com/sitemaps/scholarships-0.xml",
    "status": 200,
    "bytes": 3270284,
    "urlCount": 19881,
    "hasHostLeak": false
  }
}
```

Representative child sitemap checks:

| Sitemap | Status | URLs | Host leak |
|---|---:|---:|---|
| `core.xml` | 200 | 85 | No |
| `resources.xml` | 200 | 925 | No |
| `seo.xml` | 200 | 1,626 | No |
| `scholarships-0.xml` | 200 | 19,881 | No |
| `providers.xml` | 200 | 5,135 | No |
| `categories.xml` | 200 | 11 | No |

Conclusion:

- Sitemap discovery is strong.
- No localhost, preview, or staging host leaks were detected in checked sitemap URLs.
- The sitemap index is large but not broken in the sampled validation.

## llms.txt

Command run:

```powershell
curl.exe -sS -I -L https://scholarshiptop.com/llms.txt
curl.exe -sS https://scholarshiptop.com/llms.txt
```

Result:

- Status: `200 OK`
- Content-Type: `text/plain; charset=UTF-8`
- Cache-Control: `public, max-age=0`

Opening content:

```txt
# ScholarshipTop
# https://scholarshiptop.com/llms.txt

> ScholarshipTop is a scholarship search and application workspace for international students. It organizes scholarship details, eligibility signals, deadlines, award information, provider application paths, shortlisting tools, and AI support so students can move faster toward application.
```

Conclusion:

- `llms.txt` is available and uses product-positive AI/GEO positioning.
- This is a strength for AI visibility.

## HTML Quality for Common Crawl

Sample pages checked:

| URL | Status | Title | Canonical | H1 | Text chars | Schema | Hreflang | Noindex |
|---|---:|---|---|---:|---:|---:|---:|---|
| `/` | 200 | `Get Matched With Scholarships in 2 Minutes` | `https://scholarshiptop.com` | 1 | 35,285 | 2 | 4 | No |
| `/scholarships` | 200 | `ScholarshipTop \| Find Scholarships` | `https://scholarshiptop.com/scholarships` | 2 | 1,948 | 1 | 4 | No |
| `/scholarships/engineering` | 200 | `ScholarshipTop \| Find Engineering Scholarships in the USA` | Self | 3 | 5,312 | 2 | 0 | No |
| `/scholarships/full-ride` | 200 | `ScholarshipTop \| Find Full Ride Scholarships in the USA` | Self | 3 | 5,008 | 2 | 0 | No |
| `/resources` | 200 | `ScholarshipTop \| Scholarship Resources — Guides & Tips` | Self | 1 | 3,902 | 3 | 4 | No |
| `/resources/how-to-apply-for-scholarships` | 200 | `How to Apply for Scholarships in 2026` | Self | 1 | 4,798 | 3 | 4 | No |
| `/resources/scholarships-for-international-students-guide` | 200 | `Scholarships for International Students: Practical Guide` | Self | 1 | 12,162 | 3 | 4 | No |
| `/providers` | 200 | `ScholarshipTop \| Scholarship Providers` | Self | 1 | 4,430 | 4 | 4 | No |

Findings:

- The sampled pages are not empty JS shells. They include SSR HTML with meaningful script-stripped text.
- Title, meta description, canonical, H1, internal links, and structured data were present on sampled HTML pages.
- No `noindex` was detected on sampled public pages.
- No localhost/staging host leak was detected in sampled HTML pages. The word `preview` appeared only in asset/UI text such as `logo-preview.png`, not as a preview host URL.
- No RSS/Atom `rel=alternate` was detected in sampled HTML.
- Programmatic scholarship landing pages sampled had `hreflangCount: 0`, while homepage/resources/providers had locale alternates. This may be intentional, but it is a GEO visibility caveat.

## Existing Log Evidence

Local search commands:

```powershell
rg -n -i "CCBot|CommonCrawl|Common Crawl|GPTBot|ClaudeBot|PerplexityBot" reports scripts app lib public data
rg --files reports scripts | rg -i "log|cloudflare|gsc|crawler|bot|access"
```

Findings:

- `scripts/cloudflare/audit-scholarshiptop-traffic.mjs` contains tracking for `ClaudeBot`, `GPTBot`, and `CCBot`.
- Existing report `reports/cloudflare/scholarshiptop-traffic-audit-2026-05-21.md` shows AI crawler activity:
  - `GPTBot`: 74,811 requests, 56.8% of the reported top user-agent set.
  - `ClaudeBot`: 1,916 requests, 1.5%.
  - `verifiedBotCategory: AI Crawler`: 110,615 requests.
  - `verifiedBotCategory: Search Engine Crawler`: 2,589 requests.
- This confirms at least some AI crawler access historically.
- Live Cloudflare/Railway logs were not re-queried in this audit. No fresh log-level confirmation of `CCBot` requests was obtained.

## Common Crawl Index API Check

Command shape used:

```powershell
# Fetch index list
https://index.commoncrawl.org/collinfo.json

# Query sampled latest indexes
https://index.commoncrawl.org/{INDEX_ID}-index?url={URL}&output=json&limit=5
```

Indexes sampled:

- `CC-MAIN-2026-21` — May 2026 Index
- `CC-MAIN-2026-17` — April 2026 Index
- `CC-MAIN-2026-12` — March 2026 Index

URLs checked:

- `scholarshiptop.com/*`
- `https://scholarshiptop.com/`
- `https://scholarshiptop.com/scholarships`
- `https://scholarshiptop.com/resources/how-to-apply-for-scholarships`
- `https://scholarshiptop.com/resources/scholarships-for-international-students-guide`

Results:

| Index | Query | API status | Hits |
|---|---|---:|---:|
| `CC-MAIN-2026-21` | domain wildcard and sample URLs | 404 | 0 |
| `CC-MAIN-2026-17` | most queries | 404 | 0 |
| `CC-MAIN-2026-17` | `/scholarships` query | 503 | 0 |
| `CC-MAIN-2026-12` | most queries | 404 | 0 |
| `CC-MAIN-2026-12` | `/scholarships` query | 503 | 0 |

Additional attempt:

- A broader all-index wildcard scan was attempted but timed out against `index.commoncrawl.org`.

Conclusion:

- Public Common Crawl index inclusion was not confirmed for the sampled URLs in the latest three indexes.
- This is a visibility gap, not proof of blocking. The live site allows `CCBot` by robots and header checks.
- Recommended follow-up is a repeatable Common Crawl check workflow that queries latest indexes periodically and records first confirmed captures.

## Risks

### RSS / Feed Discovery Risks

- No RSS/Atom feed means feed readers, aggregators, some AI discovery systems, and content monitoring tools have fewer structured signals for new ScholarshipTop resources.
- No `rel=alternate` feed link in HTML means crawlers cannot discover a feed from page metadata.
- No feed link in `robots.txt` means there is no crawler hint beyond sitemap discovery.

### Common Crawl Risks

- CCBot is not blocked by the tested production headers, but Common Crawl index inclusion was not confirmed.
- HTML responses are dynamic/no-store through Cloudflare. This is not a blocker, but may be less efficient for large public crawlers.
- If Cloudflare bot rules differ for GET versus HEAD, region, request rate, or challenge state, this audit may not catch every crawler access issue.
- Programmatic SEO pages sampled were crawlable and contentful, but the lack of hreflang on sampled SEO landing pages may limit multilingual/GEO clarity if localized versions exist.

### AI Visibility Risks

- Missing RSS reduces structured content distribution to AI monitoring and aggregation systems.
- Historical Cloudflare data shows GPTBot/ClaudeBot access, but fresh logs were not pulled in this audit.
- If future Cloudflare/WAF changes add bot scoring challenges, AI crawler readiness should be re-tested with real GET requests and logs.

### Safety Risks When Adding RSS

- RSS must not expose private, draft, paywalled-only, noindex, account, checkout, API, auth, or admin URLs.
- Feed entries should use absolute canonical production URLs only.
- Feed descriptions should avoid leaking internal metadata, prompts, staging URLs, or unpublished content.

## Recommended Next Stages

### Stage 1 — Minimal RSS for Blog/Resources

Implement a single safe feed:

- Route: `/rss.xml`
- Scope: latest public blog/resources articles only.
- Fields: `title`, `link`, `description`, `pubDate`, `guid`.
- Header: `Content-Type: application/rss+xml; charset=utf-8`.
- Cache/revalidate: use a conservative public cache/revalidate policy consistent with existing sitemap behavior.
- URLs: absolute canonical `https://scholarshiptop.com/...` only.
- Exclusions: no draft, noindex, private, auth, API, checkout, account, staging, preview, or paywalled-only pages.

Do not include scholarship detail pages in the first feed unless indexability, canonical URL quality, and update cadence are explicitly validated.

### Stage 2 — Feed Discovery Signals

- Add `rel="alternate" type="application/rss+xml"` in the global HTML head or relevant layout.
- Add an optional feed reference in `robots.txt` after RSS is live.
- Keep the existing `Sitemap` directive.

### Stage 3 — AI Crawler Access Policy Audit with Cloudflare

- Review Cloudflare bot/WAF/firewall rules for `CCBot`, `GPTBot`, `ClaudeBot`, `PerplexityBot`, `Googlebot`, and `Bingbot`.
- Confirm real GET access, not only HEAD access.
- Re-run Cloudflare log queries for `CCBot`, `CommonCrawl`, `GPTBot`, `ClaudeBot`, and `PerplexityBot`.
- Watch for `403`, `429`, challenge pages, or bot-score blocks.

### Stage 4 — Common Crawl URL Check Workflow

- Add a repeatable check script or runbook for latest Common Crawl indexes.
- Track:
  - homepage
  - `/scholarships`
  - `/resources`
  - top resources
  - selected programmatic SEO pages
  - sitemap URLs
- Record first confirmed captures and crawl timestamps.

### Stage 5 — GEO/AI Visibility Content Distribution Plan

- Use RSS, sitemap, `llms.txt`, internal linking, and resource updates as coordinated discovery signals.
- Monitor how AI systems describe ScholarshipTop after Stage 1–3 trust positioning rewrites.
- Build a small dashboard/report for crawler hits and AI/GEO brand positioning over time.

## Future Acceptance Criteria

RSS/feed implementation should be accepted only when:

- `/rss.xml` returns `200`.
- Response header is `Content-Type: application/rss+xml; charset=utf-8`.
- XML is valid.
- Feed includes at least 20 recent public materials.
- Each item has `title`, `link`, `description`, `pubDate`, and `guid`.
- Feed URLs are absolute canonical production URLs.
- Feed contains only indexable public URLs.
- Feed contains no draft, noindex, private, auth, checkout, API, account, preview, or staging URLs.
- HTML includes `rel="alternate" type="application/rss+xml"`.
- `robots.txt` contains `Sitemap` and optionally the feed link.
- `CCBot` does not receive `403`, `429`, or `5xx` on homepage, `robots.txt`, `sitemap.xml`, `/rss.xml`, and sample public pages.

## Non-Changes Confirmed

- No code changes were made.
- No database, migration, or Supabase changes were made.
- No auth changes were made.
- No payments, checkout, or Lemon Squeezy changes were made.
- No sitemap or robots changes were made.
- No Cloudflare settings were changed.
- No env files were changed.
- No commit or push was performed.

