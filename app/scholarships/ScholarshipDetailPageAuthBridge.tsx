'use client';

import type { Scholarship } from '@/app/scholarships/scholarshipsData';
import ScholarshipDetailPageClient from '@/app/scholarships/ScholarshipDetailPageClient';
import AuthStatusProvider from '@/components/auth/AuthStatusProvider';
import type { ContentPostListFields } from '@/lib/content-hub/contentPostListTypes';

type ScholarshipDetailPageAuthBridgeProps = {
  initialScholarship: Scholarship | null;
  /** Articles that list this scholarship in `related_scholarships` (server-resolved). */
  initialRelatedArticles?: ContentPostListFields[];
};

export default function ScholarshipDetailPageAuthBridge({
  initialScholarship,
  initialRelatedArticles = []
}: ScholarshipDetailPageAuthBridgeProps) {
  return (
    <AuthStatusProvider>
      {({ isAuthenticated, hasSubscription, authResolved }) => (
        <ScholarshipDetailPageClient
          isAuthenticated={isAuthenticated}
          hasSubscription={hasSubscription}
          authResolved={authResolved}
          initialScholarship={initialScholarship}
          initialRelatedArticles={initialRelatedArticles}
        />
      )}
    </AuthStatusProvider>
  );
}
