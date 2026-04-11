'use client';

import ScholarshipsHubPageClient from '@/app/scholarships/ScholarshipsHubPageClient';
import type { InitialScholarshipsPayload } from '@/app/scholarships/scholarshipListServerPayload';
import type { LongTailRouteScopePayload } from '@/app/scholarships/scholarshipListServerPayload';
import AuthStatusProvider from '@/components/auth/AuthStatusProvider';

type ScholarshipsHubPageAuthBridgeProps = {
  initialPayload: InitialScholarshipsPayload | null;
  routeScope?: LongTailRouteScopePayload | null;
  leadContent?: React.ReactNode;
  postListingContent?: React.ReactNode;
};

export default function ScholarshipsHubPageAuthBridge({
  initialPayload,
  routeScope = null,
  leadContent = null,
  postListingContent = null
}: ScholarshipsHubPageAuthBridgeProps) {
  return (
    <AuthStatusProvider>
      {({ isAuthenticated, hasSubscription, authResolved }) => (
        <ScholarshipsHubPageClient
          isAuthenticated={isAuthenticated}
          authResolved={authResolved}
          hasSubscription={hasSubscription}
          initialPayload={initialPayload}
          routeScope={routeScope}
          leadContent={leadContent}
          postListingContent={postListingContent}
        />
      )}
    </AuthStatusProvider>
  );
}
