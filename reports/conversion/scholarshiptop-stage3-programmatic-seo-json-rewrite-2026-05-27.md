# ScholarshipTop Stage 3 Programmatic SEO JSON Trust Positioning Rewrite

Date: 2026-05-27

## Executive Summary

Stage 3 rewrote the programmatic scholarship SEO JSON content so it positions ScholarshipTop as a scholarship search and application workspace, not a weak directory or discovery-only starting point.

- JSON files scanned: 875
- JSON files changed: 874
- User-facing text fields changed: 4,958
- Initial required broad phrase audit before rewrite: 2,680 line hits across 794 files
- Initial exact old-pattern audit before rewrite: 741 line hits
- Expanded deterministic script audit before full rewrite: 7,112 bad-framing phrase hits
- Target validation hits before full rewrite: 448
- Final broad bad-framing hits after rewrite: 0
- Final target validation hits after rewrite: 0
- Final safety grep hits after rewrite: 0
- JSON parse validation: passed, 875 JSON files parsed
- Protected object validation: passed, `_meta` and `page_data` stayed unchanged in 874 changed JSON files
- `git diff --check`: passed; Git only reported Windows LF-to-CRLF normalization warnings
- `npm run build`: passed
- Commit hash: assigned after this report is committed; see final task response / `git log`

## What Changed

A deterministic local rewrite script was added at `scripts/seo/rewrite-scholarship-seo-content-stage3.ts`.

The script parses each file under `data/seo-scholarship-content`, rewrites only known user-facing text paths, and preserves internal metadata. It does not call external APIs, paid generation, Supabase, the database, or the network.

Rewritten user-facing field types:

- `seo_title` only if it contained bad framing
- `seo_description`
- `h1` only if it contained bad framing
- `intro`
- `supporting`
- `related_intro`
- `how_to_use[]`
- `who_for[]`
- `faq[].question`
- `faq[].answer`

Preserved field types:

- `_meta`
- `page_data`
- slugs
- canonical paths
- route paths
- generated dates
- counts
- provider names
- scholarship metadata
- tags
- index flags
- all numeric and structural fields

## Bad Framing Removed

The rewrite removed or softened repeated product/SEO language that told students to leave ScholarshipTop or distrust the page:

- "use this page as a starting point"
- "treat this page as a catalog filter"
- "open the official page to verify"
- "verify every detail"
- "double-check every detail"
- "official source before you apply"
- "official pages are the place to confirm"
- "not the final authority"
- "directory only"
- "discovery only"
- "details can change"
- "deadlines may change"
- "award amounts may change"
- "does not guarantee"

## New Workspace Framing Added

The replacement copy consistently frames ScholarshipTop as a useful application workflow:

- organized scholarship details
- eligibility signals
- award details
- deadline context
- effort level
- provider application paths
- shortlisting and planning
- moving from comparison toward submission when ready

Common replacement patterns include:

- "Use this ScholarshipTop view to compare organized opportunities by eligibility signals, award details, deadlines, effort level, and application path."
- "Use ScholarshipTop to compare fit, save relevant opportunities, prepare materials, track deadlines, and continue toward the provider application path when you are ready to submit."
- "ScholarshipTop highlights available deadline and award details in a structured format so you can prioritize opportunities and plan your next step."
- "When a provider application path is available, ScholarshipTop includes it so you can move from shortlist to submission more easily."
- "Final scholarship decisions are made by the relevant provider. ScholarshipTop helps you organize the research, compare opportunities, and prepare application materials with more context."

## Before / After Examples

### 1. `data/seo-scholarship-content/african-american.json` - `seo_description`

Old:

> African American scholarships in the USA: compare awards, deadlines, and requirements, then apply through each official program page.

New:

> African American scholarships in the USA: compare organized eligibility signals, award details, deadlines, requirements, effort level, and application paths, then continue toward provider application paths when you are ready to submit.

Why it improves positioning:

The old copy made the external page the center of value. The new copy makes ScholarshipTop the organized comparison and application-planning workspace.

### 2. `data/seo-scholarship-content/african-american.json` - `how_to_use[2]`

Old:

> Open the official page to verify current details

New:

> Use the provider application path when you are ready to submit

Why it improves positioning:

The new wording keeps the provider path as part of the application workflow without making ScholarshipTop sound unreliable.

### 3. `data/seo-scholarship-content/engineering__colorado.json` - `intro`

Old excerpt:

> Because some listed deadlines are coming up soon, it makes sense to review the date shown on each row promptly and verify every detail on the official source before you apply. If you want a focused set of engineering scholarships in Colorado, this page is a practical place to start.

New excerpt:

> ScholarshipTop highlights available deadline and award details in a structured format so you can prioritize opportunities and plan your next step. If you want a focused set of engineering scholarships in Colorado, this page is a practical organized place to plan.

Why it improves positioning:

The page now emphasizes structured deadline and award planning inside ScholarshipTop instead of telling students to verify every detail elsewhere.

### 4. `data/seo-scholarship-content/closing-soon.json` - `seo_description`

Old:

> Closing Soon scholarships in the USA: compare deadlines, award ranges, and requirements, then apply fast after verifying each listing.

New:

> Closing Soon scholarships in the USA: compare deadlines, award ranges, and requirements, then prioritize urgent next steps with organized details and provider-path context.

Why it improves positioning:

The new copy sells the urgency workflow and provider-path context without leading with distrust.

