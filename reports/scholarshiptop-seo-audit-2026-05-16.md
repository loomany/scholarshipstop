# Полный SEO-аудит ScholarshipTop.com

Дата аудита: 16 мая 2026. Scope: Stage 0 - только аудит, без изменений кода продукта.

Проверенные источники: live HTML `https://scholarshiptop.com/`, `robots.txt`, `sitemap.xml`, `/scholarships`, страницы деталей, provider/category/resource примеры, а также локальная реализация в `C:\dev\scholarshipstop`.

## 1. Executive Summary

Главный ответ: Google должен ранжировать ScholarshipTop выше обычных scholarship catalogs только если сайт явно докажет, что это не перепубликация данных, а verified scholarship intelligence platform: проверяет источники, объясняет eligibility, предупреждает о рисках, помогает выбрать и довести заявку до отправки.

Что уже хорошо:

- Есть сильная база: около 19k live listings на главной, фильтры, matching, saved/ignored workflow, official-source positioning.
- На части detail pages уже есть уникальный слой: Quick decision, Best for, Important checks, Red flags, Next steps, Application tips, Required documents, FAQ, last verified date.
- Query/filter pages в основном noindex + canonical на clean URL, что снижает риск индексного мусора.
- Есть structured data: Organization/WebSite, SearchAction, WebPage, ItemList, BreadcrumbList, FAQPage, EducationalOccupationalProgram.
- Есть контентный слой `/resources` и `/essays`, но он пока не достаточно оформлен как авторитетная editorial-система.

Главный риск:

- Большая часть каталожных и programmatic SEO страниц все еще выглядит как шаблонный список с короткими однотипными карточками. В слабых detail pages виден thin-content паттерн: "provider offers this scholarship..." + overview из сырой строки. Это может выглядеть как low added value aggregator.

Что делать первым:

1. Усилить trust/E-E-A-T: `/editorial-policy`, `/scholarship-verification-methodology`, `/how-we-rank-scholarships`, `/contact`, `/financial-aid-disclaimer`, полноценный `/about`.
2. Стандартизировать уникальный detail layer для всех indexable scholarship pages: verdict, eligibility decoded, difficulty, urgency, red flags, source status, checklist, alternatives.
3. Очистить technical SEO: исправить soft-404 на несуществующих `/scholarships/{slug}`, убрать повторяющийся HTML в home/list cards, проверить sitemap inclusion по quality threshold.
4. Индексировать только страницы с реальной пользой, а не все возможные комбинации фильтров.

## 2. Current SEO Uniqueness Score

| Area | Score | Diagnosis |
|---|---:|---|
| Homepage uniqueness | 68 | Strong matching/value prop, weak methodology and verifiable trust proof |
| Catalog uniqueness | 45 | Useful filters, but page reads like list + templated cards |
| Detail page uniqueness | 58 | Strong on enriched pages, thin on many legacy/raw pages |
| Country SEO uniqueness | 42 | Good routing policy, generic intros and country-pair copy |
| Category SEO uniqueness | 55 | 11 promoted categories with FAQ, but uneven depth |
| E-E-A-T | 38 | About exists but lacks editorial policy, authors, corrections, monetization clarity |
| AI search readiness | 61 | Schema exists; needs citation-friendly methodology and crisp definitions |
| Technical SEO | 64 | Good canonical/noindex for queries; soft-404 and crawl-depth risks remain |
| Internal linking | 57 | Good related cards and resource hooks; needs cluster architecture |
| Content moat | 52 | Matching and AI insights exist; proprietary scoring not yet explained or consistent |

## 3. Evidence Highlights

- Homepage title: "Get Matched With Scholarships in 2 Minutes"; description: "answer a few quick questions..." Good product value, light SEO specificity.
- Homepage visible trust copy exists: "Verified listings", "Updated regularly", "Official-source workflow", "What we verify". It needs stronger proof, method, dates, reviewer identity.
- Homepage has repeated country links in rendered text extraction and repeated testimonials. This is a duplication/quality risk even if caused by carousel/accessibility rendering.
- `/scholarships` shows Page 1 of 2140, with many card snippets like "[Provider] offers this scholarship to help cover education costs..." This is the core aggregator risk.
- `/scholarships?page=2` returns `noindex, follow` and canonical `/scholarships`. This is good.
- Unknown `/scholarships/not-a-real-seo-page-xyz` returns HTTP 200 with `NEXT_NOT_FOUND` and `noindex`. This is a soft-404 risk. It should be a real 404.
- Sitemap index includes `core`, `resources`, `essays`, `providers`, `categories`, `seo`, `scholarships-0`, `compare`.
- Local `data/seo-scholarship-routes.json` has 789 routes, all marked `GOOD` and indexable. This is too optimistic for a programmatic SEO system unless each page has live quality validation.
- Cross-country manifest has 308 enabled entries, only 28 indexable/in sitemap, 280 noindex. This is a healthy policy direction.
- Category allowlist currently promotes 11 category pages: arts, education, humanities, stem, medical, law, community, biology, safety, music, disability.

## 4. Top 20 SEO Risks

