'use client';

import { Suspense } from 'react';
import { ScholarshipOnboardingWizard } from '@/components/onboarding/ScholarshipOnboardingWizard';
import { SiteBrandLoading } from '@/components/ui/SiteBrandLoading';

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <SiteBrandLoading label="" className="min-h-[calc(100dvh-4rem)]" />
      }
    >
      <ScholarshipOnboardingWizard mode="standalone" />
    </Suspense>
  );
}
