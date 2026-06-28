import assert from 'node:assert/strict';
import test from 'node:test';

import {
  parseBillingPlanKey,
  resolveLemonCheckoutConfig,
  resolveLemonIqCheckoutConfig,
  resolveLemonWebhookConfig,
  validateLemonVariantMode
} from '@/lib/payments/lemonRuntimeConfig';

function liveEnv(): Record<string, string> {
  return {
    LEMON_MODE: 'live',
    LEMONSQUEEZY_API_KEY: 'api-key',
    LEMONSQUEEZY_STORE_ID: 'store-1',
    LEMON_VARIANT_MONTHLY_LIVE: '101',
    LEMON_VARIANT_QUARTERLY_LIVE: '102',
    LEMON_VARIANT_YEARLY_LIVE: '103',
    LEMON_VARIANT_MONTHLY_TEST: '201',
    LEMON_VARIANT_QUARTERLY_TEST: '202',
    LEMON_VARIANT_YEARLY_TEST: '203',
    LEMON_WEBHOOK_SECRET_LIVE: 'live-secret',
    LEMON_WEBHOOK_SECRET_TEST: 'test-secret',
    LEMON_IQ_VARIANT_LIVE: '301',
    LEMON_IQ_VARIANT_TEST: '401',
    LEMON_IQ_EXPECTED_TOTAL_MINOR: '2500',
    LEMON_IQ_CURRENCY: 'usd'
  };
}

test('production is fail-closed unless explicitly configured for live mode', () => {
  assert.deepEqual(resolveLemonCheckoutConfig('monthly', {}, 'production'), {
    ok: false,
    reason: 'disabled'
  });
  assert.deepEqual(
    resolveLemonCheckoutConfig(
      'monthly',
      { ...liveEnv(), LEMON_MODE: 'test' },
      'production'
    ),
    { ok: false, reason: 'test_mode_in_production' }
  );
});

test('live and test variants may not share ids', () => {
  const env = liveEnv();
  env.LEMON_VARIANT_MONTHLY_TEST = env.LEMON_VARIANT_MONTHLY_LIVE;
  assert.deepEqual(resolveLemonCheckoutConfig('monthly', env, 'production'), {
    ok: false,
    reason: 'live_test_collision'
  });
});

test('returns only the explicitly selected live plan', () => {
  const result = resolveLemonCheckoutConfig(
    'quarterly',
    liveEnv(),
    'production'
  );
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.config.variantId, '102');
    assert.equal(result.config.mode, 'live');
  }
});

test('webhook config rejects test mode in production', () => {
  assert.deepEqual(
    resolveLemonWebhookConfig(
      { ...liveEnv(), LEMON_MODE: 'test' },
      'production'
    ),
    { ok: false }
  );
});

test('IQ checkout requires an explicit variant, amount and currency', () => {
  const resolved = resolveLemonIqCheckoutConfig(liveEnv(), 'production');
  assert.equal(resolved.ok, true);
  if (resolved.ok) {
    assert.equal(resolved.config.variantId, '301');
    assert.equal(resolved.config.expectedTotal, 2500);
    assert.equal(resolved.config.currency, 'USD');
  }

  const missingVariant = liveEnv();
  delete missingVariant.LEMON_IQ_VARIANT_LIVE;
  assert.deepEqual(resolveLemonIqCheckoutConfig(missingVariant, 'production'), {
    ok: false,
    reason: 'missing_iq_variant'
  });
});

test('IQ checkout rejects ambiguous totals and live/test collisions', () => {
  const ambiguousTotal = liveEnv();
  ambiguousTotal.LEMON_IQ_EXPECTED_TOTAL_MINOR = '2500usd';
  assert.deepEqual(resolveLemonIqCheckoutConfig(ambiguousTotal, 'production'), {
    ok: false,
    reason: 'invalid_expected_total'
  });

  const collision = liveEnv();
  collision.LEMON_IQ_VARIANT_TEST = collision.LEMON_IQ_VARIANT_LIVE;
  assert.deepEqual(resolveLemonIqCheckoutConfig(collision, 'production'), {
    ok: false,
    reason: 'live_test_collision'
  });
});

test('provider variant validation rejects a test-mode live variant', async () => {
  const resolved = resolveLemonCheckoutConfig(
    'monthly',
    liveEnv(),
    'production'
  );
  assert.equal(resolved.ok, true);
  if (!resolved.ok) return;
  const fakeFetch = async () =>
    new Response(
      JSON.stringify({
        data: {
          attributes: { test_mode: true },
          relationships: { store: { data: { id: 'store-1' } } }
        }
      }),
      { status: 200 }
    );
  assert.deepEqual(
    await validateLemonVariantMode(resolved.config, fakeFetch as typeof fetch),
    { ok: false, reason: 'mode_mismatch' }
  );
});

test('billing plan parser is explicit and rejects unknown values', () => {
  assert.equal(parseBillingPlanKey('monthly'), 'monthly');
  assert.equal(parseBillingPlanKey('quarterly'), 'quarterly');
  assert.equal(parseBillingPlanKey('yearly'), 'yearly');
  assert.equal(parseBillingPlanKey('something-else'), null);
});
