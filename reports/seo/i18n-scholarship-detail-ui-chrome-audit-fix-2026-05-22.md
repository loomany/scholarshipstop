# Scholarship detail UI chrome audit/fix — 2026-05-22

## Scope

EN scholarship detail (`/scholarships/{slug}`) — user-reported English labels on chrome while DB body stays English until `scholarship_detail` pilot.

## Classification

| Class | Examples | Action |
|-------|----------|--------|
| A — UI chrome | Back to Matches, Scholarships breadcrumb, Deadline/Award/Requirements labels, Apply/Save/Not relevant, Sponsor & application | `lib/i18n/scholarshipDetailUiCopy.ts` + wired in `ScholarshipDetailPageClient.tsx` |
| B — DB content | Title, description, eligibility HTML | Requires `scholarship_detail` `content_translations` (Phase 5, not seeded) |
| C — Entity names | Scholarship title, provider name, category names | Keep as-is |
| D — Dates/amounts | Deadline values, award amounts | Keep values; labels localized |

## Implemented (commit `885dcaf`)

- Dictionary: EN / ES / FR strings for high-traffic chrome (back link, hub crumb, stat cards, who can apply, apply/save CTAs, disclaimers, show more/less, provider website).
- Locale from `usePathname()` + `getStage2LocaleFromPathname` (defaults EN on `/scholarships/…`).
- Fixed corrupted `Saved ✓` glyph.

## Remaining English chrome (EN route — acceptable until ES/FR detail exists)

- `SectionLabel` blocks: Eligibility, Scholarship Support, Key requirements, Applying, etc. (many strings in child components).
- Trust/quick-decision blocks (`ScholarshipTrustSignalsBlock`, `ScholarshipQuickDecisionGrid`).
- Category names via `breadcrumbCategoryLabel`.
- AI-generated section content.

## Future ES/FR detail route

When `/es|fr/scholarships/{slug}` renders with published translation, same `detailUi` copy will apply automatically from pathname locale; body from `content_translations`.

## Not done

- Full pass on all `SectionLabel` / FAQ / similar-scholarships headings.
- No `scholarship_detail` production rows.
