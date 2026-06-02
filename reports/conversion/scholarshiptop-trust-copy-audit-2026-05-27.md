# ScholarshipTop Trust Copy Audit

Date: 2026-05-27  
Mode: Audit only. No product copy, source code, metadata, database, payment, checkout, or Supabase changes were made.

## Scope And Method

Checked public UI copy, scholarship listings and detail pages, pricing/paywall copy, onboarding and quiz surfaces, dashboard/account surfaces, AI and GPT prompts, essay support, FAQ, footer, trust/legal pages, resources/blog content, comparison pages, provider pages, SEO/GEO content, `llms.txt`, `llms-full.txt`, and generated scholarship SEO JSON.

Required ripgrep searches were run for the English and Russian phrase sets from the brief. Repetitive generated SEO/content hits are grouped below so the report stays actionable while still capturing scale.

## Findings

| Priority | File / Route | Current text / meaning | Why it hurts conversion | Recommended direction |
|---|---|---|---|---|
| P0 | `lib/i18n/scholarshipDetailUiCopy.ts:229-251` / `/scholarships/{slug}` | Detail UI says `Always verify the full eligibility rules on the official source before you apply`, `Deadline may have passed`, and `ScholarshipTop is an independent discovery platform... confirm deadlines, eligibility, and application links on the official provider page.` | This sits directly in the application flow. The user can conclude Premium is not enough because they still have to re-check the core value elsewhere. | Reframe as application guidance: ScholarshipTop organizes eligibility signals, deadlines, requirements, provider link, and next steps in one workspace; provider link is for final submission when required. |
| P0 | `components/scholarships/scholarship-detail/ScholarshipDetailSections.tsx:177-249` / `/scholarships/{slug}` | Visible block heading: `What to verify before applying`; copy says official provider controls final rules and links to Methodology/Disclaimer. | A trust block on the sales/application surface becomes a warning block. It interrupts momentum right where the user should feel guided. | Rename to `Application readiness` or `Details organized for your next step`; keep provider-source transparency lower on the page or in legal/trust context. |
| P0 | `lib/i18n/scholarshipDetailUiCopy.ts:332-347` / AI insights on scholarship detail | AI copy says `Double-check every detail on the official source`, `not official rules`, and `Things to double-check on the official page.` | The AI layer is supposed to sell Premium guidance, but it repeatedly tells users its output is secondary and sends them away. | Make AI say it surfaces key details, eligibility signals, likely next steps, and the provider application link when available. Keep uncertainty as a small confidence signal, not the primary message. |
| P0 | `lib/scholarships/scholarshipUiModel.ts:560-583` / scholarship detail next steps | Generated next steps include `Confirm every eligibility rule on the official program page`, `Review official instructions`, `find the closing date on the official listing`, and `Apply through the official site linked above.` | The product-generated action plan is mostly an off-site checklist. That weakens the idea that ScholarshipTop is the workspace that helps users move faster. | Rewrite next steps around using the saved listing, eligibility signals, deadline tracking, required documents, essay support, and provider link for submission. |
| P0 | `app/scholarships/ScholarshipDetailPageClient.tsx:1693-1725` / Premium-gated provider CTA | Locked CTA is titled `Premium subscription required to visit the provider website`; unlocked CTA centers `provider website`. | Premium value is framed as paying to leave ScholarshipTop, not paying for organized scholarship intelligence and application support. | Frame Premium as unlocking organized details, deadlines, provider application link, saved shortlist, smart filters, and AI help in one place. |
| P0 | `lib/seo/scholarshipSeoQualityPolicy.ts:97-132` + `components/scholarships/ScholarshipCard.tsx:602-648` / cards and listing badges | Source badges describe listings as `Needs confirmation`, `Source unclear`, `Treat this as a lead`, and tell users to confirm final rules on provider pages. | Cards are a high-volume conversion surface. Tooltips and labels can make the whole catalog feel tentative. | Keep source quality signals but use positive labels such as `Provider link available`, `Structured from provider-facing data`, `Application path included`, with deeper methodology linked separately. |
| P0 | `services/content-hub/src/lib/aiResourcesPack.ts:53-63` + `lib/content-hub/aiResourcesPackShared.ts:37` / AI resource generation prompt | Required AI disclaimer: `ScholarshipTop is a scholarship discovery/research platform, not an official scholarship provider... Students should verify deadlines, amounts, and eligibility on official provider pages.` | This prompt bakes anti-conversion positioning into AI-generated articles and resource pages at scale. It also creates a GEO signal that LLMs may repeat. | Replace required disclaimer with honest SaaS positioning: ScholarshipTop organizes scholarship details and planning support; provider links are included for final submission steps when required. |
| P0 | `components/essays/StaticEssayGuidePage.tsx:30-44` / essay support guide pages | Global essay guide disclaimer says ScholarshipTop does not guarantee eligibility, selection, or award payment and tells users to confirm final rules on the official provider page. | Essay support is a Premium-adjacent value prop. Leading with guarantee/verification language reduces confidence in the paid essay workflow. | Keep guarantee limits in legal/footer context; on essay pages say ScholarshipTop helps plan, draft, refine, and align essays with scholarship requirements. |
| P1 | `app/faq/page.tsx:68-100` / `/faq` | FAQ answers say ScholarshipTop does not guarantee eligibility or acceptance, scholarship decisions are made by providers, users should always verify on official provider pages, and applications are handled on official websites. | FAQ is a trust-building sales page. The repeated negative formulation makes ScholarshipTop sound like a weak directory. | Recast around what ScholarshipTop does: discover, compare, shortlist, understand eligibility, prepare essays/documents, and reach provider submission paths. |
| P1 | `lib/i18n/resourceDetailUiCopy.ts:56-67` / resource articles | Global article disclaimer: `ScholarshipTop does not award scholarships or guarantee outcomes. Always verify requirements, deadlines, and award amounts on the official provider page.` | Every resource article can become a reminder that ScholarshipTop is not authoritative. This is especially bad for content that introduces Premium features. | Use a lighter footer note: ScholarshipTop organizes scholarship research and application planning; provider links are included for final submission when available. |
| P1 | `components/content-hub/StaticScholarshipGuidePage.tsx:35-36` + `lib/resources/staticScholarshipGuides.ts` / static resource guides | Guide pages say ScholarshipTop does not provide scholarships directly and repeatedly instruct users to confirm official sources. | Resources are acquisition and education surfaces. The message trains users to leave instead of treating ScholarshipTop as their scholarship workspace. | Shift guides toward `Use ScholarshipTop to build a shortlist, compare requirements, track deadlines, and prepare next steps.` |
| P1 | `data/content/polished/*.md` / blog and AI-resource content | 16 polished content files contain phrases such as `ScholarshipTop is discovery only`, `not an official scholarship provider`, `not as the final authority`, `verify deadlines`, and `official provider verification`. Examples: `can-chatgpt-help-find-scholarships-stage6c1-2026-05-21.md`, `how-to-verify-ai-generated-scholarship-lists-stage6d-2026-05-22.md`, `scholarshiptop-vs-fastweb-2026-05-21.md`. | These pages tell both users and AI crawlers that ScholarshipTop is only a starting point. That undermines Premium positioning and comparison pages. | Rewrite comparison/resource articles to position ScholarshipTop as a scholarship search and application workspace, while keeping provider submission and legal limits concise. |
| P1 | `public/llms.txt:4-44` + `public/llms-full.txt:7-145` / LLM visibility | LLM files say ScholarshipTop does not award scholarships, is not an official provider, applications happen on provider websites, users must verify amounts/deadlines, and agents should tell users to verify official pages. | This directly teaches ChatGPT/Google/AI crawlers to summarize ScholarshipTop as a directory that must be double-checked. | Rewrite LLM positioning around `scholarship search and application workspace`; keep limitations in a `Legal boundaries` section, not in the opening identity. |
| P1 | `data/seo-scholarship-content/*.json` / programmatic SEO pages | 874 of 875 SEO JSON files match audit phrases. Repeated meanings include `verify every detail on the official page`, `treat dollar figures as a starting point only`, `official pages are the place to confirm`, and `deadlines and requirements can change`. | This is the largest scale issue. Programmatic acquisition pages create the exact brand perception the audit is trying to avoid. | Regenerate SEO copy with a SaaS value frame: organized details, filters, eligibility signals, deadlines, effort level, shortlist building, and provider application paths. |
| P1 | `lib/scholarships/seoScholarshipPrompts.ts:63,149,240,294` + `lib/scholarships/seoScholarshipContentQuality.ts:303-307` / SEO generator | Prompt calls pages a `directory filter page` and instructs content to say `open official pages`, `verify on sponsor site`, `catalog + official sources`, and `starting point`. | The generator is the upstream cause of hundreds of weak SEO pages. Any future regeneration will recreate the problem. | Update prompt guidance before regenerating content: ScholarshipTop is a structured scholarship workspace, not merely a directory or starting point. |
| P1 | `app/scholarships/scholarshipsSlugPathPageBody.tsx:108-109` / cross-country SEO FAQ | FAQ says users must confirm details on provider application pages and ScholarshipTop does not guarantee selection or awards. | This appears in scholarship landing pages, close to acquisition and discovery intent. | Keep award-selection limits out of visible FAQ unless legally necessary; answer with how ScholarshipTop helps compare details and reach provider submission. |
| P1 | `app/scholarships/scholarshipCountrySeo.ts:120-138,189-219` / country SEO blocks | Copy says country pages are a `starting point` and users should always confirm requirements, dates, and restrictions on official scholarship pages. | Country pages are broad landing pages. `Starting point` downgrades the service before the user has engaged. | Position country pages as organized scholarship workspaces for a specific country, with provider links and application details included where available. |
| P1 | `lib/scholarships/universityHubJsonLd.ts:31-45` / university hub FAQ schema | FAQ schema says submit through the provider, deadlines/amounts can change, and users should double-check official sources. | Even if less visible, schema influences search and AI summaries. It reinforces `not enough here` messaging. | Make schema explain ScholarshipTop's structured comparison, eligibility, deadlines, and provider application paths without leading with doubt. |
| P1 | `lib/i18n/homePageCopy.ts:190-194` / homepage trust strip | Homepage trust card says applications usually happen through provider official sites and CTA is `Read disclaimer`. | A homepage trust CTA to a disclaimer is a conversion drag. It pushes legal caution into the first trust narrative. | Change the trust CTA direction to `See our data standards` or `How ScholarshipTop works`, with legal disclaimer linked in footer. |
| P1 | `lib/trust/trustPageContent.ts:100-326` + `components/trust/TrustPageTemplate.tsx:22-34` / `/about`, `/how-scholarshiptop-works`, methodology, ranking | About/how-it-works pages repeatedly say ScholarshipTop is not the award provider, recommendations do not guarantee awards, and users must confirm every final requirement on official provider pages. | Trust pages should strengthen the paid SaaS story. Here they often read like defensive legal pages. | Separate product trust from legal limitations: show how data is organized, updated, ranked, and used; move guarantee/provider disclaimers to legal-only areas. |
| P1 | `components/providers/ProvidersHubPageContent.tsx:188-195,390-403`, `app/providers/[id]/page.tsx:163-179,792-837`, `lib/i18n/providerDetailUiCopy.ts:115-150` / provider pages | Provider pages say this is a directory, ask what users should verify before applying, and highlight unclear official URLs. | Provider pages can support credibility, but the current framing makes ScholarshipTop feel like a weak intermediary. | Reframe provider pages as context hubs: connected scholarships, eligibility patterns, deadline/application paths, and provider links in one workspace. |
| P1 | `components/compare/StaticCompareGuidePage.tsx:30-39` + `lib/compare/staticCompareGuides.ts:57-73,193-195,259-261` / comparison pages | Comparison pages say scholarship details can change and users should confirm final terms on official provider pages. | Comparison pages should win confidence against alternatives. Repeated verification language makes ScholarshipTop sound less complete. | Focus comparison copy on organized international search, Premium matching, filters, essay support, and workflow advantages; keep a small legal note at the bottom. |
| P1 | `lib/i18n/scholarshipsMoreFiltersUiCopy.ts:170-216` + `lib/i18n/scholarshipsFilterPanelsUiCopy.ts:21-37` / filters/sidebar | Filter helper text says `Always confirm rules on official program page`, `verify before apply`, and `Marked verified — always confirm on official site.` | Filters are core SaaS utility. Verification warnings inside filters reduce confidence in the matching system. | Use product-positive helper copy: filters highlight eligibility signals and source quality so users can build stronger shortlists faster. |
| P2 | `app/terms/page.tsx:55-69` / `/terms` | Legal terms say ScholarshipTop does not guarantee awards, accuracy, completeness, or outcomes. | This is acceptable in legal context, but the same wording should not leak into Premium/detail/AI surfaces. | Keep in Terms. Do not reuse as global product copy. |
| P2 | `app/privacy-policy/page.tsx:88-96` / `/privacy-policy` | Privacy page includes scholarship/provider context and responsibility boundaries. | Acceptable legal/privacy context. Low conversion risk unless linked too prominently from sales copy. | Keep legal wording here; avoid using privacy/legal phrasing as CTA-adjacent trust copy. |
| P2 | `lib/trust/trustPageContent.ts:386-415` / `/financial-aid-disclaimer` | Financial aid disclaimer says ScholarshipTop is not a financial aid office, scholarship provider, lender, or law firm and does not guarantee awards. | This page is the right place for legal limits. Risk comes from linking it too prominently in selling moments. | Keep page. Link it from footer/legal menus, not from primary homepage/detail conversion blocks. |
| P2 | `lib/i18n/localizedFooterLinks.ts:41-80` + footer / global footer | Footer includes Verification, Ranking, Editorial Policy, Corrections, Disclaimer, and Scam Warning. | Legal/trust links in footer are acceptable, but too many legal-heavy links can make the brand feel defensive. | Keep footer links but consider grouping under `Trust & policies`; avoid duplicating disclaimer language above the footer. |
| P2 | `app/help/page.tsx:85-95` + `lib/trust/trustPageContent.ts:525-562` / `/help`, `/how-we-make-money` | Help and monetization pages say final decisions are provider-owned and paid tools cannot guarantee outcomes. | Reasonable support/legal context, but wording should remain away from Premium CTA and onboarding result surfaces. | Keep outcome limits here; on product pages lead with what Premium helps users do. |