| Risk | Severity | Evidence | Affected pages | Fix | Priority |
|---|---|---|---|---|---|
| Soft-404 returns 200 | Critical | Unknown scholarship slug returns 200 + noindex | `/scholarships/*` | Move notFound above Suspense for single unknown slugs | P0 |
| Thin detail pages | Critical | Chevening page has one eligibility bullet and raw overview | Detail pages | Require value blocks before index | P0 |
| Templated card copy | High | Repeated "offers this scholarship..." cards | Catalog/category/provider | Add facts + insight snippets per card | P0 |
| Programmatic over-indexing | High | 789/789 SEO routes marked GOOD | `/scholarships/{facets}` | Live quality gate + noindex below threshold | P0 |
| Generic country intros | High | Country copy is formulaic by route | country/cross-country | Add local context and requirements | P1 |
| Weak E-E-A-T pages | High | About is a hub, not methodology | Trust pages | Create editorial/methodology pages | P0 |
| Unproven "verified" claim | High | Claim exists, process not detailed | Home/detail | Add verification criteria and timestamps | P0 |
| Fake-looking testimonials | High | Repeated testimonial carousel, strong claims | Homepage | Use verified testimonials or remove claims | P0 |
| Paywall blurs source names | High | Detail pages blur provider/source for non-subscribers | Details | Keep official source identity visible when indexable | P1 |
| Duplicate carousel text | Medium | Repeated country/provider/testimonial text in extraction | Home/catalog | Hide duplicate carousel copies from accessibility tree | P1 |
| Weak title templates | Medium | "USA USA 2026 Apply" duplication | Details | Smarter title builder | P1 |
| Expired scholarship indexing | Medium | Expired detail examples indexable | Details | Keep only evergreen/useful expired pages, else noindex | P1 |
| FAQ boilerplate | Medium | Generic FAQ on many pages | Detail/provider/category | Only specific FAQ; no spam | P1 |
| Provider pages thin | Medium | Provider intro generic, cards repeated | `/providers/*` | Add provider verification, categories, official links | P2 |
| Sitemap quality risk | Medium | Sitemap includes many listings by `is_indexable` | Sitemap | Exclude stale/thin/expired/missing-source pages | P1 |
| Cross-subdomain sitemap | Medium | `iq.scholarshiptop.com` in core sitemap | Core sitemap | Separate if Search Console ownership differs | P2 |
| Missing author profiles | Medium | Articles use Organization author only | Resources | Add editorial reviewers and policy | P1 |
| No correction policy | Medium | Not visible in trust stack | Sitewide | Add corrections page/process | P1 |
| Lack of comparison tables | Medium | Few "why this vs alternatives" blocks | Details/resources | Add alternatives/comparison modules | P2 |
| Crawl depth at 2140 pages | Medium | Catalog pagination huge | Catalog | Keep page params noindex; strengthen hubs | P1 |

## 5. Top 30 Growth Opportunities

| Opportunity | Page type | SEO impact | Difficulty | Implementation idea | Expected result |
|---|---|---:|---:|---|---|
| ScholarshipTop Score | Detail/card | High | M | Display transparent composite score | Higher uniqueness and CTR |
| Deadline urgency score | Detail/card | High | S | days left + timezone + recurring logic | Better student utility |
| Application difficulty | Detail/card | High | M | derive from docs, essay, recs, questions | Better long-tail relevance |
| Eligibility decoded | Detail | High | M | plain-English rules + uncertainty flags | More original content |
| Official source status | Detail | High | S | verified/unverified/needs-check | Trust lift |
| Last reviewed notes | Detail | High | M | "what we checked" bullets | E-E-A-T lift |
| Who should skip | Detail | Medium | M | negative fit guidance | Differentiation |
| Alternatives if ineligible | Detail | High | M | similar open scholarships | More internal links |
| Provider trust profile | Provider | Medium | M | source count, official domains, update cadence | Trust moat |
| Verified methodology page | Trust | High | S | publish checks and limitations | Quality signal |
| How we rank page | Trust | High | S | explain matching/scoring without secrets | AI citations |
| Correction policy | Trust | Medium | S | form + SLA | E-E-A-T |
| How we make money | Trust | Medium | S | paid features, affiliate disclosure | Trust |
| Scholarship scam guide | Resource | High | S | safety + examples | Links and authority |
| Monthly deadlines pages | SEO hub | High | M | `/scholarships/deadlines/june-2026` | Recurring traffic |
| No essay guide + hub | Category/resource | High | M | combine guide + listings | Intent capture |
| International student country hubs | Country | High | M | top 20 pairs only | Strong geo topicality |
| STEM cluster | Category/resource | High | M | STEM hub + guides + listings | Authority |
| First-generation hub | Category | Medium | M | page + guide + eligibility caveats | Inclusion intent |
| Transfer student hub | Category | Medium | M | page + docs/checklist | New intent |
| High school seniors hub | Category | High | M | deadlines, docs, FAFSA caveats | High volume |
| Scholarship calendar | Product/SEO | High | L | month/season calendar | Repeat visits |
| Saved deadlines | Product | Medium | M | reminders and ICS export | Retention |
| Essay assistant integration | Detail | Medium | M | prompt-specific CTA | Funnel |
| Resource to listing links | Internal | High | M | contextual cards by article intent | Crawl + conversion |
| Listing to guide links | Internal | High | S | detail/category CTAs | Depth |
| AI-friendly definitions | Content | Medium | S | short answer blocks | Answer engine pickup |
| Comparison pages | Compare | Medium | L | school/state/provider vs pages | Moat |
| Freshness changelog | Detail | Medium | M | "changed since last review" | Trust |
| Data completeness badge | Detail/card | High | S | complete/partial/missing | Avoid overclaiming |

## 6. Exact Content Additions

