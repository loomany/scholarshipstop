import FoundersNote from '@/components/about/FoundersNote';
import { JsonLdScript } from '@/components/seo/JsonLdScript';
import TrustPageTemplate from '@/components/trust/TrustPageTemplate';
import { getCanonical } from '@/lib/seo/canonical';
import { buildWebPageJsonLd } from '@/lib/seo/jsonLd';
import {
  TRUST_PAGE_CONTENT,
  trustPageMetadata
} from '@/lib/trust/trustPageContent';

export const metadata = trustPageMetadata('about');

export default function AboutPage() {
  const aboutPage = TRUST_PAGE_CONTENT.about;
  const aboutUrl = getCanonical('/about');
  const founderUrl = `${aboutUrl}#founder`;
  const aboutJsonLd = [
    buildWebPageJsonLd({
      name: aboutPage.title,
      url: '/about',
      description: aboutPage.description
    }),
    {
      '@context': 'https://schema.org',
      '@type': 'Person',
      '@id': founderUrl,
      name: 'Daur',
      url: founderUrl,
      image: getCanonical('/images/founder-daur.png'),
      jobTitle: 'Founder and software engineer',
      worksFor: {
        '@type': 'Organization',
        name: 'ScholarshipTop',
        url: getCanonical('/')
      },
      knowsAbout: [
        'Scholarship discovery',
        'Scholarship data quality',
        'Student grant application planning',
        'Software engineering'
      ],
      description:
        'Daur is the founder of ScholarshipTop, a programmer, and a scholarship student who studied with grant support.'
    }
  ];

  return (
    <>
      <JsonLdScript data={aboutJsonLd} />
      <TrustPageTemplate page={aboutPage} featureSlot={<FoundersNote />} />
    </>
  );
}
