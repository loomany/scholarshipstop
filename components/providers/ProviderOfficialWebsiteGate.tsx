'use client';

import { useCallback, useState } from 'react';
import { ExternalLink, Lock } from 'lucide-react';

import AuthStatusProvider from '@/components/auth/AuthStatusProvider';
import ScholarshipRegistrationWallModal from '@/components/scholarships/ScholarshipRegistrationWallModal';
import ScholarshipSubscriptionOfferModal from '@/components/scholarships/ScholarshipSubscriptionOfferModal';

type ProviderOfficialWebsiteGateProps = {
  href: string;
  label?: string;
  variant?: 'button' | 'inline';
  className?: string;
  title?: string;
};

function ProviderOfficialWebsiteGateInner({
  href,
  label = 'Official website',
  variant = 'button',
  className,
  title,
  isAuthenticated,
  hasSubscription
}: ProviderOfficialWebsiteGateProps & {
  isAuthenticated: boolean;
  hasSubscription: boolean;
}) {
  const [registrationWallOpen, setRegistrationWallOpen] = useState(false);
  const [subscriptionOfferOpen, setSubscriptionOfferOpen] = useState(false);
  const [subscriptionOfferNotice, setSubscriptionOfferNotice] = useState<
    string | undefined
  >(undefined);

  const isBlocked = !isAuthenticated || !hasSubscription;
  const isSubscriptionBlocked = isAuthenticated && !hasSubscription;

  const openBlockedModal = useCallback(() => {
    if (isSubscriptionBlocked) {
      setSubscriptionOfferNotice(undefined);
      setSubscriptionOfferOpen(true);
      return;
    }
    setRegistrationWallOpen(true);
  }, [isSubscriptionBlocked]);

  const closeRegistrationWall = useCallback(() => {
    setRegistrationWallOpen(false);
  }, []);

  const closeSubscriptionOffer = useCallback(() => {
    setSubscriptionOfferOpen(false);
    setSubscriptionOfferNotice(undefined);
  }, []);

  const baseClassName =
    variant === 'inline'
      ? `inline-flex items-center gap-1.5 ${className ?? ''}`.trim()
      : className;

  return (
    <>
      {isBlocked ? (
        <button
          type="button"
          onClick={openBlockedModal}
          title={title}
          aria-label={label}
          className={baseClassName}
        >
          <span>{label}</span>
          <Lock className="h-4 w-4 shrink-0" aria-hidden />
        </button>
      ) : (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          title={title}
          className={baseClassName}
        >
          <span>{label}</span>
          {variant === 'button' ? (
            <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
          ) : null}
        </a>
      )}

      <ScholarshipRegistrationWallModal
        open={registrationWallOpen}
        onClose={closeRegistrationWall}
      />
      <ScholarshipSubscriptionOfferModal
        open={subscriptionOfferOpen}
        onClose={closeSubscriptionOffer}
        notice={subscriptionOfferNotice}
      />
    </>
  );
}

export function ProviderOfficialWebsiteGate({
  href,
  label = 'Official website',
  variant = 'button',
  className,
  title
}: ProviderOfficialWebsiteGateProps) {
  return (
    <AuthStatusProvider>
      {({ isAuthenticated, hasSubscription }) => (
        <ProviderOfficialWebsiteGateInner
          href={href}
          label={label}
          variant={variant}
          className={className}
          title={title}
          isAuthenticated={isAuthenticated}
          hasSubscription={hasSubscription}
        />
      )}
    </AuthStatusProvider>
  );
}
