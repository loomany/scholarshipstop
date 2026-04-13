'use client';

import type { ProviderFaqItem } from '@/lib/providers/providerProfileTypes';
import { SiteFaqAccordion } from '@/components/ui/SiteFaqAccordion';

type Props = { items: ProviderFaqItem[] };

export function ProviderProfileFaqAccordion({ items }: Props) {
  return (
    <SiteFaqAccordion
      items={items}
      className="mt-12"
      heading="FAQ"
      headingClassName="text-xl font-bold tracking-tight text-gray-900"
      headingId="provider-faq-heading"
      idPrefix="provider-faq"
    />
  );
}
