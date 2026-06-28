/** Billing cadence for Lemon checkouts / subscription PATCH. */
export type BillingPlanKey = 'monthly' | 'quarterly' | 'yearly';

export type ResolveLemonVariantOptions = {
  /** Existing test subscriptions must stay in the test catalog. */
  lemonTestMode?: boolean;
};

function variantIdForPlanFromEnv(
  plan: BillingPlanKey,
  test: boolean
): string | null {
  const mode = test ? 'TEST' : 'LIVE';
  const value =
    process.env[`LEMON_VARIANT_${plan.toUpperCase()}_${mode}`]?.trim();
  return value && value.length > 0 ? value : null;
}

/** There is intentionally no live/test or public-env fallback. */
export function resolveLemonVariantIdForBillingPlan(
  plan: BillingPlanKey,
  options?: ResolveLemonVariantOptions
): string | null {
  return variantIdForPlanFromEnv(plan, options?.lemonTestMode === true);
}