| Page | Section | H2 | Why | Draft copy | Data needed | Priority |
|---|---|---|---|---|---|---|
| Homepage | Methodology | How ScholarshipTop verifies scholarships | Converts "verified" into evidence | "We check whether a listing has an official source, current deadline, clear award value, eligibility rules, and application path. When data is incomplete, we show what to confirm before applying." | source URL, reviewed_at, completeness flags | P0 |
| Homepage | Ranking | How we recommend scholarships | Trust for matching | "Recommendations are based on profile fit, eligibility signals, deadline urgency, application effort, and data clarity. We do not guarantee awards." | scoring factors | P0 |
| Homepage | Audience | Who ScholarshipTop is for | Clarifies use case | "Use ScholarshipTop if you need a faster way to shortlist realistic scholarships, track deadlines, and avoid wasting time on awards you cannot use." | personas | P1 |
| Homepage | Trust | Our scholarship data standards | E-E-A-T | "Every indexable listing should show its source status, last review date, and what remains to verify." | policy | P0 |
| Catalog | Guide intro | How to use this scholarship catalog | Prevents list-only page | "Start broad, then narrow by eligibility, deadline, award value, documents, and application effort." | filters | P0 |
| Catalog | Mistakes | Common scholarship search mistakes | Student value | "Do not apply from title alone. Check citizenship, enrollment, payout, documents, and recurring deadline rules." | none | P1 |
| Cards | Intelligence strip | Why this may fit | Unique snippets | "Best for: high-school seniors. Effort: low. Check: citizenship rule unclear." | AI fields | P0 |
| Detail | Verdict | ScholarshipTop quick verdict | Distinct value | "Good fit if you meet the core eligibility and can submit required materials before the deadline. Verify payout and final rules on the official page." | eligibility, docs, payout | P0 |
| Detail | Eligibility | Eligibility decoded | Plain-English utility | "You likely need: U.S. residency, financial need, and enrollment in a certificate or associate program." | requirements | P0 |
| Detail | Risk | What to verify before applying | Avoids overclaiming | "Confirm final deadline, timezone, payment route, renewal status, and whether the provider still accepts applications." | missing flags | P0 |
| Country | Local context | What to know before applying in {country} | Unique country content | "Check visa status, institution eligibility, language/document rules, and whether funds are paid locally or to a school." | country facts | P1 |
| Category | Strategy | How to choose {category} scholarships | Intent match | "Prioritize awards where your field, level, evidence, and story match the provider's reason for funding." | category taxonomy | P1 |
| Resources | Trust CTA | Related scholarships to review | Funnel | "After reading this guide, compare current listings that match the same intent." | related_scholarships | P1 |

## 7. New Pages to Create

