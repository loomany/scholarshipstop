import TrustPageTemplate from '@/components/trust/TrustPageTemplate';
import {
  TRUST_PAGE_CONTENT,
  trustPageMetadata
} from '@/lib/trust/trustPageContent';

export const metadata = trustPageMetadata('contact');

export default function ContactPage() {
  return <TrustPageTemplate page={TRUST_PAGE_CONTENT.contact} />;
}
