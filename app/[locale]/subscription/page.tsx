import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import SubscriptionPageView from '@/components/subscription/SubscriptionPageView';
import { buildSubscriptionPageMetadata } from '@/lib/i18n/subscriptionMetadata';
import {
  METADATA_NOT_FOUND,
  resolveStage2PilotLocaleFromParams
} from '@/lib/i18n/metadataRouteParams';
import { isStage2PilotLocale } from '@/lib/i18n/pilotRoutes';
import { loadSubscriptionPageViewProps } from '@/lib/server/subscriptionPageProps';

type Props = {
  params: { locale: string };
};

export const dynamic = 'force-dynamic';

export function generateMetadata({
  params
}: {
  params?: { locale?: string };
}): Metadata {
  const locale = resolveStage2PilotLocaleFromParams(params);
  if (!locale) return METADATA_NOT_FOUND;
  return buildSubscriptionPageMetadata(locale);
}

export default async function LocalizedSubscriptionPage({ params }: Props) {
  if (!isStage2PilotLocale(params.locale)) notFound();
  const props = await loadSubscriptionPageViewProps(params.locale);
  return <SubscriptionPageView {...props} />;
}
