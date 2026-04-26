# SEO scripts inventory

High-level inventory of **SEO-related scripts** in this repo: what they read, what they write, operational flags, and whether they share centralized rules (planned: `lib/seo/seoQualityRules.ts` — **not wired in Step 1**).

Legend: **Norm** = normalization of title/meta before write; **Rev** = calls `POST /api/revalidate` or equivalent; **Shared rules** = imports shared SEO rule module (future); **State** = resume/state JSON; **Dry** = `--dry-run` or similar; **Cost** = explicit AI spend cap; **GPT** = OpenAI / model fallback usage.

---

## Primary pipeline (audit + fix)

| Script | npm (if any) | Reads | Writes | Norm | Rev | Shared rules | State | Dry | Cost | GPT |
|--------|----------------|-------|--------|------|-----|----------------|-------|-----|------|-----|
| [`scripts/audit-seo-pages.ts`](scripts/audit-seo-pages.ts) | `seo:audit`, `seo:audit:full` | Supabase rows, SEO JSON files, manifests, optional GSC; optional `SEO_AUDIT_URLS_FILE` filter | `docs/seo-audit-report.json`, CSV, `docs/seo-audit-action-plan.json` | n/a | n/a | no | n/a | limit via env | n/a | no |
| [`scripts/fix-seo-from-audit-targeted.ts`](scripts/fix-seo-from-audit-targeted.ts) | `seo:fix:targeted-from-audit`, `seo:fix:bad` | `docs/seo-audit-report.json`, Supabase (`scholarships`, `providers`, `compare_pages`, `state_compare_pages`, `content_posts`, `essays`, queues/cache tables) | Same DB tables + `docs/seo-fix-targeted-*.json` | yes (ensure title/meta/faq helpers) | **no** (not in script today) | no | yes (`docs/seo-fix-targeted-state.json`, paths overridable) | yes | tokens tracked / model checks (`requireGpt54` etc.) | yes |
| [`scripts/fix-seo-essays.ts`](scripts/fix-seo-essays.ts) | `seo:fix:essays` | `docs/seo-audit-report.json`, `essays` via Supabase | `essays` + `docs/seo-fix-essay-*.json` | yes (`isTitleGoodEnough`, templates, optional AI) | **yes** ([`lib/seo/revalidateSeoPath.ts`](../lib/seo/revalidateSeoPath.ts) `postSeoRevalidate`) | no | yes (`docs/seo-fix-essay-state.json`) | `--dry-run` | `--max-cost-usd` with `--allow-ai` | optional AI |
| [`scripts/seo-verify-runtime-sync.ts`](scripts/seo-verify-runtime-sync.ts) | `seo:verify:runtime-sync` | Supabase + `SEO_RUNTIME_SYNC_SAMPLES` JSON + `SEO_AUDIT_BASE_URL` HTML | console only | n/a | n/a | no | n/a | n/a | n/a | no |

---

## Scholarship SEO generation (DB + disk)

| Script | npm (if any) | Reads | Writes | Norm | Rev | Shared rules | State | Dry | Cost | GPT |
|--------|----------------|-------|--------|------|-----|----------------|-------|-----|------|-----|
| [`scripts/generate-seo-scholarship-ai.ts`](scripts/generate-seo-scholarship-ai.ts) | often via worker / manual | Scholarships / manifests / env | DB SEO fields / content (per script) | varies | varies | no | varies | varies | varies | yes |
| [`scripts/generate-scholarship-detail-seo-ai.ts`](scripts/generate-scholarship-detail-seo-ai.ts) | ad hoc | Detail rows, env | `scholarships` SEO columns | varies | not unified | no | varies | varies | varies | yes |
| [`scripts/seo-worker-generate.ts`](scripts/seo-worker-generate.ts) | `seo:worker-generate` | Queue / DB / env | DB + logs | varies | varies | no | worker implied | varies | varies | yes |
| [`scripts/seo-worker-drain.ts`](scripts/seo-worker-drain.ts) | `seo:worker-drain` | Queue tables | DB updates | varies | varies | no | n/a | varies | varies | yes |
| [`scripts/generate-long-tail-seo.ts`](scripts/generate-long-tail-seo.ts) | ad hoc | Source data / templates | Long-tail JSON under data paths | yes/no per block | no | no | n/a | varies | varies | possible |
| [`scripts/generate-keyword-seo-pages.ts`](scripts/generate-keyword-seo-pages.ts) | ad hoc | Keywords / config | SEO page artifacts | varies | no | no | n/a | varies | varies | possible |
| [`scripts/build-seo-scholarship-routes.ts`](scripts/build-seo-scholarship-routes.ts) | build pipeline | Manifest / SQL | Routes / manifest outputs | n/a | n/a | no | n/a | n/a | n/a | no |
| [`scripts/cron-seo-meta-generate.ts`](scripts/cron-seo-meta-generate.ts) | `cron:seo-meta-generate` | DB / queue / env | Meta cache / queue | varies | varies | no | n/a | varies | varies | yes |

