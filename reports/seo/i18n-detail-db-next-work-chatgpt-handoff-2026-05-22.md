# ChatGPT handoff — i18n detail work — 2026-05-22

**Pushed:** `885dcaf` — detail page language switcher (provider/scholarship/resource/essay clusters), `LanguageSwitcher` shows EN-only on scholarship detail, `scholarshipDetailUiCopy` for main chrome labels/CTAs.

**Not pushed:** provider +2 seed, scholarship_detail render/seed, essay/compare localized detail routes, IQ 5C-5.

**DB:** no writes. **OpenAI:** $0.

**Smoke:** unit + build green; programmatic switcher smoke green; production HTML scrape misses navbar dropdown (client) — verify in browser after deploy.

**Live check:** https://scholarshiptop.com/scholarships/climate-stripes-scholarship-14487 — expect header language control with English only; ES/FR scholarship URLs still 404.

**Next:** (1) browser QA post-deploy, (2) implement localized scholarship detail render + 1 manual ES/FR row, (3) provider +2 after script/slug extension.

**Rollback (existing provider pilot only):** `delete from content_translations where source_type='provider_profile' and locale in ('es','fr') and machine_model='stage5d-provider-manual-pilot';`

Full detail: `reports/seo/i18n-detail-db-next-work-master-report-2026-05-22.md`
