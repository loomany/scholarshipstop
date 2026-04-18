import { Suspense } from 'react';

import { SiteBrandLoading } from '@/components/ui/SiteBrandLoading';

import RegisterConversionClient from './RegisterConversionClient';

export default function RegisterConversionPage() {
  return (
    <Suspense
      fallback={<SiteBrandLoading className="min-h-[40vh]" />}
    >
      <RegisterConversionClient />
    </Suspense>
  );
}
