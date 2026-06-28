import type { Metadata } from 'next';

import SubscriptionSuccessContent from '@/components/subscription/SubscriptionSuccessContent';
import { getSubscriptionSuccessUiCopy } from '@/lib/i18n/subscriptionSuccessPageCopy';

const ui = getSubscriptionSuccessUiCopy('en');

export const metadata: Metadata = {
  title: ui.metaTitle,
  robots: { index: false, follow: true }
};

export default function SubscriptionSuccessPage() {
  return <SubscriptionSuccessContent locale="en" />;
}
