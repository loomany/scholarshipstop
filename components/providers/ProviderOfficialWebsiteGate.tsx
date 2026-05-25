'use client';

import { useCallback, useState } from 'react';
import type { MouseEvent } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ExternalLink, Lock } from 'lucide-react';

import AuthStatusProvider from '@/components/auth/AuthStatusProvider';
import PremiumPaywallModal from '@/components/scholarships/PremiumPaywallModal';
import { localizedSubscriptionHref } from '@/lib/i18n/localizedHref';
import { resolveNavLocaleFromPathname } from '@/lib/i18n/resolveNavLocale';

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
  const pathname = usePathname() ?? '/';
  const locale = resolveNavLocaleFromPathname(pathname);
  const [paywallOpen, setPaywallOpen] = useState(false);

  const isBlocked = !hasSubscription;

  const openPaywall = useCallback(() => {
    setPaywallOpen(true);
  }, []);

  const handleAnchorClick = useCallback(
    (e: MouseEvent<HTMLAnchorElement>) => {
      if (!isBlocked) return;
      e.preventDefault();
      openPaywall();
    },
    [isBlocked, openPaywall]
  );

  const closePaywall = useCallback(() => {
    setPaywallOpen(false);
  }, []);

  const handleUpgradeClick = useCallback(() => {
    setPaywallOpen(false);
    router.push(localizedSubscriptionHref(locale));
  }, [router, locale]);

  const baseClassName =
    variant === 'inline'
      ? `inline-flex items-center gap-1.5 ${className ?? ''}`.trim()
      : className;

  return (
    <>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        title={title}
        aria-label={label}
        onClick={handleAnchorClick}
        className={baseClassName}
      >
        <span>{label}</span>
        {isBlocked ? (
          <Lock className="h-4 w-4 shrink-0" aria-hidden />
        ) : variant === 'button' ? (
          <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
        ) : null}
      </a>

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
