'use client';

import { onboardingStepHref } from '@/lib/onboarding/onboardingResume';
import ScholarshipLockedCategoryModal from '@/components/scholarships/ScholarshipLockedCategoryModal';
import ScholarshipSubscriptionOfferModal from '@/components/scholarships/ScholarshipSubscriptionOfferModal';

export type ScholarshipRegistrationWallContentMode =
  | 'hub'
  | 'card-unlock'
  /** Guest clicked a grant — emphasize free account, CTA to onboarding (not payment-first). */
  | 'grant-guest';

type ScholarshipRegistrationWallModalProps = {
  open: boolean;
  onClose: () => void;
  /** Essay mentor: distinct notice; same subscription UI and signup → /subscription. */
  variant?: 'scholarships' | 'essay' | 'locked-category';
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
  if (variant === 'locked-category') {
    return <ScholarshipLockedCategoryModal open={open} onClose={onClose} />;
  }

  let notice: string | undefined;
  if (noticeOverride?.trim()) {
    notice = noticeOverride.trim();
  } else if (variant === 'essay') {
    notice =
      'AI Essay Mentor is available only on Quarterly and Yearly plans. Monthly unlocks the premium scholarship database only.';
  } else if (contentMode === 'grant-guest') {
    notice =
      "It's free to join. Save grants, see deadlines and eligibility at a glance, and pick up where you left off—no credit card required to get started.";
  } else if (contentMode === 'card-unlock') {
    notice =
      "You've viewed your free scholarship previews. Upgrade to keep browsing every detail—or start a trial from your account.";
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
      signedInWithoutSubscription={signedInWithoutSubscription}
      grantScholarshipPitch={contentMode === 'grant-guest'}
    />
  );
}
