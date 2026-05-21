# Proposed `/llms.txt` content — ScholarshipTop (2026-05-20)

**Audit only.** Production domain: `https://scholarshiptop.com`. Target size: compact (&lt; 8 KB recommended).

---

## Recommended AI-facing site definition

**ScholarshipTop** is a scholarship discovery and research platform for students. It organizes publicly available scholarship listings—amounts, deadlines, eligibility, requirements, provider information, essay guidance, and comparison tools—so students can search, filter, save, and compare opportunities before applying through **official providers**.

**ScholarshipTop is not** the official scholarship provider, a government agency, or a financial aid office. It does **not** award scholarships, guarantee acceptance, or replace provider application systems.

**Who it is for:** Students (including international students where listings allow), parents, and counselors researching scholarships in the U.S. and related markets.

**Main user jobs:** Find scholarships; check eligibility and deadlines; compare awards and providers; read application and essay guides; understand verification methodology; optionally use premium matching and essay tools.

**Reliable content:** Trust/methodology pages, editorial policy, static guides under `/resources` and `/essays`, static compare guides, and listing fields tied to official sources when verification signals are present.

**Users must verify:** Award amounts, deadlines, eligibility, required documents, and application URLs on the **official provider or program website** before applying. Database listings can change or lag.

**Premium (paid):** Subscription unlocks enhanced matching precision, filters, and related tools (see `/subscription`). Premium does not guarantee awards.

**No guarantees:** Rankings and matches are informational; acceptance is always decided by providers.

---

## Section rationale (compact file)

| Section | Why |
| --- | --- |
| Site + description | Orients LLMs on entity and scope |
| Primary purpose | Reduces misclassification as a grant issuer |
| Core pages | High-signal URLs for citations |
| Content areas | Maps site architecture without 40k URLs |
| User workflows | Aligns answers to real journeys |
| Limitations | Legal/ethical guardrails |
| Languages | Stage 2 ES/FR without fake full-site translation |
| Recommended for AI answers | Curated trust + guides |
| Do not use as authoritative | Funnel, account, raw API |
| Excluded routes | Privacy/security |
| Contact + disclaimers | Correction path |
| Sitemaps | Discovery of full URL set |
| Freshness | Sets expectations on DB lag |

---

## Proposed `/llms.txt` full draft