### 5. `data/seo-scholarship-content/can-international-students-apply-for-scholarships-usa.json` - `faq[1].answer`

Old excerpt:

> Use the catalog details to narrow the list by degree level, major, citizenship notes, and award type. Then verify on the official page that the program accepts your level, major, and international student status.

New excerpt:

> Use the catalog details to narrow the list by degree level, major, citizenship notes, and award type. Then use provider-path context in ScholarshipTop to understand whether the program accepts your level, major, and international student status.

Why it improves positioning:

The new answer keeps eligibility planning inside the ScholarshipTop workflow.

### 6. `data/seo-scholarship-content/amazon-scholarship-international-students.json` - `faq[3].answer`

Old excerpt:

> Treat this page as a catalog filter, not a guarantee that every row shares the same sponsor. Use the list to browse and compare relevant scholarships for international students, then verify the provider and full terms on the official listing page.

New excerpt:

> Use this ScholarshipTop view as a focused comparison workspace. Use the list to browse and compare relevant scholarships for international students, then review the provider and full terms on the structured listing detail page.

Why it improves positioning:

The new answer removes the weak "catalog filter" framing and turns the page into a focused comparison workspace.

## Validation

### JSON Parse

Command:

```bash
node -e "const fs=require('fs');const path=require('path');const dir='data/seo-scholarship-content';let n=0;for(const f of fs.readdirSync(dir)){if(!f.endsWith('.json'))continue;JSON.parse(fs.readFileSync(path.join(dir,f),'utf8'));n++;}console.log('parsed',n,'json files')"
```

Result:

```text
parsed 875 json files
```

### Protected Object Validation

Result:

```text
checked protected json objects 874
protected _meta/page_data unchanged
```

### Idempotence

Final dry-run of `scripts/seo/rewrite-scholarship-seo-content-stage3.ts` after the full rewrite:

```text
Mode: full dry-run
Files scanned: 875
Files changed: 0
Text fields changed: 0
Broad bad phrase hits before: 0
Broad bad phrase hits after: 0
Target validation hits before: 0
Target validation hits after: 0
Safety hits before: 0
Safety hits after: 0
```

### Targeted Old-Phrase Grep

Command:

```bash
rg -n -i "verify every|double-check every|starting point only|treat.*starting point|directory only|discovery only|not final authority|official source before you apply|not an official scholarship provider|official pages are the place|provider website controls|information may be outdated|use at your own risk|independently verify" data/seo-scholarship-content
```

Result: 0 hits.

### Safety Grep

Command:

```bash
rg -n -i "guarantee.*scholarship|guaranteed scholarship|guarantee.*acceptance|guaranteed acceptance|official provider|we award|we pay|100% accurate|100 percent accurate" data/seo-scholarship-content
```

Result: 0 hits.

### Extra Product-Framing Grep

An additional JSON-only product-framing grep for `verify`, `official source`, `official page`, `starting point`, `directory only`, `discovery only`, `not final authority`, `confirm`, `final rules`, and `guarantee` returned 0 hits in user-facing JSON content.

The remaining `official` matches in `data/seo-scholarship-content` are provider names inside protected metadata such as `_meta.pageData.topProviders[].name` and `page_data.topProviders[].name`, for example organization names that include the word "Officials". Those metadata fields were intentionally preserved.

### Repo-Wide Remaining Hits

Repo-wide hits for the old phrase set remain outside Stage 3 scope:

- historical reports under `reports/`
- old content/resource drafts outside `data/seo-scholarship-content`
- existing generated or built artifacts
- validation regex literals in the Stage 3 script

There are no remaining target hits in `data/seo-scholarship-content`.

### `git diff --check`

Result: passed. Git printed LF-to-CRLF normalization warnings on Windows, but returned exit code 0 and did not report whitespace errors.

### Build

Command:

```bash
npm run build
```

Result: passed. Next.js compiled successfully and generated 206 static pages.

Lint was not run separately because Stage 3 requested build validation; the Next.js build completed its lint/type-check phase successfully.

## Representative Post-Deploy Smoke URLs

Suggested pages to check after deploy, using the existing canonical route mapping:

- `/scholarships/full-ride`
- `/scholarships/engineering`
- `/scholarships/closing-soon`
- `/scholarships/african-american`
- `/scholarships/engineering/colorado`
- `/scholarships/can-international-students-apply-for-scholarships-usa`
- `/scholarships/amazon-scholarship-international-students`
- one sitemap-indexed country page such as `/scholarships/california`
- one page with FAQ schema from the rewritten resource-style JSON set

No route or sitemap logic was changed in Stage 3.

## Non-Changes / Protected Areas

Confirmed untouched:

- Supabase
- database files
- migrations
- auth
- payment logic
- Lemon Squeezy
- checkout
- Terms
- Privacy
- Financial Aid Disclaimer legal substance
- routing
- sitemap logic

Also confirmed:

- No paid OpenAI/API generation was used.
- No external network calls were used.
- No DB calls were used.
- `_meta` and `page_data` were preserved.
- No push was performed.

## Remaining Work

Stage 4 candidates:

1. Post-deploy smoke test representative SEO URLs.
2. Monitor Google Search Console, Bing, and Yandex recrawl behavior.
3. QA top-traffic programmatic SEO pages after deployment.
4. Optionally clean up out-of-scope old resource drafts and historical report copies that still contain the old audit language.
5. Add a lightweight AI/GEO brand-positioning monitoring report for future generated content.
