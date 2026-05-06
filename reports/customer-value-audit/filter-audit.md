# Stage 3 — Filter customer audit

- **Generated:** 2026-05-05T23:47:15.332Z
- **Base URL:** http://localhost:3001

## 1. Overall verdict

**warnings**

## 2. Filters checked

- Keyword search (`q`)
- Categories (`category`)
- Study in / host (`host_cc`)
- Citizenship / I’m from (`app_cc`)
- Sort (`sort`)
- More Filters — deadline preset (`deadline`)
- Combined category + host

## 3. Scenario outcomes

- **Pass (6):** A — Keyword search (STEM); B — Categories; C — Study in (United States); D — I'm from (Canada); E — Sort without clearing category; G — Combined (category + Study in US)
- **Warn (1):** F — More filters (deadline > 4 weeks)
- **Fail (0):** —

## 4. Listing relevance (heuristic / visual)

- **B — Categories:** STEM had no listings; used fallback category: Education.
- **F — More filters (deadline > 4 weeks):** Expected `deadline=gt4w` in URL; may use alias or client-only state.
- **A — Keyword:** Visible geography chips on the first rows may not match “STEM” literally; confirm keyword ranking uses fields beyond the card snippet.

## 5. Controls not found / not clickable

_None recorded beyond per-scenario details._

## 6. URL / state preservation

_No explicit URL/state failures summarized._

## 7. Recommendations (audit only — no code changes here)

- Re-run this script after any hub filter or URL-sync change (`scripts/customer-value-audit-filters.ts`).
- For each **fail**, treat `failReason` + screenshot as the repro; possible fixes belong in product code or test data, not in this audit.
- Guests: locked sort options may block deadline/amount sorts — expected; confirm with a signed-in run if needed later.

## Per-scenario detail

### A — Keyword search (STEM) — PASS

- Starting URL: `http://localhost:3001/scholarships/hub/matches`
- Final URL: `http://localhost:3001/scholarships/hub/matches?q=STEM`
- Cards before / after: 9 → 9
- First titles: EIT Innoenergy Masters Scholarship for Indians 2025 | Monash High Achiever Award (for new students) at Monash University Malaysia 2025 | EPSRC Doctoral Landscape Scholarships at University of Glasgow 2025 | SARAO Masters Scholarship 2026 | Clinical PhD Scholarship - Promoting Equity in Stroke Rehabilitation at University of Auckland Technology 2026
- Visible chips: Eligible: India | Study in: Spain | Eligible: India | Study in: Spain
- Screenshot: `reports/customer-value-audit/screenshots/filter-a-keyword-stem.png`

### B — Categories — PASS

- Starting URL: `http://localhost:3001/scholarships/hub/matches`
- Final URL: `http://localhost:3001/scholarships/hub/matches?category=education`
- Cards before / after: 9 → 9
- First titles: EIT Innoenergy Masters Scholarship for Indians 2025 | Migrant Farmworker Baccalaureate Scholarship | University of Calgary Award for International Student Athletes 2026 | Yavapai-Apache Nation Higher Education Scholarship | Korean Studies Association of South East Asia Scholarships at UNSW Canberra 2026
- Visible chips: Eligible: India | Study in: Spain | Eligible: India | Study in: Spain
- Relevance notes: STEM had no listings; used fallback category: Education.
- Screenshot: `reports/customer-value-audit/screenshots/filter-b-categories.png`

### C — Study in (United States) — PASS

- Starting URL: `http://localhost:3001/scholarships/hub/matches`
- Final URL: `http://localhost:3001/scholarships/hub/matches?host_cc=US`
- Cards before / after: 9 → 9
- First titles: Transfer Scholarship at Taylor University 2026 | Wagner-Torizuka Fellowship by Society of Nuclear Medicine and Molecular Imaging (SNMMI) 2026 | OAS Scholarship and Training Programs 2026 | International Dean’s Scholarship | GGU Worldwide Scholarship (UHUB)
- Visible chips: Study in: United States | Study in: United States
- Screenshot: `reports/customer-value-audit/screenshots/filter-c-study-in-us.png`

### D — I'm from (Canada) — PASS

- Starting URL: `http://localhost:3001/scholarships/hub/matches`
- Final URL: `http://localhost:3001/scholarships/hub/matches?app_cc=CA`
- Cards before / after: 9 → 9
- First titles: Peter F. Bronfman Award at Schulich School of Business 2026 | Walter and Laura Scott Horticulture Scholarship | Margaret and Angus Hamilton Apple Research Scholarship | Dr. H. A. Logan Scholarship | Janice and Earle O’Born Family Foundation Graduate Scholarship
- Visible chips: Eligible: Canada | Study in: Canada | Eligible: Canada | Study in: Canada
- Screenshot: `reports/customer-value-audit/screenshots/filter-d-from-canada.png`

### E — Sort without clearing category — PASS

- Starting URL: `http://localhost:3001/scholarships/hub/matches?category=education`
- Final URL: `http://localhost:3001/scholarships/hub/matches?category=education&sort=most_recent`
- Cards before / after: 9 → 9
- First titles: DeSalvo Family Library Education Endowed Scholarship | Minnesota State Fair Scholarship | Ohio GFOA Continuing Education Scholarship | Out to Innovate Scholarship | Yankton Sioux Tribe Higher Education Scholarship
- Visible chips: Study in: United States | Study in: United States
- Screenshot: `reports/customer-value-audit/screenshots/filter-e-sort.png`

### F — More filters (deadline > 4 weeks) — WARN

- Starting URL: `http://localhost:3001/scholarships`
- Final URL: `http://localhost:3001/scholarships/hub/matches`
- Cards before / after: 9 → 9
- First titles: Climate Stripes Scholarship | Fintech Innovation Scholarship | Vice-Chancellor’s Scholarship | Creative Arts Scholarship | China University of Petroleum Scholarship
- Visible chips: Study in: United Kingdom | Study in: United Kingdom
- Relevance notes: Expected `deadline=gt4w` in URL; may use alias or client-only state.
- **Possible fix (for developers later):** align URL query sync (`replaceListingParams`), ensure async sidebar counts finish before footer actions enable, keep apply buttons in scroll view / stable selectors; verify catalog has rows for chosen filter.
- Screenshot: `reports/customer-value-audit/screenshots/filter-f-more-filters.png`

### G — Combined (category + Study in US) — PASS

- Starting URL: `http://localhost:3001/scholarships/hub/matches`
- Final URL: `http://localhost:3001/scholarships/hub/matches?category=education&host_cc=US`
- Cards before / after: 9 → 9
- First titles: OAS Scholarship and Training Programs 2026 | Provost’s Postdoctoral Fellowship at University of Pennsylvania 2025-26 | Duke Law India Masters scholarship 2026 | Brad Evans Scholarship application deadline 2026 USA | $10,000 "No Essay" Scholarship
- Visible chips: Study in: United States | Study in: United States
- Screenshot: `reports/customer-value-audit/screenshots/filter-g-combined.png`