| URL | Type | Intent | Index | Template | Internal links | Priority |
|---|---|---|---|---|---|---|
| `/editorial-policy` | trust | editorial standards | index | H1, sources, AI use, corrections | footer, about | P0 |
| `/scholarship-verification-methodology` | trust | verification process | index | criteria, statuses, limitations | home, detail | P0 |
| `/how-we-rank-scholarships` | trust | ranking transparency | index | factors, no guarantees, examples | home, catalog | P0 |
| `/how-scholarshiptop-works` | trust/product | product explanation | index | profile, matching, tracking, applying | home | P0 |
| `/contact` | trust | support/contact | index | contact form/email, corrections | footer | P0 |
| `/financial-aid-disclaimer` | legal/trust | limitations | index | not provider, verify official source | footer, detail | P0 |
| `/scholarship-scam-warning` | resource/trust | scam prevention | index | red flags, checklist, examples | detail, resources | P0 |
| `/how-we-make-money` | trust | monetization | index | subscriptions, affiliates, no fake ranking | footer | P1 |
| `/corrections` | trust | correction requests | index | report issue, SLA, update policy | footer/detail | P1 |
| `/resources/how-to-find-scholarships` | guide | broad search | index | strategy + listings | catalog | P0 |
| `/resources/how-to-apply-for-scholarships-checklist` | guide | application workflow | index | checklist | details | P0 |
| `/resources/scholarship-eligibility-explained` | guide | eligibility | index | rules examples | details | P0 |
| `/resources/scholarship-deadline-calendar` | guide/tool | deadlines | index | monthly calendar | hot deadlines | P1 |
| `/resources/no-essay-scholarships-guide` | guide | no essay | index | caveats + listings | no-essay hub | P0 |
| `/resources/easy-scholarships-guide` | guide | easy apply | index | effort scoring | easy hub | P0 |
| `/resources/scholarship-application-difficulty` | guide | effort | index | difficulty scale | details | P1 |
| `/resources/scholarship-documents-checklist` | guide | documents | index | docs by type | details | P1 |
| `/resources/how-to-ask-for-recommendation-letter` | guide | rec letters | index | email scripts | essay/details | P1 |
| `/resources/scholarship-essay-examples` | guide | essays | index | examples framework | essays | P1 |
| `/resources/scholarship-essay-mistakes` | guide | essays | index | mistakes | essays | P1 |
| `/resources/why-do-scholarships-ask-for-financial-need` | guide | financial need | index | explain forms | low-income hub | P2 |
| `/resources/merit-vs-need-based-scholarships` | guide | comparison | index | table | catalog | P1 |
| `/resources/scholarships-for-high-school-seniors` | guide | high school | index | timeline | high-school hub | P0 |
| `/resources/scholarships-for-undergraduate-students` | guide | undergrad | index | levels | undergrad hub | P1 |
| `/resources/scholarships-for-graduate-students` | guide | grad | index | funding types | graduate hub | P1 |
| `/resources/scholarships-for-transfer-students` | guide | transfer | index | eligibility traps | transfer hub | P1 |
| `/resources/scholarships-for-first-generation-students` | guide | first-gen | index | proof, essay | first-gen hub | P1 |
| `/resources/scholarships-for-women` | guide | women | index | fields and associations | women hub | P1 |
| `/resources/stem-scholarships-guide` | guide | STEM | index | fields, projects | STEM category | P0 |
| `/resources/engineering-scholarships-guide` | guide | engineering | index | branches | engineering hub | P0 |
| `/resources/computer-science-scholarships-guide` | guide | CS | index | projects, essays | CS hub | P0 |
| `/resources/business-scholarships-guide` | guide | business | index | leadership, finance | business hub | P1 |
| `/resources/nursing-scholarships-guide` | guide | nursing | index | clinical path | nursing hub | P1 |
| `/resources/scholarships-in-usa-for-international-students` | country guide | USA intl | index | visa, FAFSA caveats | US country pages | P0 |
| `/resources/scholarships-in-canada-for-international-students` | country guide | Canada intl | index | province, school funding | Canada pages | P1 |
| `/resources/scholarships-in-uk-for-international-students` | country guide | UK intl | index | taught masters, deadlines | UK pages | P1 |
| `/resources/scholarships-in-germany-for-international-students` | country guide | Germany intl | index | DAAD, language, visa | Germany pairs | P1 |
| `/resources/scholarships-in-australia-for-international-students` | country guide | Australia intl | index | universities | AU pages | P2 |
| `/scholarships/no-essay` | SEO hub | no essay listings | index when strong | listings + effort guide | no essay guide | P0 |
| `/scholarships/easy-apply` | SEO hub | easy scholarships | index if canonicalized | listings + difficulty | easy guide | P0 |
| `/scholarships/first-generation` | SEO hub | first-gen | index | unique intro + FAQ | first-gen guide | P1 |
| `/scholarships/transfer-students` | SEO hub | transfer | index when enough listings | listings + caveats | transfer guide | P1 |
| `/scholarships/high-school-seniors` | SEO hub | seniors | index | timeline + listings | high-school guide | P0 |
| `/scholarships/women` | SEO hub | women | index | listings + fields | women guide | P1 |
| `/scholarships/business` | SEO hub | business | index if count/quality pass | listings + strategy | business guide | P1 |
| `/scholarships/deadlines/may-2026` | deadline hub | monthly deadlines | index until stale, then canonical archive | calendar + list | deadlines guide | P1 |
| `/scholarships/deadlines/june-2026` | deadline hub | monthly deadlines | index | calendar + list | deadlines guide | P1 |
| `/scholarships/deadlines/july-2026` | deadline hub | monthly deadlines | index | calendar + list | deadlines guide | P1 |
| `/tools/scholarship-scam-checker` | tool | scam check | index | checklist input | scam guide | P2 |
| `/tools/scholarship-calendar` | tool | planning | index | calendar/export | deadline hubs | P2 |
| `/tools/scholarship-fit-score` | tool | match score | index | profile preview | detail pages | P2 |

## 8. Scholarship Detail Page Template

Recommended structure:

1. H1: `{Scholarship name}: eligibility, deadline, award amount`
2. Top summary: 2-3 original sentences, factual, not copied.
3. Facts table: provider, award, deadline + timezone, recurrence, study level, location, payout, documents, source status, last reviewed.
4. ScholarshipTop quick verdict: best fit, effort, urgency, main risk.
5. Best for / Not ideal for.
6. Eligibility decoded: plain-English bullets grouped by citizenship, level, field, GPA, location, institution, special status.
7. Application difficulty: easy/medium/hard with reason.
8. Required documents: detected + "confirm official list".
9. Deadline urgency: days left, recurring flag, calendar CTA.
10. Award value context: amount, payout clarity, renewal, restrictions.
11. What to verify before applying: missing-data flags.
12. Official source: visible source name/domain, apply path, last checked.
13. Similar scholarships and alternatives if you do not qualify.
14. Listing-specific FAQ, 3-5 questions only if answers are specific.
15. Schema: Organization, BreadcrumbList, EducationalOccupationalProgram, Offer when numeric, FAQPage when visible, `dateModified`.

Index rule: index only if official source exists or source confidence is high, summary is original, at least 3 meaningful facts exist, and missing data is transparently flagged.

## 9. Category Page Template

H1: `{Category} Scholarships 2026`

Above listings:

- 120-180 word original intro.
- "How to choose {category} scholarships" with category-specific advice.
- Filter explainer: deadline, award, GPA, level, documents, location.
- Mini stats: count, open deadlines, median award if reliable, easy/essay ratio if reliable.

Listings:

- Cards show verdict snippet, effort, deadline urgency, source status.

Below listings:

- Category-specific FAQ.
- Related guides.
- Related categories.
- "Common mistakes" section.
- ItemList + FAQPage + BreadcrumbList schema.

Noindex if fewer than 5 good listings, intro is generic, no specific FAQ, or page overlaps >80 percent with another indexed page.

## 10. Country / Cross-Country Page Template

H1: `Scholarships for students from {origin} to study in {destination}`

Required unique blocks:

- Local intro: why this route matters.
- Country context: visa/enrollment/document/payment caveats.
- Typical eligibility: citizenship, residency, school, level, language, field.
- Deadline seasonality: top application months.
- Data snapshot: total listings, open listings, source clarity, average effort if reliable.
- FAQ specific to origin/destination pair.
- Related pages: origin-only, destination-only, neighboring destinations, international guide.

Index first:

- USA domestic, Canada domestic, UK domestic, Canada to USA, US to Germany, Philippines to Germany, UK to Germany, Mexico to Germany, India/Philippines/Nigeria to USA/Canada/UK if enough listings and unique content.

Noindex until strengthened:

- Pairs with low count, generic intro, unclear host/applicant signals, or medium/high duplicate risk.

## 11. Resources / Blog Strategy

Blog is needed, but not as generic content farm. It should be a decision-support layer linked to listings: search guide -> category/country hub -> scholarship detail -> tracker/essay assistant.

50 topic backlog:

| Cluster | URL slug | Intent | Keyword | Why it strengthens site | Internal links |
|---|---|---|---|---|---|
| Search | `how-to-find-scholarships` | learn search process | how to find scholarships | broad top funnel | catalog, matching |
| Search | `scholarship-search-checklist` | checklist | scholarship search checklist | action utility | catalog |
| Search | `how-to-choose-scholarships` | prioritization | how to choose scholarships | differentiates from lists | detail |
| Search | `scholarship-fit-score-explained` | product/search | scholarship match score | moat | matching |
| Search | `scholarship-deadline-calendar` | deadlines | scholarship calendar | repeat traffic | hot deadlines |
| Application | `how-to-apply-for-scholarships-checklist` | application | scholarship application checklist | action layer | details |
| Application | `scholarship-documents-checklist` | docs | scholarship documents | detail support | details |
| Application | `recommendation-letter-scholarship` | docs | scholarship recommendation letter | essay/docs | essays |
| Application | `organize-scholarship-applications` | organization | organize scholarship applications | product fit | saved |
| Application | `application-difficulty-levels` | prioritization | easy scholarships to apply for | unique scoring | easy apply |
| Essay | `scholarship-essay-mistakes` | essay | scholarship essay mistakes | authority | essays |
| Essay | `scholarship-essay-outline` | essay | scholarship essay outline | assistant funnel | essay mentor |
| Essay | `career-goals-scholarship-essay` | essay | career goals scholarship essay | evergreen | essays |
| Essay | `financial-need-scholarship-essay` | essay | financial need essay | high intent | financial need |
| Essay | `leadership-scholarship-essay` | essay | leadership scholarship essay | common prompt | essays |
| Country | `scholarships-usa-international-students` | country | scholarships in USA for international students | major cluster | US/international |
| Country | `scholarships-canada-international-students` | country | scholarships in Canada for international students | country authority | Canada |
| Country | `scholarships-uk-international-students` | country | UK scholarships international students | country authority | UK |
| Country | `scholarships-germany-international-students` | country | Germany scholarships international students | country authority | Germany |
| Country | `scholarships-australia-international-students` | country | Australia scholarships international students | country authority | AU |
| Student | `scholarships-high-school-seniors` | audience | scholarships for high school seniors | high volume | high school |
| Student | `scholarships-transfer-students` | audience | scholarships for transfer students | missing intent | transfer |
| Student | `scholarships-first-generation-students` | audience | first generation scholarships | inclusion cluster | first-gen |
| Student | `scholarships-women` | audience | scholarships for women | strong intent | women |
| Student | `scholarships-low-gpa` | audience | scholarships for low GPA | already started | low GPA |
| Deadline | `january-scholarship-deadlines` | monthly | January scholarship deadlines | calendar | deadline hub |
| Deadline | `february-scholarship-deadlines` | monthly | February scholarship deadlines | recurring | deadline hub |
| Deadline | `march-scholarship-deadlines` | monthly | March scholarship deadlines | recurring | deadline hub |
| Deadline | `april-scholarship-deadlines` | monthly | April scholarship deadlines | recurring | deadline hub |
| Deadline | `may-scholarship-deadlines` | monthly | May scholarship deadlines | recurring | deadline hub |
| Safety | `scholarship-scam-warning` | scam | scholarship scams | trust | detail |
| Safety | `verify-scholarship-email` | scam | verify scholarship email | trust, already exists variant | scam guide |
| Safety | `official-scholarship-source` | verification | official scholarship source | unique methodology | methodology |
| Safety | `scholarship-application-fees` | safety | scholarship application fee | protect users | scam guide |
| Safety | `is-this-scholarship-legit` | safety/tool | is this scholarship legit | tool funnel | scam checker |
| Aid | `merit-vs-need-based-scholarships` | explainer | merit vs need based scholarship | education | category |
| Aid | `how-scholarships-are-paid` | payment | how are scholarships paid | payout clarity | detail |
| Aid | `renewable-scholarships-explained` | explainer | renewable scholarships | detail support | details |
| Aid | `scholarships-and-financial-aid` | explainer | scholarships and financial aid | authority | disclaimer |
| Aid | `fafsa-scholarships-explained` | explainer | FAFSA scholarships | US context | US pages |
| Compare | `scholarship-vs-grant` | comparison | scholarship vs grant | definitions | catalog |
| Compare | `outside-vs-university-scholarships` | comparison | outside scholarships | school funding | country |
| Compare | `no-essay-vs-essay-scholarships` | comparison | no essay scholarships | category | no essay |
| Compare | `local-vs-national-scholarships` | comparison | local scholarships | strategy | provider/state |
| Compare | `small-vs-large-scholarships` | comparison | small scholarships | effort strategy | amount hubs |
| Program | `chevening-scholarship-explained` | program | Chevening scholarship | fix thin page | Chevening detail |
| Program | `niche-no-essay-scholarship-review` | program | Niche no essay scholarship | high intent + safety | Niche detail |
| Program | `horatio-alger-scholarships-guide` | program | Horatio Alger scholarship | provider cluster | provider/details |
| Program | `google-scholarships-guide` | program | Google scholarship | tech cluster | tech details |
| Program | `coca-cola-scholarship-guide` | program | Coca-Cola scholarship | brand intent | provider/details |

