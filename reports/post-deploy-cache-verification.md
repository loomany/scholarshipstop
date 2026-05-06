# Final Pre/Post-Deploy Flow: `unstable_cache + cookies` fix

## PRE-DEPLOY

### 1) TypeScript

- [ ] Run:
  - `npx tsc --noEmit`

### 2) Guard test

- [ ] Run:
  - `npx tsx --test app/api/scholarships/__tests__/route.cache-safety.test.ts`

### 3) Validate architecture constraints

- [ ] Inside `unstable_cache` there is no:
  - [ ] `createClient(`
  - [ ] `cookies(`
  - [ ] `headers(`
- [ ] Guest/public cache logic preserved.
- [ ] Auth personalization preserved.
- [ ] SEO routes / metadata / sitemap / canonical not changed.

### 4) Validate diff scope

- [ ] Modified only:
  - `app/api/scholarships/route.ts`
- [ ] Added only:
  - `app/api/scholarships/__tests__/route.cache-safety.test.ts`
- [ ] Observability tooling remains separate.

### 5) Validate reports present

- [ ] `reports/unstable-cache-audit.md`
- [ ] `reports/post-deploy-cache-verification.md`

---

## DEPLOY

- [ ] Push / deploy fix.
- [ ] Wait for Railway deployment completion.

---

## POST-DEPLOY FUNCTIONAL CHECKS

### Guest

- [ ] Open `/scholarships`.
- [ ] Verify SSR first load.
- [ ] Verify listings open and paginate.
- [ ] Verify no 500 errors.

### Auth

- [ ] Sign in.
- [ ] Open `/scholarships`.
- [ ] Verify My Scholarships tabs.
- [ ] Verify sidebar counts.
- [ ] Verify `meta_only` flows.
- [ ] Verify personalized tabs behavior.

### SEO

- [ ] Verify promoted SEO routes.
- [ ] Verify SSR-visible HTML.
- [ ] Verify metadata/canonical.
- [ ] Verify guest cache behavior remains intact.

---

## OBSERVABILITY CHECKS

### 1) Fetch fresh logs

- [ ] Run:
  - `npm run logs:fetch -- --service "Сайт" --lines 1000`

### 2) Run analyzer

- [ ] Run:
  - `npm run logs:analyze`

### 3) Inspect incidents report

- [ ] Check:
  - `reports/confirmed-incidents.md`

### 4) Verify absence of cache-scope dynamic warnings

- [ ] Ensure no new matches for:
  - `cookies inside unstable_cache`
  - `headers inside unstable_cache`
  - `createClient inside unstable_cache`
  - `dynamic server usage inside cache`

Railway grep/check examples:

```bash
railway logs --service "Сайт" --lines 1000 | findstr /i "unstable_cache cookies headers createClient dynamic"
```

```powershell
railway logs --service "Сайт" --lines 1000 | Select-String "unstable_cache|cookies|headers|createClient|dynamic"
```

---

## SUCCESS CRITERIA

Fix is successful only if all are true:

- [ ] `route.cache-safety.test.ts` PASS.
- [ ] No `unstable_cache` warnings.
- [ ] No SSR regressions.
- [ ] No broken sidebar counts.
- [ ] No broken personalization.
- [ ] No guest cache regressions.
- [ ] Confirmed incident disappears from `reports/confirmed-incidents.md`.

---

## ROLLBACK CONDITIONS

Rollback immediately if any:

- [ ] Sidebar counts are broken.
- [ ] Auth personalization disappears.
- [ ] Guest listings become `no-store`.
- [ ] SEO SSR degrades.
- [ ] New 500 errors appear.
- [ ] My Scholarships behaves incorrectly.
- [ ] SSR response time regresses significantly.

Rollback action:

- [ ] Revert commit.
- [ ] Redeploy previous stable build.
- [ ] Re-run:
  - `npm run logs:fetch -- --service "Сайт" --lines 1000`
  - `npm run logs:analyze`
