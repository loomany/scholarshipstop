# Scholarship SEO Route Policy Validation - 2026-05-28

## Build

Command:

```powershell
npm run build
```

Result: pass.

## Targeted unit test

Command:

```powershell
npx tsx --test lib/seo/__tests__/scholarshipSeoQualityPolicy.test.ts
```

Result: pass, 5 tests.

Covered examples:

- `/scholarships/california` excluded
- `/scholarships/no-essay` excluded
- `/scholarships/connecticut/high-school/nursing` excluded
- `/scholarships/engineering` kept indexable
- approved cross-country route kept indexable

## Full SEO lib test note

Command:

```powershell
npm run test:seo-lib -- --test-name-pattern "scholarship SEO route quality"
```

Result: existing unrelated failure in `lib/seo/__tests__/llmsFullGeoPolicy.test.ts`, which expects the old phrase `Fields agents must verify` in `llms-full.txt`. The new scholarship route-quality tests passed during that run. This task did not change `llms-full.txt`.

## Lint note

`npm run lint` is known in this project to invoke Next.js ESLint setup when config is absent/interactively unresolved. No new ESLint config was created in this task.

## Protected areas

No auth, payment, Lemon, checkout, onboarding, Supabase RLS, DB schema, migrations, env, account/dashboard/profile, private API, pricing/billing, or RSS route files were changed.
