/** Billing cadence for Lemon checkouts / subscription PATCH (must match `app/actions/billing.ts` usage). */
export type BillingPlanKey = 'monthly' | 'quarterly' | 'yearly';

export type ResolveLemonVariantOptions = {
  /**
   * When the subscription row has `test_mode: true` (Lemon test checkouts), prefer
   * `LEMONSQUEEZY_*_VARIANT_ID_TEST` — Test catalog variant ids often differ from Live.
   * If test-specific env is unset, falls back to the normal `LEMONSQUEEZY_*` / `NEXT_PUBLIC_LS_*` ids.
   */
  lemonTestMode?: boolean;
};

function variantIdForPlanFromEnv(plan: BillingPlanKey, test: boolean): string | null {
  const primary =
    plan === 'monthly'
      ? test
        ? process.env.LEMONSQUEEZY_MONTHLY_VARIANT_ID_TEST
        : process.env.LEMONSQUEEZY_MONTHLY_VARIANT_ID
      : plan === 'quarterly'
        ? test
          ? process.env.LEMONSQUEEZY_QUARTERLY_VARIANT_ID_TEST
          : process.env.LEMONSQUEEZY_QUARTERLY_VARIANT_ID
        : test
          ? process.env.LEMONSQUEEZY_YEARLY_VARIANT_ID_TEST
          : process.env.LEMONSQUEEZY_YEARLY_VARIANT_ID;
  const fallback =
    plan === 'monthly'
      ? test
        ? process.env.NEXT_PUBLIC_LS_MONTHLY_VARIANT_ID_TEST
        : process.env.NEXT_PUBLIC_LS_MONTHLY_VARIANT_ID
      : plan === 'quarterly'
        ? test
          ? process.env.NEXT_PUBLIC_LS_QUARTERLY_VARIANT_ID_TEST
          : process.env.NEXT_PUBLIC_LS_QUARTERLY_VARIANT_ID
        : test
          ? process.env.NEXT_PUBLIC_LS_YEARLY_VARIANT_ID_TEST
          : process.env.NEXT_PUBLIC_LS_YEARLY_VARIANT_ID;
  const v = (primary ?? fallback)?.trim();
  return v && v.length > 0 ? v : null;
}

/**
 * Variant id for env-configured plans (`LEMONSQUEEZY_*` with `NEXT_PUBLIC_LS_*` fallback).
 * Shared by server actions and `/api/billing/update-subscription` — not a Server Action (sync).
 */
export function resolveLemonVariantIdForBillingPlan(
  plan: BillingPlanKey,
  options?: ResolveLemonVariantOptions
): string | null {
  if (options?.lemonTestMode) {
    const testOnly = variantIdForPlanFromEnv(plan, true);
    if (testOnly) return testOnly;
  }
  return variantIdForPlanFromEnv(plan, false);
}