---

## Listing / catalog audits (non-main audit)

| Script | npm (if any) | Reads | Writes | Norm | Rev | Shared rules | State | Dry | Cost | GPT |
|--------|----------------|-------|--------|------|-----|----------------|-------|-----|------|-----|
| [`scripts/audit-seo-listing-routes.ts`](scripts/audit-seo-listing-routes.ts) | ad hoc | Routes / manifests | report / console | n/a | n/a | no | n/a | varies | n/a | no |
| [`scripts/full-catalog-seo-audit.ts`](scripts/full-catalog-seo-audit.ts) | ad hoc | Catalog data | report | n/a | n/a | no | n/a | varies | n/a | no |
| [`scripts/audit-seo-scholarship-content.ts`](scripts/audit-seo-scholarship-content.ts) | ad hoc | Files / DB | report | n/a | n/a | no | n/a | varies | n/a | no |
| [`scripts/diagnose-seo-routes-live.ts`](scripts/diagnose-seo-routes-live.ts) | ad hoc | HTTP / routes | console | n/a | n/a | no | n/a | n/a | n/a | no |
| [`scripts/diagnose-seo-manifest-sql.ts`](scripts/diagnose-seo-manifest-sql.ts) | ad hoc | SQL / manifests | console | n/a | n/a | no | n/a | n/a | n/a | no |
| [`scripts/smoke-seo-listing-fallback.ts`](scripts/smoke-seo-listing-fallback.ts) | ad hoc | HTTP / data | console | n/a | n/a | no | n/a | n/a | n/a | no |

---

## Compare / enqueue / refresh

| Script | npm (if any) | Reads | Writes | Norm | Rev | Shared rules | State | Dry | Cost | GPT |
|--------|----------------|-------|--------|------|-----|----------------|-------|-----|------|-----|
| [`scripts/enqueue-university-compare.ts`](scripts/enqueue-university-compare.ts) | `seo:enqueue-university-compare` | Config / DB | queue rows | n/a | n/a | no | n/a | varies | n/a | no |
| [`scripts/enqueue-state-compare.ts`](scripts/enqueue-state-compare.ts) | `seo:enqueue-state-compare` | Config / DB | queue rows | n/a | n/a | no | n/a | varies | n/a | no |
| [`scripts/refresh-university-compare-sources.ts`](scripts/refresh-university-compare-sources.ts) | `seo:refresh-university-compare-sources` | External / DB | DB / JSON | n/a | n/a | no | n/a | varies | varies | possible |
| [`scripts/refresh-state-compare-pages.ts`](scripts/refresh-state-compare-pages.ts) | `seo:refresh-state-compare-pages` | DB / templates | `state_compare_pages` etc. | varies | varies | no | n/a | varies | varies | yes |
| [`scripts/compare-battle-stats.ts`](scripts/compare-battle-stats.ts) | `seo:compare-battle-stats` | reports / DB | console / file | n/a | n/a | no | n/a | n/a | n/a | no |
| [`scripts/compare-battle-sequential.ts`](scripts/compare-battle-sequential.ts) | `seo:compare-battle-sequential` | DB / OpenAI | compare tables | varies | varies | no | n/a | varies | varies | yes |

---

## Essays (generation / queue — SEO-relevant)

