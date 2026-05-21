'use client';

import ScholarshipsHubPageClient from '@/app/scholarships/ScholarshipsHubPageClient';
import type { InitialScholarshipsPayload } from '@/app/scholarships/scholarshipListServerPayload';
import type { LongTailRouteScopePayload } from '@/app/scholarships/scholarshipListServerPayload';
import AuthStatusProvider from '@/components/auth/AuthStatusProvider';
import type { Stage2PilotLocale } from '@/lib/i18n/pilotRoutes';

type ScholarshipsHubPageAuthBridgeProps = {
  initialPayload: InitialScholarshipsPayload | null;
  routeScope?: LongTailRouteScopePayload | null;
  currentPathname?: string;
  leadContent?: React.ReactNode;
  postListingContent?: React.ReactNode;
  /** Canonical `/scholarships/hub/[segment]` SSR copy under listings h1. */
  hubCanonicalIntroBelowTitle?: React.ReactNode;
  fallbackPageTitle?: string;
  locale?: Stage2PilotLocale;
};

export default function ScholarshipsHubPageAuthBridge({
  initialPayload,
  routeScope = null,
  currentPathname = '/scholarships',
  leadContent = null,
  postListingContent = null,
  hubCanonicalIntroBelowTitle = null,
  fallbackPageTitle = 'Scholarship matches',
  locale
}: ScholarshipsHubPageAuthBridgeProps) {
  return (
    <AuthStatusProvider>
      {({ isAuthenticated, hasSubscription, authResolved, needsEmailConfirmation }) => (
        <ScholarshipsHubPageClient
          isAuthenticated={isAuthenticated}
          authResolved={authResolved}
          hasSubscription={hasSubscription}
          needsEmailConfirmation={needsEmailConfirmation}
          initialPayload={initialPayload}
          routeScope={routeScope}
          currentPathname={currentPathname}
          leadContent={leadContent}
          postListingContent={postListingContent}
          hubCanonicalIntroBelowTitle={hubCanonicalIntroBelowTitle}
          fallbackPageTitle={fallbackPageTitle}
          locale={locale}
        />
      )}
    </AuthStatusProvider>
  );
}
