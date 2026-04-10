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
import type { Json } from '@/types_db';
import {
  sendLemonSubscriptionActiveEmail,
  sendLemonSubscriptionCancelledEmail,
  lemonWebhookShouldSendSubscriptionActiveEmail,
  lemonWebhookShouldSendSubscriptionCancelledEmail
} from '@/lib/email/sendLemonSubscriptionEmail';
import { notifyTelegramPayment } from '@/lib/telegram/bot';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

function parseIsoDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getPayloadUpdatedAt(payload: LemonWebhookPayload): string | null {
  const value = payload.data?.attributes?.updated_at ?? payload.attributes?.updated_at ?? null;
  return typeof value === 'string' && value.trim() ? value : null;
}

function getStoredPayloadUpdatedAt(rawPayload: Json | null): string | null {
  if (!rawPayload || typeof rawPayload !== 'object' || Array.isArray(rawPayload)) {
    return null;
  }

  const payload = rawPayload as LemonWebhookPayload;
  return getPayloadUpdatedAt(payload);
}

function shouldSkipSignatureValidation() {
  return process.env.NODE_ENV !== 'production' && process.env.LEMON_WEBHOOK_SKIP_SIGNATURE === '1';
}

/** Signing secret from the webhook in Lemon (6–40 chars), not the REST API key. Try all distinct env values. */
function lemonWebhookSecretCandidates(): string[] {
  const raw = [
    process.env.LEMON_SQUEEZY_WEBHOOK_SECRET,
    process.env.LEMON_SQUEEZY_SECRET
  ];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const s of raw) {
    const t = s?.trim();
    if (t && !seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  }
  return out;
}

export async function POST(req: Request) {
  const rawBodyBuffer = await req.arrayBuffer();
  const rawBodyBytes = new Uint8Array(rawBodyBuffer);
  const bodyText = new TextDecoder().decode(rawBodyBytes);
  const signature = req.headers.get('x-signature');
  const secretCandidates = lemonWebhookSecretCandidates();
  let payload: LemonWebhookPayload;

  try {
    if (secretCandidates.length === 0) {
      return new Response('Webhook secret is not configured.', { status: 500 });
    }
    if (!signature) {
      return new Response('Invalid signature', { status: 400 });
    }
    const signatureValid = secretCandidates.some((secret) =>
      validateLemonSignature({
        rawBody: rawBodyBytes,
        signatureHeader: signature,
        secret
      })
    );
    const signatureDebug = getLemonSignatureDebug({
      rawBody: rawBodyBytes,
      signatureHeader: signature,
      secret: secretCandidates[0]!
    });
    if (!signatureValid) {
      if (shouldSkipSignatureValidation()) {
        console.warn('[lemon:webhook] skipping invalid signature in local development', signatureDebug);
      } else {
        console.warn('[lemon:webhook] invalid signature (check LEMON_SQUEEZY_WEBHOOK_SECRET matches Lemon webhook signing secret)', {
          ...signatureDebug,
          candidateCount: secretCandidates.length
        });
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
      .select('id, metadata, raw_payload')
      .eq('id', decision.subscription.id)
      .maybeSingle();
    const existingMetadata =
      existingSubscription?.metadata &&
      typeof existingSubscription.metadata === 'object' &&
      !Array.isArray(existingSubscription.metadata)
        ? (existingSubscription.metadata as Record<string, Json>)
        : null;
    const nextMetadata =
      decision.subscription.metadata &&
      typeof decision.subscription.metadata === 'object' &&
      !Array.isArray(decision.subscription.metadata)
        ? (decision.subscription.metadata as Record<string, Json>)
        : null;
    const existingEventFingerprint =
      typeof existingMetadata?.lemon_event_fingerprint === 'string'
        ? existingMetadata.lemon_event_fingerprint
        : null;
    const nextEventFingerprint =
      typeof nextMetadata?.lemon_event_fingerprint === 'string'
        ? nextMetadata.lemon_event_fingerprint
        : null;
    const existingUpdatedAt = getStoredPayloadUpdatedAt(existingSubscription?.raw_payload ?? null);
    const incomingUpdatedAt = getPayloadUpdatedAt(payload);

    if (
      (existingEventFingerprint && nextEventFingerprint && existingEventFingerprint === nextEventFingerprint) ||
      (existingSubscription?.raw_payload &&
        JSON.stringify(existingSubscription.raw_payload) === JSON.stringify(payload))
    ) {
      console.info('[lemon:webhook] duplicate payload ignored', {
        subscriptionId: decision.subscription.id,
        userId: decision.userId,
        eventFingerprint: nextEventFingerprint
      });
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        status: 200
      });
    }

    if (existingUpdatedAt && incomingUpdatedAt) {
      const existingUpdatedAtDate = parseIsoDate(existingUpdatedAt);
      const incomingUpdatedAtDate = parseIsoDate(incomingUpdatedAt);
      if (
        existingUpdatedAtDate &&
        incomingUpdatedAtDate &&
        incomingUpdatedAtDate.getTime() < existingUpdatedAtDate.getTime()
      ) {
        console.info('[lemon:webhook] stale payload ignored', {
          subscriptionId: decision.subscription.id,
          userId: decision.userId,
          existingUpdatedAt,
          incomingUpdatedAt,
          eventName: decision.eventName
        });
        return new Response(JSON.stringify({ received: true, stale: true }), {
          status: 200
        });
      }
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
        incomingStatus: decision.subscription.status,
        incomingUpdatedAt,
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
      .then(async ({ data: authUserData }) => {
        const email = authUserData?.user?.email ?? null;
        await notifyTelegramPayment({
          userId: decision.userId,
          email,
          plan: decision.subscriptionPlan,
          status: decision.subscription.status ?? 'unknown',
          eventName: payload.meta?.event_name ?? null
        });

        if (!email?.trim()) {
          return;
        }

        const eventName = decision.eventName;
        if (
          lemonWebhookShouldSendSubscriptionActiveEmail(eventName) &&
          decision.isSubscribed
        ) {
          const r = await sendLemonSubscriptionActiveEmail({
            toEmail: email.trim(),
            payload,
            subscriptionPlan: decision.subscriptionPlan
          });
          if (!r.ok) {
            console.warn('[lemon:webhook] subscription active email not sent', {
              userId: decision.userId,
              skipped: r.skipped
            });
          }
        } else if (lemonWebhookShouldSendSubscriptionCancelledEmail(eventName)) {
          const r = await sendLemonSubscriptionCancelledEmail({
            toEmail: email.trim(),
            payload
          });
          if (!r.ok) {
            console.warn('[lemon:webhook] subscription cancelled email not sent', {
              userId: decision.userId,
              skipped: r.skipped
            });
          }
        }
      })
      .catch((sideEffectError) => {
        console.error('[lemon:webhook] post-update notification failed', {
          message:
            sideEffectError instanceof Error ? sideEffectError.message : String(sideEffectError),
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
