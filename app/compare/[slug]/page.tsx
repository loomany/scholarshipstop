import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { StaticCompareGuidePage } from '@/components/compare/StaticCompareGuidePage';
import { getStaticCompareGuide } from '@/lib/compare/staticCompareGuides';
import { getCanonical } from '@/lib/seo/canonical';

type PageProps = {
  params: { slug: string };
};

export function generateMetadata({ params }: PageProps): Metadata {
  const slug = decodeURIComponent(params.slug).trim().toLowerCase();
  const guide = getStaticCompareGuide(slug);
  if (!guide) {
    return {
      title: 'Compare scholarships',
      robots: { index: false, follow: false }
    };
  }

  const canonical = getCanonical(`/compare/${encodeURIComponent(guide.slug)}`);
  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical },
    openGraph: {
      title: guide.title,
      description: guide.description,
      url: canonical,
      type: 'article'
    }
  };
}

export default function StaticCompareGuideRoute({ params }: PageProps) {
  const slug = decodeURIComponent(params.slug).trim().toLowerCase();
  const guide = getStaticCompareGuide(slug);
  if (!guide) notFound();
  return <StaticCompareGuidePage guide={guide} />;
}
