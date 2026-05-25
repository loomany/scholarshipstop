'use client';

import type { ProviderFaqItem } from '@/lib/providers/providerProfileTypes';
import { SiteFaqAccordion } from '@/components/ui/SiteFaqAccordion';

type Props = { items: ProviderFaqItem[]; heading?: string };

export function ProviderProfileFaqAccordion({
  items,
  heading = 'FAQ'
}: Props) {
  return (
    <SiteFaqAccordion
      items={items}
      className="mt-12 scroll-mt-24"
      heading={heading}
      headingClassName="text-xl font-bold tracking-tight text-gray-900"
      headingId="provider-faq-heading"
      idPrefix="provider-faq"
    />
  );
}
