import { escapeHtml } from '@/lib/email/templates/escapeHtml';
import { defaultEmailUnsubscribeUrl } from '@/lib/email/templates/premiumTemplates';
import { buildScholarshipTopPremiumEmailHtml } from '@/lib/email/templates/scholarshipTopEmailLayout';

export const EMAIL_SUBJECT_SUBSCRIPTION_ACTIVE =
  'Welcome to ScholarshipTop! Your subscription is active';

export const EMAIL_SUBJECT_SUBSCRIPTION_CANCELLED =
  'Your ScholarshipTop subscription has been cancelled';

export const EMAIL_SUBJECT_SUBSCRIPTION_PAYMENT_FAILED =
  'Action Required: Payment Failed';

export type SubscriptionActiveEmailParams = {
  siteOrigin: string;
  /** e.g. "Monthly Plan", "Quarterly Plan", "Annual Plan" — from Lemon `product_name` + tier logic */
  planDisplayName: string;
  /** e.g. "$25", "$57", "$144" — from order/subscription totals or static tier map */
  planPriceDisplay: string;
  /** Optional second line, e.g. "Billed every month" — from `variant_name` or app rules */
  planCadenceLine?: string;
  /** Deep link to scholarships hub */
  scholarshipsUrl: string;
  unsubscribeUrl?: string;
};

/**
 * Lemon Squeezy mapping (webhook JSON):
 * - **Plan name:** `data.attributes.product_name` (and optionally format with `variant_name`).
 * - **Price:** Prefer `meta.custom_data` if you store tier; else map `variant_id` / `product_id` to your
 *   known prices ($25 / $57 / $144); order webhooks may include `first_order_item` totals.
 * - Always `escapeHtml()` or pass through this builder only (values are escaped here).
 */
export function buildSubscriptionActiveEmailHtml(
  params: SubscriptionActiveEmailParams
): string {
  const origin = params.siteOrigin.replace(/\/+$/, '');
  const unsub = params.unsubscribeUrl ?? defaultEmailUnsubscribeUrl(origin);
  const name = escapeHtml(params.planDisplayName.trim());
  const price = escapeHtml(params.planPriceDisplay.trim());
  const cadence = params.planCadenceLine?.trim()
    ? `<p style="margin:10px 0 0;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:14px;line-height:1.5;color:#6b7280;">${escapeHtml(params.planCadenceLine.trim())}</p>`
    : '';

  const extraHtml = `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:24px 0;">
  <tr>
    <td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:100%;border-radius:14px;background-color:#f9fafb;border:1px solid #e5e7eb;">
        <tr>
          <td style="padding:22px 20px;text-align:center;">
            <p style="margin:0 0 10px;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280;">
              Your plan
            </p>
            <p style="margin:0;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:20px;font-weight:800;line-height:1.3;color:#111827;">
              ${name}
            </p>
            <p style="margin:12px 0 0;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:22px;font-weight:800;line-height:1.2;color:#f97316;">
              ${price}
            </p>
            ${cadence}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;

  return buildScholarshipTopPremiumEmailHtml({
    preheader: 'Your ScholarshipTop subscription is active — start exploring scholarships.',
    headline: 'Subscription Confirmed',
    bodyParagraphsHtml: [
      `Hi there! Congratulations and welcome to <strong style="color:#111827;">ScholarshipTop</strong>. Your subscription is now active, and your <strong style="color:#111827;">3-day free trial</strong> has started. You have unlocked full access to our database to find your perfect scholarship.`
    ],
    extraHtml,
    ctaHref: params.scholarshipsUrl,
    ctaLabel: 'Find Scholarships',
    siteOrigin: origin,
    unsubscribeUrl: unsub,
    secondaryLinkNote: ''
  });
}

export type SubscriptionCancelledEmailParams = {
  siteOrigin: string;
  /** Lemon customer portal / update payment / resubscribe URL from `urls.customer_portal` or your app */
  billingPortalUrl: string;
  unsubscribeUrl?: string;
};

export function buildSubscriptionCancelledEmailHtml(
  params: SubscriptionCancelledEmailParams
): string {
  const origin = params.siteOrigin.replace(/\/+$/, '');
  const unsub = params.unsubscribeUrl ?? defaultEmailUnsubscribeUrl(origin);

  return buildScholarshipTopPremiumEmailHtml({
    preheader: 'Your ScholarshipTop subscription has been cancelled.',
    headline: 'Subscription Cancelled',
    bodyParagraphsHtml: [
      `Hi there. We&rsquo;re sorry to see you go! This email confirms that your ScholarshipTop subscription has been successfully cancelled. You will continue to have <strong style="color:#111827;">full access</strong> to the platform until the end of your current billing period. If you change your mind, you can always come back and reactivate your plan.`
    ],
    ctaHref: params.billingPortalUrl,
    ctaLabel: 'Reactivate Subscription',
    siteOrigin: origin,
    unsubscribeUrl: unsub,
    secondaryLinkNote: ''
  });
}

export type SubscriptionPaymentFailedEmailParams = {
  siteOrigin: string;
  updatePaymentUrl: string;
  unsubscribeUrl?: string;
};

export function buildSubscriptionPaymentFailedEmailHtml(
  params: SubscriptionPaymentFailedEmailParams
): string {
  const origin = params.siteOrigin.replace(/\/+$/, '');
  const unsub = params.unsubscribeUrl ?? defaultEmailUnsubscribeUrl(origin);

  return buildScholarshipTopPremiumEmailHtml({
    preheader: 'Action required: we could not process your subscription renewal payment.',
    headline: 'Action Required: Payment Failed',
    bodyParagraphsHtml: [
      `Hi there. Your 3-day free trial on ScholarshipTop has ended. Unfortunately, we couldn&rsquo;t process your payment for the subscription renewal, so your access is temporarily paused. This usually happens if a card has expired, has insufficient funds, or the bank declined the transaction. Please update your billing information to restore your access to our scholarship database.`
    ],
    ctaHref: params.updatePaymentUrl,
    ctaLabel: 'Update Billing Info',
    siteOrigin: origin,
    unsubscribeUrl: unsub,
    secondaryLinkNote: ''
  });
}
