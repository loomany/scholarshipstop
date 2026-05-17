import TrustPageTemplate from '@/components/trust/TrustPageTemplate';
import {
  TRUST_PAGE_CONTENT,
  trustPageMetadata
} from '@/lib/trust/trustPageContent';

export const metadata = trustPageMetadata('howItWorks');

export default function HowScholarshipTopWorksPage() {
  return <TrustPageTemplate page={TRUST_PAGE_CONTENT.howItWorks} />;
}
