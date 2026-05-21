import { Suspense } from 'react';
import { notFound } from 'next/navigation';

import { ScholarshipOnboardingWizard } from '@/components/onboarding/ScholarshipOnboardingWizard';
import { SiteBrandLoading } from '@/components/ui/SiteBrandLoading';
import { getOnboardingUiCopy } from '@/lib/i18n/onboardingUiCopy';
import {
  isStage2PilotLocale,
  type Stage2PilotLocale
} from '@/lib/i18n/pilotRoutes';

type Props = { params: { locale: string } };

export default function LocalizedOnboardingPage({ params }: Props) {
  if (!isStage2PilotLocale(params.locale)) notFound();
  const locale = params.locale as Stage2PilotLocale;
  const ob = getOnboardingUiCopy(locale);
  return (
    <Suspense
      fallback={
        <SiteBrandLoading
          label={ob.loadingProgress}
          className="min-h-[calc(100dvh-4rem)]"
        />
      }
    >
      <ScholarshipOnboardingWizard mode="standalone" uiLocale={locale} />
    </Suspense>
  );
}
