import 'server-only';

/**
 * Global default From for all Resend sends. Override with `RESEND_FROM` in env when needed.
 */
export const RESEND_FROM = 'ScholarshipTop <hello@mail.scholarshiptop.com>';

export function getResendFrom(): string {
  const env = process.env.RESEND_FROM?.trim();
  return env || RESEND_FROM;
}
