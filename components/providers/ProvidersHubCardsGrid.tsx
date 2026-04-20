'use client';

import { useCallback, useState } from 'react';

import AuthStatusProvider from '@/components/auth/AuthStatusProvider';
import ScholarshipRegistrationWallModal from '@/components/scholarships/ScholarshipRegistrationWallModal';
import type { ProviderHubRow } from '@/lib/providers/providerHubTypes';

import { ProvidersHubCard } from './ProvidersHubCard';

type Props = {
  rows: ProviderHubRow[];
};

export function ProvidersHubCardsGrid({ rows }: Props) {
  const [offerOpen, setOfferOpen] = useState(false);
  const openOffer = useCallback(() => setOfferOpen(true), []);

  return (
    <AuthStatusProvider>
      {({ isAuthenticated, hasSubscription, authResolved }) => (
        <>
          <ul className="mt-10 grid list-none grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {rows.map((row) => (
              <ProvidersHubCard
                key={row.slug}
                row={row}
                isAuthenticated={isAuthenticated}
                hasSubscription={hasSubscription}
                authResolved={authResolved}
                onSubscriptionRequired={openOffer}
              />
            ))}
          </ul>
          <ScholarshipRegistrationWallModal
            open={offerOpen}
            onClose={() => setOfferOpen(false)}
            signedInWithoutSubscription={
              Boolean(isAuthenticated && authResolved && !hasSubscription)
            }
          />
        </>
      )}
    </AuthStatusProvider>
  );
}
