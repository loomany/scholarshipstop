import { escapeHtml } from '@/lib/email/templates/escapeHtml';
import { buildScholarshipTopPremiumEmailHtml } from '@/lib/email/templates/scholarshipTopEmailLayout';

/**
 * Map to Supabase / Go templates: pass the resolved confirmation URL as `confirmationUrl`
 * (e.g. same value you would put in {{ .ConfirmationURL }}).
 */
export const EMAIL_SUBJECT_CONFIRM_SIGNUP =
  '🎓 Welcome to ScholarshipTop! Confirm your email';

export const EMAIL_SUBJECT_MAGIC_LINK = 'Your magic link for ScholarshipTop';

export const EMAIL_SUBJECT_RESET_PASSWORD = 'Reset your password';

export function emailSubjectNewMatches(matchCount: number): string {
  return `⚡️ ${matchCount} new scholarships found for you!`;
}

export function defaultEmailUnsubscribeUrl(siteOrigin: string): string {
  return `${siteOrigin.replace(/\/+$/, '')}/account`;
}

export type ConfirmSignupEmailParams = {
  /** Display name (maps from {{ .Name }} or app profile). */
  name: string;
  /** Same as {{ .ConfirmationURL }} in Supabase templates. */
  confirmationUrl: string;
  siteOrigin: string;
  unsubscribeUrl?: string;
};

export function buildConfirmSignupEmailHtml(params: ConfirmSignupEmailParams): string {
  const origin = params.siteOrigin.replace(/\/+$/, '');
  const name = params.name.trim() || 'there';
  const unsub = params.unsubscribeUrl ?? defaultEmailUnsubscribeUrl(origin);

  return buildScholarshipTopPremiumEmailHtml({
    preheader: `Confirm your email to unlock ScholarshipTop — 3,000+ matches await.`,
    headline: 'One step away from your scholarship',
    accentLine: 'Confirm your email to get started',
    bodyParagraphsHtml: [
      `Hi ${escapeHtml(name)}! Thanks for joining <strong style="color:#111827;">ScholarshipTop</strong>. Please confirm your email to activate your account and get full access to 3,000+ matches.`,
      `You&rsquo;re already signed in on the site in most cases &mdash; this step secures your account and unlocks the full experience.`
    ],
    ctaHref: params.confirmationUrl,
    ctaLabel: 'Confirm email',
    siteOrigin: origin,
    unsubscribeUrl: unsub,
    secondaryLinkNote: ''
  });
}

export type MagicLinkEmailParams = {
  confirmationUrl: string;
  siteOrigin: string;
  unsubscribeUrl?: string;
};

export function buildMagicLinkEmailHtml(params: MagicLinkEmailParams): string {
  const origin = params.siteOrigin.replace(/\/+$/, '');
  const unsub = params.unsubscribeUrl ?? defaultEmailUnsubscribeUrl(origin);

  return buildScholarshipTopPremiumEmailHtml({
    preheader: 'Secure sign-in link — expires in 15 minutes.',
    headline: 'Sign in to ScholarshipTop',
    bodyParagraphsHtml: [
      `Click the button below to securely sign in to your dashboard. This link expires in <strong style="color:#111827;">15 minutes</strong>.`,
      `If you didn&rsquo;t request this email, you can safely ignore it.`
    ],
    ctaHref: params.confirmationUrl,
    ctaLabel: 'Sign in now',
    siteOrigin: origin,
    unsubscribeUrl: unsub
  });
}

export type ResetPasswordEmailParams = {
  confirmationUrl: string;
  siteOrigin: string;
  unsubscribeUrl?: string;
};

export function buildResetPasswordEmailHtml(params: ResetPasswordEmailParams): string {
  const origin = params.siteOrigin.replace(/\/+$/, '');
  const unsub = params.unsubscribeUrl ?? defaultEmailUnsubscribeUrl(origin);

  return buildScholarshipTopPremiumEmailHtml({
    preheader: 'Reset your ScholarshipTop password.',
    headline: 'Reset your password',
    bodyParagraphsHtml: [
      `Forgot your password? No worries. Click below to set a new one.`,
      `This link is single-use. If you didn&rsquo;t ask for a reset, you can ignore this message.`
    ],
    ctaHref: params.confirmationUrl,
    ctaLabel: 'Reset password',
    siteOrigin: origin,
    unsubscribeUrl: unsub
  });
}

export type NewMatchesEmailParams = {
  /** Deep link to hub or filtered list. */
  confirmationUrl: string;
  siteOrigin: string;
  matchCount?: number;
  unsubscribeUrl?: string;
};

export function buildNewMatchesEmailHtml(params: NewMatchesEmailParams): string {
  const origin = params.siteOrigin.replace(/\/+$/, '');
  const unsub = params.unsubscribeUrl ?? defaultEmailUnsubscribeUrl(origin);
  const n = params.matchCount ?? 5;

  return buildScholarshipTopPremiumEmailHtml({
    preheader: `${n} new scholarships matched to your profile.`,
    headline: 'Fresh matches for you',
    accentLine: `${n} new scholarships to explore`,
    bodyParagraphsHtml: [
      `Our AI found new scholarships matching your profile. Don&rsquo;t miss out!`,
      `Open your dashboard to review requirements, deadlines, and your personalized match scores.`
    ],
    ctaHref: params.confirmationUrl,
    ctaLabel: 'View matches',
    siteOrigin: origin,
    unsubscribeUrl: unsub
  });
}
