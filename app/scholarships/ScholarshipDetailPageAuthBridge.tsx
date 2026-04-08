'use client';

import type { Scholarship } from '@/app/scholarships/scholarshipsData';
import ScholarshipDetailPageClient from '@/app/scholarships/ScholarshipDetailPageClient';
import AuthStatusProvider from '@/components/auth/AuthStatusProvider';

type ScholarshipDetailPageAuthBridgeProps = {
  initialScholarship: Scholarship | null;
};

export default function ScholarshipDetailPageAuthBridge({
  initialScholarship
}: ScholarshipDetailPageAuthBridgeProps) {
  return (
    <AuthStatusProvider>
      {({ isAuthenticated, hasSubscription, authResolved }) => (
        <ScholarshipDetailPageClient
          isAuthenticated={isAuthenticated}
          hasSubscription={hasSubscription}
          authResolved={authResolved}
          initialScholarship={initialScholarship}
        />
      )}
    </AuthStatusProvider>
  );
}
