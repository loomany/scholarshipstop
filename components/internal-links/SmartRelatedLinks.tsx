import type { ContextLinkItem } from '@/lib/external-data';
import { finalizeInternalLinks } from '@/lib/external-data/internalLinkGraph';

import { RelatedContextLinks } from '@/components/data-viz/RelatedContextLinks';

type SmartRelatedLinksProps = {
  title: string;
  links: ContextLinkItem[];
  excludeHref?: string | null;
  className?: string;
};

export function SmartRelatedLinks({
  title,
  links,
  excludeHref = null,
  className = ''
}: SmartRelatedLinksProps) {
  const visible = finalizeInternalLinks(links, excludeHref);
  if (!visible.length) return null;

  return (
    <RelatedContextLinks title={title} links={visible} className={className} />
  );
}
