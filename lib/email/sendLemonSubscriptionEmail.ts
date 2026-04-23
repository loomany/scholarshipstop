import 'server-only';

import type { AppSubscriptionPlan } from '@/lib/payments/subscriptionEntitlements';
import {
  extractLemonCustomerPortalUrl,
  extractLemonUpdatePaymentMethodUrl,
  type LemonWebhookPayload
} from '@/lib/payments/lemonSubscriptionState';
import {
  buildSubscriptionActiveEmailHtml,
  buildSubscriptionCancelledEmailHtml,
  buildSubscriptionPaymentFailedEmailHtml,
  EMAIL_SUBJECT_SUBSCRIPTION_ACTIVE,
  EMAIL_SUBJECT_SUBSCRIPTION_CANCELLED,
  EMAIL_SUBJECT_SUBSCRIPTION_PAYMENT_FAILED
} from '@/lib/email/templates/subscriptionEmailTemplates';
import { postResend } from '@/lib/email/postResend';
import { defaultEmailUnsubscribeUrl } from '@/lib/email/templates/premiumTemplates';

function getEmailSiteOrigin(): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (site) {
    const s = site.replace(/\/+$/, '');
    return s.startsWith('http') ? s : `https://${s}`;
  }
  return 'https://scholarshiptop.com';
}

function getLemonAttributes(payload: LemonWebhookPayload) {
  return payload.data?.attributes ?? payload.attributes;
}

/**
 * Plan line for the “Your plan” card — aligned with `SubscriptionPricingClient` copy.
 */
function planCardFromSubscriptionPlan(
  plan: AppSubscriptionPlan,
  payload: LemonWebhookPayload
): { planDisplayName: string; planPriceDisplay: string; planCadenceLine?: string } {
  const attrs = getLemonAttributes(payload);
  const product = attrs?.product_name?.trim();
  const variant = attrs?.variant_name?.trim();
  const fromLemon = [product, variant].filter(Boolean).join(' · ');
  switch (plan) {
    case 'trial':
      return {
        planDisplayName: 'Monthly',
        planPriceDisplay: '$0',
        planCadenceLine: 'Full access during your trial'
      };
    case 'monthly_pro':
      return {
        planDisplayName: 'Monthly',
        planPriceDisplay: '$25',
        planCadenceLine: 'Billed every month'
      };
    case 'quarterly_pro':
      return {
        planDisplayName: 'Quarterly',
        planPriceDisplay: '$57',
        planCadenceLine: 'Billed every 3 months'
      };
    case 'yearly_pro':
      return {
        planDisplayName: 'Yearly',
        planPriceDisplay: '$144',
        planCadenceLine: 'Billed annually'
      };
    default:
      return {
        planDisplayName: fromLemon || 'ScholarshipTop Pro',
        planPriceDisplay: '—',
        planCadenceLine: variant || undefined
      };
  }
}

export function lemonWebhookShouldSendSubscriptionActiveEmail(eventName: string): boolean {
  return (
    eventName === 'subscription_created' ||
    eventName === 'subscription_resumed' ||
    eventName === 'subscription_unpaused'
  );
}

/**
 * **SaaS default: do not send.** Lemon Squeezy already emails the customer (receipt / order confirmation).
 * Sending our own “subscription active” on top duplicated that flow and could double with
 * `subscription_created` + `subscription_updated` within minutes.
 *
 * Set `SUBSCRIPTION_RESEND_WELCOME_ON_PURCHASE=1` to opt into legacy Resend “welcome” on:
 * `subscription_created` | `subscription_resumed` | `subscription_unpaused` | `subscription_plan_changed`,
 * plus `subscription_updated` when `created_at` and `updated_at` are within 5 minutes (Lemon sometimes skips `created`).
 */
