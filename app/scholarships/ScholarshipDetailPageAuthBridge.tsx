'use client';

import type { Scholarship } from '@/app/scholarships/scholarshipsData';
import ScholarshipDetailPageClient from '@/app/scholarships/ScholarshipDetailPageClient';
import AuthStatusProvider from '@/components/auth/AuthStatusProvider';
import type { ContentPostListFields } from '@/lib/content-hub/contentPostListTypes';
import type { EssayListFields } from '@/lib/essays/essaysServer';

type ScholarshipDetailPageAuthBridgeProps = {
  initialScholarship: Scholarship | null;
  /** Articles that list this scholarship in `related_scholarships` (server-resolved). */
  initialRelatedArticles?: ContentPostListFields[];
  /** Published essay hub guides linked via `scholarship_essays` (max 4). */
  initialRelatedEssays?: EssayListFields[];
};

export default function ScholarshipDetailPageAuthBridge({
  initialScholarship,
  initialRelatedArticles = [],
  initialRelatedEssays = []
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
          initialRelatedEssays={initialRelatedEssays}
        />
      )}
    </AuthStatusProvider>
  );
}
