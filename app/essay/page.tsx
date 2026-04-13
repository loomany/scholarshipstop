import type { Metadata } from 'next';
import { Suspense } from 'react';

import EssayPageClient from './EssayPageClient';

export const metadata: Metadata = {
  title: 'Write your essay',
  robots: { index: false, follow: false }
};

function EssayPageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-500"
        role="status"
        aria-label="Loading"
      />
    </div>
  );
}

export default function EssayPage() {
  return (
    <Suspense fallback={<EssayPageFallback />}>
      <EssayPageClient />
    </Suspense>
  );
}
