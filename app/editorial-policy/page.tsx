import TrustPageTemplate from '@/components/trust/TrustPageTemplate';
import {
  TRUST_PAGE_CONTENT,
  trustPageMetadata
} from '@/lib/trust/trustPageContent';

export const metadata = trustPageMetadata('editorialPolicy');

export default function EditorialPolicyPage() {
  return <TrustPageTemplate page={TRUST_PAGE_CONTENT.editorialPolicy} />;
}
