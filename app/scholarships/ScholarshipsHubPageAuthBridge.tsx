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
  /** Canonical `/scholarships/hub/[segment]` SSR copy under listings h1. */
  hubCanonicalIntroBelowTitle?: React.ReactNode;
  fallbackPageTitle?: string;
};

export default function ScholarshipsHubPageAuthBridge({
  initialPayload,
  routeScope = null,
  leadContent = null,
  postListingContent = null,
  hubCanonicalIntroBelowTitle = null,
  fallbackPageTitle = 'Scholarship matches'
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
          hubCanonicalIntroBelowTitle={hubCanonicalIntroBelowTitle}
          fallbackPageTitle={fallbackPageTitle}
        />
      )}
    </AuthStatusProvider>
  );
}
