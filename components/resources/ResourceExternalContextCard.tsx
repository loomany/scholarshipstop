import {
  hasDisplayableContentContext,
  resolveContentEnrichmentContext,
  resolveHealthcareResourceTopicContext,
  type ContentEnrichmentHints
} from '@/lib/external-data';

import { ExternalReferenceContextCard } from '@/components/content-hub/ExternalReferenceContextCard';
import { PremedTopicContextCard } from '@/components/content-hub/PremedTopicContextCard';

type ResourceExternalContextCardProps = ContentEnrichmentHints;

export function ResourceExternalContextCard(props: ResourceExternalContextCardProps) {
  const context = resolveContentEnrichmentContext(props);
  const topicContext = resolveHealthcareResourceTopicContext(props);
  const hasExternalContext = hasDisplayableContentContext(context, props);
  if (!hasExternalContext && !topicContext) return null;

  return (
    <>
      {hasExternalContext ? (
        <ExternalReferenceContextCard
          heading="Affordability & cost context"
          intro="Public reference figures related to this guide topic. Shown only when state or school mapping is clear from the article title, slug, category, or summary."
          context={context}
          contentType="resource"
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
