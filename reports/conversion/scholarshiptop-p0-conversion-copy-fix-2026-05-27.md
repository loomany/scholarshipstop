# ScholarshipTop P0 Conversion Copy Fix

Date: 2026-05-27  
Mode: Stage 1 implementation. Scope limited to P0 visible sales/application surfaces from the conversion copy audit.

## Files Changed

- `lib/i18n/scholarshipDetailUiCopy.ts`
- `components/scholarships/scholarship-detail/ScholarshipDetailSections.tsx`
- `lib/scholarships/scholarshipUiModel.ts`
- `app/scholarships/ScholarshipDetailPageClient.tsx`
- `lib/seo/scholarshipSeoQualityPolicy.ts`
- `components/scholarships/ScholarshipCard.tsx`
- `services/content-hub/src/lib/aiResourcesPack.ts`
- `lib/content-hub/aiResourcesPackShared.ts`
- `components/essays/StaticEssayGuidePage.tsx`

## P0 Places Fixed

| Area | What changed |
|---|---|
| Scholarship detail warning copy | Replaced `verify on official source` / `independent discovery platform` language with workspace positioning: eligibility signals, deadlines, award details, provider application paths, saved shortlists, and AI help in one place. |
| `What to verify before applying` block | Renamed the block to `Application readiness`; changed intro and complete-listing note to focus on fit, materials, saving the opportunity, tracking deadlines, and moving toward the provider application path. |
| Detail trust block CTA | Replaced the visible `Disclaimer` CTA in the detail trust block with `View matches` and routed it to `/scholarships/hub/matches` instead of `/financial-aid-disclaimer`. |
| AI insights on scholarship detail | Replaced `Double-check every detail on the official source` and `not official rules` language with AI guidance that surfaces key details, eligibility signals, likely next steps, and provider application link when available. |
| Generated next steps | Replaced off-site verification steps with ScholarshipTop workflow steps: save to shortlist, prepare materials, track deadline, revisit application path, and use provider application link when ready to submit. |
| Premium/provider CTA title | Replaced `Premium subscription required to visit the provider website` with Premium workspace value copy from `detailUi.applyPremiumTitle`. |
| Scholarship card source badges | Replaced `Needs confirmation`, `Source unclear`, `Treat this as a lead`, and provider-page warning descriptions with positive source-quality/application-path signals. Card source badge prefix now says `Signal:` in English. |
| Card snippets and source quality descriptions | Rewrote card summary fallbacks, difficulty reasons, missing-data notes, and urgency descriptions to focus on organized details, fit, materials, deadlines, and application paths. |
| AI resource generation prompt | Removed the required `not an official scholarship provider` / `students should verify deadlines` disclaimer from the AI resource pack prompt and shared helper. Replaced with ScholarshipTop workspace positioning and provider application path guidance. |
| Essay guide disclaimer | Replaced the top essay guide disclaimer with sales-positive essay support copy: plan, draft, refine, and align essays with scholarship requirements to prepare stronger applications faster. |

## Phrases Replaced

- `Always verify the full eligibility rules on the official source before you apply.`
- `Deadline may have passed. Check the official provider page before applying.`
- `ScholarshipTop is an independent discovery platform... confirm deadlines, eligibility, and application links on the official provider page.`
- `What to verify before applying`
- `The official provider page controls final rules.`
- `Core listing fields look reasonably complete, but you should still confirm... on the official source.`
- `AI summary is based on limited listing data. Double-check every detail on the official source before you apply.`
- `not official rules`
- `Confirm every eligibility rule on the official program page.`
- `Review the official instructions...`
- `If no deadline is shown here, find the closing date on the official listing.`
- `Apply through the official site linked above.`
- `Premium subscription required to visit the provider website`
- `Needs confirmation`
- `Source unclear`
- `Treat this as a lead`
- `ScholarshipTop is a scholarship discovery/research platform, not an official scholarship provider... Students should verify...`
- `ScholarshipTop provides writing guidance... but it does not guarantee... Always confirm final rules...`

## Verification

`npm run lint`

- Result: blocked by existing project setup.
- Output: Next.js opened the interactive prompt `How would you like to configure ESLint?`
- No ESLint config was created because that would be outside the P0 copy scope.

`npm run build`

- Result: passed.
- Build completed successfully, including Next.js production compile, type/lint phase, and static page generation.

Targeted grep on P0 files:

```powershell
rg -n -i "verify every|double-check every|treat this as a lead|needs confirmation|source unclear|official source before you apply|Premium subscription required to visit the provider website" lib\i18n\scholarshipDetailUiCopy.ts components\scholarships\scholarship-detail\ScholarshipDetailSections.tsx lib\scholarships\scholarshipUiModel.ts app\scholarships\ScholarshipDetailPageClient.tsx lib\seo\scholarshipSeoQualityPolicy.ts components\scholarships\ScholarshipCard.tsx services\content-hub\src\lib\aiResourcesPack.ts lib\content-hub\aiResourcesPackShared.ts components\essays\StaticEssayGuidePage.tsx
```

- Result: no matches.

Broader repo grep still finds the same phrases in Stage 2 areas such as programmatic SEO JSON, resource/blog markdown, provider/trust pages, and existing reports. Those files were intentionally not changed in Stage 1.

`git diff --check` on changed P0 files:

- Result: passed.
- Only Git line-ending warnings were printed for existing Windows CRLF behavior.

## Explicit Non-Changes

- Payments were not changed.
- Lemon Squeezy was not changed.
- Supabase was not changed.
- Database/migrations were not changed.
- Auth was not changed.
- SEO JSON was not mass-edited.
- `llms.txt` and `llms-full.txt` were not changed.
- Terms, Privacy, and legal disclaimer pages were not changed.
- No commit or push was performed.

## Stage 2 Remaining Work

- Programmatic SEO JSON still contains large-scale `verify every`, `official source`, and `starting point` framing.
- `llms.txt` and `llms-full.txt` still teach AI crawlers that ScholarshipTop is non-official/discovery-only.
- FAQ, trust/about/how-it-works, provider pages, comparison pages, static resource pages, and polished AI-resource markdown still contain P1/P2 disclaimer-heavy copy.
- Some non-P0 helper text and legal/support pages still include guarantee/provider responsibility language, which should be reviewed separately without touching Terms/Privacy/Disclaimer substance.
- Existing reports also contain the old phrases as audit evidence and should remain as historical documentation.
