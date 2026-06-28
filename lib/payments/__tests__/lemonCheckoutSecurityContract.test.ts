import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const billing = readFileSync('app/actions/billing.ts', 'utf8');
const webhook = readFileSync('app/api/webhooks/route.ts', 'utf8');

test('subscription checkout has no hosted or test fallback', () => {
  assert.doesNotMatch(billing, /pay\.scholarshiptop\.com\/checkout\/buy/);
  assert.doesNotMatch(
    billing,
    /checkoutUrlSkipTrialFallback|checkoutUrlFromPlan/
  );
  assert.doesNotMatch(
    billing,
    /LEMONSQUEEZY_(MONTHLY|QUARTERLY|YEARLY)_VARIANT_ID/
  );
  assert.match(billing, /resolveLemonCheckoutConfig/);
  assert.match(billing, /validateLemonVariantMode/);
});

test('webhook selects only the secret for the explicit Lemon mode', () => {
  assert.match(webhook, /resolveLemonWebhookConfig/);
  assert.doesNotMatch(
    webhook,
    /process\.env\.LEMON_SQUEEZY_(WEBHOOK_SECRET|SECRET)/
  );
});
