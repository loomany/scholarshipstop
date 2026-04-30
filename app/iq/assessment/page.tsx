import type { Metadata } from 'next';

import { parseUserIntent } from '@/lib/iqIntent';

import ContextualAssessmentFunnelClient from './ContextualAssessmentFunnelClient';

export const metadata: Metadata = {
  title: 'Start IQ Test | 30-Question Online IQ Score',
  description:
    'Complete a timed 30-question IQ test to generate your IQ score, percentile, domain breakdown, and Brain Archetype report.',
  alternates: {
    canonical: 'https://iq.scholarshiptop.com/assessment'
  }
};

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
