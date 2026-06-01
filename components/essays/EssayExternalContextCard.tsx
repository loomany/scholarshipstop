import {
  hasDisplayableContentContext,
  resolveContentEnrichmentContext,
  resolveHealthcareEssayTopicContext,
  type ContentEnrichmentHints
} from '@/lib/external-data';

import { ExternalReferenceContextCard } from '@/components/content-hub/ExternalReferenceContextCard';
import { PremedTopicContextCard } from '@/components/content-hub/PremedTopicContextCard';

type EssayExternalContextCardProps = ContentEnrichmentHints;

export function EssayExternalContextCard(props: EssayExternalContextCardProps) {
  const context = resolveContentEnrichmentContext(props);
  const topicContext = resolveHealthcareEssayTopicContext(props);
  const hasExternalContext = hasDisplayableContentContext(context, props);
  if (!hasExternalContext && !topicContext) return null;

  const intro =
    context.schoolRow ?
      'Public cost and outcomes context when this guide maps to a specific college. Use verified facts from your application — these estimates help you compare award value with tuition and living costs.'
    : context.stateCode ?
      'Public affordability context when this guide maps to a U.S. state. Cost figures can support financial-need framing, relocation planning, or state-specific examples — always use your own verified numbers in the essay.'
    : 'Optional public cost context when this guide clearly maps to a U.S. state or college in the English title, slug, or summary.';

  return (
    <>
      {hasExternalContext ? (
        <ExternalReferenceContextCard
          heading="Planning context for your essay"
          intro={intro}
          context={context}
          contentType="essay"
        />
      ) : null}
      <PremedTopicContextCard
        context={topicContext}
        className={hasExternalContext ? 'mt-6' : 'mt-8'}
        compact
      />
    </>
  );
}
