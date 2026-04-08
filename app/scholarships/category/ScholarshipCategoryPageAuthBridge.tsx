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
      {({ isAuthenticated, hasSubscription }) => (
        <ScholarshipCategoryPageClient
          categorySlug={categorySlug}
          pageTitle={pageTitle}
          isAuthenticated={isAuthenticated}
          hasSubscription={hasSubscription}
          initialPayload={initialPayload}
        />
      )}
    </AuthStatusProvider>
  );
}
