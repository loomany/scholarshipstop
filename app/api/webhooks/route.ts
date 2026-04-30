import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types_db';
import {
  getLemonSignatureDebug,
  validateLemonSignature
} from '@/lib/payments/lemonWebhookSignature';
import {
  decideSubscriptionUpdate,
  isSubscriptionInvoicePayload,
  mergeSubscriptionPaymentFailedInvoiceUpsert,
  type LemonWebhookPayload
} from '@/lib/payments/lemonSubscriptionState';
import type { Json } from '@/types_db';
import {
  sendLemonSubscriptionActiveEmail,
  sendLemonSubscriptionCancelledEmail,
  sendLemonSubscriptionPaymentFailedEmail,
  lemonWebhookShouldSendSubscriptionWelcomeEmail,
  lemonWebhookShouldSendSubscriptionCancelledEmail,
  lemonWebhookShouldSendSubscriptionPaymentFailedEmail
} from '@/lib/email/sendLemonSubscriptionEmail';
import {
  notifyTelegramPayment,
  notifyTelegramStandaloneIqPaid
} from '@/lib/telegram/bot';
import { runInvoicePaymentFailedWebhookEffects } from '@/lib/payments/runInvoicePaymentFailedWebhookEffects';
import { enrichInvoicePaymentSuccessWithSubscriptionFetch } from '@/lib/payments/lemonInvoiceWebhookEnrichment';
import { sendIqReportReadyEmail } from '@/lib/email/sendIqReportReadyEmail';
import { getIqReportAdminClient, getIqReportUrl } from '@/lib/iqReportOrders';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

let supabaseAdminSingleton: SupabaseClient<Database> | null | undefined;

function getSupabaseAdmin(): SupabaseClient<Database> {
  if (supabaseAdminSingleton !== undefined) {
    if (!supabaseAdminSingleton) {
      throw new Error('Supabase admin client is not configured.');
    }
    return supabaseAdminSingleton;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    supabaseAdminSingleton = null;
    throw new Error('Supabase admin client is not configured.');
  }
  supabaseAdminSingleton = createClient<Database>(url, key);
  return supabaseAdminSingleton;
}

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

function getLemonAttributes(payload: LemonWebhookPayload) {
  return payload.data?.attributes ?? payload.attributes;
}

