import TrustPageTemplate from '@/components/trust/TrustPageTemplate';
import {
  TRUST_PAGE_CONTENT,
  trustPageMetadata
} from '@/lib/trust/trustPageContent';

export const metadata = trustPageMetadata('about');

export default function AboutPage() {
  return <TrustPageTemplate page={TRUST_PAGE_CONTENT.about} />;
}
