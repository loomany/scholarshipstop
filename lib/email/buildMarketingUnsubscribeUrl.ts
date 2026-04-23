import { getEmailSiteOrigin } from '@/lib/email/emailSiteOrigin';

function originNoSlash(siteOrigin: string): string {
  return siteOrigin.replace(/\/+$/, '');
}

/** Public page with confirm button (human clicks from email footer). */
export function buildMarketingUnsubscribePageUrl(
  siteOrigin: string,
  email: string
): string {
  const base = originNoSlash(siteOrigin);
  return `${base}/unsubscribe?email=${encodeURIComponent(email)}`;
}

/**
 * HTTPS URL for `List-Unsubscribe` / one-click POST (RFC 8058).
 * Points at the API route so mailbox providers POST here, not the React page.
 */
export function buildMarketingUnsubscribeListHeaderUrl(
  siteOrigin: string,
  email: string
): string {
  const base = originNoSlash(siteOrigin);
  return `${base}/api/unsubscribe?email=${encodeURIComponent(email)}`;
}

/** When only env-based origin is needed (cron, scripts). */
export function buildMarketingUnsubscribePageUrlFromEnv(email: string): string {
  return buildMarketingUnsubscribePageUrl(getEmailSiteOrigin(), email);
}

export function buildMarketingUnsubscribeListHeaderUrlFromEnv(
  email: string
): string {
  return buildMarketingUnsubscribeListHeaderUrl(getEmailSiteOrigin(), email);
}
