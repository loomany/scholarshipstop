import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types_db';

type LemonWebhookPayload = {
  meta?: {
    event_name?: string;
    custom_data?: {
      user_id?: string;
      userId?: string;
    };
  };
  data?: {
    attributes?: {
      status?: string;
      user_id?: string;
      userId?: string;
      custom_data?: {
        user_id?: string;
        userId?: string;
      };
    };
  };
};

const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

function resolveUserId(payload: LemonWebhookPayload): string | null {
  const userId =
    payload.data?.attributes?.user_id ??
    payload.data?.attributes?.userId ??
    payload.data?.attributes?.custom_data?.user_id ??
    payload.data?.attributes?.custom_data?.userId ??
    payload.meta?.custom_data?.user_id ??
    payload.meta?.custom_data?.userId ??
    null;
  return typeof userId === 'string' && userId.trim() ? userId : null;
}

function toSubscribedFromLemonStatus(status?: string): boolean {
  const normalized = (status ?? '').toLowerCase();
  return normalized === 'active' || normalized === 'trialing';
}

export async function POST(req: Request) {
  const bodyText = await req.text();
  const signature = req.headers.get('x-signature');
  const webhookSecret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
  let payload: LemonWebhookPayload;

  try {
    if (!signature || !webhookSecret) {
      return new Response('Webhook secret/signature not found.', {
        status: 400
      });
    }
    // NOTE: HMAC verification for Lemon Squeezy should be added here.
    // The payload is still parsed safely and ignored for unknown events.
    payload = JSON.parse(bodyText) as LemonWebhookPayload;
  } catch {
    return new Response('Invalid webhook payload.', { status: 400 });
  }

  const eventName = payload.meta?.event_name ?? '';
  const userId = resolveUserId(payload);
  if (!userId) {
    return new Response('Missing user id in webhook payload.', { status: 400 });
  }

  let isSubscribed = false;
  if (eventName === 'subscription.created') {
    isSubscribed = true;
  } else if (eventName === 'subscription.updated') {
    isSubscribed = toSubscribedFromLemonStatus(payload.data?.attributes?.status);
  } else if (eventName === 'subscription.deleted') {
    isSubscribed = false;
  } else {
    return new Response(JSON.stringify({ received: true, ignored: true }), {
      status: 200
    });
  }

  const { error } = await supabaseAdmin
    .from('profiles')
    .upsert([{ id: userId, is_subscribed: isSubscribed }], { onConflict: 'id' });
  if (error) {
    return new Response('Error updating subscription status.', { status: 500 });
  }

  return new Response(JSON.stringify({ received: true, updated: true }), {
    status: 200
  });
}
