import assert from 'node:assert/strict';
import test from 'node:test';

import type { LemonSubscriptionWebhookConfig } from '@/lib/payments/lemonRuntimeConfig';
import { validateLemonSubscriptionEvent } from '@/lib/payments/lemonSubscriptionEventValidation';
import type { LemonWebhookPayload } from '@/lib/payments/lemonSubscriptionState';

const config: LemonSubscriptionWebhookConfig = {
  mode: 'live',
  storeId: '9001',
  variantIds: { monthly: '101', quarterly: '102', yearly: '103' },
  expectedTotals: { monthly: 1200, quarterly: 3000, yearly: 9900 },
  currency: 'USD'
};

function subscriptionPayload(
  overrides: Record<string, unknown> = {}
): LemonWebhookPayload {
  return {
    meta: {
      event_name: 'subscription_created',
      custom_data: { user_id: 'dceafcc1-dfe6-44c1-83af-46066fdc7f79' }
    },
    data: {
      id: 'sub-1',
      type: 'subscriptions',
      attributes: {
        store_id: 9001,
        order_id: 5001,
        variant_id: 101,
        test_mode: false,
        status: 'active',
        ...overrides
      }
    }
  } as LemonWebhookPayload;
}

function validate(payload: LemonWebhookPayload) {
  return validateLemonSubscriptionEvent({
    payload,
    payloadHash: 'b'.repeat(64),
    providerEventId: 'evt-1',
    config
  });
}

test('accepts an exact live subscription event and builds ledger metadata', () => {
  const result = validate(subscriptionPayload());
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.plan, 'monthly');
  assert.equal(result.event.eventId, 'provider:evt-1');
  assert.equal(result.event.providerOrderId, '5001');
  assert.equal(result.event.providerSubscriptionId, 'sub-1');
});

test('accepts an exact order amount and creates a stable synthetic event id', () => {
  const payload = {
    meta: {
      event_name: 'order_created',
      custom_data: { user_id: 'dceafcc1-dfe6-44c1-83af-46066fdc7f79' }
    },
    data: {
      type: 'orders',
      id: 'order-22',
      attributes: {
        store_id: 9001,
        test_mode: false,
        total: 3000,
        currency: 'usd',
        first_order_item: { variant_id: 102 }
      }
    }
  } as LemonWebhookPayload;
  const result = validateLemonSubscriptionEvent({
    payload,
    payloadHash: 'c'.repeat(64),
    config
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.plan, 'quarterly');
  assert.equal(
    result.event.eventId,
    `synthetic:order_created:orders:order-22:${'c'.repeat(64)}`
  );
});

test('rejects store, mode and variant mismatches', () => {
  assert.equal(
    validate(subscriptionPayload({ store_id: 1 })).ok
      ? null
      : (validate(subscriptionPayload({ store_id: 1 })) as { reason: string })
          .reason,
    'store_mismatch'
  );
  const mode = validate(subscriptionPayload({ test_mode: true }));
  assert.equal(mode.ok ? null : mode.reason, 'mode_mismatch');
  const variant = validate(subscriptionPayload({ variant_id: 999 }));
  assert.equal(variant.ok ? null : variant.reason, 'variant_mismatch');
});

test('rejects incorrect amount and currency for payment events', () => {
  const original = {
    meta: {
      event_name: 'subscription_payment_success',
      custom_data: { user_id: 'dceafcc1-dfe6-44c1-83af-46066fdc7f79' }
    },
    data: {
      id: 'invoice-1',
      type: 'subscription-invoices',
      attributes: {
        store_id: 9001,
        subscription_id: 7001,
        test_mode: false,
        total: 1199,
        currency: 'USD'
      }
    }
  } as LemonWebhookPayload;
  const effective = subscriptionPayload({ total: 1199, currency: 'USD' });
  effective.meta = original.meta;
  const amount = validateLemonSubscriptionEvent({
    payload: effective,
    originalPayload: original,
    payloadHash: 'd'.repeat(64),
    config
  });
  assert.equal(amount.ok ? null : amount.reason, 'amount_mismatch');

  original.data!.attributes!.total = 1200;
  original.data!.attributes!.currency = 'EUR';
  const currency = validateLemonSubscriptionEvent({
    payload: effective,
    originalPayload: original,
    payloadHash: 'e'.repeat(64),
    config
  });
  assert.equal(currency.ok ? null : currency.reason, 'currency_mismatch');
});

test('rejects missing and malformed user mappings', () => {
  const missing = subscriptionPayload();
  missing.meta!.custom_data = {};
  const missingResult = validate(missing);
  assert.equal(
    missingResult.ok ? null : missingResult.reason,
    'missing_user_mapping'
  );

  const invalid = subscriptionPayload();
  invalid.meta!.custom_data!.user_id = 'not-a-supabase-user-id';
  const invalidResult = validate(invalid);
  assert.equal(
    invalidResult.ok ? null : invalidResult.reason,
    'invalid_user_mapping'
  );
});

test('rejects a missing provider resource id and live events in test mode', () => {
  const missingId = subscriptionPayload();
  delete missingId.data!.id;
  const missingResult = validate(missingId);
  assert.equal(
    missingResult.ok ? null : missingResult.reason,
    'missing_resource_id'
  );

  const testConfig: LemonSubscriptionWebhookConfig = {
    ...config,
    mode: 'test'
  };
  const modeResult = validateLemonSubscriptionEvent({
    payload: subscriptionPayload(),
    payloadHash: 'f'.repeat(64),
    config: testConfig
  });
  assert.equal(modeResult.ok ? null : modeResult.reason, 'mode_mismatch');
});
