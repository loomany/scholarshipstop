# i18n detail DB next work — master report — 2026-05-22

## 1. Done

- **Detail language switcher** (`885dcaf`): provider pilot EN/ES/FR; scholarship EN-only until published translations; resource pilot via existing href helpers; essay long-tail EN-only; locale prefix stripping for `/es/providers/…`.
- **LanguageSwitcher**: show when ≥1 locale (fixes hidden EN-only scholarship switcher).
- **Scholarship detail UI chrome**: `scholarshipDetailUiCopy.ts` + primary CTAs/stats/breadcrumb/back links.
- **Tests + build**: detail/languageSwitcher tests pass; `npm run build` pass.
- **Reports**: Phases 0–3, 5D–5G audits; this master + handoff.

## 2. Pushed

| Commit | Branch |
|--------|--------|
| `885dcaf` | `main` |

## 3. Not pushed

- Smoke script HTML expectation fix (local, commit pending).
- Phase 4 provider +2 seed.
- Phase 5E scholarship render + seed.
- Phases 6–7 essay/compare routes.
- Phase 8 IQ 5C-5 cleanup.

## 4. DB writes

None this session.

## 5. OpenAI

$0 — no API calls.

## 6. Build / tests / smoke

| Check | Result |
|-------|--------|
| Unit tests (detail + languageSwitcher) | Pass |
| `npm run build` | Pass |
| Programmatic `i18n-detail-language-switcher-smoke.ts` | Pass (after script fix) |
| Production HTML locale scrape | Unreliable for navbar dropdown — use browser QA post-deploy |

## 7. New live URLs

None (no new DB rows).

## 8. 404 gates (unchanged)

- `/es|fr/scholarships/{slug}` without `scholarship_detail` → 404
- `/es|fr/essays/{long-tail-slug}` without translation → 404
- Compare detail pairs → 404
- `/en` → 404

## 9. Sitemap

No changes.

## 10. Remaining issues

- Production may still be serving prior bundle — verify header switcher on scholarship detail manually after deploy settles.
- Many scholarship section headings still English on EN page.
- Provider +2, scholarship/essay/compare DB pilots blocked on render/seed tooling.

## 11. Next recommended step

1. Browser QA: https://scholarshiptop.com/scholarships/climate-stripes-scholarship-14487 — header language dropdown visible, English only.
2. Implement scholarship detail render after gate; seed 1× ES/FR manually.
3. Extend provider seed script for +2 slugs after UUID resolution.

## 12. Rollback SQL

No new rows. Existing provider pilot:

```sql
delete from public.content_translations
where source_type = 'provider_profile'
  and locale in ('es', 'fr')
  and machine_model = 'stage5d-provider-manual-pilot';
```

## 13. Scale DB translations?

**Safe to continue** for gated pilots (category, resource, provider) with dry-run + row caps + manual QA. **Do not bulk** scholarship/compare/essay until per-type render gates and switcher published-slug sets exist.
