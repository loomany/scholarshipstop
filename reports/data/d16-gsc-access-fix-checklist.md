# D16 GSC Access Fix Checklist

Date: 2026-06-01

D15 automated Search Analytics pull failed with **403 Forbidden** — the indexing service account is not permitted on the Search Console property. This is an **access/configuration task**, not a site code bug.

## Steps

1. Open [Google Search Console](https://search.google.com/search-console) for **scholarshiptop.com**
2. Go to **Settings → Users and permissions**
3. Add the service account email from `GOOGLE_INDEXING_CLIENT_EMAIL` (local `.env.local` only — **never commit**)
4. Grant **Full** access (or sufficient access for URL Inspection + Performance export)
5. Confirm property URL matches code:
   - URL-prefix: `https://scholarshiptop.com/`
   - Or domain property: `sc-domain:scholarshiptop.com` (must match `GOOGLE_SEARCH_CONSOLE_SITE_URL` if set)
6. After access is granted, rerun GSC pull:
   ```bash
   dotenv -e .env.local -- npx tsx reports/data/_d15-gsc-pull.ts
   ```
7. If API automation is not needed, manually export **Performance → Search results → Pages** for **7** and **28** days and fill `d15-search-console-priority-url-status.csv`

## URL Inspection after D16 deploy

Request indexing (indexable only):

- `/resources/medical-scholarships-guide`
- `/essays/career-goals`
- `/providers/loyola-university-chicago`
- `/resources/best-scholarships-texas-international-students`

Inspect only — **do not request indexing**:

- `/scholarships/texas`
- `/compare/states/california-vs-texas`
- `/compare/universities/university-of-massachusetts-amherst-vs-university-of-south-florida`

## Security

- Do not store private keys or service account JSON in the repo
- Do not commit `.env*` files

See also: `reports/data/d15-url-inspection-priority-list.md`
