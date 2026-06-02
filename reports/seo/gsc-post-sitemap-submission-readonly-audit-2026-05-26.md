# GSC post-sitemap submission — READ-ONLY live audit

**Date:** 2026-05-26 (UTC)  
**Property:** `https://scholarshiptop.com/`  
**Mode:** Read-only — no code/DB/sitemap/robots/revalidate/commit/push/autopilot  
**Machine-readable evidence:** `reports/seo/_tmp-gsc-readonly-audit-2026-05-26.json`

---

## Executive summary

| Metric | Value |
|--------|------:|
| URLs checked (live GET) | **60** |
| OK_WAIT (valid indexable, wait for Google) | **23** |
| OK_INTENTIONAL_NOINDEX | **26** |
| OK_CANONICAL | **3** |
| QUALITY_WEAK | **2** |
| **FIX_NEEDED (live bugs)** | **3** (2 real + 1 debatable redirect) |

**Sitemap:** index **200** (~1.3s), **71** child sitemaps all **200**, **60 006** `<loc>` URLs, **0** `/en/` paths, **0** query URLs in sitemaps. Spot-check of 40 sitemap URLs: **0** live 404, **0** live `noindex` in HTML.

**Verdict:** After sitemap/indexation fixes, **most GSC “not indexed” rows for canonical EN/ES scholarship, provider, compare, and essay URLs are likely stale crawl history or intentional `noindex` on thin/localized compare — not broken production.** Sitemap hygiene looks healthy. **Do not emergency-fix** indexation; **wait ~72h** for recrawl, but **schedule a small P1 patch** for two noisy query URLs that are still indexable on live HTML.

---

## Methodology and limitations

1. **No GSC CSV/API export** was found in the repo for this run. The “Crawled – currently not indexed” set is a **stratified proxy sample** (30 URLs): scholarship / provider / compare / essay paths from prior production audits (`scholarshiptop-url-sample-audit-2026-05-25.csv`, `googlebot-noindex-validation.md`) plus known GSC legacy paths.
2. Each URL was fetched with redirect follow; parsed `robots`, `canonical`, `<title>`, first `<h1>`, approximate visible word count (HTML stripped).
3. **Sitemap membership** checked against a full live crawl of `/sitemap.xml` and all child sitemaps (**60 006** URLs).
4. **No** URL Inspection API, Indexing API, revalidate, or Supabase writes.

If you export exact URL lists from GSC (Coverage → issue → Export), re-run the same checks against that file for 1:1 parity.

---

## 1. Sitemap audit (production)

| Check | Result |
|-------|--------|
| `GET /sitemap.xml` | **200**, ~1270 ms |
| Child sitemaps listed | **71**, all **200** |
| `/en/` in any `<loc>` | **0** child files flagged |
| Query strings in `<loc>` | **0** child files flagged |
| Total URLs in sitemaps | **60 006** |
| Spot-check 40 sitemap URLs (HEAD/GET) | **0** returned 404; **0** returned `noindex` in HTML |

**Notes**

- Largest/slowest shard: `locale-fr-scholarships-detail-db.xml` (~18.4s, **15 301** URLs) — performance/crawl-budget concern, not a broken sitemap.
- Legacy wrong paths (`/sitemaps/scholarships.xml`, `/sitemaps/cross-country.xml`) correctly return **404** JSON and are **not** in the index (expected).

---

## 2. “Crawled, not indexed” proxy sample (n=30)

| Surface | n | OK_WAIT | OK_INTENTIONAL_NOINDEX | QUALITY_WEAK | FIX_NEEDED |
|---------|--:|--------:|------------------------:|-------------:|-----------:|
| Scholarships | 8 | 5 | 0 | 0 | 0 |
| Providers | 7 | 7 | 0 | 0 | 0 |
| Compare | 8 | 1 | 6 | 0 | 0 |
| Essays | 7 | 2 | 0 | 2 | 0 |
| **Total** | **30** | **22** | **6** | **2** | **0** |

### Interpretation

