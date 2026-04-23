/**
 * Shared Resend “envelope” (from + optional reply-to). Safe to import from scripts (no `server-only`).
 */

/** Default production sender on `mail.scholarshiptop.com`. Override with `RESEND_FROM`. */
export const RESEND_FROM_DEFAULT = 'ScholarshipTop <hello@mail.scholarshiptop.com>';

export function resolveResendFrom(): string {
  const env = process.env.RESEND_FROM?.trim();
  return env && env.length > 0 ? env : RESEND_FROM_DEFAULT;
}

/**
 * When `REPLY_TO_EMAIL` is set, Resend adds a Reply-To header so “Reply” in the client goes to your inbox.
 * @see https://resend.com/docs/api-reference/emails/send-email#body-parameters
 */
export function resolveResendReplyTo(): string | undefined {
  const v = process.env.REPLY_TO_EMAIL?.trim();
  return v && v.length > 0 ? v : undefined;
}

/** Spread into the Resend JSON body: `{ ...fields, ...resendReplyToFields() }`. */
export function resendReplyToFields(): { reply_to: string } | Record<string, never> {
  const replyTo = resolveResendReplyTo();
  return replyTo ? { reply_to: replyTo } : {};
}
