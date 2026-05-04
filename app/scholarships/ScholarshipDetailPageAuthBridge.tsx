'use client';

import type { Scholarship } from '@/app/scholarships/scholarshipsData';
import ScholarshipDetailPageClient from '@/app/scholarships/ScholarshipDetailPageClient';
import AuthStatusProvider, {
  type AuthBootstrapSnapshot
} from '@/components/auth/AuthStatusProvider';
import type { ContentPostListFields } from '@/lib/content-hub/contentPostListTypes';
import type { EssayListFields } from '@/lib/essays/essaysServer';
import type { ComparePeerRow } from '@/lib/seo/comparePeersServer';

type ScholarshipDetailPageAuthBridgeProps = {
  initialScholarship: Scholarship | null;
  routeParam?: string;
  returnToHref?: string;
  /** Articles that list this scholarship in `related_scholarships` (server-resolved). */
  initialRelatedArticles?: ContentPostListFields[];
  /** Published essay hub guides linked via `scholarship_essays` (max 4). */
  initialRelatedEssays?: EssayListFields[];
  /** Programmatic SEO hub links (state / state + topic). */
  initialRelatedHubLinks?: { href: string; label: string }[];
  /** Top peer universities for versus-page internal links. */
  initialComparePeers?: ComparePeerRow[];
  /** RSC session snapshot — avoids paywall UI flash before client `getSession()`. */
  initialAuthFromServer: AuthBootstrapSnapshot;
};

export default function ScholarshipDetailPageAuthBridge({
  initialScholarship,
  routeParam,
  returnToHref,
  initialRelatedArticles = [],
  initialRelatedEssays = [],
  initialRelatedHubLinks = [],
  initialComparePeers = [],
  initialAuthFromServer
}: ScholarshipDetailPageAuthBridgeProps) {
  return (
    <AuthStatusProvider initialAuthFromServer={initialAuthFromServer}>
      {({ isAuthenticated, hasSubscription, authResolved, needsEmailConfirmation }) => (
        <ScholarshipDetailPageClient
          isAuthenticated={isAuthenticated}
          hasSubscription={hasSubscription}
          authResolved={authResolved}
          needsEmailConfirmation={needsEmailConfirmation}
          initialScholarship={initialScholarship}
          routeParam={routeParam}
          returnToHref={returnToHref}
          initialRelatedArticles={initialRelatedArticles}
          initialRelatedEssays={initialRelatedEssays}
          initialRelatedHubLinks={initialRelatedHubLinks}
          initialComparePeers={initialComparePeers}
        />
      )}
    </AuthStatusProvider>
  );
}
