import assert from 'node:assert/strict';
import test from 'node:test';

import { enrichInvoicePaymentSuccessWithSubscriptionFetch } from '@/lib/payments/lemonInvoiceWebhookEnrichment';
import type { LemonWebhookPayload } from '@/lib/payments/lemonSubscriptionState';

function invoicePayload(): LemonWebhookPayload {
  return {
    meta: {
      event_name: 'subscription_payment_success',
      custom_data: { user_id: 'dceafcc1-dfe6-44c1-83af-46066fdc7f79' }
    },
    data: {
      id: 'invoice-1',
      type: 'subscription-invoices',
      attributes: {
        subscription_id: 7001,
        total: 1200,
        currency: 'USD',
        test_mode: false
      }
    }
  };
}

test('invoice enrichment preserves signed event and charge fields', async () => {
  const previousKey = process.env.LEMONSQUEEZY_API_KEY;
  process.env.LEMONSQUEEZY_API_KEY = 'test-only-api-key';
  try {
    const result = await enrichInvoicePaymentSuccessWithSubscriptionFetch(
      invoicePayload(),
      (async () =>
        new Response(
          JSON.stringify({
            data: {
              id: '7001',
              type: 'subscriptions',
              attributes: {
                store_id: 9001,
                variant_id: 101,
                test_mode: false,
                status: 'active'
              }
            }
          }),
          { status: 200 }
        )) as typeof fetch
    );
    assert.equal(result?.meta?.event_name, 'subscription_payment_success');
    assert.equal(result?.data?.type, 'subscriptions');
    assert.equal(result?.data?.attributes?.variant_id, 101);
    assert.equal(result?.data?.attributes?.total, 1200);
    assert.equal(result?.data?.attributes?.currency, 'USD');
    assert.equal(result?.data?.attributes?.subscription_id, 7001);
  } finally {
    if (previousKey === undefined) delete process.env.LEMONSQUEEZY_API_KEY;
    else process.env.LEMONSQUEEZY_API_KEY = previousKey;
  }
});

test('invoice enrichment failure is retryable instead of silently ignored', async () => {
  const previousKey = process.env.LEMONSQUEEZY_API_KEY;
  process.env.LEMONSQUEEZY_API_KEY = 'test-only-api-key';
  try {
    await assert.rejects(
      enrichInvoicePaymentSuccessWithSubscriptionFetch(
        invoicePayload(),
        (async () =>
          new Response('unavailable', { status: 503 })) as typeof fetch
      ),
      /HTTP 503/
    );
  } finally {
    if (previousKey === undefined) delete process.env.LEMONSQUEEZY_API_KEY;
    else process.env.LEMONSQUEEZY_API_KEY = previousKey;
  }
});
