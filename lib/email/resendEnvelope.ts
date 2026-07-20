/**
 * Shared outbound “envelope” (from + optional reply-to).
 * Safe to import from scripts (no `server-only`).
 *
 * Prefer `MAIL_FROM` / `REPLY_TO_EMAIL`. `RESEND_FROM` is kept as a legacy alias.
 */

/** Default production sender on `mail.scholarshiptop.com`. */
export const RESEND_FROM_DEFAULT = 'ScholarshipTop <hello@mail.scholarshiptop.com>';

export const MAIL_FROM_DEFAULT = RESEND_FROM_DEFAULT;

export function resolveMailFrom(): string {
  const mail = process.env.MAIL_FROM?.trim();
  if (mail && mail.length > 0) return mail;
  const legacy = process.env.RESEND_FROM?.trim();
  if (legacy && legacy.length > 0) return legacy;
  return MAIL_FROM_DEFAULT;
}

/** @deprecated Prefer `resolveMailFrom`. */
export function resolveResendFrom(): string {
  return resolveMailFrom();
}

/**
 * When `REPLY_TO_EMAIL` is set, clients show that address for “Reply”.
 */
export function resolveMailReplyTo(): string | undefined {
  const v = process.env.REPLY_TO_EMAIL?.trim();
  return v && v.length > 0 ? v : undefined;
}

/** @deprecated Prefer `resolveMailReplyTo`. */
export function resolveResendReplyTo(): string | undefined {
  return resolveMailReplyTo();
}

/** @deprecated Legacy Resend JSON helper — unused by SMTP path. */
export function resendReplyToFields(): { reply_to: string } | Record<string, never> {
  const replyTo = resolveMailReplyTo();
  return replyTo ? { reply_to: replyTo } : {};
}
