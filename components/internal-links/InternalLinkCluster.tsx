import {
  buildInternalLinkCluster,
  internalLinkTitle,
  type InternalLinkGraphInput
} from '@/lib/external-data/internalLinkGraph';

import { SmartRelatedLinks } from '@/components/internal-links/SmartRelatedLinks';

type InternalLinkClusterProps = InternalLinkGraphInput & {
  excludeHref?: string | null;
  title?: string;
  className?: string;
};

export function InternalLinkCluster({
  excludeHref = null,
  title,
  className = '',
  ...input
}: InternalLinkClusterProps) {
  const links = buildInternalLinkCluster(input);
  const heading = title ?? internalLinkTitle(input.pageType);

  return (
    <SmartRelatedLinks
      title={heading}
      links={links}
      excludeHref={excludeHref}
      className={className}
    />
  );
}
