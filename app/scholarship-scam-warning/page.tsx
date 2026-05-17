import TrustPageTemplate from '@/components/trust/TrustPageTemplate';
import {
  TRUST_PAGE_CONTENT,
  trustPageMetadata
} from '@/lib/trust/trustPageContent';

export const metadata = trustPageMetadata('scamWarning');

export default function ScholarshipScamWarningPage() {
  return <TrustPageTemplate page={TRUST_PAGE_CONTENT.scamWarning} />;
}
