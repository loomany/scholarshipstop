import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types_db';
import { validateLemonSignature } from '@/lib/payments/lemonWebhookSignature';
import {
  decideSubscriptionUpdate,
  type LemonWebhookPayload
} from '@/lib/payments/lemonSubscriptionState';
import { notifyTelegramPayment } from '@/lib/telegram/bot';

const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(req: Request) {
  const bodyText = await req.text();
  const signature = req.headers.get('x-signature');
  const webhookSecret =
    process.env.LEMON_SQUEEZY_SECRET ??
    process.env.LEMON_SQUEEZY_WEBHOOK_SECRET ??
    '';
  let payload: LemonWebhookPayload;

  try {
    if (!webhookSecret) {
      return new Response('Webhook secret is not configured.', { status: 500 });
    }
    if (!signature) {
      return new Response('Invalid signature', { status: 400 });
    }
    if (
      !validateLemonSignature({
        rawBody: bodyText,
        signatureHeader: signature,
        secret: webhookSecret
      })
    ) {
      return new Response('Invalid signature', { status: 400 });
    }
    payload = JSON.parse(bodyText) as LemonWebhookPayload;
  } catch (error) {
    if (error instanceof SyntaxError) {
      return new Response('Invalid webhook payload.', { status: 400 });
    }
    return new Response('Webhook signature validation failed.', { status: 500 });
  }

  try {
    const decision = decideSubscriptionUpdate(payload);
    if (decision.kind === 'ignored') {
      return new Response(JSON.stringify({ received: true, ignored: true }), {
        status: 200
      });
    }

    const { data: existingSubscription } = await supabaseAdmin
      .from('subscriptions')
      .select('id, raw_payload')
      .eq('id', decision.subscription.id)
      .maybeSingle();
    if (
      existingSubscription?.raw_payload &&
      JSON.stringify(existingSubscription.raw_payload) === JSON.stringify(payload)
    ) {
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        status: 200
      });
    }

    const { error: subscriptionError } = await supabaseAdmin
      .from('subscriptions')
      .upsert([decision.subscription], { onConflict: 'id' });
    if (subscriptionError) {
      return new Response('Error syncing subscription record.', { status: 500 });
    }

    const { error } = await supabaseAdmin
      .from('profiles')
      .upsert(
        [
          {
            id: decision.userId,
            is_subscribed: decision.isSubscribed,
            subscription_plan: decision.subscriptionPlan
          }
        ],
        { onConflict: 'id' }
      );
    if (error) {
      return new Response('Error updating subscription status.', { status: 500 });
    }

    const { data: authUser } = await (supabaseAdmin as any)
      .schema('auth')
      .from('users')
      .select('email')
      .eq('id', decision.userId)
      .maybeSingle();

    await notifyTelegramPayment({
      userId: decision.userId,
      email: authUser?.email ?? null,
      plan: decision.subscriptionPlan,
      status: decision.subscription.status ?? 'unknown',
      eventName: payload.meta?.event_name ?? null
    });

    return new Response(JSON.stringify({ received: true, updated: true }), {
      status: 200
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Missing user id')) {
      return new Response(error.message, { status: 400 });
    }
    return new Response('Webhook processing failed.', { status: 500 });
  }
}
