'use client';

import PremiumCompactModal from '@/components/scholarships/PremiumCompactModal';

type PremiumPaywallModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onUpgradeClick: () => void;
  variant?: 'compact';
};

export default function PremiumPaywallModal({
  isOpen,
  onClose,
  onUpgradeClick,
  variant = 'compact'
}: PremiumPaywallModalProps) {
  if (variant === 'compact') {
    return (
      <PremiumCompactModal
        isOpen={isOpen}
        onClose={onClose}
        onUpgradeClick={onUpgradeClick}
      />
    );
  }

  return (
    <PremiumCompactModal
      isOpen={isOpen}
      onClose={onClose}
      onUpgradeClick={onUpgradeClick}
    />
  );
}
