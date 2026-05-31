import {
  hasDisplayableContentContext,
  resolveContentEnrichmentContext,
  type ContentEnrichmentHints
} from '@/lib/external-data';

import { ExternalReferenceContextCard } from '@/components/content-hub/ExternalReferenceContextCard';

type ResourceExternalContextCardProps = ContentEnrichmentHints;

export function ResourceExternalContextCard(props: ResourceExternalContextCardProps) {
  const context = resolveContentEnrichmentContext(props);
  if (!hasDisplayableContentContext(context, props)) return null;

  return (
    <ExternalReferenceContextCard
      heading="Affordability & cost context"
      intro="Public reference figures related to this guide topic. Shown only when state or school mapping is clear from the article title, slug, category, or summary."
      context={context}
      contentType="resource"
    />
  );
}
