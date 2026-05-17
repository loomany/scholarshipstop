import TrustPageTemplate from '@/components/trust/TrustPageTemplate';
import {
  TRUST_PAGE_CONTENT,
  trustPageMetadata
} from '@/lib/trust/trustPageContent';

export const metadata = trustPageMetadata('verificationMethodology');

export default function ScholarshipVerificationMethodologyPage() {
  return <TrustPageTemplate page={TRUST_PAGE_CONTENT.verificationMethodology} />;
}