## 12. 3-Month Content Plan

| Week | Article | Keyword | Purpose | Links | CTA | Priority |
|---:|---|---|---|---|---|---|
| 1 | Scholarship verification methodology | scholarship verification | Trust foundation | home/detail | report issue | P0 |
| 1 | How to find scholarships | how to find scholarships | Broad entry | catalog | matching | P0 |
| 2 | No essay scholarships guide | no essay scholarships | Category support | no-essay | easy apply | P0 |
| 2 | Scholarship scam warning | scholarship scams | Safety/E-E-A-T | detail | scam checker | P0 |
| 3 | Application checklist | scholarship application checklist | Action | detail | saved tracker | P0 |
| 3 | USA scholarships for international students | USA scholarships international students | Country cluster | US pages | matching | P0 |
| 4 | STEM scholarships guide | STEM scholarships | Category authority | STEM | matching | P0 |
| 4 | Essay mistakes | scholarship essay mistakes | Essay funnel | essays | essay mentor | P1 |
| 5 | High school seniors guide | scholarships high school seniors | Audience | high-school | tracker | P0 |
| 5 | How scholarships are paid | how are scholarships paid | Payout clarity | details | save | P1 |
| 6 | Engineering scholarships guide | engineering scholarships | Category | engineering | matching | P0 |
| 6 | Canada international scholarships | Canada scholarships international students | Country | Canada | matching | P1 |
| 7 | First-generation scholarships | first generation scholarships | Audience | first-gen | matching | P1 |
| 7 | Scholarship documents checklist | scholarship documents | Docs | details | tracker | P1 |
| 8 | UK international scholarships | UK scholarships international students | Country | UK | matching | P1 |
| 8 | Easy scholarships guide | easy scholarships | Effort | easy apply | matching | P0 |
| 9 | Recommendation letters | scholarship recommendation letter | Docs/essay | essays | essay mentor | P1 |
| 9 | Transfer student scholarships | transfer student scholarships | Audience | transfer hub | matching | P1 |
| 10 | Germany international scholarships | Germany scholarships international students | Country | Germany pairs | matching | P1 |
| 10 | Merit vs need-based | merit vs need based scholarships | Explainer | financial need | matching | P1 |
| 11 | Monthly deadline calendar | scholarship deadlines | Recurring | hot deadlines | calendar | P1 |
| 11 | Scholarship application difficulty | easy scholarships to apply for | Moat | details | score | P1 |
| 12 | Women scholarships guide | scholarships for women | Audience | women | matching | P1 |
| 12 | How we rank scholarships | scholarship ranking | Trust/product | home/catalog | profile | P0 |

## 13. Schema / Structured Data Plan

| Page type | Schema | Add/keep | Notes |
|---|---|---|---|
| Sitewide | Organization | keep, expand | Add `sameAs`, `contactPoint`, `foundingDate` if true, logo, support email |
| Sitewide | WebSite + SearchAction | keep | Target is `/scholarships?q=` |
| Homepage | WebPage | keep | Add `about`, `mainEntity` to methodology page when created |
| Catalog | CollectionPage + ItemList | add CollectionPage | Current ItemList should be clean URL only |
| Category | CollectionPage + ItemList + FAQPage + BreadcrumbList | keep/add CollectionPage | FAQ only visible and specific |
| Country/cross-country | CollectionPage + ItemList + FAQPage + BreadcrumbList | add | Include exact origin/destination in name |
| Scholarship detail | EducationalOccupationalProgram + Offer + FAQPage + BreadcrumbList | keep | Add `dateModified`; avoid invalid FinancialAid unless validated |
| Resources | Article or BlogPosting + BreadcrumbList + FAQPage | keep | Add reviewer/author profile once real |
| Trust pages | WebPage/AboutPage | add | Use Organization references |
| Tools | WebApplication/SoftwareApplication | add carefully | For scam checker/calendar |

AI citation blocks to add:

- "In one sentence" definitions.
- "Best for" and "Not ideal for".
- Comparison tables.
- Checklists.
- Methodology blocks.
- Official-source notes.
- Clear dates: deadline, last reviewed, last modified.

## 14. Internal Linking Plan

Hub architecture:

- Homepage -> `/how-scholarshiptop-works`, `/scholarship-verification-methodology`, `/how-we-rank-scholarships`, `/scholarships`, top category hubs, top country hubs.
- Catalog -> category hubs, country hubs, resources, methodology.
- Category pages -> related guides, filtered listings, adjacent categories, top details.
- Country pages -> international guide, country-specific guide, top category pages, cross-country pairs.
- Detail pages -> provider page, category page, origin/destination page, related guide, similar scholarships, alternatives.
- Resources -> listing widgets, related scholarship cards, category/country hubs.
- Provider pages -> provider methodology, all provider scholarships, related organizations.

