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

/** Guests complete onboarding, then land on a variant-specific destination. */
const REGISTRATION_THEN_SCHOLARSHIPS_HREF = onboardingStepHref(1, '/scholarships');
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
    notice =
      "Stop worrying about AI detection. Our Mentor doesn't just write; it conducts an interview to capture your true story, then polishes the text so it easily passes academic AI checks.";
  } else if (contentMode === 'card-unlock') {
    notice =
      "You've used your free previews. Continue with trial access — we will open plan selection after sign-up.";
  } else {
    notice =
      'Unlock filters, saved scholarships, personalized matches, every essay guide, and the AI Essay Mentor right after sign-up.';
  }

  const primaryHref = signedInWithoutSubscription
    ? '/subscription'
    : variant === 'essay'
      ? REGISTRATION_THEN_SUBSCRIPTION_HREF
      : REGISTRATION_THEN_SCHOLARSHIPS_HREF;

  const marketingMode = variant === 'essay' ? 'subscription' : 'trial';
  const copyVariant =
    variant === 'essay' ? 'classic-trial' : 'modern-free-account';

  return (
    <ScholarshipSubscriptionOfferModal
      open={open}
      onClose={onClose}
      notice={notice}
      primaryHref={primaryHref}
      marketingMode={marketingMode}
      copyVariant={copyVariant}
    />
  );
}
