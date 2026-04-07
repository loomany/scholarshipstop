import assert from 'node:assert/strict';
import test from 'node:test';
import { decideSubscriptionUpdate } from '@/lib/payments/lemonSubscriptionState';

test('maps subscription_deleted to upsert with inactive access', () => {
  const payload = {
    meta: {
      event_name: 'subscription_deleted',
      custom_data: { user_id: 'user-123' }
    },
    data: {
      id: 'sub_123',
      attributes: {
        status: 'expired'
      }
    }
  };

  const decision = decideSubscriptionUpdate(payload);
  assert.equal(decision.kind, 'upsert');
  if (decision.kind !== 'upsert') return;
  assert.equal(decision.userId, 'user-123');
  assert.equal(decision.isSubscribed, false);
  assert.equal(decision.eventName, 'subscription_deleted');
  assert.equal(decision.subscription.provider, 'lemon_squeezy');
  assert.equal(decision.subscription.status, 'expired');
  assert.equal(decision.subscriptionPlan, 'free');
});

test('maps subscription_updated cancelled status to isSubscribed=false', () => {
  const payload = {
    meta: { event_name: 'subscription_updated' },
    data: {
      id: 'sub_456',
      attributes: {
        user_id: 'user-456',
        status: 'cancelled',
        variant_name: 'Quarterly Pro'
      }
    }
  };

  const decision = decideSubscriptionUpdate(payload);
  assert.equal(decision.kind, 'upsert');
  if (decision.kind !== 'upsert') return;
  assert.equal(decision.userId, 'user-456');
  assert.equal(decision.isSubscribed, false);
  assert.equal(decision.eventName, 'subscription_updated');
  assert.equal(decision.subscription.status, 'cancelled');
  assert.equal(decision.subscriptionPlan, 'quarterly_pro');
});

test('maps on_trial status to trial plan and active access', () => {
  const payload = {
    meta: { event_name: 'subscription_created' },
    data: {
      id: 'sub_789',
      attributes: {
        user_id: 'user-789',
        status: 'on_trial',
        variant_name: 'Monthly Pro',
        trial_ends_at: '2026-04-10T00:00:00.000Z'
      }
    }
  };

  const decision = decideSubscriptionUpdate(payload);
  assert.equal(decision.kind, 'upsert');
  if (decision.kind !== 'upsert') return;
  assert.equal(decision.userId, 'user-789');
  assert.equal(decision.isSubscribed, true);
  assert.equal(decision.eventName, 'subscription_created');
  assert.equal(decision.subscription.status, 'on_trial');
  assert.equal(decision.subscriptionPlan, 'trial');
});

test('throws on missing user id for subscription events', () => {
  assert.throws(() =>
    decideSubscriptionUpdate({
      meta: { event_name: 'subscription_created' }
    })
  );
});

test('ignores unrelated events', () => {
  const payload = {
    meta: { event_name: 'order.created' }
  };

  const decision = decideSubscriptionUpdate(payload);
  assert.deepEqual(decision, {
    kind: 'ignored',
    eventName: 'order.created'
  });
});
