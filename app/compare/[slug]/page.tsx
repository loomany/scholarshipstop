import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { StaticCompareGuidePage } from '@/components/compare/StaticCompareGuidePage';
import { getStaticCompareGuide } from '@/lib/compare/staticCompareGuides';
import { getCanonical } from '@/lib/seo/canonical';
import { DEFAULT_OPEN_GRAPH_IMAGES } from '@/lib/seo/socialImage';
import { buildStage2EnglishPilotAlternates } from '@/lib/i18n/englishAlternates';

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

  const path = `/compare/${encodeURIComponent(guide.slug)}`;
  const canonical = getCanonical(path);
  return {
    title: guide.title,
    description: guide.description,
    alternates: buildStage2EnglishPilotAlternates(path),
    openGraph: {
      title: guide.title,
      description: guide.description,
      url: canonical,
      type: 'article',
      images: DEFAULT_OPEN_GRAPH_IMAGES
    }
  };
}

export default function StaticCompareGuideRoute({ params }: PageProps) {
  const slug = decodeURIComponent(params.slug).trim().toLowerCase();
  const guide = getStaticCompareGuide(slug);
  if (!guide) notFound();
  return <StaticCompareGuidePage guide={guide} />;
}