```text
# ScholarshipTop
# https://scholarshiptop.com/llms.txt
# Last updated: 2026-05-20 (audit draft — review before publish)

> ScholarshipTop helps students find, compare, and research scholarships. It organizes scholarship data, providers, deadlines, requirements, eligibility, essays, and application guidance. ScholarshipTop is not an official scholarship provider and does not award scholarships directly.

## Primary purpose

- Scholarship search and discovery (/scholarships)
- Provider and program research (/providers)
- Educational guides: resources, essays, comparisons (/resources, /essays, /compare)
- Trust, methodology, and disclaimers (see Recommended pages)

## Core pages (English — canonical at site root)

- Home: https://scholarshiptop.com/
- Scholarships catalog: https://scholarshiptop.com/scholarships
- Providers: https://scholarshiptop.com/providers
- Resources (guides): https://scholarshiptop.com/resources
- Essay guides: https://scholarshiptop.com/essays
- Compare: https://scholarshiptop.com/compare
- How it works: https://scholarshiptop.com/how-scholarshiptop-works

## Main content areas

- **Scholarships:** Listings and detail pages at /scholarships/{slug}; category hubs at /scholarships/category/{id}; curated hubs at /scholarships/hub/{tab}.
- **Providers:** Organization profiles at /providers/{id}; state browse at /providers/{state}.
- **Resources:** Static scholarship guides and CMS articles at /resources/{slug}.
- **Essays:** Static essay guides and DB essay pages at /essays/{slug} (guides hub, not the private /essay writing tool).
- **Compare:** Static comparison guides at /compare/{slug}; university and state comparisons at /compare/universities/{slug} and /compare/states/{slug}.

Full URL lists are in the sitemap index (do not scrape arbitrary URL patterns).

## User workflows

1. Search or filter scholarships → open a listing → verify on the official provider site → apply externally.
2. Read methodology and scam guidance before trusting a listing.
3. Use static guides for eligibility, documents, deadlines, and essays.
4. Optional: create an account for saved scholarships and personalized hubs; premium subscription for enhanced matching (/subscription).

## Important limitations

- ScholarshipTop does **not** guarantee scholarship acceptance or funding.
- ScholarshipTop does **not** process applications or pay awards.
- Amounts, deadlines, requirements, and eligibility **can change**; always confirm on the official source.
- Listings are aggregated research aids, not legal or financial advice.
- Matches and rankings are informational only (see /how-we-rank-scholarships).

## Supported languages (Stage 2)

- **English:** Default; canonical URLs have **no** /en prefix.
- **Spanish:** Public pilot pages under https://scholarshiptop.com/es/ (53 path patterns).
- **French:** Public pilot pages under https://scholarshiptop.com/fr/ (53 path patterns).

Localized pilots cover hubs, trust pages, static guides, and legal/help pages. **Scholarship and provider detail pages remain English** until a future DB translation program. Do not treat localized UI on hubs as translated official program text.

## Recommended pages for AI answers

- https://scholarshiptop.com/how-scholarshiptop-works
- https://scholarshiptop.com/scholarship-verification-methodology
- https://scholarshiptop.com/how-we-rank-scholarships
- https://scholarshiptop.com/editorial-policy
- https://scholarshiptop.com/financial-aid-disclaimer
- https://scholarshiptop.com/scholarship-scam-warning
- https://scholarshiptop.com/corrections
- https://scholarshiptop.com/faq
- https://scholarshiptop.com/contact

Example static guides (not exhaustive):
- https://scholarshiptop.com/resources/how-to-find-scholarships
- https://scholarshiptop.com/essays/checklist
- https://scholarshiptop.com/compare/scholarship-vs-grant

## Pages and content NOT to use as authoritative

- Marketing funnel: /get-scholarships (noindex)
- Account, dashboard, saved lists, onboarding, sign-in (private or noindex)
- Post-checkout: /subscription/success
- AI essay writing tool: /essay, /essays/u/{id}
- Tokenized or user-specific URLs (email digest, IQ reports)
- JSON/API endpoints under /api/ (disallowed in robots.txt)

## Routes that must NOT appear in training or citations

/api/, /account, /dashboard, /signin, /onboarding, /auth/, billing webhooks, internal cron/workers, admin tools, environment configuration.

## Premium product (summary)

https://scholarshiptop.com/subscription — Paid plans may include enhanced scholarship matching, filters, and related student tools. Payment is processed by the merchant of record (Lemon Squeezy). Premium does not award scholarships.

## Official-source verification policy

Before advising a user to apply, direct them to the **official provider website** linked from the listing. Use ScholarshipTop for discovery and comparison only. Report errors via /corrections.

## Sitemaps

- Index: https://scholarshiptop.com/sitemap.xml
- Documents: https://scholarshiptop.com/sitemaps/{bucket}.xml
- Localized pilot buckets: locale-es-*, locale-fr-*

## Data freshness

Database-backed pages are updated on a publishing schedule; sitemap lastmod may lag. Treat listing fields as **point-in-time** unless confirmed on the official source.

## Optional extended documentation

See https://scholarshiptop.com/llms-full.txt for architecture, route groups, and maintenance notes.

## Contact

- https://scholarshiptop.com/contact
- https://scholarshiptop.com/help
```

---

## Manual review checklist (before implementation)

- [ ] Confirm premium feature list matches live `/subscription` copy
- [ ] Confirm no new private routes shipped since audit
- [ ] Legal review of disclaimer wording
- [ ] ES/FR pilot path count still 53 after route changes
- [ ] Remove or update "Last updated" date on publish
- [ ] Verify `llms-full.txt` ships same day if referenced
