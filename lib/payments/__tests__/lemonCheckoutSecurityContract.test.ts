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
  assert.match(
    webhook,
    /new Response\('Webhook is disabled\.', \{ status: 503 \}\)/
  );
  assert.doesNotMatch(webhook, /Webhook secret is not configured/);
});

test('subscription webhooks validate and claim the durable ledger before processing', () => {
  assert.match(webhook, /validateLemonSubscriptionEvent/);
  assert.match(webhook, /processWebhookWithLedger/);
  assert.match(
    webhook,
    /process: async \(\) => \{\s+const decision = decideSubscriptionUpdate/
  );
});
