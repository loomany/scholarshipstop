import assert from 'node:assert/strict';
import test from 'node:test';
import { decideSubscriptionUpdate } from '@/lib/payments/lemonSubscriptionState';

test('maps subscription.deleted to isSubscribed=false', () => {
  const payload = {
    meta: {
      event_name: 'subscription.deleted',
      custom_data: { user_id: 'user-123' }
    }
  };

  const decision = decideSubscriptionUpdate(payload);
  assert.deepEqual(decision, {
    kind: 'update',
    userId: 'user-123',
    isSubscribed: false,
    eventName: 'subscription.deleted'
  });
});

test('maps subscription.updated inactive status to isSubscribed=false', () => {
  const payload = {
    meta: { event_name: 'subscription.updated' },
    data: {
      attributes: {
        user_id: 'user-456',
        status: 'cancelled'
      }
    }
  };

  const decision = decideSubscriptionUpdate(payload);
  assert.deepEqual(decision, {
    kind: 'update',
    userId: 'user-456',
    isSubscribed: false,
    eventName: 'subscription.updated'
  });
});

test('maps subscription.updated active status to isSubscribed=true', () => {
  const payload = {
    meta: { event_name: 'subscription.updated' },
    data: {
      attributes: {
        user_id: 'user-789',
        status: 'active'
      }
    }
  };

  const decision = decideSubscriptionUpdate(payload);
  assert.deepEqual(decision, {
    kind: 'update',
    userId: 'user-789',
    isSubscribed: true,
    eventName: 'subscription.updated'
  });
});

test('throws on missing user id for subscription events', () => {
  assert.throws(() =>
    decideSubscriptionUpdate({
      meta: { event_name: 'subscription.created' }
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