- **OK_WAIT (22):** Live **200**, `index, follow` (or default indexable), self-canonical, in sitemap where applicable. Google can index after recrawl; aligns with post-sitemap submission wait.
- **OK_INTENTIONAL_NOINDEX (6):** EN dynamic compare pages (`loyola…vs worcester`, `new-york-vs-california` → canonical slug redirect) and **ES/FR** `california-vs-texas` with `noindex, follow` and **excluded from localized compare sitemaps** — matches 2026-05-25 quality policy.
- **QUALITY_WEAK (2):** `/essays/checklist`, `/essays/outline` — indexable, in sitemap, ~390–400 visible words; improve content later, not a technical blocker.
- **Stale GSC URLs (still useful signal):** Several samples that were **200** on 2026-05-25 now return **404** + `noindex` and are **not** in sitemap (e.g. `benjamin-h-murray-memorial-scholarship-9504`, short essay slugs `how-to-write-richard-scholarship-essay`). GSC likely still shows old URLs; live site behavior is correct.

**Representative OK_WAIT examples**

| URL | Status | Robots | In sitemap | Words |
|-----|--------|--------|------------|------:|
| `/scholarships/harjit-sandhu-criminal-justice-scholarship-uue8kcn4pdkc` | 200 | index, follow | yes | ~768 |
| `/scholarships/for-women` | 200 | index, follow | yes | ~741 |
| `/es/scholarships/eitel-scholarship-8524` | 200 | index, follow | yes | ~787 |
| `/providers/loyola-university-chicago` | 200 | (default index) | yes | ~1868 |
| `/compare/states/california-vs-texas` | 200 | (default index) | yes | ~891 |

---

## 3. “Excluded by noindex” bucket (n=10)

| URL | Live robots | Canonical | Verdict |
|-----|-------------|-----------|---------|
| `/scholarships?page=2` | noindex, follow | `/scholarships` | OK_INTENTIONAL_NOINDEX |
| `/resources?cat=ai` | noindex, follow | `/resources` | OK_INTENTIONAL_NOINDEX |
| `/scholarships?utm_source=newsletter` | noindex, follow | `/scholarships` | OK_INTENTIONAL_NOINDEX |
| `/providers?page=2` | noindex, follow | `/providers` | OK_INTENTIONAL_NOINDEX |
| `/essays?page=2` | noindex, follow | `/essays` | OK_INTENTIONAL_NOINDEX |
| Detail `?return_to=…` (404 slug) | noindex | — | OK_INTENTIONAL_NOINDEX |
| `/scholarships?tab=matches` | **index, follow** (redirect → `/scholarships/hub/matches`) | hub | **FIX_NEEDED** (see P2) |
| `/scholarships/hub/matches?page=2` | **index, follow** | `/scholarships/hub/matches` | **FIX_NEEDED** |
| `/compare?state=california` | **(none → indexable)** | `/compare` | **FIX_NEEDED** |

**8/10** match intentional noisy-query / pagination policy. **2** are real live gaps vs policy intent.

---

## 4. “Alternate page with proper canonical” bucket (n=10)

| URL | Behavior | Verdict |
|-----|----------|---------|
| `?sort=deadline`, `?category=…`, `?cat=ai`, `?return_to=…` | noindex + clean canonical | OK_INTENTIONAL_NOINDEX / OK_CANONICAL |
| `www.scholarshiptop.com/scholarships` (path) | 404 | OK (malformed; not in sitemap) |
| `/en/scholarships` | 404 | OK (no `/en` routes) |
| `www` host redirect | 301 → apex | OK_CANONICAL |
| `/scholarships/hub/matches?page=2017` | noindex, follow | OK_INTENTIONAL_NOINDEX |
| `/fr/resources/…?cat=guides` | noindex, follow | OK_INTENTIONAL_NOINDEX |

**0** canonical bugs on indexable money pages in this sample.

---

## 5. 404 / redirect / soft-404 / 5xx bucket (n=10)

| URL | Status | Final URL | In sitemap | Verdict |
|-----|--------|-----------|------------|---------|
| `/sitemaps/scholarships.xml` | 404 | self | no | OK (wrong legacy path) |
| `/sitemaps/cross-country.xml` | 404 | self | no | OK |
| `/en/scholarships` | 404 | self | no | OK |
| Fake provider / essay / scholarship slugs | 404 | self | no | OK |
| `/study-in-canada-vanier-…-2019` | **308** | `/scholarships/vanier-canada-graduate-scholarships` | no | OK (legacy alias) |
| `/compare/universities/harvard-…-mit` | 404 | self | no | OK (slug not in catalog) |