## AI-Specific Notes

The live essay mentor and essay generation prompts are mostly not the problem. Files such as `lib/essay/interviewerAi.ts`, `app/api/essay/generate/route.ts`, and `lib/essays/essayHubMegaPrompt.ts` focus on essay quality, anti-fabrication, and profile collection rather than telling users to leave ScholarshipTop.

The larger AI risk is upstream content generation:

- `services/content-hub/src/lib/aiResourcesPack.ts` and `lib/content-hub/aiResourcesPackShared.ts` force a disclaimer that ScholarshipTop is not official and that students should verify deadlines, amounts, and eligibility on official provider pages.
- `lib/content-hub/polishAiResourceStage6cDrafts.ts` and `lib/content-hub/polishAiResourceStage6dDrafts.ts` hardcode phrases like `ScholarshipTop is discovery only`, `verify every award`, and `not as the final authority`.
- The polished content output shows these phrases already reached public/resource content.

## SEO / GEO Scale Notes

The SEO/GEO issue is broad:

- `public/llms.txt` and `public/llms-full.txt` explicitly instruct AI agents to describe ScholarshipTop as non-official, not an award provider, and something users must verify against official sources.
- `data/seo-scholarship-content` has 874 matching JSON files out of 875 total checked files.
- `lib/scholarships/seoScholarshipPrompts.ts` and `lib/scholarships/seoScholarshipContentQuality.ts` are upstream causes, so future regenerations will recreate the issue unless prompt policy changes first.

