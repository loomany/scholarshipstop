import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types_db';
import {
  getLemonSignatureDebug,
  validateLemonSignature
} from '@/lib/payments/lemonWebhookSignature';
import {
  decideSubscriptionUpdate,
  type LemonWebhookPayload
} from '@/lib/payments/lemonSubscriptionState';
import { notifyTelegramPayment } from '@/lib/telegram/bot';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

function shouldSkipSignatureValidation() {
  return process.env.NODE_ENV !== 'production' && process.env.LEMON_WEBHOOK_SKIP_SIGNATURE === '1';
}

export async function POST(req: Request) {
  const rawBodyBuffer = await req.arrayBuffer();
  const rawBodyBytes = new Uint8Array(rawBodyBuffer);
  const bodyText = new TextDecoder().decode(rawBodyBytes);
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
    const signatureDebug = getLemonSignatureDebug({
      rawBody: rawBodyBytes,
      signatureHeader: signature,
      secret: webhookSecret
    });
    const signatureValid = validateLemonSignature({
      rawBody: rawBodyBytes,
      signatureHeader: signature,
      secret: webhookSecret
    });
    if (!signatureValid) {
      if (shouldSkipSignatureValidation()) {
        console.warn('[lemon:webhook] skipping invalid signature in local development', signatureDebug);
      } else {
        console.warn('[lemon:webhook] invalid signature', signatureDebug);
        return new Response('Invalid signature', { status: 400 });
      }
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

    console.info('[lemon:webhook] processing entitlement event', {
      eventName: decision.eventName,
      subscriptionId: decision.subscription.id,
      userId: decision.userId,
      status: decision.subscription.status,
      plan: decision.subscriptionPlan
    });

    const { data: existingSubscription } = await supabaseAdmin
      .from('subscriptions')
      .select('id, raw_payload')
      .eq('id', decision.subscription.id)
      .maybeSingle();
    if (
      existingSubscription?.raw_payload &&
      JSON.stringify(existingSubscription.raw_payload) === JSON.stringify(payload)
    ) {
      console.info('[lemon:webhook] duplicate payload ignored', {
        subscriptionId: decision.subscription.id,
        userId: decision.userId
      });
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        status: 200
      });
    }

    console.info('[lemon:webhook] upserting subscription', {
      subscriptionId: decision.subscription.id,
      userId: decision.userId
    });
    const { error: subscriptionError } = await supabaseAdmin
      .from('subscriptions')
      .upsert([decision.subscription], { onConflict: 'id' });
    if (subscriptionError) {
      console.error('[lemon:webhook] subscription upsert failed', {
        message: subscriptionError.message,
        code: subscriptionError.code,
        details: subscriptionError.details,
        hint: subscriptionError.hint,
        subscriptionId: decision.subscription.id,
        userId: decision.userId
      });
      return new Response('Error syncing subscription record.', { status: 500 });
    }
    console.info('[lemon:webhook] subscription upserted', {
      subscriptionId: decision.subscription.id,
      userId: decision.userId
    });

    console.info('[lemon:webhook] updating profile entitlements', {
      userId: decision.userId,
      isSubscribed: decision.isSubscribed,
      plan: decision.subscriptionPlan
    });
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
      console.error('[lemon:webhook] profile entitlement update failed', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        userId: decision.userId
      });
      return new Response('Error updating subscription status.', { status: 500 });
    }
    console.info('[lemon:webhook] profile entitlements updated', {
      userId: decision.userId
    });

    void supabaseAdmin.auth.admin
      .getUserById(decision.userId)
      .then(({ data: authUserData }) =>
        notifyTelegramPayment({
          userId: decision.userId,
          email: authUserData?.user?.email ?? null,
          plan: decision.subscriptionPlan,
          status: decision.subscription.status ?? 'unknown',
          eventName: payload.meta?.event_name ?? null
        })
      )
      .catch((telegramError) => {
        console.error('[lemon:webhook] telegram notification failed', {
          message: telegramError instanceof Error ? telegramError.message : String(telegramError),
          userId: decision.userId
        });
      });

    return new Response(JSON.stringify({ received: true, updated: true }), {
      status: 200
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Missing user id')) {
      return new Response(error.message, { status: 400 });
    }
    console.error('[lemon:webhook] unexpected failure', {
      message: error instanceof Error ? error.message : String(error)
    });
    return new Response('Webhook processing failed.', { status: 500 });
  }
}
