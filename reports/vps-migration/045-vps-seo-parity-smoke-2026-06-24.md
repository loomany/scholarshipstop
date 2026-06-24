# Stage 4.5 — SEO parity smoke (VPS vs Railway)

**Дата:** 2026-06-24
**Production:** https://scholarshiptop.com
**VPS staging:** http://213.155.22.74
**Режим:** read-only HTTP, без изменений DNS/Railway/Supabase/jobs

## Verdict: **PASS**

---

## 1) HTTP status (ключевые URL)

| Path | Railway | VPS | Match |
|------|---------|-----|-------|
| / | 200 | 200 | yes |
| /sitemap.xml | 200 | 200 | yes |
| /sitemaps/scholarships-0.xml | 200 | 200 | yes |
| /scholarships/no-essay | 200 | 200 | yes |
| /scholarships/closing-soon | 200 | 200 | yes |
| /scholarships/category/no-essay | 200 | 200 | yes |
| /scholarships/engineering | 200 | 200 | yes |
| /scholarships/california | 200 | 200 | yes |

## 2–5) Meta / canonical / title / H1

| Path | robots match | canonical path match | title match | H1 count match | H1 text match |
|------|--------------|----------------------|-------------|----------------|---------------|
| / | yes | yes | yes | yes | yes |
| /scholarships/no-essay | yes | yes | yes | yes | yes |
| /scholarships/closing-soon | yes | yes | yes | yes | yes |
| /scholarships/category/no-essay | yes | yes | yes | yes | yes |
| /scholarships/engineering | yes | yes | yes | yes | yes |
| /scholarships/california | yes | yes | yes | yes | yes |

### Detail snippets (no secrets)

**/**
- Railway title: Get Matched With Scholarships in 2 Minutes
- VPS title: Get Matched With Scholarships in 2 Minutes
- Railway H1 (1): Find scholarships that fit you in 2 minutes
- VPS H1 (1): Find scholarships that fit you in 2 minutes
- Railway canonical path: /
- VPS canonical path: /
- Railway robots: (none)
- VPS robots: (none)

**/scholarships/no-essay**
- Railway title: No Essay Scholarships USA \| Find &amp; Apply \| ScholarshipTop
- VPS title: No Essay Scholarships USA \| Find &amp; Apply \| ScholarshipTop
- Railway H1 (1): No Essay Scholarships USA \| Find &amp; Apply
- VPS H1 (1): No Essay Scholarships USA \| Find &amp; Apply
- Railway canonical path: /scholarships/no-essay
- VPS canonical path: /scholarships/no-essay
- Railway robots: index, follow
- VPS robots: index, follow

**/scholarships/closing-soon**
- Railway title: Find Closing Soon Scholarships in the USA \| ScholarshipTop
- VPS title: Find Closing Soon Scholarships in the USA \| ScholarshipTop
- Railway H1 (1): Apply for Closing Soon USA Scholarships
- VPS H1 (1): Apply for Closing Soon USA Scholarships
- Railway canonical path: /scholarships/closing-soon
- VPS canonical path: /scholarships/closing-soon
- Railway robots: index, follow
- VPS robots: index, follow

**/scholarships/category/no-essay**
- Railway title: No Essay Scholarships USA \| Find &amp; Apply \| ScholarshipTop
- VPS title: No Essay Scholarships USA \| Find &amp; Apply \| ScholarshipTop
- Railway H1 (1): No Essay Scholarships USA \| Find &amp; Apply
- VPS H1 (1): No Essay Scholarships USA \| Find &amp; Apply
- Railway canonical path: /scholarships/no-essay
- VPS canonical path: /scholarships/no-essay
- Railway robots: index, follow
- VPS robots: index, follow

**/scholarships/engineering**
- Railway title: Find Engineering Scholarships in the USA \| ScholarshipTop
- VPS title: Find Engineering Scholarships in the USA \| ScholarshipTop
- Railway H1 (1): Compare Engineering Scholarships in the USA
- VPS H1 (1): Compare Engineering Scholarships in the USA
- Railway canonical path: /scholarships/engineering
- VPS canonical path: /scholarships/engineering
- Railway robots: index, follow
- VPS robots: index, follow

**/scholarships/california**
- Railway title: Find Scholarships in California \| ScholarshipTop
- VPS title: Find Scholarships in California \| ScholarshipTop
- Railway H1 (1): Scholarships in California
- VPS H1 (1): Scholarships in California
- Railway canonical path: /scholarships/california
- VPS canonical path: /scholarships/california
- Railway robots: noindex, follow
- VPS robots: noindex, follow


## 6) sitemap.xml valid

| Check | Railway | VPS |
|-------|---------|-----|
| Valid XML / has URLs | yes | yes |

