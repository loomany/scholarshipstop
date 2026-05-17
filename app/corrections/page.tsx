import TrustPageTemplate from '@/components/trust/TrustPageTemplate';
import {
  TRUST_PAGE_CONTENT,
  trustPageMetadata
} from '@/lib/trust/trustPageContent';

export const metadata = trustPageMetadata('corrections');

export default function CorrectionsPage() {
  return <TrustPageTemplate page={TRUST_PAGE_CONTENT.corrections} />;
}