| Script | npm (if any) | Reads | Writes | Norm | Rev | Shared rules | State | Dry | Cost | GPT |
|--------|----------------|-------|--------|------|-----|----------------|-------|-----|------|-----|
| [`lib/essays/runEssayGenerationJob.ts`](../lib/essays/runEssayGenerationJob.ts) | used by API / workers | Queue, scholarships | `essays` | yes (normalized title/meta in pipeline) | indexing ping, not always Next revalidate | no | queue tables | n/a | implied by model usage | yes |
| [`scripts/run-manual-essay-guides.ts`](scripts/run-manual-essay-guides.ts) | `essay:manual-run` | manual queue / topics | `essays` | yes (`enforceTitle` / `enforceMeta` / `enforceFaq`) | optional indexing | no | `manual_essay_generation_queue` | n/a | n/a | yes |
| [`scripts/queue-next-essay-and-run-once.ts`](scripts/queue-next-essay-and-run-once.ts) | `essay:queue-next` | env / queue | essays pipeline | delegates | varies | no | n/a | n/a | varies | yes |
| [`scripts/run-essay-pipeline-full.ts`](scripts/run-essay-pipeline-full.ts) | `essay:pipeline-full` | queue | essays | delegates | varies | no | n/a | n/a | varies | yes |
| [`scripts/audit-manual-essay-guides.ts`](scripts/audit-manual-essay-guides.ts) | `essay:manual-audit` | DB / rules | report | n/a | n/a | no | n/a | n/a | n/a | no |

---

## Content hub (articles)

| Path | npm (if any) | Reads | Writes | Norm | Rev | Shared rules | State | Dry | Cost | GPT |
|------|----------------|-------|--------|------|-----|----------------|-------|-----|------|-----|
| [`services/content-hub/src/jobs/runContentJob.ts`](../services/content-hub/src/jobs/runContentJob.ts) | content-hub package scripts | topics / prompts | `content_posts` | varies | varies | no | job DB | varies | varies | yes |

---

## Misc SEO / measurement

| Script | npm (if any) | Reads | Writes | Norm | Rev | Shared rules | State | Dry | Cost | GPT |
|--------|----------------|-------|--------|------|-----|----------------|-------|-----|------|-----|
| [`scripts/seo-measure-urls.ts`](scripts/seo-measure-urls.ts) | `seo:measure-urls` | URL list / HTTP | metrics | n/a | n/a | no | n/a | n/a | n/a | no |
| [`scripts/seo-pilot-launch.ts`](scripts/seo-pilot-launch.ts) | `seo:pilot-launch` | config / URLs | logs | n/a | n/a | no | n/a | varies | n/a | no |
| [`scripts/seo-grand-audit.ts`](scripts/seo-grand-audit.ts) | `seo:grand-audit` | multiple sources | aggregate report | n/a | n/a | no | n/a | varies | n/a | varies |
| [`scripts/seo-enqueue-missing-hubs.ts`](scripts/seo-enqueue-missing-hubs.ts) | `seo:enqueue-missing` | manifests / DB | queue | n/a | n/a | no | n/a | n/a | n/a | no |
| [`scripts/generate-seo-pages-md.ts`](scripts/generate-seo-pages-md.ts) | ad hoc | internal | markdown docs | n/a | n/a | no | n/a | n/a | n/a | no |
| [`scripts/cron-seo-page-inspection.ts`](scripts/cron-seo-page-inspection.ts) | `cron:seo-page-inspection` | live URLs | logs / alerts | n/a | n/a | no | n/a | n/a | n/a | no |
| [`scripts/post-seo-daily-digest-telegram.mjs`](scripts/post-seo-daily-digest-telegram.mjs) | `seo:daily-digest-telegram` | reports | Telegram | n/a | n/a | no | n/a | n/a | n/a | no |

---

## Gaps (explicit)

1. **Shared `lib/seo/seoQualityRules`**: not present yet; audit and fix scripts each embed length checks (e.g. fix-essays `isTitleGoodEnough` / `isMetaGoodEnough` vs audit `getTitleRangeForType`).
2. **Revalidate after targeted DB fix**: `fix-seo-from-audit-targeted.ts` does not call `/api/revalidate` today — risk of stale ISR until natural revalidate or deploy.
3. **Compare runtime vs audit**: runtime may run `resolveAiMetaDescription`; audit scores stored `meta_description` from DB — intentional divergence unless unified later.

---

## Maintenance

When adding a new SEO script, append a row here and add a short entry in [`docs/seo-source-of-truth.md`](seo-source-of-truth.md) if it introduces a new write path or data source.
