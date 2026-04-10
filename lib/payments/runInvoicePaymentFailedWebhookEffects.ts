import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { sendLemonSubscriptionPaymentFailedEmail } from '@/lib/email/sendLemonSubscriptionEmail';
import { notifyTelegramPayment } from '@/lib/telegram/bot';
import type { Database } from '@/types_db';

import {
  isSubscriptionInvoicePayload,
  normalizeLemonEventName,
  resolveUserId,
  type LemonWebhookPayload
} from '@/lib/payments/lemonSubscriptionState';

export type InvoicePaymentFailedEffectsResult = 'sent' | 'duplicate' | 'skipped';

/**
 * Lemon sends `subscription_payment_failed` with a **subscription-invoices** payload.
 * We intentionally ignore those for DB upserts (`decideSubscriptionUpdate`); this runs
 * email + admin Telegram using `meta.custom_data.user_id` and dedupes by invoice id.
 */
export async function runInvoicePaymentFailedWebhookEffects(
  admin: SupabaseClient<Database>,
  payload: LemonWebhookPayload
): Promise<InvoicePaymentFailedEffectsResult> {
  const eventName = normalizeLemonEventName(payload.meta?.event_name);
  if (eventName !== 'subscription_payment_failed') return 'skipped';
  if (!isSubscriptionInvoicePayload(payload)) return 'skipped';

  const userId = resolveUserId(payload);
  if (!userId) {
    console.warn(
      '[lemon:webhook] invoice subscription_payment_failed: missing user_id in meta.custom_data'
    );
    return 'skipped';
  }

  const invoiceId =
    payload.data?.id != null ? String(payload.data.id) : '';
  if (!invoiceId) return 'skipped';

  /** One email + one admin log per Lemon invoice id (retries / debugger replays do not resend). */
  const { data: dup } = await admin
    .from('telegram_event_logs')
    .select('id')
    .eq('event_type', 'payment')
    .eq('related_user_id', userId)
    .contains('payload', {
      source: 'invoice_payment_failed',
      invoice_id: invoiceId
    })
    .maybeSingle();

  if (dup) {
    console.info('[lemon:webhook] invoice payment_failed notify skipped (duplicate)', {
      userId,
      invoiceId
    });
    return 'duplicate';
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('subscription_plan')
    .eq('id', userId)
    .maybeSingle();
  const plan = profile?.subscription_plan ?? 'free';

  const { data: authUserData } = await admin.auth.admin.getUserById(userId);
  const attrs = payload.data?.attributes;
  const email =
    authUserData?.user?.email?.trim() ||
    (typeof attrs?.user_email === 'string' ? attrs.user_email.trim() : null) ||
    null;

  await notifyTelegramPayment({
    userId,
    email,
    plan,
    status: 'past_due',
    eventName: 'subscription_payment_failed',
    invoiceId,
    source: 'invoice_payment_failed'
  });

  if (email) {
    const r = await sendLemonSubscriptionPaymentFailedEmail({ toEmail: email, payload });
    if (!r.ok) {
      console.warn('[lemon:webhook] invoice payment_failed email not sent', {
        userId,
        skipped: r.skipped
      });
    }
  } else {
    console.warn('[lemon:webhook] invoice payment_failed: no email for user', { userId });
  }

  console.info('[lemon:webhook] invoice subscription_payment_failed side effects completed', {
    userId,
    invoiceId
  });
  return 'sent';
}
