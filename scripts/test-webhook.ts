import crypto from 'node:crypto';

type ScenarioName = 'created' | 'payment_failed' | 'cancelled' | 'refunded';

const scenario = (process.argv[2] as ScenarioName | undefined) ?? 'created';
const endpoint = process.env.LEMON_WEBHOOK_TEST_URL?.trim() || 'http://localhost:3000/api/webhooks';
const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET?.trim();

if (!secret) {
  throw new Error('LEMON_SQUEEZY_WEBHOOK_SECRET is required.');
}

const now = new Date();
const inThreeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
const inThirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

function createPayload(selectedScenario: ScenarioName) {
  const base = {
    meta: {
      event_name: 'subscription.created',
      custom_data: {
        user_id: process.env.LEMON_TEST_USER_ID?.trim() || 'local-test-user'
      }
    },
    data: {
      id: process.env.LEMON_TEST_SUBSCRIPTION_ID?.trim() || `local-sub-${Date.now()}`,
      type: 'subscriptions',
      attributes: {
        store_id: Number(process.env.LEMONSQUEEZY_STORE_ID || 0) || undefined,
        customer_id: 1001,
        order_id: 2001,
        product_id: 3001,
        variant_id: Number(process.env.NEXT_PUBLIC_LS_MONTHLY_VARIANT_ID || 9001) || 9001,
        product_name: 'Monthly Pro',
        variant_name: 'Monthly Pro',
        status: 'active',
        cancelled: false,
        renews_at: inThirtyDays,
        ends_at: null,
        trial_ends_at: inThreeDays,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
        test_mode: true,
        custom_data: {
          user_id: process.env.LEMON_TEST_USER_ID?.trim() || 'local-test-user'
        },
        first_subscription_item: {
          id: 5001,
          price_id: 6001,
          quantity: 1
        }
      }
    }
  };

  switch (selectedScenario) {
    case 'payment_failed':
      return {
        ...base,
        meta: { ...base.meta, event_name: 'subscription.payment_failed' },
        data: {
          ...base.data,
          attributes: {
            ...base.data.attributes,
            status: 'subscription_payment_failed',
            updated_at: now.toISOString(),
            trial_ends_at: null
          }
        }
      };
    case 'cancelled':
      return {
        ...base,
        meta: { ...base.meta, event_name: 'subscription.cancelled' },
        data: {
          ...base.data,
          attributes: {
            ...base.data.attributes,
            status: 'cancelled',
            cancelled: true,
            ends_at: inThirtyDays,
            updated_at: now.toISOString(),
            trial_ends_at: null
          }
        }
      };
    case 'refunded':
      return {
        ...base,
        meta: { ...base.meta, event_name: 'subscription.payment_refunded' },
        data: {
          ...base.data,
          attributes: {
            ...base.data.attributes,
            status: 'subscription_payment_refunded',
            ends_at: now.toISOString(),
            renews_at: null,
            trial_ends_at: null,
            updated_at: now.toISOString()
          }
        }
      };
    case 'created':
    default:
      return base;
  }
}

function signPayload(rawBody: string, signingSecret: string) {
  return crypto.createHmac('sha256', signingSecret).update(rawBody, 'utf8').digest('hex');
}

async function main() {
  const payload = createPayload(scenario);
  const body = JSON.stringify(payload);
  const signature = signPayload(body, secret);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-signature': signature
    },
    body
  });

  const responseText = await response.text();

  console.log(JSON.stringify({ scenario, endpoint, status: response.status, ok: response.ok }, null, 2));
  console.log(responseText);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
