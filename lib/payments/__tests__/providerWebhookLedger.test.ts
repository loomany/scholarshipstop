import assert from 'node:assert/strict';
import test from 'node:test';

import {
  processWebhookWithLedger,
  type ProviderWebhookEvent,
  type ProviderWebhookRpcClient
} from '@/lib/payments/providerWebhookLedger';

type RecordState = {
  status: 'processing' | 'processed' | 'failed';
  attempts: number;
};

class FakeLedgerClient implements ProviderWebhookRpcClient {
  readonly records = new Map<string, RecordState>();
  readonly completions: string[] = [];
  failProcessedCompletion = false;

  async rpc(name: string, params: Record<string, string | null>) {
    const eventId = params.p_event_id!;
    if (name === 'claim_provider_webhook_event') {
      const existing = this.records.get(eventId);
      if (!existing) {
        this.records.set(eventId, { status: 'processing', attempts: 1 });
        return { data: true, error: null };
      }
      if (existing.status === 'failed') {
        existing.status = 'processing';
        existing.attempts += 1;
        return { data: true, error: null };
      }
      return { data: false, error: null };
    }

    if (name === 'complete_provider_webhook_event') {
      const status = params.p_status as 'processed' | 'failed';
      this.completions.push(status);
      if (status === 'processed' && this.failProcessedCompletion) {
        this.failProcessedCompletion = false;
        return { data: null, error: { message: 'temporary completion error' } };
      }
      const existing = this.records.get(eventId);
      if (existing) existing.status = status;
      return { data: null, error: null };
    }

    return { data: null, error: { message: `unexpected rpc ${name}` } };
  }
}

const event: ProviderWebhookEvent = {
  provider: 'lemon_squeezy',
  eventId: 'provider:event-1',
  eventType: 'subscription_created',
  payloadHash: 'a'.repeat(64),
  providerOrderId: 'order-1',
  providerSubscriptionId: 'subscription-1'
};

test('first delivery runs entitlement and notifications once; duplicate runs none', async () => {
  const client = new FakeLedgerClient();
  const effects = { entitlement: 0, email: 0, telegram: 0 };
  const process = async () => {
    effects.entitlement += 1;
    effects.email += 1;
    effects.telegram += 1;
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  };

  const first = await processWebhookWithLedger({ client, event, process });
  const duplicate = await processWebhookWithLedger({ client, event, process });

  assert.equal(first.status, 200);
  assert.equal(duplicate.status, 200);
  assert.deepEqual(await duplicate.json(), { received: true, duplicate: true });
  assert.deepEqual(effects, { entitlement: 1, email: 1, telegram: 1 });
  assert.equal(client.records.get(event.eventId)?.status, 'processed');
  assert.equal(client.records.get(event.eventId)?.attempts, 1);
});

test('500 marks failed and a later delivery is claimed as a retry', async () => {
  const client = new FakeLedgerClient();
  let calls = 0;

  const failed = await processWebhookWithLedger({
    client,
    event,
    process: async () => {
      calls += 1;
      return new Response('temporary failure', { status: 500 });
    }
  });
  assert.equal(failed.status, 500);
  assert.equal(client.records.get(event.eventId)?.status, 'failed');

  const retried = await processWebhookWithLedger({
    client,
    event,
    process: async () => {
      calls += 1;
      return new Response('ok', { status: 200 });
    }
  });
  assert.equal(retried.status, 200);
  assert.equal(calls, 2);
  assert.equal(client.records.get(event.eventId)?.status, 'processed');
  assert.equal(client.records.get(event.eventId)?.attempts, 2);
});

test('thrown processing and failed processed-completion remain retryable', async () => {
  const thrownClient = new FakeLedgerClient();
  const thrown = await processWebhookWithLedger({
    client: thrownClient,
    event,
    process: async () => {
      throw new Error('database unavailable');
    }
  });
  assert.equal(thrown.status, 500);
  assert.equal(thrownClient.records.get(event.eventId)?.status, 'failed');

  const completionClient = new FakeLedgerClient();
  completionClient.failProcessedCompletion = true;
  const completion = await processWebhookWithLedger({
    client: completionClient,
    event,
    process: async () => new Response('ok', { status: 200 })
  });
  assert.equal(completion.status, 500);
  assert.equal(completionClient.records.get(event.eventId)?.status, 'failed');
  assert.deepEqual(completionClient.completions, ['processed', 'failed']);
});
