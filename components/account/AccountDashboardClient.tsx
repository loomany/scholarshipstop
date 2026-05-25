'use client';

import { useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import type { User } from '@supabase/supabase-js';

import ScholarshipCatalogEntryLink from '@/components/scholarships/ScholarshipCatalogEntryLink';
import {
  getStage2LocaleFromPathname,
  isStage2PilotLocale
} from '@/lib/i18n/pilotRoutes';
import type { LocalizedUiLocale } from '@/lib/i18n/localizedHref';
import { writeStoredUiLocale } from '@/components/i18n/LocaleUiPreference';
import { getAccountUiCopy } from '@/lib/i18n/accountUiCopy';

import SubscriptionPausedBanner from '@/components/billing/SubscriptionPausedBanner';
import SubscriptionDebug from '@/components/debug/SubscriptionDebug';
import ScholarshipProfileForm from '@/components/ui/AccountForms/ScholarshipProfileForm';
import { resolveResumeSubscriptionHref } from '@/lib/payments/billingUrls';
import { deriveSubscriptionPresentation } from '@/lib/payments/subscriptionEntitlements';
import type { Database, Tables } from '@/types_db';

type ProfilesRow = Database['public']['Tables']['profiles']['Row'];

function pickResendConfirmationMode(
  authUser: User,
  profile: ProfilesRow | null
): 'app' | 'supabase' | null {
  if (profile?.email_verified === false) return 'app';
  const at = authUser.email_confirmed_at;
  if (at == null || at === '') return 'supabase';
  return null;
}
type Subscription = Tables<'subscriptions'>;
type Price = Tables<'prices'>;
type Product = Tables<'products'>;
type SubscriptionWithPriceAndProduct = Subscription & {
  prices:
    | (Price & {
        products: Product | null;
      })
    | null;
};

export default function AccountDashboardClient({
  user,
  profile,
  subscription
}: {
  user: User;
  profile: ProfilesRow | null;
  subscription: SubscriptionWithPriceAndProduct | null;
}) {
  /** Confirmed only if Auth says so AND profile does not explicitly say unverified. */
  const authEmailVerified = Boolean(user.email_confirmed_at);
  const emailConfirmedForUi: boolean | undefined =
    profile === null
      ? authEmailVerified
        ? true
        : false
      : profile.email_verified === false
        ? false
        : authEmailVerified
          ? true
          : false;

  const subscriptionPresentation = deriveSubscriptionPresentation(profile, subscription);
  const subscriptionPaused = subscriptionPresentation.status === 'paused';
  const pausedResumeUrl = resolveResumeSubscriptionHref(subscription, '/subscription');
  const resendConfirmationMode = pickResendConfirmationMode(user, profile);
  const pathname = usePathname() ?? '/account';
  const pathLocale = getStage2LocaleFromPathname(pathname);
  const uiLocale = useMemo((): LocalizedUiLocale => {
    if (pathLocale && isStage2PilotLocale(pathLocale)) return pathLocale;
    return 'en';
  }, [pathLocale]);

  useEffect(() => {
    if (pathLocale && isStage2PilotLocale(pathLocale)) {
      writeStoredUiLocale(pathLocale);
      return;
    }
    writeStoredUiLocale('en');
  }, [pathLocale]);

  const ui = getAccountUiCopy(uiLocale);

  return (
    <div className="min-h-screen bg-zinc-50/90">
      <div className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6 lg:px-8">
        <section id="account-section-profile" className="scroll-mt-20 space-y-6 pb-16">
          {subscriptionPaused ? (
            <SubscriptionPausedBanner resumeUrl={pausedResumeUrl} className="shadow-sm" />
          ) : null}
          <ScholarshipProfileForm
            profile={profile}
            subscription={subscription}
            userEmail={user.email}
            emailConfirmed={emailConfirmedForUi}
            resendConfirmationMode={resendConfirmationMode}
            variant="saas"
            uiLocale={uiLocale}
          />

          <div>
            <ScholarshipCatalogEntryLink
              className="text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
            >
              {ui.backToScholarships}
            </ScholarshipCatalogEntryLink>
          </div>
        </section>
      </div>
      <SubscriptionDebug />
    </div>
  );
}