Blocks to add:

- "Related guides for this scholarship".
- "If you do not qualify, try these alternatives".
- "More scholarships like this".
- "Understand this requirement".
- "Country requirements to check".
- "Provider profile and source status".

## 15. Programmatic SEO Index/Noindex Policy

| Page type | Index if | Noindex if | Canonical |
|---|---|---|---|
| Root catalog | unique intro + useful filters | never for query variants | `/scholarships` |
| Detail | official/source confidence, original summary, reviewed date, useful facts | no source, expired and no evergreen value, raw/thin | self |
| Category | 10+ listings, unique intro, specific FAQ, related guide | not promoted, thin, overlap high | self or broader |
| Country | 10+ listings, local context, FAQ, internal links | generic copy, low count, unclear signals | self or country parent |
| Cross-country | 10+ strict pair listings, unique pair copy | low count, manual_review, high duplicate risk | self or destination/origin parent |
| Search pages | never | always | clean catalog |
| Filtered pages | only curated static URL | query params always | nearest clean hub |
| Pagination | noindex follow | page > 1 | page 1 |
| Saved/user pages | noindex | always | account/dashboard |
| Onboarding/premium | noindex unless marketing page | user/private | self |
| Resources/blog | index if editorial quality | duplicate/AI-thin | self |

Minimum recommended gate for indexable programmatic pages:

- 5+ high-quality listings for narrow facets; 10+ for country/category; 20+ for broad competitive pages.
- Unique intro 120+ words, specific FAQ, visible source methodology link, ItemList schema, no duplicate title, no query params, useful internal links.

## 16. Content Moat Evaluation

| Idea | SEO value | Product value | Difficulty | Priority | Risk | Expected impact |
|---|---:|---:|---:|---|---|---|
| ScholarshipTop Score | High | High | M | P0 | Must be explainable | Differentiation |
| Match Score | High | High | M | P0 | Avoid false certainty | Conversion |
| Deadline urgency | High | High | S | P0 | Timezone errors | CTR + utility |
| Application difficulty | High | High | M | P0 | Bad inference | Unique content |
| Requirement count | Medium | High | S | P0 | Incomplete docs | Better cards |
| Verified official link | High | High | S | P0 | Source freshness | Trust |
| Last checked | High | Medium | S | P0 | Requires process | E-E-A-T |
| What changed | Medium | Medium | M | P1 | Data diff quality | Freshness |
| Student profile recs | Medium | High | L | P1 | Privacy | Retention |
| Saved deadlines | Medium | High | M | P1 | Notification accuracy | Repeat use |
| Essay assistant | Medium | High | M | P1 | Over-AI content | Revenue |
| Scholarship tracker | Medium | High | M | P1 | UX complexity | Retention |
| Country maps | Medium | Medium | L | P2 | Data quality | Linkable asset |
| Monthly deadlines | High | Medium | M | P1 | Staleness | Traffic |
| Calendar | High | High | M | P1 | Date accuracy | Utility |
| Scam checker | High | High | M | P1 | Legal wording | Trust and links |
| Provider trust signals | Medium | High | M | P1 | Overclaiming | Trust |
| Eligibility explainer | High | High | M | P0 | AI hallucination | Detail moat |

## 17. Implementation Roadmap

### Stage 0 - Audit only

- Done: report only, no code/product changes.
- Do not touch auth, payments, subscription logic.
- Acceptance: stakeholder has prioritized SEO plan.
- Check: review this report and pick Stage 1 backlog.

### Stage 1 - Trust + E-E-A-T pages

- Do: create About rewrite, editorial policy, verification methodology, how we rank, contact, disclaimer, corrections.
- Likely files: `app/about/page.tsx`, new `app/editorial-policy/page.tsx`, `app/scholarship-verification-methodology/page.tsx`, footer/nav components.
- Do not: invent experts, fake reviews, overclaim verification.
- Acceptance: every indexable detail/category page links to methodology/disclaimer.
- Check: crawl site, inspect footer, validate schema.

### Stage 2 - Scholarship detail uniqueness

- Do: standardize quick verdict, decoded eligibility, difficulty, urgency, missing flags, source status, alternatives.
- Likely files: `ScholarshipDetailPageClient.tsx`, `scholarshipUiModel.ts`, detail copy helpers, DB AI fields.
- Do not: hide official source from Google/users on indexable pages.
- Acceptance: 90 percent of indexable details have original value blocks and last reviewed.
- Check: sample 50 pages manually and with crawler.

### Stage 3 - Category SEO pages

- Do: build 10-20 strong categories with expert intros, stats, FAQ, guide links.
- Likely files: category page, `categoryExpertContent.ts`, `categorySeoAllowlist.ts`.
- Do not: index hobbies/misc until strengthened.
- Acceptance: each category has unique strategy and related guide.
- Check: titles, canonical, ItemList, FAQ schema.

### Stage 4 - Country SEO pages

- Do: strengthen top host/applicant pages and top 28 cross-country pages.
- Likely files: `scholarshipCountrySeo.ts`, `seo-cross-country-routes.json`, content JSON.
- Do not: index all 308 pairs.
- Acceptance: each indexed pair has local context and specific FAQ.
- Check: sitemap only includes approved pairs.

### Stage 5 - Blog/resources

