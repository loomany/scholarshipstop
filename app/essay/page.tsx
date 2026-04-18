import type { Metadata } from 'next';
import { Suspense } from 'react';

import { SiteBrandLoading } from '@/components/ui/SiteBrandLoading';

import EssayPageClient from './EssayPageClient';

export const metadata: Metadata = {
  title: 'Write your essay',
  robots: { index: false, follow: false }
};

function EssayPageFallback() {
  return <SiteBrandLoading className="min-h-[100dvh]" />;
}

export default function EssayPage() {
  return (
    <Suspense fallback={<EssayPageFallback />}>
      <EssayPageClient />
    </Suspense>
  );
}