## Suggested Replacement Copy Examples

1. Scholarship detail trust block  
   Replace `What to verify before applying` with:  
   `Application guidance in one place`  
   `ScholarshipTop organizes eligibility signals, deadlines, award details, required materials, and the provider application path so you can decide faster and prepare your next step with less guesswork.`

2. Premium-gated provider CTA  
   Replace `Premium subscription required to visit the provider website` with:  
   `Upgrade to Premium to unlock organized scholarship details, deadlines, provider application links, saved lists, smart filters, and AI application support in one workspace.`

3. AI detail confidence note  
   Replace `Double-check every detail on the official source before you apply` with:  
   `I’ll surface the key details, eligibility signals, likely next steps, and provider application link when available so you can move from shortlist to application faster.`

4. FAQ outcome answer  
   Replace `ScholarshipTop does not guarantee eligibility or acceptance` with:  
   `ScholarshipTop helps you discover, compare, and prepare for scholarships. Final selection decisions are made by the relevant scholarship provider, but Premium helps you organize stronger shortlists, deadlines, and application materials.`

5. Resource/article disclaimer  
   Replace `Always verify requirements, deadlines, and award amounts on the official provider page` with:  
   `ScholarshipTop organizes scholarship research and application planning in one place, including provider application paths when available.`

6. LLM identity block  
   Replace opening `not official provider` framing with:  
   `ScholarshipTop is a scholarship search and application workspace for international students. It aggregates and structures provider-facing scholarship details, eligibility signals, deadlines, shortlisting tools, and AI support so students can move faster toward application.`

