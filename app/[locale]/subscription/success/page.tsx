import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import SubscriptionSuccessContent from '@/components/subscription/SubscriptionSuccessContent';
import { getSubscriptionSuccessUiCopy } from '@/lib/i18n/subscriptionSuccessPageCopy';
import { localizedPath } from '@/lib/i18n/paths';
import {
  isStage2PilotLocale,
  type Stage2PilotLocale
} from '@/lib/i18n/pilotRoutes';

export function generateMetadata({
  params
}: {
  params: { locale: string };
}): Metadata {
  if (!isStage2PilotLocale(params.locale)) {
    return { title: 'Page not found', robots: { index: false, follow: false } };
  }
  const locale = params.locale as Stage2PilotLocale;
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