- Do: publish 2 articles/week for 12 weeks from clusters above.
- Likely files: content hub pipeline, DB content posts.
- Do not: publish thin AI articles without listing links and editorial checks.
- Acceptance: each article links to 3-8 listings/hubs and has clear CTA.
- Check: Search Console impressions, crawl, engagement.

### Stage 6 - Schema + AI search

- Do: add CollectionPage, sameAs/contactPoint, trust page schema, dateModified.
- Likely files: JSON-LD builders.
- Do not: add unsupported or spammy schema.
- Acceptance: validator passes, visible content matches schema.
- Check: Rich Results/Schema validator.

### Stage 7 - Internal linking + sitemap cleanup

- Do: fix soft-404, quality-gate sitemap, noindex thin routes, link clusters.
- Likely files: `seoScholarshipResolve.ts`, layout/page, sitemap builders, manifests.
- Do not: remove useful existing canonical/noindex query policy.
- Acceptance: no unknown `/scholarships/*` returns 200, sitemap only high-value URLs.
- Check: Screaming Frog/Sitebulb crawl, server logs, GSC coverage.

## 18. Ready Draft Text Blocks

### Homepage Trust Block

ScholarshipTop is built to help students find scholarships they can realistically act on. We organize listings by eligibility, deadline, award value, required materials, application effort, and official-source status so you can move from search to shortlist faster.

### How We Verify Scholarships

We review scholarship listings for source clarity, deadline information, award amount, eligibility signals, required materials, and application path. When a detail is missing or unclear, we flag it instead of treating it as confirmed. Scholarship providers can change rules, so every applicant should confirm final requirements on the official program page before submitting.

### ScholarshipTop Quick Verdict

This scholarship may be worth your time if your profile matches the core eligibility rules and you can prepare the required materials before the deadline. Before applying, confirm the final deadline, payout method, renewal rules, and official submission steps on the provider page.

### Scholarship Detail FAQ

Q: Who should apply for this scholarship?  
A: Apply if you meet the listed eligibility rules, can provide the required materials, and the award fits your study level, location, and field.

Q: What should I verify before applying?  
A: Confirm the official deadline, timezone, eligibility rules, required documents, payout method, and whether the award is renewable.

Q: Is ScholarshipTop the scholarship provider?  
A: No. ScholarshipTop summarizes and organizes scholarship information. Applications should be completed through the official provider or application source.

### Category Page Intro

Use this page to compare {category} scholarships by deadline, award amount, eligibility, GPA expectations, required documents, and application effort. Start with scholarships where your academic path and background clearly match the provider's rules, then prioritize applications with deadlines and materials you can realistically complete.

### Country Page Intro

This page helps students compare scholarships connected to {country}. Review each listing for citizenship, residency, study destination, school eligibility, visa-related rules, required documents, award payment method, and deadline timing. Country signals can describe applicant eligibility, provider location, or study destination, so always confirm the official rules before applying.

### Editorial Policy

ScholarshipTop publishes scholarship information and educational guides to help students make better application decisions. Our editorial goal is clarity, usefulness, and transparency. We summarize public scholarship facts in original language, identify details that need verification, and link students to official provider routes when available. We do not guarantee eligibility, selection, award payment, or provider decisions.

### About Page

ScholarshipTop helps students search, compare, save, and act on scholarship opportunities. Instead of asking students to sort through thousands of disconnected listings, we organize scholarships by fit, deadline, requirements, award value, source status, and application effort. Our goal is to make scholarship search feel less like guesswork and more like a clear application pipeline.

### Disclaimer

ScholarshipTop is not a scholarship provider, university, financial aid office, or government agency unless clearly stated. Scholarship details can change after we review them. Always confirm eligibility, deadlines, documents, award amounts, and application instructions on the official provider page before applying.

### AI-Search Friendly Description

ScholarshipTop is a scholarship search and application-planning platform that helps students find relevant scholarships, compare eligibility and deadlines, understand application requirements, save opportunities, and apply through official provider sources. The site adds explanatory guidance, verification notes, risk flags, and student action checklists on top of scholarship listing data.

## 19. What to Do First

First 7 days:

1. Fix soft-404 200 status for unknown scholarship routes.
2. Publish verification methodology, editorial policy, how we rank, contact, disclaimer.
3. Remove or verify homepage testimonials; reduce duplicated carousel HTML.
4. Add mandatory detail-page fields: source status, last reviewed, missing-data flags.
5. Audit top 100 indexed detail pages for thin/duplicate risk.

First 30 days:

1. Upgrade top 500 detail pages with verdict, eligibility decoded, difficulty, urgency, alternatives.
2. Strengthen 10 category pages and 8 country/cross-country pages.
3. Publish 12 high-intent guides from the content plan.
4. Add CollectionPage schema and Organization `sameAs/contactPoint`.
5. Rebuild sitemap quality gates and remove thin programmatic URLs.

Maximum SEO growth:

- Category/country hubs supported by guides and detail links.
- Monthly deadline pages with real data and freshness.
- Strong international student cluster.

Maximum uniqueness:

- ScholarshipTop Score, source confidence, application difficulty, deadline urgency, eligibility decoded, official-source notes, alternatives.

Do not do now:

- Do not generate thousands of new pages.
- Do not index all filters.
- Do not publish generic FAQ blocks at scale.
- Do not invent experts, reviews, or verification data.
- Do not hide source-critical details on indexable scholarship pages.

