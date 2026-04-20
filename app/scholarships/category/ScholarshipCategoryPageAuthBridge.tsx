'use client';

import ScholarshipCategoryPageClient from './ScholarshipCategoryPageClient';
import type { InitialScholarshipsPayload } from '@/app/scholarships/scholarshipListServerPayload';
import AuthStatusProvider from '@/components/auth/AuthStatusProvider';

type ScholarshipCategoryPageAuthBridgeProps = {
  categorySlug: string;
  pageTitle: string;
  initialPayload: InitialScholarshipsPayload | null;
};

export default function ScholarshipCategoryPageAuthBridge({
  categorySlug,
  pageTitle,
  initialPayload
}: ScholarshipCategoryPageAuthBridgeProps) {
  return (
    <AuthStatusProvider>
      {({ isAuthenticated, hasSubscription, authResolved }) => (
        <ScholarshipCategoryPageClient
          categorySlug={categorySlug}
          pageTitle={pageTitle}
          isAuthenticated={isAuthenticated}
          authResolved={authResolved}
          hasSubscription={hasSubscription}
          initialPayload={initialPayload}
        />
      )}
    </AuthStatusProvider>
  );
}