**No 5xx** observed. **No** 404 URLs found **inside** current sitemaps in spot-check.

---

## 6. P0 / P1 action list

### P1 — fix in next deploy (real live vs policy)

1. **`/scholarships/hub/matches?page=2` (and `page>1`)**  
   - **Live:** `meta robots: index, follow`  
   - **Expected:** `noindex, follow` per `scholarshipHubListingQueryIsNonCanonical` / `isSeoNoiseQuery` (`page` key).  
   - **Risk:** GSC discovers paginated hub URLs from internal links; duplicate indexation / crawl waste.

2. **`/compare?state=california` (and similar undocumented query keys)**  
   - **Live:** no `robots` meta → default indexable; canonical → `/compare`.  
   - **Expected:** `noindex, follow` like other filter views (`hasNonCanonicalView` only checks `page`, `q`, `cat`, `sort`).  
   - **Risk:** GSC “Alternate page” / duplicate compare hub variants.

### P2 — monitor / optional

3. **`/scholarships?tab=matches`**  
   - **308/200** to `/scholarships/hub/matches` (clean, indexable hub).  
   - Historical GSC noindex on `?tab=` may be **stale**; redirect removes query before render. Low urgency unless GSC still inspects the parameterized URL.

4. **Thin static essays in sitemap** (`/essays/checklist`, `/essays/outline`) — QUALITY_WEAK; consider depth pass or later noindex if quality threshold tightens.

### P0 — none from this sample

No indexable URL in sitemap returned **404/5xx**, wrong global `noindex`, or missing child sitemap **200**.

---

## 7. Classification totals (all 60 URLs)

| Class | Count | Meaning |
|-------|------:|---------|
| OK_WAIT | 23 | Technically indexable; wait for Google recrawl |
| OK_INTENTIONAL_NOINDEX | 26 | Policy/noise/thin localized/404 — expected |
| OK_CANONICAL | 3 | Redirect or canonical consolidation — expected |
| QUALITY_WEAK | 2 | Indexable but thin |
| FIX_NEEDED | 3 | Live HTML ≠ policy (2 confirmed + 1 redirect edge) |

---

## 8. Recommendation: wait 72h or fix now?

| Question | Answer |
|----------|--------|
| Are GSC errors mostly old data? | **Mostly yes** for canonical scholarship/provider/essay URLs and intentional compare noindex. Many 404 samples are **removed slugs** no longer in sitemap. |
| Is sitemap submission healthy? | **Yes** — index + children OK, no `/en`, no query URLs, spot-check clean. |
| Emergency fix needed? | **No** for sitemap/indexation rollout. |
| What to do now? | **Wait ~72 hours** after sitemap resubmit; monitor Coverage “Crawled – not indexed” **count trend**. |
| What not to wait on? | **P1** hub pagination + compare `?state=` noindex (small metadata/query gate fix when you allow a code change). |

---

## 9. Suggested follow-up (when code changes are allowed)

1. Ensure `generateMetadata` for `/scholarships/hub/[segment]` receives `searchParams` so `page>1` emits `noindex, follow` (verify in HTML, not only in helper).
2. Extend `parseCompareIndexSearchParams` / `hasNonCanonicalView` to treat `state` (and any other filter keys) as non-canonical.
3. Export GSC issue URL CSVs and re-run this audit 1:1 against exported lists.
4. Optional: URL Inspection (live test) on 5 OK_WAIT samples after 72h to confirm Google sees `index, follow`.

---

## Appendix: slow child sitemaps (>2s fetch)

| Child sitemap | ms | URLs |
|---------------|---:|-----:|
| `locale-fr-scholarships-detail-db.xml` | 18353 | 15301 |
| `locale-es-scholarships-detail-db.xml` | (similar tier) | ~15k |
| `essays-*.xml` shards | 1500–2300 | 244–255 each |

These are operational crawl-budget signals, not indexation defects.
