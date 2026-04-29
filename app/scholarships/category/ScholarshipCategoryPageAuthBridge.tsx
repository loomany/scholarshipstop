'use client';

import ScholarshipCategoryPageClient from './ScholarshipCategoryPageClient';
import type { InitialScholarshipsPayload } from '@/app/scholarships/scholarshipListServerPayload';
import AuthStatusProvider from '@/components/auth/AuthStatusProvider';

type ScholarshipCategoryPageAuthBridgeProps = {
  categorySlug: string;
  pageTitle: string;
  introParagraph: string;
  listingExploreHeading: string;
  listingExploreIntro: string;
  initialPayload: InitialScholarshipsPayload | null;
};

export default function ScholarshipCategoryPageAuthBridge({
  categorySlug,
  pageTitle,
  introParagraph,
  listingExploreHeading,
  listingExploreIntro,
  initialPayload
}: ScholarshipCategoryPageAuthBridgeProps) {
  return (
    <AuthStatusProvider>
      {({ isAuthenticated, hasSubscription, authResolved }) => (
        <ScholarshipCategoryPageClient
          categorySlug={categorySlug}
          pageTitle={pageTitle}
          introParagraph={introParagraph}
          listingExploreHeading={listingExploreHeading}
          listingExploreIntro={listingExploreIntro}
          isAuthenticated={isAuthenticated}
          authResolved={authResolved}
          hasSubscription={hasSubscription}
          initialPayload={initialPayload}
        />
      )}
    </AuthStatusProvider>
  );
}
