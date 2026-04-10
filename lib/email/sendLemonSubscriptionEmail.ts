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

async function postResend(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: boolean; skipped?: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim();
  if (!apiKey) {
    return { ok: false, skipped: 'RESEND_API_KEY not set' };
  }
  if (!from) {
    return { ok: false, skipped: 'RESEND_FROM not set' };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject: params.subject,
      html: params.html
    })
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('[email:lemon-subscription] Resend error', res.status, text);
    return { ok: false, skipped: `Resend HTTP ${res.status}` };
  }
  return { ok: true };
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
    html
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
    html
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
    html
  });
}
