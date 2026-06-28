import assert from 'node:assert/strict';
import test from 'node:test';

import { validateIqOrderCreatedPayload } from '@/lib/payments/lemonIqOrderValidation';
import type { LemonIqCheckoutConfig } from '@/lib/payments/lemonRuntimeConfig';
import type { LemonWebhookPayload } from '@/lib/payments/lemonSubscriptionState';

const config: LemonIqCheckoutConfig = {
  mode: 'live',
  apiKey: 'api-key',
  storeId: '11',
  variantId: '22',
  webhookSecret: 'secret',
  expectedTotal: 2500,
  currency: 'USD'
};

function payload(): LemonWebhookPayload {
  return {
    meta: {
      event_name: 'order_created',
      custom_data: { iq_report_id: 'report-1' }
    },
    data: {
      id: 'order-1',
      attributes: {
        store_id: 11,
        order_id: 33,
        first_order_item: { variant_id: 22 },
        test_mode: false,
        total: 2500,
        currency: 'USD'
      }
    }
  };
}

test('accepts the exact configured IQ order', () => {
  assert.deepEqual(validateIqOrderCreatedPayload(payload(), config), {
    ok: true,
    order: { orderId: '33', reportId: 'report-1' }
  });
});

for (const [name, mutate, reason] of [
  [
    'store',
    (p: LemonWebhookPayload) => {
      p.data!.attributes!.store_id = 99;
    },
    'store_mismatch'
  ],
  [
    'variant',
    (p: LemonWebhookPayload) => {
      p.data!.attributes!.first_order_item = { variant_id: 99 };
    },
    'variant_mismatch'
  ],
  [
    'mode',
    (p: LemonWebhookPayload) => {
      p.data!.attributes!.test_mode = true;
    },
    'mode_mismatch'
  ],
  [
    'total',
    (p: LemonWebhookPayload) => {
      p.data!.attributes!.total = 1;
    },
    'total_mismatch'
  ],
  [
    'currency',
    (p: LemonWebhookPayload) => {
      p.data!.attributes!.currency = 'EUR';
    },
    'currency_mismatch'
  ]
] as const) {
  test(`rejects ${name} mismatch`, () => {
    const value = payload();
    mutate(value);
    assert.deepEqual(validateIqOrderCreatedPayload(value, config), {
      ok: false,
      reason
    });
  });
}
