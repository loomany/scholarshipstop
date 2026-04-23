'use client';

import { useCallback } from 'react';

import PremiumPaywallModal from '@/components/scholarships/PremiumPaywallModal';

type ScholarshipLockedCategoryModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function ScholarshipLockedCategoryModal({
  open,
  onClose
}: ScholarshipLockedCategoryModalProps) {
  const handleUpgradeClick = useCallback(() => {
    window.location.assign('https://scholarshiptop.com/subscription');
  }, []);

  return (
    <PremiumPaywallModal
      isOpen={open}
      onClose={onClose}
      onUpgradeClick={handleUpgradeClick}
    />
  );
}
