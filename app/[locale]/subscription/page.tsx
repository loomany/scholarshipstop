import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import SubscriptionPageView from '@/components/subscription/SubscriptionPageView';
import { buildSubscriptionPageMetadata } from '@/lib/i18n/subscriptionMetadata';
import { isStage2PilotLocale } from '@/lib/i18n/pilotRoutes';
import { loadSubscriptionPageViewProps } from '@/lib/server/subscriptionPageProps';

type Props = {
  params: { locale: string };
};

export const dynamic = 'force-dynamic';

export function generateMetadata({ params }: Props): Metadata {
  if (!isStage2PilotLocale(params.locale)) {
    return {
      title: 'Page not found',
      robots: { index: false, follow: false }
    };
  }
  return buildSubscriptionPageMetadata(params.locale);
}

export default async function LocalizedSubscriptionPage({ params }: Props) {
  if (!isStage2PilotLocale(params.locale)) notFound();
  const props = await loadSubscriptionPageViewProps(params.locale);
  return <SubscriptionPageView {...props} />;
}
