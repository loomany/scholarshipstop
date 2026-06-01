import {
  getPremedTopicContext,
  hasDisplayableContentContext,
  resolveContentEnrichmentContext,
  type ContentEnrichmentHints
} from '@/lib/external-data';

import { ExternalReferenceContextCard } from '@/components/content-hub/ExternalReferenceContextCard';
import { PremedTopicContextCard } from '@/components/content-hub/PremedTopicContextCard';

type ResourceExternalContextCardProps = ContentEnrichmentHints;

function shouldShowHealthcareTopic(props: ResourceExternalContextCardProps): boolean {
  const haystack = [
    props.slug,
    props.title,
    props.category,
    props.subcategory,
    ...(props.tags ?? [])
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return /\b(pre[-\s]?med|medical|medicine|nursing|healthcare|health care)\b/.test(
    haystack
  );
}

export function ResourceExternalContextCard(props: ResourceExternalContextCardProps) {
  const context = resolveContentEnrichmentContext(props);
  const topicContext = shouldShowHealthcareTopic(props)
    ? getPremedTopicContext(props.slug) ??
      getPremedTopicContext(props.title) ??
      getPremedTopicContext(props.category)
    : null;
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
