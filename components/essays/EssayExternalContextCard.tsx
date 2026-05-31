import {
  hasDisplayableContentContext,
  resolveContentEnrichmentContext
} from '@/lib/external-data';

import { ExternalReferenceContextCard } from '@/components/content-hub/ExternalReferenceContextCard';

type EssayExternalContextCardProps = {
  slug: string;
  title?: string | null;
};

export function EssayExternalContextCard({
  slug,
  title
}: EssayExternalContextCardProps) {
  const context = resolveContentEnrichmentContext({ slug, title });
  if (!hasDisplayableContentContext(context)) return null;

  return (
    <ExternalReferenceContextCard
      heading="Planning context for your essay"
      intro="Optional public cost and affordability context when this guide clearly maps to a U.S. state in the title or slug."
      context={context}
    />
  );
}
