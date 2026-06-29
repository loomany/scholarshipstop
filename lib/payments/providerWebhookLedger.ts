export type ProviderWebhookEvent = {
  provider: string;
  eventId: string;
  eventType: string;
  payloadHash: string;
  providerOrderId: string | null;
  providerSubscriptionId: string | null;
};

export type ProviderWebhookRpcClient = {
  rpc(
    name: string,
    params: Record<string, string | null>
  ): Promise<{ data: unknown; error: { message?: string } | null }>;
};

async function completeProviderWebhookEvent(
  client: ProviderWebhookRpcClient,
  event: ProviderWebhookEvent,
  status: 'processed' | 'failed',
  lastError: string | null
) {
  return client.rpc('complete_provider_webhook_event', {
    p_provider: event.provider,
    p_event_id: event.eventId,
    p_status: status,
    p_last_error: lastError
  });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function processWebhookWithLedger(options: {
  client: ProviderWebhookRpcClient;
  event: ProviderWebhookEvent;
  process: () => Promise<Response>;
}): Promise<Response> {
  const { client, event } = options;
  const { data: claimed, error: claimError } = await client.rpc(
    'claim_provider_webhook_event',
    {
      p_provider: event.provider,
      p_event_id: event.eventId,
      p_event_type: event.eventType,
      p_payload_hash: event.payloadHash,
      p_provider_order_id: event.providerOrderId,
      p_provider_subscription_id: event.providerSubscriptionId
    }
  );

  if (claimError) {
    console.error('[provider:webhook] event claim failed', {
      provider: event.provider,
      eventId: event.eventId,
      message: claimError.message
    });
    return new Response('Could not claim webhook event.', { status: 500 });
  }
  if (claimed !== true) {
    return new Response(JSON.stringify({ received: true, duplicate: true }), {
      status: 200
    });
  }

  let response: Response;
  try {
    response = await options.process();
  } catch (error) {
    const message = errorMessage(error);
    await completeProviderWebhookEvent(
      client,
      event,
      'failed',
      message.slice(0, 500)
    );
    console.error('[provider:webhook] claimed event processing threw', {
      provider: event.provider,
      eventId: event.eventId,
      message
    });
    return new Response('Webhook processing failed.', { status: 500 });
  }

  if (response.status >= 500) {
    await completeProviderWebhookEvent(
      client,
      event,
      'failed',
      `handler_response_${response.status}`
    );
    return response;
  }

  const { error: completionError } = await completeProviderWebhookEvent(
    client,
    event,
    'processed',
    null
  );
  if (completionError) {
    console.error('[provider:webhook] event completion failed', {
      provider: event.provider,
      eventId: event.eventId,
      message: completionError.message
    });
    await completeProviderWebhookEvent(
      client,
      event,
      'failed',
      'processed_completion_failed'
    );
    return new Response('Could not complete webhook event.', { status: 500 });
  }

  return response;
}
