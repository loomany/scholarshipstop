import TrustPageTemplate from '@/components/trust/TrustPageTemplate';
import {
  TRUST_PAGE_CONTENT,
  trustPageMetadata
} from '@/lib/trust/trustPageContent';

export const metadata = trustPageMetadata('howWeMakeMoney');

export default function HowWeMakeMoneyPage() {
  return <TrustPageTemplate page={TRUST_PAGE_CONTENT.howWeMakeMoney} />;
}
