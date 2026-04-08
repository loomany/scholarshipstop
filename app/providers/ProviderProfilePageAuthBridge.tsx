'use client';

import type { ProviderProfilePayload } from '@/lib/providers/providerProfileTypes';
import { ProviderProfileScholarshipsList } from '@/components/providers/ProviderProfileScholarshipsList';
import AuthStatusProvider from '@/components/auth/AuthStatusProvider';

type ProviderProfilePageAuthBridgeProps = {
  scholarships: ProviderProfilePayload['scholarships'];
};

export default function ProviderProfilePageAuthBridge({
  scholarships
}: ProviderProfilePageAuthBridgeProps) {
  return (
    <AuthStatusProvider>
      {({ isAuthenticated, hasSubscription }) => (
        <ProviderProfileScholarshipsList
          scholarships={scholarships}
          isAuthenticated={isAuthenticated}
          hasSubscription={hasSubscription}
        />
      )}
    </AuthStatusProvider>
  );
}
