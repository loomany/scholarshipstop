# i18n detail DB next work log — 2026-05-22

## Phase 0 — Repo safety

| Check | Result |
|-------|--------|
| `origin/main` at provider pilot | `63cf18c` before session work |
| No secrets staged | Confirmed — `.env*` untracked |
| Unrelated WIP on `main` | Many untracked reports/scripts (not committed) |

## Session commits pushed

| Commit | Summary |
|--------|---------|
| `885dcaf` | Detail language switcher clusters + scholarship UI chrome dictionary |

## Production baseline (pre-`885dcaf` HTML audit)

- Scholarship/provider EN detail: no `data-language-switcher-locale` in static HTML (navbar dropdown is client-mounted).
- ES/FR resource pilot: switcher anchors present (inline variant on article shell).
- ES scholarship detail: 404 (expected, no `scholarship_detail` rows).

## Phases completed this session

- **Phase 1–2:** Audit script + switcher fix (`detailLanguageSwitcher.ts`, `LanguageSwitcher` show when ≥1 locale).
- **Phase 3:** Partial scholarship detail UI chrome via `scholarshipDetailUiCopy.ts` (CTAs, stats, breadcrumb hub label).
- **Phase 4:** Provider +2 **not written** — seed script locked to 6 rows / 3 slugs; no stanford/yale data in pilot module.
- **Phase 5:** Audit only — gate still ends in `notFound()` after translation check; no DB seed.
- **Phase 6–7:** Not implemented (no `app/[locale]/essays/[slug]` gate; compare detail gate unchanged).
- **Phase 8:** Deferred (existing `i18n-stage5c-5-iq-final-remaining-cleanup-2026-05-22.md` untracked).

## Gates

| Gate | Result |
|------|--------|
| `npx tsx --test` detail + languageSwitcher tests | Pass |
| `npm run build` | Pass |
| Programmatic detail smoke | Pass |
| Production HTML locale scrape (navbar pages) | False negative — documented |

## Next

1. Post-deploy: confirm header dropdown on `/scholarships/climate-stripes-scholarship-14487` shows English (only) after `885dcaf` live.
2. Provider +2: extend seed script with `I18N_PROVIDER_PILOT_PLUS2` + translation data for 2 resolved slugs.
3. Scholarship detail pilot: implement render path after `gateLocalizedScholarshipDetailOrNotFound` before any production seed.
