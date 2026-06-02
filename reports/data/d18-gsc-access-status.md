# D18 GSC Access Status

Date: 2026-06-01

## API check result

| Item | Status |
|---|---|
| Credentials present locally | **Yes** (`GOOGLE_INDEXING_CLIENT_EMAIL` + private key via `.env.local`) |
| Search Analytics API | **403 Forbidden** |
| Property tested | `https://scholarshiptop.com/` |
| Error | User does not have sufficient permission for site |

## Conclusion

**Manual GSC export required.** Automated Performance pull cannot run until service account is added to Search Console property with sufficient access.

## What works without API

- Production URL/sitemap/robots/canonical checks (D18 indexing readiness **PASS**)
- Manual URL Inspection in Search Console UI
- Manual Performance → Pages export

## What is blocked

- `d18-gsc-performance-export.csv` automated fill
- Query-level top queries from API
- Programmatic indexing status via URL Inspection API

## Fix steps (ops — not code)

1. Open [Google Search Console](https://search.google.com/search-console)
2. Settings → Users and permissions
3. Add service account email from local env (do **not** commit)
4. Grant **Full** access (or minimum needed for Search Analytics + URL Inspection)
5. Confirm property URL matches: `https://scholarshiptop.com/` (trailing slash) or set `GOOGLE_SEARCH_CONSOLE_SITE_URL`
6. Re-run: `dotenv -e .env.local -- npx tsx reports/data/_d18-gsc-pull.ts`

See: `d18-gsc-manual-export-checklist.md`

## Status file

`d18-gsc-access-status.json` — `{ "available": false, "error": "403: ..." }`