export function lemonWebhookShouldSendSubscriptionWelcomeEmail(
  eventName: string,
  payload: LemonWebhookPayload,
  isSubscribed: boolean
): boolean {
  if (process.env.SUBSCRIPTION_RESEND_WELCOME_ON_PURCHASE?.trim() !== '1') {
    return false;
  }
  if (!isSubscribed) return false;
  if (lemonWebhookShouldSendSubscriptionActiveEmail(eventName)) return true;
  if (eventName === 'subscription_plan_changed') return true;
  if (eventName === 'subscription_updated') {
    const attrs = payload.data?.attributes ?? (payload as { attributes?: { created_at?: string; updated_at?: string } }).attributes;
    const created = attrs?.created_at;
    const updated = attrs?.updated_at;
    if (typeof created === 'string' && typeof updated === 'string') {
      const c = new Date(created).getTime();
      const u = new Date(updated).getTime();
      if (!Number.isNaN(c) && !Number.isNaN(u)) {
        return Math.abs(u - c) <= 5 * 60 * 1000;
      }
    }
  }
  return false;
}

export function lemonWebhookShouldSendSubscriptionCancelledEmail(
  eventName: string
): boolean {
  return eventName === 'subscription_cancelled';
}

export function lemonWebhookShouldSendSubscriptionPaymentFailedEmail(
  eventName: string
): boolean {
  return eventName === 'subscription_payment_failed';
}

export async function sendLemonSubscriptionActiveEmail(options: {
  toEmail: string;
  payload: LemonWebhookPayload;
  subscriptionPlan: AppSubscriptionPlan;
}): Promise<{ ok: boolean; skipped?: string }> {
  const origin = getEmailSiteOrigin();
  const card = planCardFromSubscriptionPlan(options.subscriptionPlan, options.payload);
  const html = buildSubscriptionActiveEmailHtml({
    siteOrigin: origin,
    planDisplayName: card.planDisplayName,
    planPriceDisplay: card.planPriceDisplay,
    planCadenceLine: card.planCadenceLine,
    scholarshipsUrl: `${origin}/scholarships`,
    unsubscribeUrl: defaultEmailUnsubscribeUrl(origin)
  });
  return postResend({
    to: options.toEmail,
    subject: EMAIL_SUBJECT_SUBSCRIPTION_ACTIVE,
    html,
    category: 'transactional'
  });
}

export async function sendLemonSubscriptionCancelledEmail(options: {
  toEmail: string;
  payload: LemonWebhookPayload;
}): Promise<{ ok: boolean; skipped?: string }> {
  const origin = getEmailSiteOrigin();
  const portal =
    extractLemonCustomerPortalUrl(options.payload) ?? `${origin}/subscription`;
  const html = buildSubscriptionCancelledEmailHtml({
    siteOrigin: origin,
    billingPortalUrl: portal,
    unsubscribeUrl: defaultEmailUnsubscribeUrl(origin)
  });
  return postResend({
    to: options.toEmail,
    subject: EMAIL_SUBJECT_SUBSCRIPTION_CANCELLED,
    html,
    category: 'transactional'
  });
}

export async function sendLemonSubscriptionPaymentFailedEmail(options: {
  toEmail: string;
  payload: LemonWebhookPayload;
}): Promise<{ ok: boolean; skipped?: string }> {
  const origin = getEmailSiteOrigin();
  const base = origin.replace(/\/+$/, '');
  /** Invoice webhooks do not include `urls.update_payment_method` (see Lemon API). */
  const updatePaymentUrl =
    extractLemonUpdatePaymentMethodUrl(options.payload) ?? `${base}/subscription`;

  const html = buildSubscriptionPaymentFailedEmailHtml({
    siteOrigin: origin,
    updatePaymentUrl,
    unsubscribeUrl: defaultEmailUnsubscribeUrl(origin)
  });

  return postResend({
    to: options.toEmail,
    subject: EMAIL_SUBJECT_SUBSCRIPTION_PAYMENT_FAILED,
    html,
    category: 'transactional'
  });
}
