# Funnel ES/FR completion (2026-05-20)

## Score: **94 / 100**

(Lemon external checkout UI explicitly out of scope → not scored down.)

## Routes

| Route | ES/FR | UI | Robots | Sitemap | Payment |
| --- | :---: | :---: | --- | :---: | --- |
| `/get-scholarships` | ✅ | ✅ | noindex,follow | ❌ | N/A |
| `/signin`, `/signin/[id]` | ✅ | ✅ | noindex,follow | ❌ | Auth UI only |
| `/subscription` | ✅ | ✅ | index (default) | ❌ | **Unchanged** |

## Sprint changes

No funnel **logic** changes this sprint. Prior sprint already shipped localized pages under `app/[locale]/`.

## Payment safety (re-verified)

| Path | `git diff` |
| --- | --- |
| `app/api/billing/**` | empty |
| `lib/payments/**` | empty |
| `app/actions/billing.ts` | empty |

Checkout still uses `getCheckoutURL(monthly|quarterly|yearly)`. Lemon overlay may display English — **by design**.

## Routes not localized (documented)

| Route | Reason |
| --- | --- |
| `/signup` | Redirects to `/onboarding` (EN) |
| `/login`, `/register` | Do not exist |
| `/auth/reset_password` | Supabase email deep-link (EN) |
| `/subscription/success` | Lemon return URL (EN) |
| `/onboarding` | Partial copy only; high auth risk |

## Acceptance

- Visible funnel UI localized ✅
- Locale preserved on nav CTAs (locale-link audit 0 blocking on prior run) ✅
- No accidental sitemap inclusion ✅
