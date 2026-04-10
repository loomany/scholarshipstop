import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createSubscriptionEventFingerprint,
  hasSubscriptionAccess,
  pickCanonicalSubscription
} from '@/lib/payments/subscriptionAccess';

test('treats cancelled subscriptions as active until the paid period ends', () => {
  assert.equal(
    hasSubscriptionAccess({
      status: 'cancelled',
      renewsAt: '2099-04-10T00:00:00.000Z'
    }),
    true
  );
  assert.equal(
    hasSubscriptionAccess({
      status: 'cancelled',
      renewsAt: '2000-04-10T00:00:00.000Z'
    }),
    false
  );
});

test('blocks access immediately for payment failures', () => {
  assert.equal(
    hasSubscriptionAccess({
      status: 'subscription_payment_failed',
      renewsAt: '2099-04-10T00:00:00.000Z'
    }),
    false
  );
  assert.equal(
    hasSubscriptionAccess({
      status: 'past_due',
      renewsAt: '2099-04-10T00:00:00.000Z'
    }),
    false
  );
});

test('blocks access immediately for past_due even when current period end is in the future', () => {
  assert.equal(
    hasSubscriptionAccess({
      status: 'past_due',
      currentPeriodEnd: '2099-04-10T00:00:00.000Z'
    }),
    false
  );
});

test('blocks access for expired and paused states regardless of dates', () => {
  assert.equal(
    hasSubscriptionAccess({
      status: 'expired',
      renewsAt: '2099-04-10T00:00:00.000Z'
    }),
    false
  );
  assert.equal(
    hasSubscriptionAccess({
      status: 'paused',
      renewsAt: '2099-04-10T00:00:00.000Z'
    }),
    false
  );
});

test('allows access for active subscriptions', () => {
  assert.equal(
    hasSubscriptionAccess({
      status: 'active'
    }),
    true
  );
});

test('revokes access immediately for refunded subscriptions and orders', () => {
  assert.equal(
    hasSubscriptionAccess({
      status: 'subscription_payment_refunded',
      renewsAt: '2099-04-10T00:00:00.000Z'
    }),
    false
  );
  assert.equal(
    hasSubscriptionAccess({
      status: 'order_refunded',
      renewsAt: '2099-04-10T00:00:00.000Z'
    }),
    false
  );
});

test('event fingerprint depends on subscription state, not payload key order', () => {
  const left = createSubscriptionEventFingerprint({
    eventName: 'subscription_updated',
    subscriptionId: 'sub_123',
    status: 'cancelled',
    updatedAt: '2026-04-10T10:00:00.000Z',
    renewsAt: '2026-05-10T10:00:00.000Z',
    endsAt: '2026-05-10T10:00:00.000Z',
    trialEndsAt: null,
    cancelled: true,
    orderId: 777
  });
  const right = createSubscriptionEventFingerprint({
    orderId: 777,
    cancelled: true,
    trialEndsAt: null,
    endsAt: '2026-05-10T10:00:00.000Z',
    renewsAt: '2026-05-10T10:00:00.000Z',
    updatedAt: '2026-04-10T10:00:00.000Z',
    status: 'cancelled',
    subscriptionId: 'sub_123',
    eventName: 'subscription_updated'
  });

  assert.equal(left, right);
});

test('prefers an active or grace-period subscription over a newer expired row', () => {
  const canonical = pickCanonicalSubscription([
    {
      id: 'expired_newer',
      status: 'expired',
      created: '2026-04-10T00:00:00.000Z',
      renews_at: null,
      current_period_end: '2026-04-10T00:00:00.000Z',
      cancel_at: null,
      ended_at: '2026-04-10T00:00:00.000Z'
    },
    {
      id: 'cancelled_grace',
      status: 'cancelled',
      created: '2026-04-01T00:00:00.000Z',
      renews_at: '2099-04-10T00:00:00.000Z',
      current_period_end: '2099-04-10T00:00:00.000Z',
      cancel_at: '2099-04-10T00:00:00.000Z',
      ended_at: '2099-04-10T00:00:00.000Z'
    }
  ]);

  assert.equal(canonical?.id, 'cancelled_grace');
});
