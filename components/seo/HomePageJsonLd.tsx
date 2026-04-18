import { buildHomePageJsonLd } from '@/lib/seo/homePageJsonLd';

export function HomePageJsonLd() {
  const schema = buildHomePageJsonLd();
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
