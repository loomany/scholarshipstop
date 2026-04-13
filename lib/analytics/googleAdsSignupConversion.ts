import type { User } from '@supabase/supabase-js';

/** Google Ads: Global Site Tag destination (layout + gtag config). */
export const GOOGLE_ADS_AW_ID = 'AW-18081113109';

/**
 * Conversion action (gtag `send_to`).
 * Format: `${AW_ID}/${conversion_label}`.
 */
export const GOOGLE_ADS_SIGNUP_CONVERSION_SEND_TO =
  'AW-18081113109/fmjbCPGZg5oceJXI361D';

/**
 * Only fire the signup conversion for relatively new accounts (email confirm can be delayed).
 * Avoids attributing routine logins of long-time users.
 */
const SIGNUP_CONVERSION_MAX_ACCOUNT_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function isSignupConversionEligibleUser(
  user: User | null | undefined
): boolean {
  if (!user?.created_at) return false;
  const created = new Date(user.created_at).getTime();
  const age = Date.now() - created;
  return age >= 0 && age <= SIGNUP_CONVERSION_MAX_ACCOUNT_AGE_MS;
}
