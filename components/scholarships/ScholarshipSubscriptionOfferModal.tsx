'use client';

import GuestTrialMarketingModal from '@/components/scholarships/GuestTrialMarketingModal';
import type { GuestTrialMarketingModalProps } from '@/components/scholarships/GuestTrialMarketingModal';

type ScholarshipSubscriptionOfferModalProps = {
  open: boolean;
  onClose: () => void;
  notice?: string;
  primaryHref?: string;
  onSecondaryAction?: () => void;
  onPrimaryClick?: () => void;
  marketingMode?: GuestTrialMarketingModalProps['marketingMode'];
};

/**
 * Premium / trial upsell — same marketing layout as guest trial (`GuestTrialMarketingModal`).
 * Default CTA: `/subscription`. Pass `primaryHref` for onboarding → subscription.
 */
export default function ScholarshipSubscriptionOfferModal({
  open,
  onClose,
  notice,
  primaryHref = '/subscription',
  onSecondaryAction,
  onPrimaryClick,
  marketingMode = 'trial'
}: ScholarshipSubscriptionOfferModalProps) {
  return (
    <GuestTrialMarketingModal
      open={open}
      onClose={onClose}
      notice={notice}
      primaryHref={primaryHref}
      onSecondaryAction={onSecondaryAction}
      onPrimaryClick={onPrimaryClick}
      marketingMode={marketingMode}
    />
  );
}
