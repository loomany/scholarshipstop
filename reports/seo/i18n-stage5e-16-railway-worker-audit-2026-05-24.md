# Stage 5E-16 — Railway worker audit (2026-05-24)

## Current runner: `run-relaxed-autopilot.ts`

| Question | Answer |
|----------|--------|
| Headless on Railway? | **Yes**, with wrapper. Runner is CLI-only, no Cursor/TUI. Needs env vars + Supabase + outbound HTTPS to production for smoke/sitemap. |
| Exits cleanly after target? | **Yes**. Loop stops when `netNewScholarships >= target` or gate failure; `process.exit(0)` on `stoppedReason: completed`, else `exit(1)`. |
| Resumable? | **Yes**. Pass `--start-wave=N` from last accepted wave + 1; target = remaining net-new. Wave numbers map to `machine_model` for rollback. |
| Infinite loop? | **No**. Bounded by target, max-waves arg, pool exhaustion, or gate failure. |

## Required env vars (production)

| Variable | Purpose |
|----------|---------|
| `I18N_SCHOLARSHIP_AUTOPILOT=1` | Autopilot guard |
| `I18N_PILOT_ALLOW_DB_WRITES=1` | Allow DB upserts |
| `I18N_PILOT_ALLOW_PRODUCTION=1` | Allow production publish |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project |
| `SUPABASE_SERVICE_ROLE_KEY` | DB reads/writes |
| `SMOKE_BASE_URL` / `SITE_URL` | Production smoke + sitemap checks (default scholarshiptop.com) |
| `IQ_SMOKE_BASE_URL` | Optional IQ regression (default iq.scholarshiptop.com) |

CLI args (passed by worker wrapper):

- `--start-wave=N` (required for production)
- `--target=N` (net-new scholarships)
- `--wave-size=N` (50–150 tested)

## Current behavior summary

- **Candidate selection:** tiered pool A/B only via `select-candidates-tiered.ts`
- **Overlays:** deterministic $0 via `generate-overlays.ts`
- **Publish:** `publish-wave.ts` → `content_translations` upsert + sitemap revalidation
- **Gates:** validation fail rate, net-new source_id guard, sitemap delta guard (with retry), route/HTML smoke
- **Checkpoints:** every 5 waves (stage5e-15), build/tsc/tests on checkpoint
- **Reports:** per-wave CSV/smoke under `reports/seo/` (ephemeral on Railway unless volume mounted)
- **Rollback:** `rollback-wave.ts --wave=N --relaxed` (manual, destructive — not automated)

## Risks for Railway

| Risk | Mitigation |
|------|------------|
| Two autopilots in parallel | Postgres advisory lock RPC (migration proposed, not applied) |
| Transient sitemap count false stop | `countSitemapWithRetry()` in runner (committed locally) |
| Long runtime / cron overlap | Worker `I18N_WORKER_MAX_RUNTIME_MINUTES` + SIGTERM |
| `.env.local` missing on Railway | Worker uses Railway env; `loadEnvLocal()` is optional |
| Reports lost on ephemeral disk | Logs to stdout; optional worker summary report |
| Regression `npm run build` during run | Heavy; keep wave-size/target modest on first Railway runs |
| No public lock visibility | `railway-worker-status.ts` + `i18n_scholarship_autopilot_is_locked()` RPC |

## Verdict

**Railway-ready with wrapper + lock migration approval.** Do not deploy worker until lock migration is applied and first manual run is approved.
