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

test('maps subscription_plan_changed to active and updates variant fields', () => {
  const payload = {
    meta: { event_name: 'subscription.plan_changed' },
    data: {
      id: 'sub_plan_change',
      attributes: {
        user_id: 'user-plan-change',
        status: 'active',
        variant_id: 962441,
        variant_name: 'Yearly Pro'
      }
    }
  };

  const decision = decideSubscriptionUpdate(payload);
  assert.equal(decision.kind, 'upsert');
  if (decision.kind !== 'upsert') return;
  assert.equal(decision.eventName, 'subscription_plan_changed');
  assert.equal(decision.isSubscribed, true);
  assert.equal(decision.subscription.provider_variant_id, '962441');
  assert.equal(decision.subscriptionPlan, 'yearly_pro');
});

test('keeps access during paid grace period for cancelled Lemon subscriptions', () => {
  const payload = {
    meta: { event_name: 'subscription_updated' },
    data: {
      id: 'sub_grace',
      attributes: {
        user_id: 'user-grace',
        status: 'cancelled',
        variant_name: 'Yearly Pro',
        ends_at: '2099-04-10T00:00:00.000Z',
        updated_at: '2026-04-10T00:00:00.000Z'
      }
    }
  };

  const decision = decideSubscriptionUpdate(payload);
  assert.equal(decision.kind, 'upsert');
  if (decision.kind !== 'upsert') return;
  assert.equal(decision.isSubscribed, true);
  assert.equal(decision.subscription.status, 'cancelled');
  assert.equal(decision.subscriptionPlan, 'yearly_pro');
});

test('maps subscription_payment_refunded to immediate access revocation', () => {
  const payload = {
    meta: { event_name: 'subscription.payment_refunded' },
    data: {
      id: 'sub_refunded',
      attributes: {
        user_id: 'user-refunded',
        status: 'subscription_payment_refunded',
        variant_name: 'Monthly Pro',
        ends_at: '2099-04-10T00:00:00.000Z'
      }
    }
  };

  const decision = decideSubscriptionUpdate(payload);
  assert.equal(decision.kind, 'upsert');
  if (decision.kind !== 'upsert') return;
  assert.equal(decision.eventName, 'subscription_payment_refunded');
  assert.equal(decision.isSubscribed, false);
  assert.equal(decision.subscription.status, 'expired');
  assert.equal(decision.subscriptionPlan, 'free');
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
  assert.equal(decision.subscription.status, 'trialing');
  assert.equal(decision.subscriptionPlan, 'trial');
});

test('throws on missing user id for subscription events', () => {
  assert.throws(() =>
    decideSubscriptionUpdate({
      meta: { event_name: 'subscription_created' }
    })
  );
});

test('ignores order_created because subscription_created carries the access state', () => {
  const payload = {
    meta: { event_name: 'order_created', custom_data: { user_id: 'user-111' } },
    data: {
      type: 'orders',
      id: 'order_123',
      attributes: {
        status: 'paid'
      }
    }
  };

  const decision = decideSubscriptionUpdate(payload);
  assert.deepEqual(decision, {
    kind: 'ignored',
    eventName: 'order_created'
  });
});

test('maps dotted subscription event names to normalized snake_case', () => {
  const payload = {
    meta: { event_name: 'subscription.updated' },
    data: {
      id: 'sub_dotted',
      attributes: {
        user_id: 'user-dotted',
        status: 'active',
        variant_name: 'Monthly Pro'
      }
    }
  };

  const decision = decideSubscriptionUpdate(payload);
  assert.equal(decision.kind, 'upsert');
  if (decision.kind !== 'upsert') return;
  assert.equal(decision.eventName, 'subscription_updated');
  assert.equal(decision.isSubscribed, true);
});

test('does not persist Lemon price ids into Stripe price_id foreign key', () => {
  const payload = {
    meta: {
      event_name: 'subscription_updated',
      custom_data: { user_id: 'dceafcc1-dfe6-44c1-83af-46066fdc7f79' }
    },
    data: {
      id: '2047507',
      attributes: {
        status: 'on_trial',
        product_name: 'Monthly Plan1',
        variant_name: 'Default',
        first_subscription_item: {
          id: 7674432,
          price_id: 2516368,
          quantity: 1
        }
      }
    }
  };

  const decision = decideSubscriptionUpdate(payload);
  assert.equal(decision.kind, 'upsert');
  if (decision.kind !== 'upsert') return;
  assert.equal(decision.subscriptionPlan, 'trial');
  assert.equal(decision.subscription.price_id, null);
  assert.deepEqual(decision.subscription.metadata, {
    source: 'lemon_squeezy',
    event_name: 'subscription_updated',
    lemon_event_fingerprint:
      'subscription_updated:2047507:trialing:::::0:',
    lemon_price_id: '2516368',
    lemon_subscription_item_id: '7674432'
  });
});

test('ignores subscription_payment_success invoice payloads for entitlement sync', () => {
  const payload = {
    meta: {
      event_name: 'subscription_payment_success',
      custom_data: { user_id: 'dceafcc1-dfe6-44c1-83af-46066fdc7f79' }
    },
    data: {
      id: '6714128',
      type: 'subscription-invoices',
      attributes: {
        status: 'paid',
        subscription_id: 2047512
      }
    }
  };

  const decision = decideSubscriptionUpdate(payload);
  assert.deepEqual(decision, {
    kind: 'ignored',
    eventName: 'subscription_payment_success'
  });
});

test('ignores refunded invoice payloads for entitlement sync', () => {
  const payload = {
    meta: {
      event_name: 'subscription.payment_refunded',
      custom_data: { user_id: 'user-refunded-invoice' }
    },
    data: {
      id: 'invoice_refunded',
      type: 'subscription-invoices',
      attributes: {
        status: 'refunded'
      }
    }
  };

  const decision = decideSubscriptionUpdate(payload);
  assert.deepEqual(decision, {
    kind: 'ignored',
    eventName: 'subscription_payment_refunded'
  });
});

test('ignores refunded orders for subscription entitlement sync', () => {
  const payload = {
    meta: {
      event_name: 'order.refunded',
      custom_data: { user_id: 'user-order-refunded' }
    },
    data: {
      id: 'order_refunded_1',
      type: 'orders',
      attributes: {
        status: 'refunded'
      }
    }
  };

  const decision = decideSubscriptionUpdate(payload);
  assert.equal(decision.kind, 'upsert');
  if (decision.kind !== 'upsert') return;
  assert.equal(decision.eventName, 'order_refunded');
  assert.equal(decision.isSubscribed, false);
  assert.equal(decision.subscription.status, 'expired');
});