function getIqReportIdFromPayload(payload: LemonWebhookPayload): string | null {
  const value =
    payload.meta?.custom_data?.iq_report_id ??
    payload.data?.attributes?.custom_data?.iq_report_id ??
    payload.attributes?.custom_data?.iq_report_id ??
    null;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function getCheckoutEmailFromPayload(payload: LemonWebhookPayload): string | null {
  const attrs = getLemonAttributes(payload) as
    | (NonNullable<LemonWebhookPayload['data']>['attributes'] & {
        user_email?: string | null;
        user_email_address?: string | null;
        customer_email?: string | null;
      })
    | undefined;
  const value = attrs?.user_email ?? attrs?.user_email_address ?? attrs?.customer_email ?? null;
  return typeof value === 'string' && value.trim() ? value.trim().toLowerCase() : null;
}

async function handleIqReportOrderCreated(payload: LemonWebhookPayload) {
  if (payload.meta?.event_name !== 'order_created') return null;

  const reportId = getIqReportIdFromPayload(payload);
  if (!reportId) return null;

  const attrs = getLemonAttributes(payload);
  const orderId =
    attrs?.order_id != null
      ? String(attrs.order_id)
      : payload.data?.id != null
        ? String(payload.data.id)
        : null;

  const paidAt = new Date().toISOString();
  const { data: order, error } = await getIqReportAdminClient()
    .from('iq_report_orders')
    .update({
      status: 'paid',
      lemon_order_id: orderId,
      lemon_checkout_email: getCheckoutEmailFromPayload(payload),
      raw_payload: payload as Json,
      paid_at: paidAt,
      updated_at: paidAt
    })
    .eq('id', reportId)
    .select('*')
    .maybeSingle();

  if (error || !order) {
    console.error('[lemon:webhook] iq report order update failed', {
      reportId,
      message: error?.message
    });
    return new Response('Error updating IQ report order.', { status: 500 });
  }

  const reportUrl = getIqReportUrl(order.access_token);
  const result = order.assessment_result as {
    iqScore?: number;
    archetype?: string;
  };

  await notifyTelegramStandaloneIqPaid({
    email: order.email,
    reportId,
    orderId,
    reportUrl,
    iqScore: typeof result.iqScore === 'number' ? result.iqScore : null,
    archetype: typeof result.archetype === 'string' ? result.archetype : null
  });

  const emailResult = await sendIqReportReadyEmail({
    toEmail: order.email,
    reportUrl,
    iqScore: typeof result.iqScore === 'number' ? result.iqScore : 0,
    archetype: typeof result.archetype === 'string' ? result.archetype : 'Cognitive Profile'
  });

  if (emailResult.ok) {
    const sentAt = new Date().toISOString();
    await getIqReportAdminClient()
      .from('iq_report_orders')
      .update({
        status: 'email_sent',
        email_sent_at: sentAt,
        updated_at: sentAt
      })
      .eq('id', reportId);
  } else {
    console.warn('[lemon:webhook] iq report email not sent', {
      reportId,
      skipped: emailResult.skipped
    });
  }

  return new Response(
    JSON.stringify({
      received: true,
      iqReport: true,
      emailSent: emailResult.ok,
      skipped: emailResult.skipped
    }),
    { status: 200 }
  );
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
    const enriched = await enrichInvoicePaymentSuccessWithSubscriptionFetch(payload);
    if (enriched) {
      console.info('[lemon:webhook] enriched invoice webhook via Lemon API GET /subscriptions', {
        subscriptionId: enriched.data?.id
      });
      payload = enriched;
    }

    const iqReportResponse = await handleIqReportOrderCreated(payload);
    if (iqReportResponse) return iqReportResponse;

    const decision = decideSubscriptionUpdate(payload);
    if (decision.kind === 'ignored') {
      const invoiceFx = await runInvoicePaymentFailedWebhookEffects(getSupabaseAdmin(), payload);
      return new Response(
        JSON.stringify({
          received: true,
          ignored: true,
          invoicePaymentFailed: invoiceFx
        }),
        { status: 200 }
      );
    }

    console.info('[lemon:webhook] processing entitlement event', {
      eventName: decision.eventName,
      subscriptionId: decision.subscription.id,
      userId: decision.userId,
      status: decision.subscription.status,
      plan: decision.subscriptionPlan
    });

    const { data: existingSubscription } = await getSupabaseAdmin()
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

    const skipStaleForInvoicePaymentFailed =
      decision.eventName === 'subscription_payment_failed' &&
      isSubscriptionInvoicePayload(payload);

    if (!skipStaleForInvoicePaymentFailed && existingUpdatedAt && incomingUpdatedAt) {
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

    let subscriptionRow = decision.subscription;
    if (
      decision.eventName === 'subscription_payment_failed' &&
      isSubscriptionInvoicePayload(payload)
    ) {
      const { data: existingFull } = await getSupabaseAdmin()
        .from('subscriptions')
        .select('*')
        .eq('id', decision.subscription.id)
        .maybeSingle();
      if (existingFull) {
        subscriptionRow = mergeSubscriptionPaymentFailedInvoiceUpsert(
          decision.subscription,
          existingFull
        );
      }
    }

    console.info('[lemon:webhook] upserting subscription', {
      subscriptionId: subscriptionRow.id,
      userId: decision.userId
    });
    const { error: subscriptionError } = await getSupabaseAdmin()
      .from('subscriptions')
      .upsert([subscriptionRow], { onConflict: 'id' });
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
    const { error } = await getSupabaseAdmin()
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

    try {
      let userEmail: string | null = null;
      try {
        const { data: authUserData, error: authErr } =
          await getSupabaseAdmin().auth.admin.getUserById(decision.userId);
        if (authErr) {
          console.warn('[lemon:webhook] auth admin getUserById', authErr.message);
        }
        userEmail = authUserData?.user?.email ?? null;
      } catch (authLookupError) {
        console.error('[lemon:webhook] auth admin getUserById threw', {
          message:
            authLookupError instanceof Error
              ? authLookupError.message
              : String(authLookupError),
          userId: decision.userId
        });
      }

      await notifyTelegramPayment({
        userId: decision.userId,
        email: userEmail,
        plan: decision.subscriptionPlan,
        status: decision.subscription.status ?? 'unknown',
        eventName: decision.eventName
      });

      if (!userEmail?.trim()) {
        console.warn('[lemon:webhook] skip subscription emails — no auth email for user', {
          userId: decision.userId
        });
      } else {
        const eventName = decision.eventName;
        if (
          lemonWebhookShouldSendSubscriptionWelcomeEmail(eventName, payload, decision.isSubscribed)
        ) {
          const r = await sendLemonSubscriptionActiveEmail({
            toEmail: userEmail.trim(),
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
            toEmail: userEmail.trim(),
            payload
          });
          if (!r.ok) {
            console.warn('[lemon:webhook] subscription cancelled email not sent', {
              userId: decision.userId,
              skipped: r.skipped
            });
          }
        } else if (lemonWebhookShouldSendSubscriptionPaymentFailedEmail(eventName)) {
          const r = await sendLemonSubscriptionPaymentFailedEmail({
            toEmail: userEmail.trim(),
            payload
          });
          if (!r.ok) {
            console.warn('[lemon:webhook] subscription payment failed email not sent', {
              userId: decision.userId,
              skipped: r.skipped
            });
          }
        }
      }
    } catch (sideEffectError) {
      console.error('[lemon:webhook] post-update notification failed', {
        message:
          sideEffectError instanceof Error ? sideEffectError.message : String(sideEffectError),
        userId: decision.userId
      });
    }

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
