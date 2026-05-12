# Telegram first-touch admin alert enrichment

## Summary

First-touch admin Telegram alerts now include a **Клиент** (client diagnostics) block: device/OS, browser, bot flags, masked IP, country (from edge headers when present), referrer/UTM summary, human-readable **Reason**, and a truncated User-Agent. **No database migration**; bots still do not receive the normal first-touch Telegram ping (`!is_likely_bot` unchanged).

## Files changed

| File | Change |
|------|--------|
| `lib/analytics/visitorDiagnostics.ts` | **New:** `maskIp`, `getClientIpFromHeaders`, `getCountryFromHeaders`, `summarizeUserAgent`, `explainTrafficReason` |
| `lib/analytics/resolveTrafficChannel.ts` | Hostname-based search referrer detection (google.\*, bing, yahoo, duckduckgo, yandex, baidu, Brave); Google/Bing **web search** referrers → `organic_search`; Bing `/search` excluded from Copilot AI heuristic |
| `app/api/analytics/first-touch/route.ts` | Builds diagnostics from `request.headers` + UA; passes enriched payload to `notifyTelegramAdminsVisitorFirstTouch` |
| `lib/telegram/bot.ts` | Extended `VisitorFirstTouchAdminPayload`; **Статус:** `Human-like visit` / `Likely bot`; short-view **Клиент** block; Telegram fold reload selects `is_likely_bot`, `user_agent_snapshot` |
| `lib/analytics/__tests__/visitorDiagnostics.test.ts` | **New** unit tests |
| `lib/analytics/__tests__/resolveTrafficChannel.test.ts` | **New** unit tests |

## Example Telegram message (illustrative)

```
Новый визит на ScholarshipTop
Статус: Human-like visit
Канал: Direct / unknown

Страница входа: /scholarships/...

Клиент
Device: Desktop / ChromeOS
Browser: Chrome 147
Bot: no
Bot name: —
Country: US
IP: 203.0.113.xxx.xxx
Referrer: none
UTM: none
Reason: No referrer or UTM; browser-like direct/opened link

UA: Mozilla/5.0 (X11; CrOS x86_64...) Chrome/147...
```

(Exact HTML uses Telegram `<b>` tags and escaped dynamic text.)

## Headers used (IP / country)

| Header | Use |
|--------|-----|
| `cf-connecting-ip` | Client IP (Cloudflare) |
| `x-real-ip` | Client IP |
| `x-forwarded-for` | First hop IP |
| `true-client-ip` | Client IP (Akamai-style) |
| `cf-ipcountry` | Country code (Cloudflare) |
| `x-vercel-ip-country` | Country (Vercel) |
| `x-country-code` | Generic country hint |

**Risks:** On some hosts (e.g. plain Railway without Cloudflare), IP/country may be **unknown** — the alert shows `unknown` for country and IP.

## Database

- **No schema changes.** `anonymous_visitor_first_touch` unchanged.
- Bots are still stored with `is_likely_bot: true`; **Telegram first-touch alert is still skipped** when `is_likely_bot` is true.

## How to test manually

1. Open the site in **Incognito** (or clear `st_visitor_id` cookie) so a new `visitor_id` is minted.
2. Trigger `POST /api/analytics/first-touch` (loading any page with `AnalyticsTracker` in the root layout is enough after debounce).
3. Check Telegram for the new **Клиент** block and **Reason** line.
4. Behind **Cloudflare**, confirm `Country` / masked `IP` populate when headers are present.

## Commands run

- `npx tsc --noEmit`
- `npm run build`
- `npx tsx --test lib/analytics/__tests__/visitorDiagnostics.test.ts lib/analytics/__tests__/resolveTrafficChannel.test.ts`

## Follow-ups (not in this patch)

- Optional `ADMIN_ALERT_CRAWLERS` separate channel for bots (per earlier audit).
- Persist diagnostics in DB only if product later requires historical IP/UA in SQL.
