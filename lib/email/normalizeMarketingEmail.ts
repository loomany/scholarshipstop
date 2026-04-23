/** Lowercase + trim for storage and unsubscribe checks. */
export function normalizeMarketingEmail(email: string): string {
  return email.trim().toLowerCase();
}
