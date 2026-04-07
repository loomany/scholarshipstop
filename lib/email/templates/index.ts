export { escapeHtml } from '@/lib/email/templates/escapeHtml';
export { buildScholarshipTopPremiumEmailHtml } from '@/lib/email/templates/scholarshipTopEmailLayout';
export type { PremiumEmailLayoutOptions } from '@/lib/email/templates/scholarshipTopEmailLayout';
export {
  EMAIL_SUBJECT_CONFIRM_SIGNUP,
  EMAIL_SUBJECT_MAGIC_LINK,
  EMAIL_SUBJECT_RESET_PASSWORD,
  emailSubjectNewMatches,
  defaultEmailUnsubscribeUrl,
  buildConfirmSignupEmailHtml,
  buildMagicLinkEmailHtml,
  buildResetPasswordEmailHtml,
  buildNewMatchesEmailHtml
} from '@/lib/email/templates/premiumTemplates';
export type {
  ConfirmSignupEmailParams,
  MagicLinkEmailParams,
  ResetPasswordEmailParams,
  NewMatchesEmailParams
} from '@/lib/email/templates/premiumTemplates';
