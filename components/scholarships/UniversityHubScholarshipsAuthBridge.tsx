'use client';

import type { Scholarship } from '@/app/scholarships/scholarshipsData';
import AuthStatusProvider from '@/components/auth/AuthStatusProvider';
import { ProviderProfileScholarshipsList } from '@/components/providers/ProviderProfileScholarshipsList';

type Props = {
  scholarships: Scholarship[];
};

/**
 * Renders the same {@link ScholarshipCard} stack as the provider profile (Save, Not relevant, chips row).
 */
export default function UniversityHubScholarshipsAuthBridge({
  scholarships
}: Props) {
  return (
    <AuthStatusProvider>
      {({
        isAuthenticated,
        hasSubscription,
        authResolved,
        needsEmailConfirmation
      }) => (
        <ProviderProfileScholarshipsList
          scholarships={scholarships}
          isAuthenticated={isAuthenticated}
          hasSubscription={hasSubscription}
          authResolved={authResolved}
          needsEmailConfirmation={needsEmailConfirmation}
        />
      )}
    </AuthStatusProvider>
  );
}