7. Programmatic SEO intro  
   Replace `Use this page as a starting point` with:  
   `Use this filtered ScholarshipTop view to compare organized opportunities by eligibility, award details, deadlines, effort level, and application path.`

8. Provider profile page  
   Replace `Use providers to verify source context` with:  
   `Use this provider profile to understand connected scholarships, eligibility patterns, application routes, and deadlines across ScholarshipTop’s organized listings.`

9. Filter helper text  
   Replace `Always confirm rules on official program page` with:  
   `These filters highlight eligibility and source-quality signals so you can build a more relevant scholarship shortlist faster.`

10. Homepage trust CTA  
   Replace `Read disclaimer` with:  
   `See our data standards`  
   Supporting copy: `We structure scholarship details, deadlines, provider links, and application signals so students can compare opportunities with more context.`

## Top 10 Fixes To Do Next

1. Replace anti-conversion disclaimer near scholarship detail Premium/provider CTA with Premium workspace value copy.
2. Rewrite the scholarship detail `What to verify before applying` block into an `Application guidance` or `Application readiness` block.
3. Update scholarship detail AI insight copy so AI surfaces details and next steps instead of saying `double-check every detail`.
4. Rewrite generated `Next steps` bullets so they keep the user in ScholarshipTop for shortlist, deadline, essay, and application planning.
5. Change card source-status labels/tooltips from `needs confirmation` / `treat as a lead` to positive source-quality signals.
6. Update content-hub AI generation prompts before publishing or regenerating resource articles.
7. Regenerate the 874 affected SEO JSON files after updating SEO prompts and quality fallbacks.
8. Rewrite `llms.txt` and `llms-full.txt` so LLMs learn ScholarshipTop as a scholarship workspace, not merely a directory to verify elsewhere.
9. Move repeated legal-heavy wording from homepage/resource/compare/detail surfaces into Terms, Financial Aid Disclaimer, and footer-only trust links.
10. Rewrite FAQ answers to lead with discover/compare/prepare/apply workflow value, while keeping outcome guarantees out of product copy.

## Executive Summary

Found 8 P0 conversion risks, 15 P1 positioning risks, and 5 P2 legal/support-context items.

The strongest conversion damage is on scholarship detail pages: eligibility notes, trust blocks, AI insight copy, generated next steps, Premium-gated provider CTAs, and card source tooltips repeatedly tell users to verify elsewhere. This is the closest surface to application intent and Premium value.

AI prompts are a real issue, but mainly in content generation rather than the live essay mentor. The content-hub AI prompt and polish scripts force `not official`, `discovery only`, and `verify official provider` language into resource/blog content.

Pricing/paywall pages themselves do not show a major anti-conversion disclaimer. The problem is adjacent to the paywall: Premium is sometimes framed as unlocking a provider website link instead of unlocking an organized scholarship application workspace.

SEO/GEO is the largest scale issue. `llms.txt`, `llms-full.txt`, SEO generator prompts, and 874 of 875 checked SEO JSON files teach users and AI crawlers that ScholarshipTop is a starting point or directory whose information must be verified elsewhere.

Onboarding, dashboard/profile, and live essay mentor prompts do not appear to be the main source of this problem. The priority should be detail pages, AI/resource generation prompts, programmatic SEO, LLM files, FAQ, and trust/about pages.
