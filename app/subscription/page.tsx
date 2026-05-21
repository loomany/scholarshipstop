import type { Metadata } from 'next';

import SubscriptionPageView from '@/components/subscription/SubscriptionPageView';
import { buildSubscriptionPageMetadata } from '@/lib/i18n/subscriptionMetadata';
import { loadSubscriptionPageViewProps } from '@/lib/server/subscriptionPageProps';

export const metadata: Metadata = buildSubscriptionPageMetadata('en');

export const dynamic = 'force-dynamic';

export default async function SubscriptionPage() {
  const props = await loadSubscriptionPageViewProps('en');
  return <SubscriptionPageView {...props} />;
}
