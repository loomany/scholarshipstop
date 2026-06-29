import {
  resolveLemonCheckoutConfig,
  validateLemonVariantMode
} from '@/lib/payments/lemonRuntimeConfig';
import type { BillingPlanKey } from '@/lib/payments/lemonVariantIds';

const plans: BillingPlanKey[] = ['monthly', 'quarterly', 'yearly'];

async function main() {
  let failed = false;

  for (const plan of plans) {
    const resolved = resolveLemonCheckoutConfig(
      plan,
      process.env,
      'production'
    );
    if (!resolved.ok) {
      console.error(`[lemon-config] ${plan}: FAIL reason=${resolved.reason}`);
      failed = true;
      continue;
    }

    try {
      const provider = await validateLemonVariantMode(resolved.config);
      if (!provider.ok) {
        console.error(
          `[lemon-config] ${plan}: FAIL provider=${provider.reason}`
        );
        failed = true;
        continue;
      }
      console.log(`[lemon-config] ${plan}: PASS mode=live`);
    } catch {
      console.error(`[lemon-config] ${plan}: FAIL provider=unreachable`);
      failed = true;
    }
  }

  if (failed) process.exitCode = 1;
}

void main();
