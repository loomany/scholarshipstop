# Static Pages i18n Inventory

Date: 2026-05-19

## Summary

| Category | Count | ES/FR action |
|----------|------:|--------------|
| Already in Stage 2 pilot (verified) | 26 | Verify only |
| **New static translations (this pass)** | **28** | **Translate** |
| DB-backed / long-tail | Many | Skip |
| Private / auth / paywall | ~20 | Skip |
| Query/filter variants | Hub bases | noindex only |

**Pilot total after extension:** 53 canonical paths × 2 locales = **106** localized URLs.

---

## 1. Already translated (Stage 2 — verify only)

| Route | File | Static | Indexable | ES/FR | Translate now |
|-------|------|--------|-----------|-------|---------------|
| `/` | `app/page.tsx` | Partial (Suspense) | Yes | Yes | No |
| `/scholarships` | `app/scholarships/[[...slugPath]]/page.tsx` | Hub (DB catalog) | Yes | Yes (static hub UI) | No |
| `/essays` | `app/essays/page.tsx` | Hub (DB list) | Yes | Yes | No |
| `/providers` | `app/providers/page.tsx` | Hub (DB) | Yes | Yes | No |
| `/compare` | `app/compare/page.tsx` | Hub (DB list) | Yes | Yes | No |
| `/resources` | `app/resources/page.tsx` | Hub (DB list) | Yes | Yes | No |
| Trust pages (9) | `app/*/page.tsx` + `trustPageContent.ts` | Yes | Yes | Yes | No |
| `/essays/examples` … `/essays/mistakes` (5) | `app/essays/[slug]/page.tsx` | Yes | Yes | Yes | No |
| Compare guides (4) | `app/compare/[slug]/page.tsx` | Yes | Yes | Yes | No |

---

## 2. Translated in this pass (28 routes)

### Essay static guides (6)

| Route | File | Static | Indexable | ES/FR | Translate now |
|-------|------|--------|-----------|-------|---------------|
| `/essays/outline` | `app/essays/[slug]/page.tsx` | Yes | Yes | **Yes** | Done |
| `/essays/leadership` | same | Yes | Yes | **Yes** | Done |
| `/essays/why-do-you-deserve-this-scholarship` | same | Yes | Yes | **Yes** | Done |
| `/essays/personal-statement` | same | Yes | Yes | **Yes** | Done |
| `/essays/stem` | same | Yes | Yes | **Yes** | Done |
| `/essays/no-essay-scholarships` | same | Yes | Yes | **Yes** | Done |

### Resource static guides — slug pages (9)

| Route | File | Static | Indexable | ES/FR | Translate now |
|-------|------|--------|-----------|-------|---------------|
| `/resources/how-to-find-scholarships` | `app/resources/[slug]/page.tsx` | Yes | Yes | **Yes** | Done |
| `/resources/how-to-apply-for-scholarships-checklist` | same | Yes | Yes | **Yes** | Done |
| `/resources/no-essay-scholarships-guide` | same | Yes | Yes | **Yes** | Done |
| `/resources/easy-scholarships-guide` | same | Yes | Yes | **Yes** | Done |
| `/resources/stem-scholarships-guide` | same | Yes | Yes | **Yes** | Done |
| `/resources/scholarships-in-usa-for-international-students` | same | Yes | Yes | **Yes** | Done |
| `/resources/scholarships-for-high-school-seniors` | same | Yes | Yes | **Yes** | Done |
| `/resources/scholarship-eligibility-explained` | same | Yes | Yes | **Yes** | Done |
| `/resources/scholarship-documents-checklist` | same | Yes | Yes | **Yes** | Done |

### Resource dedicated guides — ResourceGuideShell (5)

| Route | File | Static | Indexable | ES/FR | Translate now |
|-------|------|--------|-----------|-------|---------------|
| `/resources/how-to-apply-for-scholarships` | `app/resources/how-to-apply-for-scholarships/page.tsx` | Yes | Yes | **Yes** | Done |
| `/resources/scholarship-deadlines-explained` | `app/resources/scholarship-deadlines-explained/page.tsx` | Yes | Yes | **Yes** | Done |
| `/resources/combine-multiple-scholarships` | `app/resources/combine-multiple-scholarships/page.tsx` | Yes | Yes | **Yes** | Done |
| `/resources/medical-scholarships-guide` | `app/resources/medical-scholarships-guide/page.tsx` | Yes | Yes | **Yes** | Done |
| `/resources/scholarships-for-international-students-guide` | `app/resources/scholarships-for-international-students-guide/page.tsx` | Yes | Yes | **Yes** | Done |

### Legal / help (5)

| Route | File | Static | Indexable | ES/FR | Translate now |
|-------|------|--------|-----------|-------|---------------|
| `/terms` | `app/terms/page.tsx` | Yes | Yes | **Yes** | Done |
| `/privacy-policy` | `app/privacy-policy/page.tsx` | Yes | Yes | **Yes** | Done |
| `/refund-policy` | `app/refund-policy/page.tsx` | Yes | Yes | **Yes** | Done |
| `/help` | `app/help/page.tsx` | Yes | Yes | **Yes** | Done |
| `/faq` | `app/faq/page.tsx` | Yes | Yes | **Yes** | Done |

### Marketing (3)

| Route | File | Static | Indexable | ES/FR | Translate now |
|-------|------|--------|-----------|-------|---------------|
| `/international-students` | `app/international-students/page.tsx` | Yes | Yes | **Yes** | Done |
| `/for-organizations` | `app/for-organizations/page.tsx` | Yes | Yes | **Yes** | Done |
| `/submit-grant` | `app/submit-grant/page.tsx` | Yes | Yes | **Yes** | Done |

---

## 3. DB-backed — skip

| Route pattern | Reason |
|---------------|--------|
| `/resources/{slug}` (CMS) | Supabase content posts |
| `/essays/{slug}` (CMS) | Supabase essays |
| `/scholarships/**` long-tail | Scholarship listings |
| `/providers/{slug}` | Provider profiles |
| `/compare/universities/**`, `/compare/states/**` | DB compare pages |

---

## 4. Private / auth — skip

`/dashboard`, `/account`, `/subscription`, `/signin`, `/onboarding`, `/get-scholarships`, `/essay`, `/tools`, etc.

---

## 5. Query / filter — noindex only

Hub bases (`/scholarships`, `/essays`, …) and localized pilot URLs with `searchParams` remain `noindex, follow`.

---

## Rendering model (ES/FR)

| Kind | English template | Localized entry |
|------|------------------|-----------------|
| `essay` | `StaticEssayGuidePage` | `LocalizedPilotPageView` |
| `resource` | `StaticScholarshipGuidePage` | `LocalizedPilotPageView` |
| `resourceShell` | `ResourceGuideShell` | `LocalizedResourceShellPage` |
| `legal` | Terms-style layout | `LegalDocumentPage` |
| `marketing` | International-students-style sections | `LocalizedMarketingPage` |
| `trust` | `TrustPageTemplate` | `LocalizedPilotPageView` |

Route: `app/[locale]/[[...slugPath]]/page.tsx` → `LocalizedProductionPage` → production templates (not emergency shells).
