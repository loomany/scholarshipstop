import {
  hasDisplayableContentContext,
  resolveContentEnrichmentContext,
  type ContentEnrichmentHints
} from '@/lib/external-data';

import { ExternalReferenceContextCard } from '@/components/content-hub/ExternalReferenceContextCard';

type EssayExternalContextCardProps = ContentEnrichmentHints;

export function EssayExternalContextCard(props: EssayExternalContextCardProps) {
  const context = resolveContentEnrichmentContext(props);
  if (!hasDisplayableContentContext(context)) return null;

  return (
    <ExternalReferenceContextCard
      heading="Planning context for your essay"
      intro="Optional public cost and affordability context when this guide clearly maps to a U.S. state or college in the English title, slug, or summary."
      context={context}
    />
  );
}
