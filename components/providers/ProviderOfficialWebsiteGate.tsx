'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, Lock } from 'lucide-react';

import AuthStatusProvider from '@/components/auth/AuthStatusProvider';
import PremiumPaywallModal from '@/components/scholarships/PremiumPaywallModal';

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
  hasSubscription
}: ProviderOfficialWebsiteGateProps & {
  hasSubscription: boolean;
}) {
  const router = useRouter();
  const [paywallOpen, setPaywallOpen] = useState(false);

  const isBlocked = !hasSubscription;

  const openPaywall = useCallback(() => {
    setPaywallOpen(true);
  }, []);

  const closePaywall = useCallback(() => {
    setPaywallOpen(false);
  }, []);

  const handleUpgradeClick = useCallback(() => {
    setPaywallOpen(false);
    router.push('/subscription');
  }, [router]);

  const baseClassName =
    variant === 'inline'
      ? `inline-flex items-center gap-1.5 ${className ?? ''}`.trim()
      : className;

  return (
    <>
      {isBlocked ? (
        <button
          type="button"
          onClick={openPaywall}
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

      <PremiumPaywallModal
        isOpen={paywallOpen}
        onClose={closePaywall}
        onUpgradeClick={handleUpgradeClick}
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
      {({ hasSubscription }) => (
        <ProviderOfficialWebsiteGateInner
          href={href}
          label={label}
          variant={variant}
          className={className}
          title={title}
          hasSubscription={hasSubscription}
        />
      )}
    </AuthStatusProvider>
  );
}
