# 02. AUTH-001 fix

Issue IDs covered: `AUTH-001`, `AUTH-003`  
Production touched: **NO**  
Secrets exposed: **NO**

## Было

Public country signup создавал auth user через service role с `email_confirm:true`, генерировал password, возвращал `sessionPassword` в browser и немедленно вызывал `signInWithPassword`.

## Стало

- Endpoint fail-closed: без `COUNTRY_SIGNUP_MODE=email_verification` возвращает 503 и safe standard signup path.
- Явно включенный режим создает только unconfirmed passwordless user (`email_confirm:false`).
- Password/credential не генерируется и не возвращается; browser auto-login удален.
- Session появляется только после перехода по email verification/magic-link chain.
- Добавлен in-memory VPS rate limit по Cloudflare IP, email hash и HttpOnly anonymous session; ответ 429 содержит `Retry-After`.
- Логи содержат masked email или 12-char hash, но не credential.
- `Button loading` теперь выставляет native `disabled` и `aria-busy`.

## Files changed

- `app/api/onboarding/country-signup/route.ts`
- `lib/onboarding/countryFirstSignupClient.ts`
- `components/onboarding/ScholarshipOnboardingWizard.tsx`
- `components/ui/Button/Button.tsx`
- `lib/security/countrySignupRateLimit.ts`
- `lib/security/__tests__/countrySignupRateLimit.test.ts`
- `lib/security/__tests__/countrySignupSecurityContract.test.ts`
- `.env.example`

## Commands run

- `npx tsx --test lib/security/__tests__/countrySignupRateLimit.test.ts lib/security/__tests__/countrySignupSecurityContract.test.ts`
- `npx tsc --noEmit`
- Full build/auth smoke заполняются после прогона gate.

## Tests passed/failed

- Auth security/rate-limit tests: **6 PASS, 0 FAIL**.
- `npx tsc --noEmit`: **PASS**.
- Full build and existing suites: pending P0 gate.

## Smoke plan

1. Default env: endpoint returns 503, no user row created, UI routes to standard signup.
2. Staging `email_verification`: response never contains password/session; user remains unconfirmed and no session cookie exists.
3. Tester opens owned mailbox link; only then auth callback creates session.
4. Sixth same-email attempt in window returns 429; raw email absent from rate-limit log.
5. Existing authenticated user can still sync own profile.

## Rollback plan

Safest rollback is `COUNTRY_SIGNUP_MODE=disabled`. Code rollback must never restore `email_confirm:true`, returned password or automatic password sign-in; route can remain unavailable while the standard signup stays active.

## Remaining risks

- In-memory limiter is appropriate for the current single Next.js VPS process but must be replaced by a shared store before horizontal scaling.
- CAPTCHA/challenge is not yet implemented; fail-closed mode and rate limits are the current controls.
- Email-link/session behavior still needs disposable/staging verification before enabling the safe mode.
