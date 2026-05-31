import type { ResolvedContentEnrichmentContext } from '@/lib/external-data';
import {
  buildRelatedScholarshipContextLinks,
  type ScholarshipContextLinkCluster
} from '@/lib/external-data/contentEnrichmentLinks';

import { RelatedContextLinks } from '@/components/data-viz/RelatedContextLinks';

type RelatedScholarshipContextLinksProps = {
  cluster: ScholarshipContextLinkCluster;
  context: ResolvedContentEnrichmentContext;
  stateSlug?: string | null;
  title?: string;
  className?: string;
};

export function RelatedScholarshipContextLinks({
  cluster,
  context,
  stateSlug = null,
  title = 'Related scholarship planning',
  className = ''
}: RelatedScholarshipContextLinksProps) {
  const links = buildRelatedScholarshipContextLinks({
    cluster,
    context,
    stateSlug
  });

  return (
    <RelatedContextLinks title={title} links={links} className={className} />
  );
}
