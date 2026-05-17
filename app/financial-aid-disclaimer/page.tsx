import TrustPageTemplate from '@/components/trust/TrustPageTemplate';
import {
  TRUST_PAGE_CONTENT,
  trustPageMetadata
} from '@/lib/trust/trustPageContent';

export const metadata = trustPageMetadata('disclaimer');

export default function FinancialAidDisclaimerPage() {
  return <TrustPageTemplate page={TRUST_PAGE_CONTENT.disclaimer} />;
}
