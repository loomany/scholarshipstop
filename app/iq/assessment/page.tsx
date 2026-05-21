import type { Metadata } from 'next';

import { getIqLocaleFromRequest } from '@/lib/iq/i18n/getIqLocaleFromRequest';
import { getIqAssessmentMetadata } from '@/lib/iq/i18n/iqMetadataCopy';
import { parseUserIntent } from '@/lib/iqIntent';

import ContextualAssessmentFunnelClient from './ContextualAssessmentFunnelClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const locale = getIqLocaleFromRequest();
  const meta = getIqAssessmentMetadata(locale);

  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: 'https://iq.scholarshiptop.com/assessment'
    }
  };
}

type CognitiveAssessmentPageProps = {
  searchParams?: {
    intent?: string;
  };
};

export default function CognitiveAssessmentPage({
  searchParams
}: CognitiveAssessmentPageProps) {
  return (
    <ContextualAssessmentFunnelClient
      initialIntent={parseUserIntent(searchParams?.intent)}
    />
  );
}
