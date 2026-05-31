import type { ResolvedContentEnrichmentContext } from '@/lib/external-data';
import {
  buildRelatedScholarshipContextLinks,
  type ScholarshipContextLinkCluster
} from '@/lib/external-data/contentEnrichmentLinks';

import { SmartRelatedLinks } from '@/components/internal-links/SmartRelatedLinks';

type RelatedScholarshipContextLinksProps = {
  cluster: ScholarshipContextLinkCluster;
  context: ResolvedContentEnrichmentContext;
  stateSlug?: string | null;
  title?: string;
  className?: string;
  excludeHref?: string | null;
};

export function RelatedScholarshipContextLinks({
  cluster,
  context,
  stateSlug = null,
  title = 'Related scholarship planning pages',
  className = '',
  excludeHref = null
}: RelatedScholarshipContextLinksProps) {
  const links = buildRelatedScholarshipContextLinks({
    cluster,
    context,
    stateSlug
  });

  return (
    <SmartRelatedLinks
      title={title}
      links={links}
      excludeHref={excludeHref}
      className={className}
    />
  );
}
