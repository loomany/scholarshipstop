import {
  hasDisplayableContentContext,
  resolveContentEnrichmentContext
} from '@/lib/external-data';

import { ExternalReferenceContextCard } from '@/components/content-hub/ExternalReferenceContextCard';

type ResourceExternalContextCardProps = {
  slug: string;
  title?: string | null;
};

export function ResourceExternalContextCard({
  slug,
  title
}: ResourceExternalContextCardProps) {
  const context = resolveContentEnrichmentContext({ slug, title });
  if (!hasDisplayableContentContext(context)) return null;

  return (
    <ExternalReferenceContextCard
      heading="Affordability & cost context"
      intro="Public reference figures related to this guide topic. Shown only when state or school mapping is clear from the article title or slug."
      context={context}
    />
  );
}
