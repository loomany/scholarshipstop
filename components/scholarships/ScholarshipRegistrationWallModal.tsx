'use client';

import { onboardingStepHref } from '@/lib/onboarding/onboardingResume';
import ScholarshipSubscriptionOfferModal from '@/components/scholarships/ScholarshipSubscriptionOfferModal';

export type ScholarshipRegistrationWallContentMode = 'hub' | 'card-unlock';

type ScholarshipRegistrationWallModalProps = {
  open: boolean;
  onClose: () => void;
  /** Essay mentor: distinct notice; same subscription UI and signup → /subscription. */
  variant?: 'scholarships' | 'essay';
  /** Catalog card click vs. filters/save — controls notice text only. */
  contentMode?: ScholarshipRegistrationWallContentMode;
  /**
   * Signed-in without subscription: same modal copy as guest, but primary CTA
   * goes straight to `/subscription` instead of onboarding → subscription.
   */
  signedInWithoutSubscription?: boolean;
  /** Replaces auto-generated notice (e.g. trial quota exhausted on essay page). */
  noticeOverride?: string;
};

/** Guests complete onboarding, then land on `/subscription` to start the trial. */
const REGISTRATION_THEN_SUBSCRIPTION_HREF = onboardingStepHref(1, '/subscription');

export default function ScholarshipRegistrationWallModal({
  open,
  onClose,
  variant = 'scholarships',
  contentMode = 'hub',
  signedInWithoutSubscription = false,
  noticeOverride
}: ScholarshipRegistrationWallModalProps) {
  let notice: string | undefined;
  if (noticeOverride?.trim()) {
    notice = noticeOverride.trim();
  } else if (variant === 'essay') {
    notice = signedInWithoutSubscription
      ? "Subscribe for full AI Essay Mentor, authenticity checks, and draft tools. We'll open the subscription page next so you can choose a plan."
      : "Create a free account to save your essay draft, unlock every essay guide, and use the full AI Essay Mentor. After sign-up we'll open the subscription page to choose a plan.";
  } else if (contentMode === 'card-unlock') {
    notice =
      "You've used your free previews. Continue with a free trial — we'll open the subscription page after sign-up.";
  } else {
    notice =
      "Create a free account for filters, saved scholarships, personalized matches, every essay guide, and the AI Essay Mentor. After sign-up we'll open the subscription page so you can start your 3-day trial.";
  }

  const primaryHref = signedInWithoutSubscription
    ? '/subscription'
    : REGISTRATION_THEN_SUBSCRIPTION_HREF;

  const marketingMode = variant === 'essay' ? 'subscription' : 'trial';

  return (
    <ScholarshipSubscriptionOfferModal
      open={open}
      onClose={onClose}
      notice={notice}
      primaryHref={primaryHref}
      marketingMode={marketingMode}
    />
  );
}
