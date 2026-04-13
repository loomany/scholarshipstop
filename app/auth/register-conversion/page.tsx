import { Suspense } from 'react';

import RegisterConversionClient from './RegisterConversionClient';

export default function RegisterConversionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center px-4 text-sm text-zinc-600">
          Loading…
        </div>
      }
    >
      <RegisterConversionClient />
    </Suspense>
  );
}