## 7) scholarships-0.xml loc count

| Source | loc count |
|--------|-----------|
| Railway | 765 |
| VPS | 765 |

## 8) Sample 20 URLs from VPS scholarships sitemap

| Path | Railway | VPS | Railway robots | VPS robots | noindex mismatch |
|------|---------|-----|----------------|------------|------------------|
| /scholarships/soas-sanctuary-scholarships-2026-soas-sanctuary-scholarships | 200 | 200 | index, follow | index, follow | no |
| /scholarships/riewoldt-family-afl-excellence-scholarship-at-bond-university-2026-riewoldt-family-afl-excellence-s | 200 | 200 | index, follow | index, follow | no |
| /scholarships/jim-hamrick-athletic-academic-scholarship-dvowrqqm3vyv | 200 | 200 | index, follow | index, follow | no |
| /scholarships/txst-strutters-scholarship-at-texas-state-university-2026-txst-strutters-scholarship-at-te | 200 | 200 | index, follow | index, follow | no |
| /scholarships/awards-of-excellence-renewal-at-algoma-university-2026-awards-of-excellence-renewal-at- | 200 | 200 | index, follow | index, follow | no |
| /scholarships/creativity-takes-courage-scholarship-for-art-students-creativity-takes-courage-scholar | 200 | 200 | index, follow | index, follow | no |
| /scholarships/robert-b-henderson-memorial-endowed-scholarship-zalqbihm9le7 | 200 | 200 | index, follow | index, follow | no |
| /scholarships/guangdong-government-outstanding-foreign-student-scholarships-in-china-2-guangdong-government-outstanding | 200 | 200 | index, follow | index, follow | no |
| /scholarships/milestone-trial-lawher-scholarship-qckdybv63vli | 200 | 200 | index, follow | index, follow | no |
| /scholarships/jo-gaines-endowed-scholarship-i71bnywsczp4 | 200 | 200 | index, follow | index, follow | no |
| /scholarships/nicholas-perkins-hardeman-graduate-award-sdg6g2jqarkl | 200 | 200 | index, follow | index, follow | no |
| /scholarships/international-undergraduate-student-bursary-at-university-of-manitoba-20-international-undergraduate-stud | 200 | 200 | index, follow | index, follow | no |
| /scholarships/scott-jo-anne-charmack-endowed-coe-award-mjxvvmayniso | 200 | 200 | index, follow | index, follow | no |
| /scholarships/friends-of-the-leisure-world-library-scholarship-76aqlpcgskv7 | 200 | 200 | index, follow | index, follow | no |
| /scholarships/eastern-michigan-hockey-association-bob-landaal-scholarship-fsorqyhn4gpe | 200 | 200 | index, follow | index, follow | no |
| /scholarships/ius-high-achievers-scholarship-yemqeauxpiz3 | 200 | 200 | index, follow | index, follow | no |
| /scholarships/phcc-national-auxiliary-scholarship-qepsxdnmxuuq | 200 | 200 | index, follow | index, follow | no |
| /scholarships/dr-c-e-myers-and-olive-s-myers-memorial-scholarship-lxezwbvbathk | 200 | 200 | index, follow | index, follow | no |
| /scholarships/joseph-michael-murphy-memorial-scholarship-kutm9cj2ckwe | 200 | 200 | index, follow | index, follow | no |
| /scholarships/assistive-technology-award-at-red-river-college-polytech-2026-assistive-technology-award-at-re | 200 | 200 | index, follow | index, follow | no |

## 9) no-essay canonical winner

| Page | Railway canonical path | VPS canonical path |
|------|------------------------|--------------------|
| /scholarships/no-essay | /scholarships/no-essay | /scholarships/no-essay |
| /scholarships/category/no-essay | HTTP 308 (Location: /scholarships/no-essay) | HTTP 308 (Location: /scholarships/no-essay) |

Expected winner path: `/scholarships/no-essay` on both origins (path parity).

## 10) closing-soon

| Check | Railway | VPS |
|-------|---------|-----|
| robots | index, follow | index, follow |
| H1 count | 1 | 1 |
| H1 text | Apply for Closing Soon USA Scholarships | Apply for Closing Soon USA Scholarships |

## 11) California weak route

| | Railway | VPS |
|---|---------|-----|
| robots | noindex, follow | noindex, follow |
| noindex | yes | yes |
| parity | yes | |

## 12) VPS jobs still OFF

Active containers: scholarshiptop-site, scholarshiptop-nginx — **site/nginx only**

---

## Issues

- none

## Warnings

- none

## Constraints confirmed

- DNS: not changed
- Railway production: read-only fetches only
- Supabase: not modified
- VPS jobs: not started
- Env values: not printed
