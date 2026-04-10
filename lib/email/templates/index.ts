export { escapeHtml } from '@/lib/email/templates/escapeHtml';
export { buildScholarshipTopPremiumEmailHtml } from '@/lib/email/templates/scholarshipTopEmailLayout';
export type { PremiumEmailLayoutOptions } from '@/lib/email/templates/scholarshipTopEmailLayout';
export { buildScholarshipTopDarkEmailHtml } from '@/lib/email/templates/scholarshipTopEmailLayoutDark';
export type { DarkEmailLayoutOptions } from '@/lib/email/templates/scholarshipTopEmailLayoutDark';
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
export {
  EMAIL_SUBJECT_SUBSCRIPTION_ACTIVE,
  EMAIL_SUBJECT_SUBSCRIPTION_CANCELLED,
  EMAIL_SUBJECT_SUBSCRIPTION_PAYMENT_FAILED,
  buildSubscriptionActiveEmailHtml,
  buildSubscriptionCancelledEmailHtml,
  buildSubscriptionPaymentFailedEmailHtml
} from '@/lib/email/templates/subscriptionEmailTemplates';
export type {
  SubscriptionActiveEmailParams,
  SubscriptionCancelledEmailParams,
  SubscriptionPaymentFailedEmailParams
} from '@/lib/email/templates/subscriptionEmailTemplates';
