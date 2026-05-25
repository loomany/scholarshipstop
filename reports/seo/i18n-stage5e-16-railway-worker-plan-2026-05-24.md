# Stage 5E-16 — Railway worker plan (2026-05-24)

## 1. Railway-ready?

**Yes (code prepared).** Separate worker service; main Next.js web service unchanged.

## 2. Files changed

| File | Role |
|------|------|
| `scripts/i18n/scholarship-detail-autopilot/run-railway-worker.ts` | Wrapper: env, lock, spawn runner, max runtime, exit |
| `scripts/i18n/scholarship-detail-autopilot/worker-config.ts` | Env parsing + validation |
| `scripts/i18n/scholarship-detail-autopilot/scholarship-autopilot-lock.ts` | Advisory lock via Supabase RPC |
| `scripts/i18n/scholarship-detail-autopilot/railway-worker-status.ts` | Read-only status |
| `scripts/i18n/scholarship-detail-autopilot/run-relaxed-autopilot.ts` | Sitemap count retry hardening |
| `supabase/migrations/20260524180000_i18n_scholarship_autopilot_advisory_lock.sql` | Lock RPC (**apply before prod lock**) |
| `lib/i18n/__tests__/scholarshipAutopilotWorkerConfig.test.ts` | Config unit tests |
| `package.json` | `i18n:scholarship-autopilot:*` scripts |

## 3. Env vars (Railway service `scholarship-i18n-worker`)

```
I18N_SCHOLARSHIP_AUTOPILOT=1
I18N_PILOT_ALLOW_DB_WRITES=1
I18N_PILOT_ALLOW_PRODUCTION=1
I18N_WORKER_START_WAVE=181
I18N_WORKER_TARGET=100
I18N_WORKER_WAVE_SIZE=50
I18N_WORKER_MAX_RUNTIME_MINUTES=90
I18N_WORKER_REQUIRE_LOCK=1
I18N_WORKER_RUN_ID=<optional uuid>
NEXT_PUBLIC_SUPABASE_URL=<Railway secret>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<Railway secret>
SUPABASE_SERVICE_ROLE_KEY=<Railway secret>
SITE_URL=https://scholarshiptop.com
SMOKE_BASE_URL=https://scholarshiptop.com
```

Dry-run locally (no writes): omit production guards or set `I18N_WORKER_DRY_RUN=1` and `I18N_WORKER_REQUIRE_LOCK=0`.

## 4. Lock mechanism

- Postgres **session advisory lock** key `hashtext('scholarship_detail_autopilot')`
- RPC: `i18n_scholarship_autopilot_try_lock`, `_unlock`, `_is_locked`
- Auto-releases on DB session disconnect (crash/kill)
- **Migration not applied yet** — run `supabase db push` (or apply SQL in Supabase dashboard) before `I18N_WORKER_REQUIRE_LOCK=1`

## 5. Start command

```
npm run i18n:scholarship-autopilot:railway
```

Status (read-only):

```
npm run i18n:scholarship-autopilot:status
```

## 6. Manual Railway setup

1. Create new Railway service **`scholarship-i18n-worker`** (same repo, branch `main`).
2. **Disable public domain.**
3. Build: same as web (`npm install`, `npm run build` optional for worker — runner uses tsx).
4. Start command: `npm run i18n:scholarship-autopilot:railway`
5. Copy Supabase + guard env vars from secure store (not repo).
6. Apply lock migration to Supabase.
7. **Manual deploy/run once** — do not enable cron until first run passes.
8. Watch logs + `npm run i18n:scholarship-autopilot:status` from local.

## 7. Next production run (Stage 5E-17, wave 188+)

**Prerequisites:** guard commit on `main` deployed to `scholarship-i18n-worker`; auto-deploy **OFF**; restart policy **Never**; worker **stopped** until manual run.

| Setting | Value |
|---------|-------|
| `I18N_WORKER_START_WAVE` | **188** |
| `I18N_WORKER_TARGET` | **900** |
| `I18N_WORKER_WAVE_SIZE` | **150** |
| `I18N_WORKER_MAX_RUNTIME_MINUTES` | **600** |
| `I18N_WORKER_REQUIRE_LOCK` | **1** |
| `I18N_WORKER_FORCE_START_WAVE` | **unset** (do not set `=1`) |

Pre-run: `npm run i18n:scholarship-autopilot:status` — lock not held, sitemap **13051/13051**, `nextSafeStartWave` **188**.

Expected: waves **188–193**, sitemap **13051 → 13951**, clean exit, lock released.

**Do not** leave `I18N_WORKER_START_WAVE=183` in Railway after repeat-start incident.

## 8. Resume / rollback

**Resume:** set `I18N_WORKER_START_WAVE` to last accepted + 1; `I18N_WORKER_TARGET` = remaining net-new.

**Rollback one wave (manual, destructive):**

```sql
delete from public.content_translations
where source_type = 'scholarship_detail'
  and locale in ('es', 'fr')
  and machine_model = 'stage5e-scholarship-autopilot-relaxed-wave-{N}';
```

Then revalidate sitemaps via existing publish/revalidate path.

## 9. What NOT to do

- Do not add worker to main web service start command
- Do not run two workers/cron overlaps without lock migration
- Do not commit `.env` / secrets
- Do not enable auto-deploy or **restart-on-failure** on worker (one-shot manual only)
- Do not rerun a wave without `I18N_WORKER_FORCE_START_WAVE=1` when DB rows exist
- Do not switch to provider/resource/essay/compare

## 10. Ready to create Railway service?

**Code: yes. Production worker: not yet.**

Blockers before first prod run:

1. Apply advisory lock migration
2. Push commit to `main`
3. Explicit user approval for first manual Railway run
4. Confirm no local autopilot running

Current production baseline: **13051/13051** ES/FR; next wave **188**; see `i18n-stage5e-17-railway-worker-repeat-startwave-audit-2026-05-24.md`.
