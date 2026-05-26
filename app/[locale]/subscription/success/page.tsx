import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import SubscriptionSuccessContent from '@/components/subscription/SubscriptionSuccessContent';
import { getSubscriptionSuccessUiCopy } from '@/lib/i18n/subscriptionSuccessPageCopy';
import { localizedPath } from '@/lib/i18n/paths';
import {
  METADATA_NOT_FOUND,
  resolveStage2PilotLocaleFromParams
} from '@/lib/i18n/metadataRouteParams';
import {
  isStage2PilotLocale,
  type Stage2PilotLocale
} from '@/lib/i18n/pilotRoutes';

export function generateMetadata({
  params
}: {
  params?: { locale?: string };
}): Metadata {
  const locale = resolveStage2PilotLocaleFromParams(params);
  if (!locale) return METADATA_NOT_FOUND;
  const ui = getSubscriptionSuccessUiCopy(locale);
  return {
    title: ui.metaTitle,
    robots: { index: false, follow: true },
    alternates: {
      canonical: localizedPath(locale, '/subscription/success')
    }
  };
}

export default function LocalizedSubscriptionSuccessPage({
  params
}: {
  params: { locale: string };
}) {
  if (!isStage2PilotLocale(params.locale)) notFound();
  return <SubscriptionSuccessContent locale={params.locale as Stage2PilotLocale} />;
}
