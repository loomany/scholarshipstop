import TrustPageTemplate from '@/components/trust/TrustPageTemplate';
import {
  TRUST_PAGE_CONTENT,
  trustPageMetadata
} from '@/lib/trust/trustPageContent';

export const metadata = trustPageMetadata('ranking');

export default function HowWeRankScholarshipsPage() {
  return <TrustPageTemplate page={TRUST_PAGE_CONTENT.ranking} />;
}
